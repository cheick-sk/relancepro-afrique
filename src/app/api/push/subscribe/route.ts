import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";

// POST - Enregistrer une nouvelle subscription push
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, p256dh, auth, userAgent, deviceType, notifyReminders, notifyPayments, notifyAlerts } = body;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Les informations de subscription sont incomplètes" },
        { status: 400 }
      );
    }

    // Vérifier si cette subscription existe déjà
    const existing = await db.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing) {
      // Mettre à jour la subscription existante
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
        },
      });
      return NextResponse.json(updated);
    }

    // Créer une nouvelle subscription
    const subscription = await db.pushSubscription.create({
      data: {
        profileId: session.user.id,
        endpoint,
        p256dh,
        auth,
        userAgent,
        deviceType,
        notifyReminders: notifyReminders ?? true,
        notifyPayments: notifyPayments ?? true,
        notifyAlerts: notifyAlerts ?? true,
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error saving push subscription:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de la subscription" },
      { status: 500 }
    );
  }
}

// GET - Récupérer les subscriptions de l'utilisateur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const subscriptions = await db.pushSubscription.findMany({
      where: { profileId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error("Error fetching push subscriptions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des subscriptions" },
      { status: 500 }
    );
  }
}
