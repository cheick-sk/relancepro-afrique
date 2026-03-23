// Push Notification Service for RelancePro Africa
// Handles subscription management and notification sending

import { db } from '@/lib/db';
import { 
  getVapidConfig, 
  createPushPayload, 
  isInQuietHours,
  type PushPayload, 
  type NotificationType,
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './config';

// Subscription data from client
export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
}

// Result of sending a notification
export interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

// Generate VAPID keys for initial setup
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  // This is a placeholder - in production, use web-push library
  // Run: npx web-push generate-vapid-keys
  const config = getVapidConfig();
  return {
    publicKey: config.publicKey,
    privateKey: config.privateKey,
  };
}

// Subscribe a user to push notifications
export async function subscribeUser(
  userId: string,
  subscriptionData: PushSubscriptionData,
  preferences?: Partial<NotificationPreferences>
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  try {
    // Check if subscription already exists
    const existing = await db.pushSubscription.findUnique({
      where: { endpoint: subscriptionData.endpoint },
    });

    if (existing) {
      // Update existing subscription
      const updated = await db.pushSubscription.update({
        where: { endpoint: subscriptionData.endpoint },
        data: {
          p256dh: subscriptionData.p256dh,
          auth: subscriptionData.auth,
          userAgent: subscriptionData.userAgent,
          deviceType: subscriptionData.deviceType,
          // Update preferences if provided
          notifyPaymentReminders: preferences?.paymentReminders ?? existing.notifyPaymentReminders,
          notifyNewDebts: preferences?.newDebts ?? existing.notifyNewDebts,
          notifyRemindersSent: preferences?.remindersSent ?? existing.notifyRemindersSent,
          notifySubscription: preferences?.subscription ?? existing.notifySubscription,
          soundEnabled: preferences?.soundEnabled ?? existing.soundEnabled,
          quietHoursStart: preferences?.quietHoursStart ?? existing.quietHoursStart,
          quietHoursEnd: preferences?.quietHoursEnd ?? existing.quietHoursEnd,
        },
      });
      
      return { success: true, subscriptionId: updated.id };
    }

    // Create new subscription
    const subscription = await db.pushSubscription.create({
      data: {
        profileId: userId,
        endpoint: subscriptionData.endpoint,
        p256dh: subscriptionData.p256dh,
        auth: subscriptionData.auth,
        userAgent: subscriptionData.userAgent,
        deviceType: subscriptionData.deviceType,
        notifyPaymentReminders: preferences?.paymentReminders ?? DEFAULT_NOTIFICATION_PREFERENCES.paymentReminders,
        notifyNewDebts: preferences?.newDebts ?? DEFAULT_NOTIFICATION_PREFERENCES.newDebts,
        notifyRemindersSent: preferences?.remindersSent ?? DEFAULT_NOTIFICATION_PREFERENCES.remindersSent,
        notifySubscription: preferences?.subscription ?? DEFAULT_NOTIFICATION_PREFERENCES.subscription,
        soundEnabled: preferences?.soundEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.soundEnabled,
        quietHoursStart: preferences?.quietHoursStart ?? DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart,
        quietHoursEnd: preferences?.quietHoursEnd ?? DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnd,
      },
    });

    return { success: true, subscriptionId: subscription.id };
  } catch (error) {
    console.error('Error subscribing user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to subscribe user' 
    };
  }
}

