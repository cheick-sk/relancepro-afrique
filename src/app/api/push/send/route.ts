import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";

// POST - Envoyer une notification push
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, payload } = body;

    // Vérifier que l'utilisateur envoie à lui-même ou est admin
    if (userId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Récupérer toutes les subscriptions actives de l'utilisateur
    const subscriptions = await db.pushSubscription.findMany({
      where: { profileId: userId },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: "Aucune subscription active trouvée" },
        { status: 404 }
      );
    }

    // Pour chaque subscription, on enverrait la notification push
    // En production, il faudrait utiliser une librairie comme web-push
    // Pour l'instant, on crée juste une notification en base de données
    
    const notification = await db.notification.create({
      data: {
        profileId: userId,
        type: payload.type || "info",
        title: payload.title,
        message: payload.body,
        actionUrl: payload.data?.url,
        actionLabel: payload.data?.actionLabel,
      },
    });

    // TODO: Envoyer via Web Push si configuré
    // Pour chaque subscription:
    // await webpush.sendNotification(subscription, JSON.stringify(payload));

    return NextResponse.json({
      success: true,
      notification,
      subscriptionCount: subscriptions.length,
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de la notification" },
      { status: 500 }
    );
  }
}
