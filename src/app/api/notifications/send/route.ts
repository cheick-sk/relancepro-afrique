import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import {
  sendPushNotification,
  sendBroadcastNotification,
  sendPaymentReminder,
  sendWeeklyDigest,
  NOTIFICATION_TYPES,
  type NotificationType,
  type PushNotificationPayload,
} from '@/lib/notifications/push-service';
import { db } from '@/lib/db';

/**
 * Notification type validation
 */
const VALID_NOTIFICATION_TYPES: NotificationType[] = [
  NOTIFICATION_TYPES.PAYMENT_RECEIVED,
  NOTIFICATION_TYPES.REMINDER_SENT,
  NOTIFICATION_TYPES.DEBT_OVERDUE,
  NOTIFICATION_TYPES.CLIENT_RESPONDED,
  NOTIFICATION_TYPES.WEEKLY_SUMMARY,
  NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING,
];

/**
 * POST /api/notifications/send
 * Send a push notification
 * 
 * Body:
 * - userId?: string - Target user ID (defaults to current user)
 * - broadcast?: boolean - Send to all users
 * - type?: NotificationType - Notification type for template
 * - notification: PushNotificationPayload - Notification content
 * 
 * Special types:
 * - payment_reminder: Send payment reminder (requires debtId)
 * - weekly_digest: Send weekly digest (auto-generates content)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      broadcast = false,
      type,
      notification,
      // Special type-specific data
      debtId,
      debtInfo,
    } = body;

    // Broadcast notifications require admin role
    if (broadcast && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Seuls les administrateurs peuvent envoyer des notifications broadcast' },
        { status: 403 }
      );
    }

    // Validate notification type if provided
    if (type && !VALID_NOTIFICATION_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Type de notification invalide. Types valides: ${VALID_NOTIFICATION_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Handle broadcast
    if (broadcast) {
      if (!notification?.title || !notification?.body) {
        return NextResponse.json(
          { error: 'Le titre et le corps de la notification sont requis' },
          { status: 400 }
        );
      }

      const result = await sendBroadcastNotification(notification);
      return NextResponse.json({
        success: result.success,
        totalUsers: result.totalUsers,
        sent: result.sent,
        failed: result.failed,
      });
    }

    // Determine target user
    const targetUserId = userId || session.user.id;

    // Only admins can send to other users
    if (targetUserId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Non autorisé à envoyer des notifications à cet utilisateur' },
        { status: 403 }
      );
    }

    // Handle payment reminder
    if (type === 'payment_reminder' && debtId) {
      // Fetch debt info
      const debt = await db.debt.findFirst({
        where: {
          id: debtId,
          profileId: targetUserId,
        },
        include: {
          client: true,
        },
      });

      if (!debt) {
        return NextResponse.json(
          { error: 'Créance non trouvée' },
          { status: 404 }
        );
      }

      const result = await sendPaymentReminder(targetUserId, {
        id: debt.id,
        clientName: debt.client.name,
        amount: debt.amount,
        currency: debt.currency,
        reference: debt.reference || undefined,
        daysOverdue: Math.floor((Date.now() - debt.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
      });

      return NextResponse.json({
        success: result.success,
        sent: result.sent,
        failed: result.failed,
      });
    }

    // Handle weekly digest
    if (type === 'weekly_digest') {
      // Calculate weekly stats
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [debts, reminders, payments] = await Promise.all([
        // Active debts
        db.debt.count({
          where: {
            profileId: targetUserId,
            status: 'pending',
          },
        }),
        // Reminders sent this week
        db.reminder.count({
          where: {
            profileId: targetUserId,
            createdAt: { gte: oneWeekAgo },
          },
        }),
        // Get total debt amount
        db.debt.aggregate({
          where: {
            profileId: targetUserId,
            status: 'pending',
          },
          _sum: { amount: true },
        }),
      ]);

      // Get user's preferred currency
      const user = await db.profile.findUnique({
        where: { id: targetUserId },
        select: { preferredCurrency: true },
      });

      const result = await sendWeeklyDigest(targetUserId, {
        totalDebts: debts,
        totalAmount: payments._sum.amount || 0,
        currency: user?.preferredCurrency || 'GNF',
        remindersSent: reminders,
        paymentsReceived: 0, // Would need payment tracking
        amountCollected: 0, // Would need payment tracking
        newClients: 0, // Would need client tracking
      });

      return NextResponse.json({
        success: result.success,
        sent: result.sent,
        failed: result.failed,
      });
    }

    // Standard notification
    if (!notification?.title || !notification?.body) {
      return NextResponse.json(
        { error: 'Le titre et le corps de la notification sont requis' },
        { status: 400 }
      );
    }

    // Add type to notification data if provided
    const notificationPayload: PushNotificationPayload = {
      ...notification,
      data: {
        ...notification.data,
        type: type || notification.data?.type,
      },
    };

    const result = await sendPushNotification(targetUserId, notificationPayload);

    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de la notification' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/send
 * Get notification history for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type');
    const unreadOnly = searchParams.get('unread') === 'true';

    // Build where clause
    const where: Record<string, unknown> = {
      profileId: session.user.id,
    };

    if (type) {
      where.type = type;
    }

    if (unreadOnly) {
      where.read = false;
    }

    // Get notifications
    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.notification.count({ where }),
      db.notification.count({
        where: {
          profileId: session.user.id,
          read: false,
        },
      }),
    ]);

    return NextResponse.json({
      notifications,
      total,
      unreadCount,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    );
  }
}
