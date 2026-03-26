import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe a specific device from push notifications
 * 
 * Body:
 * - endpoint?: string - Specific endpoint to unsubscribe
 * - subscriptionId?: string - Specific subscription ID to unsubscribe
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, subscriptionId } = body;

    // Need at least one identifier
    if (!endpoint && !subscriptionId) {
      return NextResponse.json(
        { error: 'Endpoint ou ID de subscription requis' },
        { status: 400 }
      );
    }

    // Find the subscription
    const where = endpoint
      ? { endpoint }
      : { id: subscriptionId };

    // Verify ownership
    const subscription = await db.pushSubscription.findFirst({
      where: {
        ...where,
        profileId: session.user.id,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription non trouvée' },
        { status: 404 }
      );
    }

    // Delete the subscription
    await db.pushSubscription.delete({
      where: { id: subscription.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription supprimée avec succès',
    });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/unsubscribe
 * Unsubscribe all devices from push notifications
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Delete all subscriptions for the user
    const result = await db.pushSubscription.deleteMany({
      where: { profileId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} subscription(s) supprimée(s)`,
    });
  } catch (error) {
    console.error('Error removing all push subscriptions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression des subscriptions' },
      { status: 500 }
    );
  }
}
