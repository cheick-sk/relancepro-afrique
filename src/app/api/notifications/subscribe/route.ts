import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { getVapidPublicKey } from '@/lib/notifications/push-config';

/**
 * DELETE /api/notifications/subscribe
 * Remove a specific push subscription by ID
 * 
 * Query params:
 * - subscriptionId: string - ID of the subscription to remove
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'ID de subscription requis' },
        { status: 400 }
      );
    }

    // Verify ownership and delete
    const subscription = await db.pushSubscription.findFirst({
      where: {
        id: subscriptionId,
        profileId: session.user.id,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription non trouvée' },
        { status: 404 }
      );
    }

    await db.pushSubscription.delete({
      where: { id: subscriptionId },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription supprimée avec succès',
    });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la subscription' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/subscribe
 * Subscribe to push notifications
 * 
 * Body:
 * - endpoint: string (required) - Push subscription endpoint URL
 * - p256dh: string (required) - ECDH public key
 * - auth: string (required) - Authentication secret
 * - userAgent?: string - Browser user agent
 * - deviceType?: 'desktop' | 'mobile' | 'tablet' - Device type
 * - notifyReminders?: boolean - Receive reminder notifications
 * - notifyPayments?: boolean - Receive payment notifications
 * - notifyAlerts?: boolean - Receive alert notifications
 * - notifyWeeklyDigest?: boolean - Receive weekly digest
 * - quietHoursEnabled?: boolean - Enable quiet hours
 * - quietHoursStart?: string - Quiet hours start time (HH:MM)
 * - quietHoursEnd?: string - Quiet hours end time (HH:MM)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const {
      endpoint,
      p256dh,
      auth,
      userAgent,
      deviceType,
      notifyReminders = true,
      notifyPayments = true,
      notifyAlerts = true,
      notifyWeeklyDigest = false,
      quietHoursEnabled = false,
      quietHoursStart,
      quietHoursEnd,
    } = body;

    // Validate required fields
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: 'Les informations de subscription sont incomplètes' },
        { status: 400 }
      );
    }

    // Check if this subscription already exists
    const existing = await db.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing) {
      // Update existing subscription
      const updated = await db.pushSubscription.update({
        where: { endpoint },
        data: {
          p256dh,
          auth,
          userAgent: userAgent || existing.userAgent,
          deviceType: deviceType || existing.deviceType,
          notifyReminders: notifyReminders ?? existing.notifyReminders,
          notifyPayments: notifyPayments ?? existing.notifyPayments,
          notifyAlerts: notifyAlerts ?? existing.notifyAlerts,
          notifyWeeklyDigest: notifyWeeklyDigest ?? existing.notifyWeeklyDigest,
          quietHoursEnabled: quietHoursEnabled ?? existing.quietHoursEnabled,
          quietHoursStart: quietHoursStart ?? existing.quietHoursStart,
          quietHoursEnd: quietHoursEnd ?? existing.quietHoursEnd,
          active: true, // Reactivate if was inactive
          updatedAt: new Date(),
        },
      });
      return NextResponse.json({
        success: true,
        subscription: updated,
        message: 'Subscription mise à jour',
      });
    }

    // Create new subscription
    const subscription = await db.pushSubscription.create({
      data: {
        profileId: session.user.id,
        endpoint,
        p256dh,
        auth,
        userAgent,
        deviceType,
        notifyReminders,
        notifyPayments,
        notifyAlerts,
        notifyWeeklyDigest,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
      },
    });

    return NextResponse.json({
      success: true,
      subscription,
      message: 'Subscription créée avec succès',
    });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement de la subscription' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/subscribe
 * Get user's push subscriptions and VAPID public key
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Get user's subscriptions
    const subscriptions = await db.pushSubscription.findMany({
      where: { profileId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        endpoint: true,
        deviceType: true,
        userAgent: true,
        notifyReminders: true,
        notifyPayments: true,
        notifyAlerts: true,
        notifyWeeklyDigest: true,
        quietHoursEnabled: true,
        quietHoursStart: true,
        quietHoursEnd: true,
        active: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      subscriptions,
      vapidPublicKey: getVapidPublicKey(),
    });
  } catch (error) {
    console.error('Error fetching push subscriptions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des subscriptions' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/subscribe
 * Update subscription preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { subscriptionId, ...updates } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'ID de subscription requis' },
        { status: 400 }
      );
    }

    // Verify ownership
    const subscription = await db.pushSubscription.findFirst({
      where: {
        id: subscriptionId,
        profileId: session.user.id,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription non trouvée' },
        { status: 404 }
      );
    }

    // Update subscription
    const updated = await db.pushSubscription.update({
      where: { id: subscriptionId },
      data: {
        notifyReminders: updates.notifyReminders,
        notifyPayments: updates.notifyPayments,
        notifyAlerts: updates.notifyAlerts,
        notifyWeeklyDigest: updates.notifyWeeklyDigest,
        quietHoursEnabled: updates.quietHoursEnabled,
        quietHoursStart: updates.quietHoursStart,
        quietHoursEnd: updates.quietHoursEnd,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: updated,
    });
  } catch (error) {
    console.error('Error updating push subscription:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la subscription' },
      { status: 500 }
    );
  }
}