// Unsubscribe a user from push notifications
export async function unsubscribeUser(
  userId: string,
  endpoint?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (endpoint) {
      // Remove specific subscription
      const subscription = await db.pushSubscription.findFirst({
        where: { endpoint, profileId: userId },
      });

      if (subscription) {
        await db.pushSubscription.delete({
          where: { endpoint },
        });
      }
    } else {
      // Remove all subscriptions for the user
      await db.pushSubscription.deleteMany({
        where: { profileId: userId },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error unsubscribing user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to unsubscribe user' 
    };
  }
}

// Get user's notification preferences
export async function getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
  try {
    const subscription = await db.pushSubscription.findFirst({
      where: { profileId: userId },
    });

    if (!subscription) {
      return null;
    }

    return {
      paymentReminders: subscription.notifyPaymentReminders,
      newDebts: subscription.notifyNewDebts,
      remindersSent: subscription.notifyRemindersSent,
      subscription: subscription.notifySubscription,
      soundEnabled: subscription.soundEnabled,
      quietHoursStart: subscription.quietHoursStart || undefined,
      quietHoursEnd: subscription.quietHoursEnd || undefined,
    };
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
}

// Update user's notification preferences
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.pushSubscription.updateMany({
      where: { profileId: userId },
      data: {
        notifyPaymentReminders: preferences.paymentReminders,
        notifyNewDebts: preferences.newDebts,
        notifyRemindersSent: preferences.remindersSent,
        notifySubscription: preferences.subscription,
        soundEnabled: preferences.soundEnabled,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update preferences' 
    };
  }
}

// Send a push notification to a specific user
export async function sendPushNotification(
  userId: string,
  type: NotificationType,
  data: {
    title?: string;
    body: string;
    url?: string;
    id: string;
    actions?: PushPayload['actions'];
  }
): Promise<SendResult> {
  const result: SendResult = {
    success: false,
    sent: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get user's subscriptions
    const subscriptions = await db.pushSubscription.findMany({
      where: { profileId: userId },
    });

    if (subscriptions.length === 0) {
      result.errors.push('No active subscriptions found for user');
      return result;
    }

    // Check notification type preferences for each subscription
    const eligibleSubscriptions = subscriptions.filter(sub => {
      switch (type) {
        case 'reminder_sent':
        case 'reminder_delivered':
          return sub.notifyRemindersSent;
        case 'payment_received':
          return sub.notifyPaymentReminders;
        case 'new_debt':
          return sub.notifyNewDebts;
        case 'subscription_warning':
        case 'subscription_expired':
          return sub.notifySubscription;
        case 'client_responded':
          return sub.notifyRemindersSent;
        default:
          return true;
      }
    });

    if (eligibleSubscriptions.length === 0) {
      result.errors.push('User has disabled this notification type');
      return result;
    }

    // Check quiet hours for each subscription
    const activeSubscriptions = eligibleSubscriptions.filter(sub => {
      const prefs: NotificationPreferences = {
        paymentReminders: sub.notifyPaymentReminders,
        newDebts: sub.notifyNewDebts,
        remindersSent: sub.notifyRemindersSent,
        subscription: sub.notifySubscription,
        soundEnabled: sub.soundEnabled,
        quietHoursStart: sub.quietHoursStart || undefined,
        quietHoursEnd: sub.quietHoursEnd || undefined,
      };
      return !isInQuietHours(prefs);
    });

    // Create the payload
    const payload = createPushPayload(type, data);

    // For each subscription, we would send via web-push
    // Since we're in a serverless environment, we'll create in-app notifications
    // and optionally send via web-push if configured
    
    for (const sub of activeSubscriptions) {
      try {
        // Create in-app notification
        await db.notification.create({
          data: {
            profileId: userId,
            type: type.includes('warning') || type.includes('expired') ? 'warning' : 
                  type.includes('error') ? 'error' : 'info',
            title: payload.title,
            message: payload.body,
            actionUrl: payload.data.url,
            actionLabel: 'Voir',
          },
        });

        // TODO: Send via Web Push if web-push library is configured
        // await webpush.sendNotification({
        //   endpoint: sub.endpoint,
        //   keys: {
        //     p256dh: sub.p256dh,
        //     auth: sub.auth,
        //   },
        // }, JSON.stringify(payload));

        result.sent++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to send to ${sub.endpoint.slice(0, 30)}...: ${error}`);
      }
    }

    result.success = result.sent > 0;
    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

// Send a push notification to multiple users
export async function broadcastNotification(
  userIds: string[],
  type: NotificationType,
  data: {
    title?: string;
    body: string;
    url?: string;
    id: string;
    actions?: PushPayload['actions'];
  }
): Promise<SendResult> {
  const result: SendResult = {
    success: false,
    sent: 0,
    failed: 0,
    errors: [],
  };

  for (const userId of userIds) {
    const userResult = await sendPushNotification(userId, type, data);
    result.sent += userResult.sent;
    result.failed += userResult.failed;
    result.errors.push(...userResult.errors);
  }

  result.success = result.sent > 0;
  return result;
}

// Clean up expired or invalid subscriptions
export async function cleanupSubscriptions(): Promise<{ removed: number }> {
  try {
    // Remove subscriptions older than 30 days without activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db.pushSubscription.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    return { removed: result.count };
  } catch (error) {
    console.error('Error cleaning up subscriptions:', error);
    return { removed: 0 };
  }
}

// Get all subscriptions for a user
export async function getUserSubscriptions(userId: string) {
  try {
    return await db.pushSubscription.findMany({
      where: { profileId: userId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error getting user subscriptions:', error);
    return [];
  }
}

// Notification trigger functions for integration with existing services

// Trigger: After reminder sent successfully
export async function notifyReminderSent(
  userId: string,
  debtId: string,
  clientName: string,
  reminderType: 'email' | 'whatsapp'
): Promise<void> {
  await sendPushNotification(userId, 'reminder_sent', {
    title: 'Relance envoyée',
    body: `Votre relance par ${reminderType} à ${clientName} a été envoyée avec succès.`,
    url: `/debts/${debtId}`,
    id: debtId,
  });
}

// Trigger: When payment received
export async function notifyPaymentReceived(
  userId: string,
  debtId: string,
  clientName: string,
  amount: number,
  currency: string
): Promise<void> {
  await sendPushNotification(userId, 'payment_received', {
    title: 'Paiement reçu',
    body: `${clientName} a effectué un paiement de ${amount} ${currency}.`,
    url: `/debts/${debtId}`,
    id: debtId,
  });
}

// Trigger: When subscription expiring soon
export async function notifySubscriptionExpiring(
  userId: string,
  daysRemaining: number
): Promise<void> {
  await sendPushNotification(userId, 'subscription_warning', {
    title: 'Abonnement expire bientôt',
    body: `Votre abonnement expire dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}. Renouvelez-le pour continuer à utiliser toutes les fonctionnalités.`,
    url: '/subscription',
    id: 'subscription-warning',
    actions: [
      { action: 'renew', title: 'Renouveler' },
      { action: 'dismiss', title: 'Plus tard' },
    ],
  });
}

// Trigger: When subscription expired
export async function notifySubscriptionExpired(userId: string): Promise<void> {
  await sendPushNotification(userId, 'subscription_expired', {
    title: 'Abonnement expiré',
    body: 'Votre abonnement a expiré. Renouvelez-le pour continuer à utiliser toutes les fonctionnalités.',
    url: '/subscription',
    id: 'subscription-expired',
    actions: [
      { action: 'renew', title: 'Renouveler' },
    ],
  });
}

// Trigger: When client responds
export async function notifyClientResponded(
  userId: string,
  clientId: string,
  clientName: string,
  message: string
): Promise<void> {
  await sendPushNotification(userId, 'client_responded', {
    title: `Réponse de ${clientName}`,
    body: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
    url: `/clients/${clientId}`,
    id: clientId,
  });
}

// Trigger: When new debt added
export async function notifyNewDebt(
  userId: string,
  debtId: string,
  clientName: string,
  amount: number,
  currency: string
): Promise<void> {
  await sendPushNotification(userId, 'new_debt', {
    title: 'Nouvelle créance',
    body: `Créance de ${amount} ${currency} ajoutée pour ${clientName}.`,
    url: `/debts/${debtId}`,
    id: debtId,
  });
}
