// Push Notification Sending Functions for RelancePro Africa
// Server-side functions for sending push notifications

import { db } from '@/lib/db';
import { 
  createPushPayload, 
  isInQuietHours,
  type PushPayload, 
  type NotificationType,
  type NotificationPreferences,
  NOTIFICATION_TYPE_CONFIG,
} from './config';

// Send result interface
export interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

// Notification data interface
export interface NotificationData {
  title?: string;
  body: string;
  url?: string;
  id: string;
  icon?: string;
  badge?: string;
  actions?: PushPayload['actions'];
}

// Send a push notification to a specific user
export async function sendPushNotification(
  userId: string,
  type: NotificationType,
  data: NotificationData
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
      return shouldSendNotificationType(sub, type);
    });

    if (eligibleSubscriptions.length === 0) {
      result.errors.push('User has disabled this notification type');
      return result;
    }

    // Filter out subscriptions in quiet hours
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

    // Send notifications
    for (const sub of activeSubscriptions) {
      try {
        // Create in-app notification
        await db.notification.create({
          data: {
            profileId: userId,
            type: getNotificationDbtype(type),
            title: payload.title,
            message: payload.body,
            actionUrl: payload.data.url,
            actionLabel: 'Voir',
          },
        });

        // TODO: Send via Web Push if web-push library is configured
        // await webpush.sendNotification({
        //   endpoint: sub.endpoint,
        //   keys: { p256dh: sub.p256dh, auth: sub.auth },
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

// Send push notification to multiple users (bulk)
export async function sendBulkPush(
  userIds: string[],
  type: NotificationType,
  data: NotificationData
): Promise<SendResult> {
  const result: SendResult = {
    success: false,
    sent: 0,
    failed: 0,
    errors: [],
  };

  for (const userId of userIds) {
    try {
      const userResult = await sendPushNotification(userId, type, data);
      result.sent += userResult.sent;
      result.failed += userResult.failed;
      result.errors.push(...userResult.errors);
    } catch (error) {
      result.failed++;
      result.errors.push(`Failed to send to user ${userId}: ${error}`);
    }
  }

  result.success = result.sent > 0;
  return result;
}

// Send push notification to all subscribers (broadcast)
export async function sendToAll(
  type: NotificationType,
  data: NotificationData
): Promise<SendResult> {
  const result: SendResult = {
    success: false,
    sent: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get all unique users with push subscriptions
    const subscriptions = await db.pushSubscription.findMany({
      where: {
        // Only active subscriptions
        profile: {
          subscriptionStatus: { in: ['active', 'demo'] },
        },
      },
      select: {
        profileId: true,
      },
      distinct: ['profileId'],
    });

    const userIds = subscriptions.map(sub => sub.profileId);

    if (userIds.length === 0) {
      result.errors.push('No active subscribers found');
      return result;
    }

    // Send to all users
    const broadcastResult = await sendBulkPush(userIds, type, data);
    return broadcastResult;
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

// Send notification with custom payload (for advanced use cases)
export async function sendCustomPushNotification(
  userId: string,
  payload: PushPayload
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

    // Send to all subscriptions
    for (const sub of subscriptions) {
      try {
        // Create in-app notification
        await db.notification.create({
          data: {
            profileId: userId,
            type: 'info',
            title: payload.title,
            message: payload.body,
            actionUrl: payload.data.url,
            actionLabel: 'Voir',
          },
        });

        result.sent++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed: ${error}`);
      }
    }

    result.success = result.sent > 0;
    return result;
  } catch (error) {
    console.error('Error sending custom notification:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

// Helper: Check if notification type should be sent based on preferences
function shouldSendNotificationType(
  sub: { 
    notifyPaymentReminders: boolean;
    notifyNewDebts: boolean;
    notifyRemindersSent: boolean;
    notifySubscription: boolean;
  },
  type: NotificationType
): boolean {
  // Map notification types to preference fields
  switch (type) {
    case 'reminder.sent':
    case 'reminder_sent':
    case 'reminder.delivered':
    case 'reminder_delivered':
    case 'client.responded':
    case 'client_responded':
      return sub.notifyRemindersSent;
    
    case 'payment.received':
    case 'payment_received':
    case 'debt.paid':
    case 'payment.overdue':
      return sub.notifyPaymentReminders;
    
    case 'debt.created':
    case 'new_debt':
      return sub.notifyNewDebts;
    
    case 'subscription.warning':
    case 'subscription_warning':
    case 'subscription.expired':
    case 'subscription_expired':
      return sub.notifySubscription;
    
    case 'daily.digest':
    case 'risk.alert':
      // These are always sent if any notification type is enabled
      return sub.notifyPaymentReminders || sub.notifyNewDebts || 
             sub.notifyRemindersSent || sub.notifySubscription;
    
    default:
      return true;
  }
}

// Helper: Get database notification type from push type
function getNotificationDbtype(type: NotificationType): 'success' | 'warning' | 'error' | 'info' {
  if (type.includes('warning') || type.includes('alert') || type.includes('overdue')) {
    return 'warning';
  }
  if (type.includes('expired')) {
    return 'error';
  }
  if (type.includes('paid') || type.includes('received')) {
    return 'success';
  }
  return 'info';
}

// Convenience functions for specific notification types

// Notify when a new debt is created
export async function notifyDebtCreated(
  userId: string,
  debtId: string,
  clientName: string,
  amount: number,
  currency: string
): Promise<SendResult> {
  return sendPushNotification(userId, 'debt.created', {
    title: 'Nouvelle créance',
    body: `Créance de ${formatCurrency(amount, currency)} ajoutée pour ${clientName}.`,
    url: `/debts/${debtId}`,
    id: debtId,
  });
}

// Notify when a debt is paid
export async function notifyDebtPaid(
  userId: string,
  debtId: string,
  clientName: string,
  amount: number,
  currency: string
): Promise<SendResult> {
  return sendPushNotification(userId, 'debt.paid', {
    title: 'Créance payée',
    body: `${clientName} a payé ${formatCurrency(amount, currency)}.`,
    url: `/debts/${debtId}`,
    id: debtId,
  });
}

// Notify when a reminder is sent
export async function notifyReminderSent(
  userId: string,
  debtId: string,
  clientName: string,
  channel: 'email' | 'whatsapp'
): Promise<SendResult> {
  return sendPushNotification(userId, 'reminder.sent', {
    title: 'Relance envoyée',
    body: `Votre relance par ${channel} à ${clientName} a été envoyée.`,
    url: `/debts/${debtId}`,
    id: debtId,
  });
}

// Notify when a payment is overdue
export async function notifyPaymentOverdue(
  userId: string,
  debtId: string,
  clientName: string,
  amount: number,
  currency: string,
  daysOverdue: number
): Promise<SendResult> {
  return sendPushNotification(userId, 'payment.overdue', {
    title: 'Paiement en retard',
    body: `La créance de ${formatCurrency(amount, currency)} de ${clientName} a ${daysOverdue} jour(s) de retard.`,
    url: `/debts/${debtId}`,
    id: debtId,
  });
}

// Notify daily digest
export async function sendDailyDigest(
  userId: string,
  stats: {
    totalDebts: number;
    overdueDebts: number;
    paymentsToday: number;
    remindersSent: number;
  }
): Promise<SendResult> {
  return sendPushNotification(userId, 'daily.digest', {
    title: 'Résumé quotidien',
    body: `${stats.totalDebts} créances, ${stats.overdueDebts} en retard, ${stats.paymentsToday} paiements aujourd'hui, ${stats.remindersSent} relances envoyées.`,
    url: '/dashboard',
    id: `digest-${new Date().toISOString().split('T')[0]}`,
  });
}

// Notify risk alert
export async function sendRiskAlert(
  userId: string,
  clientId: string,
  clientName: string,
  riskLevel: 'high' | 'critical',
  reason: string
): Promise<SendResult> {
  return sendPushNotification(userId, 'risk.alert', {
    title: `Alerte de risque ${riskLevel === 'critical' ? 'critique' : 'élevé'}`,
    body: `${clientName}: ${reason}`,
    url: `/clients/${clientId}`,
    id: `risk-${clientId}`,
  });
}

// Helper: Format currency
function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
}
