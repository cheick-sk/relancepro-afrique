import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";

// POST - Supprimer une subscription push
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "L'endpoint de la subscription est requis" },
        { status: 400 }
      );
    }

    // Vérifier que la subscription appartient à l'utilisateur
    const subscription = await db.pushSubscription.findFirst({
      where: {
        endpoint,
        profileId: session.user.id,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription non trouvée" },
        { status: 404 }
      );
    }

    // Supprimer la subscription
    await db.pushSubscription.delete({
      where: { endpoint },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing push subscription:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la subscription" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer toutes les subscriptions de l'utilisateur
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    await db.pushSubscription.deleteMany({
      where: { profileId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing all push subscriptions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression des subscriptions" },
      { status: 500 }
    );
  }
}
