import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { 
  subscribeUser, 
  unsubscribeUser, 
  getUserSubscriptions,
  getUserPreferences,
  updateUserPreferences,
  type PushSubscriptionData,
  type NotificationPreferences,
} from "@/lib/push/service";
import { getVapidConfig } from "@/lib/push/config";

// POST - Save push subscription
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      endpoint, 
      p256dh, 
      auth, 
      userAgent, 
      deviceType,
      // Preferences
      notifyPaymentReminders,
      notifyNewDebts,
      notifyRemindersSent,
      notifySubscription,
      soundEnabled,
      quietHoursStart,
      quietHoursEnd,
    } = body;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Les informations de subscription sont incomplètes" },
        { status: 400 }
      );
    }

    const subscriptionData: PushSubscriptionData = {
      endpoint,
      p256dh,
      auth,
      userAgent,
      deviceType,
    };

    const preferences: Partial<NotificationPreferences> = {
      paymentReminders: notifyPaymentReminders,
      newDebts: notifyNewDebts,
      remindersSent: notifyRemindersSent,
      subscription: notifySubscription,
      soundEnabled,
      quietHoursStart,
      quietHoursEnd,
    };

    const result = await subscribeUser(session.user.id, subscriptionData, preferences);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erreur lors de l'enregistrement" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      subscriptionId: result.subscriptionId 
    });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de la subscription" },
      { status: 500 }
    );
  }
}

// GET - Get user's subscriptions and preferences
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const subscriptions = await getUserSubscriptions(session.user.id);
    const preferences = await getUserPreferences(session.user.id);
    const vapidConfig = getVapidConfig();

    return NextResponse.json({
      subscriptions,
      preferences,
      vapidPublicKey: vapidConfig.publicKey,
    });
  } catch (error) {
    console.error("Error fetching push subscriptions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des subscriptions" },
      { status: 500 }
    );
  }
}

// DELETE - Remove subscription(s)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");

    const result = await unsubscribeUser(session.user.id, endpoint || undefined);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erreur lors de la suppression" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing push subscription:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la subscription" },
      { status: 500 }
    );
  }
}

// PUT - Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const preferences: Partial<NotificationPreferences> = {
      paymentReminders: body.notifyPaymentReminders,
      newDebts: body.notifyNewDebts,
      remindersSent: body.notifyRemindersSent,
      subscription: body.notifySubscription,
      soundEnabled: body.soundEnabled,
      quietHoursStart: body.quietHoursStart,
      quietHoursEnd: body.quietHoursEnd,
    };

    const result = await updateUserPreferences(session.user.id, preferences);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating push preferences:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des préférences" },
      { status: 500 }
    );
  }
}
