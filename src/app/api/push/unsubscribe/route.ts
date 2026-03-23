import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { unsubscribeUser } from "@/lib/push/service";

// POST - Unsubscribe from push notifications (specific endpoint)
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

    const result = await unsubscribeUser(session.user.id, endpoint);

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

// DELETE - Unsubscribe from all push notifications
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const result = await unsubscribeUser(session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erreur lors de la suppression" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing all push subscriptions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression des subscriptions" },
      { status: 500 }
    );
  }
}
