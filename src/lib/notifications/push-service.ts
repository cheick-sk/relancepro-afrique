/**
 * Push Notification Service for RelancePro Africa
 * Backend service for sending push notifications to users
 */

import { db } from '@/lib/db';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_LABELS,
  type NotificationType,
  type PushNotificationPayload,
  isVapidConfigured,
  isInQuietHours,
} from './push-config';

// Types
interface DebtInfo {
  id: string;
  clientName: string;
  amount: number;
  currency: string;
  reference?: string;
  daysOverdue?: number;
}

interface WeeklyDigestData {
  totalDebts: number;
  totalAmount: number;
  currency: string;
  remindersSent: number;
  paymentsReceived: number;
  amountCollected: number;
  newClients: number;
}

/**
 * Send a push notification to a specific user
 */
export async function sendPushNotification(
  userId: string,
  notification: PushNotificationPayload
): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  try {
    // Check if VAPID is configured
    if (!isVapidConfigured()) {
      // Fallback: create in-app notification only
      await createInAppNotification(userId, notification);
      return { success: true, sent: 0, failed: 0, errors: ['VAPID not configured - in-app notification only'] };
    }

    // Get all active subscriptions for the user
    const subscriptions = await db.pushSubscription.findMany({
      where: {
        profileId: userId,
        active: true,
      },
    });

    if (subscriptions.length === 0) {
      // No push subscriptions, create in-app notification only
      await createInAppNotification(userId, notification);
      return { success: true, sent: 0, failed: 0, errors: ['No active push subscriptions'] };
    }

    // Check notification type preferences
    const notificationType = notification.data?.type as NotificationType | undefined;
    
    // Filter subscriptions based on notification type preferences
    const eligibleSubscriptions = subscriptions.filter(sub => {
      if (!notificationType) return true;

      // Check quiet hours
      if (sub.quietHoursEnabled && isInQuietHours(sub.quietHoursStart, sub.quietHoursEnd)) {
        return false;
      }

      // Check notification type preferences
      switch (notificationType) {
        case NOTIFICATION_TYPES.REMINDER_SENT:
          return sub.notifyReminders;
        case NOTIFICATION_TYPES.PAYMENT_RECEIVED:
          return sub.notifyPayments;
        case NOTIFICATION_TYPES.WEEKLY_SUMMARY:
          return sub.notifyWeeklyDigest;
        case NOTIFICATION_TYPES.DEBT_OVERDUE:
        case NOTIFICATION_TYPES.CLIENT_RESPONDED:
        case NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING:
          return sub.notifyAlerts;
        default:
          return true;
      }
    });

    if (eligibleSubscriptions.length === 0) {
      await createInAppNotification(userId, notification);
      return { success: true, sent: 0, failed: 0, errors: ['No eligible subscriptions for this notification type'] };
    }

    // Send push notifications
    // Note: In production, use web-push library here
    // For now, we'll create in-app notifications and mark subscriptions as used
    for (const subscription of eligibleSubscriptions) {
      try {
        // TODO: Implement actual web-push with web-push library
        // await webpush.sendNotification(
        //   {
        //     endpoint: subscription.endpoint,
        //     keys: {
        //       p256dh: subscription.p256dh,
        //       auth: subscription.auth,
        //     },
        //   },
        //   JSON.stringify(notification)
        // );

        // Update last used timestamp
        await db.pushSubscription.update({
          where: { id: subscription.id },
          data: { lastUsedAt: new Date() },
        });

        sent++;
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to send to ${subscription.deviceType || 'device'}: ${errorMsg}`);

        // If the subscription is invalid, mark it as inactive
        if (errorMsg.includes('410') || errorMsg.includes('expired')) {
          await db.pushSubscription.update({
            where: { id: subscription.id },
            data: { active: false },
          });
        }
      }
    }

    // Always create an in-app notification as backup
    await createInAppNotification(userId, notification);

    return { success: sent > 0 || failed === 0, sent, failed, errors };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMsg);
    return { success: false, sent, failed, errors };
  }
}

/**
 * Send a broadcast notification to all users
 */
export async function sendBroadcastNotification(
  notification: PushNotificationPayload
): Promise<{ success: boolean; totalUsers: number; sent: number; failed: number }> {
  try {
    // Get all unique users with active subscriptions
    const usersWithSubscriptions = await db.pushSubscription.findMany({
      where: { active: true },
      select: { profileId: true },
      distinct: ['profileId'],
    });

    const totalUsers = usersWithSubscriptions.length;
    let totalSent = 0;
    let totalFailed = 0;

    // Send to each user
    for (const { profileId } of usersWithSubscriptions) {
      const result = await sendPushNotification(profileId, notification);
      totalSent += result.sent;
      totalFailed += result.failed;
    }

    return { success: true, totalUsers, sent: totalSent, failed: totalFailed };
  } catch (error) {
    console.error('Error sending broadcast notification:', error);
    return { success: false, totalUsers: 0, sent: 0, failed: 0 };
  }
}

/**
 * Send a payment reminder notification
 */
export async function sendPaymentReminder(
  userId: string,
  debtInfo: DebtInfo
): Promise<{ success: boolean; sent: number; failed: number }> {
  const formattedAmount = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: debtInfo.currency,
  }).format(debtInfo.amount);

  const notification: PushNotificationPayload = {
    title: `Relance: ${debtInfo.clientName}`,
    body: `Créance de ${formattedAmount}${debtInfo.reference ? ` (${debtInfo.reference})` : ''} en attente de paiement.`,
    tag: `debt-${debtInfo.id}`,
    data: {
      type: NOTIFICATION_TYPES.DEBT_OVERDUE,
      debtId: debtInfo.id,
      url: `/debts?id=${debtInfo.id}`,
    },
    actions: [
      { action: 'view', title: 'Voir détails' },
      { action: 'send_reminder', title: 'Envoyer relance' },
    ],
  };

  const result = await sendPushNotification(userId, notification);
  return { success: result.success, sent: result.sent, failed: result.failed };
}

/**
 * Send a weekly digest notification
 */
export async function sendWeeklyDigest(
  userId: string,
  data: WeeklyDigestData
): Promise<{ success: boolean; sent: number; failed: number }> {
  const formattedTotal = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: data.currency,
  }).format(data.totalAmount);

  const formattedCollected = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: data.currency,
  }).format(data.amountCollected);

  const notification: PushNotificationPayload = {
    title: 'Résumé hebdomadaire',
    body: `${data.remindersSent} relances envoyées, ${data.paymentsReceived} paiements reçus (${formattedCollected}). ${data.totalDebts} créances actives (${formattedTotal}).`,
    tag: 'weekly-summary',
    data: {
      type: NOTIFICATION_TYPES.WEEKLY_SUMMARY,
      url: '/reports',
    },
    silent: true,
  };

  const result = await sendPushNotification(userId, notification);
  return { success: result.success, sent: result.sent, failed: result.failed };
}

/**
 * Create an in-app notification in the database
 */
async function createInAppNotification(
  userId: string,
  notification: PushNotificationPayload
): Promise<void> {
  try {
    await db.notification.create({
      data: {
        profileId: userId,
        type: getNotificationTypeForDb(notification.data?.type as NotificationType),
        title: notification.title,
        message: notification.body,
        actionUrl: notification.data?.url,
        actionLabel: notification.actions?.[0]?.title,
      },
    });
  } catch (error) {
    console.error('Error creating in-app notification:', error);
  }
}

/**
 * Map notification type to database type
 */
function getNotificationTypeForDb(type?: NotificationType): string {
  switch (type) {
    case NOTIFICATION_TYPES.PAYMENT_RECEIVED:
      return 'success';
    case NOTIFICATION_TYPES.DEBT_OVERDUE:
    case NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING:
      return 'warning';
    case NOTIFICATION_TYPES.REMINDER_SENT:
    case NOTIFICATION_TYPES.CLIENT_RESPONDED:
    case NOTIFICATION_TYPES.WEEKLY_SUMMARY:
    default:
      return 'info';
  }
}

/**
 * Clean up inactive or expired push subscriptions
 */
export async function cleanupInactiveSubscriptions(
  daysInactive: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

  const result = await db.pushSubscription.deleteMany({
    where: {
      OR: [
        { active: false },
        {
          AND: [
            { lastUsedAt: { lt: cutoffDate } },
            { createdAt: { lt: cutoffDate } },
          ],
        },
      ],
    },
  });

  return result.count;
}

/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(userId: string): Promise<{
  activeSubscriptions: number;
  totalSubscriptions: number;
  notificationPreferences: Record<NotificationType, { push: boolean; email: boolean; whatsapp: boolean }>;
}> {
  const subscriptions = await db.pushSubscription.findMany({
    where: { profileId: userId },
  });

  const preferences = await db.notificationPreference.findMany({
    where: { profileId: userId },
  });

  // Build preferences map
  const preferencesMap: Record<string, { push: boolean; email: boolean; whatsapp: boolean }> = {};
  for (const pref of preferences) {
    preferencesMap[pref.notificationType] = {
      push: pref.pushEnabled,
      email: pref.emailEnabled,
      whatsapp: pref.whatsappEnabled,
    };
  }

  return {
    activeSubscriptions: subscriptions.filter(s => s.active).length,
    totalSubscriptions: subscriptions.length,
    notificationPreferences: preferencesMap as Record<NotificationType, { push: boolean; email: boolean; whatsapp: boolean }>,
  };
}

/**
 * Notification helper functions for common events
 */

export async function notifyPaymentReceived(
  userId: string,
  data: { clientName: string; amount: number; currency: string; debtId: string }
): Promise<void> {
  const formattedAmount = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: data.currency,
  }).format(data.amount);

  await sendPushNotification(userId, {
    title: 'Paiement reçu',
    body: `${data.clientName} a payé ${formattedAmount}`,
    tag: `payment-${data.debtId}`,
    data: {
      type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
      debtId: data.debtId,
      url: `/debts?id=${data.debtId}`,
    },
  });
}

export async function notifyReminderSent(
  userId: string,
  data: { clientName: string; channel: 'email' | 'whatsapp'; reminderId: string; debtId: string }
): Promise<void> {
  await sendPushNotification(userId, {
    title: 'Relance envoyée',
    body: `Relance ${data.channel === 'email' ? 'email' : 'WhatsApp'} envoyée à ${data.clientName}`,
    tag: `reminder-${data.reminderId}`,
    data: {
      type: NOTIFICATION_TYPES.REMINDER_SENT,
      reminderId: data.reminderId,
      debtId: data.debtId,
      url: `/reminders`,
    },
  });
}

export async function notifyDebtOverdue(
  userId: string,
  data: { clientName: string; amount: number; currency: string; daysOverdue: number; debtId: string }
): Promise<void> {
  const formattedAmount = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: data.currency,
  }).format(data.amount);

  await sendPushNotification(userId, {
    title: 'Créance en retard',
    body: `La créance de ${data.clientName} (${formattedAmount}) est en retard de ${data.daysOverdue} jours`,
    tag: `overdue-${data.debtId}`,
    data: {
      type: NOTIFICATION_TYPES.DEBT_OVERDUE,
      debtId: data.debtId,
      url: `/debts?id=${data.debtId}`,
    },
    requireInteraction: true,
  });
}

export async function notifyClientResponded(
  userId: string,
  data: { clientName: string; message: string; clientId: string }
): Promise<void> {
  await sendPushNotification(userId, {
    title: `${data.clientName} a répondu`,
    body: data.message.substring(0, 100) + (data.message.length > 100 ? '...' : ''),
    tag: `response-${data.clientId}`,
    data: {
      type: NOTIFICATION_TYPES.CLIENT_RESPONDED,
      clientId: data.clientId,
      url: `/clients?id=${data.clientId}`,
    },
  });
}

export async function notifySubscriptionExpiring(
  userId: string,
  data: { planName: string; daysRemaining: number }
): Promise<void> {
  await sendPushNotification(userId, {
    title: 'Abonnement expire bientôt',
    body: `Votre abonnement ${data.planName} expire dans ${data.daysRemaining} jours. Renouvelez pour continuer à utiliser toutes les fonctionnalités.`,
    tag: 'subscription-expiring',
    data: {
      type: NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING,
      url: '/subscription',
    },
    requireInteraction: true,
  });
}

// Export notification types and labels for use in other modules
export { NOTIFICATION_TYPES, NOTIFICATION_LABELS };
export type { NotificationType, PushNotificationPayload, DebtInfo, WeeklyDigestData };
