import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { 
  sendPushNotification, 
  broadcastNotification,
  type NotificationType,
} from "@/lib/push/service";
import { type PushPayload } from "@/lib/push/config";

interface SendNotificationBody {
  userId?: string;
  userIds?: string[];
  type: NotificationType;
  payload: {
    title?: string;
    body: string;
    url?: string;
    id: string;
    actions?: PushPayload['actions'];
  };
}

// POST - Send push notification to user(s)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body: SendNotificationBody = await request.json();
    const { userId, userIds, type, payload } = body;

    // Validate required fields
    if (!type || !payload || !payload.body || !payload.id) {
      return NextResponse.json(
        { error: "Type, payload.body et payload.id sont obligatoires" },
        { status: 400 }
      );
    }

    // Determine target users
    let targetUserIds: string[] = [];
    
    if (userIds && Array.isArray(userIds)) {
      // Admin can send to multiple users
      if (session.user.role !== "admin") {
        return NextResponse.json(
          { error: "Seuls les administrateurs peuvent envoyer à plusieurs utilisateurs" },
          { status: 403 }
        );
      }
      targetUserIds = userIds;
    } else if (userId) {
      // Can only send to self (unless admin)
      if (userId !== session.user.id && session.user.role !== "admin") {
        return NextResponse.json(
          { error: "Non autorisé à envoyer à cet utilisateur" },
          { status: 403 }
        );
      }
      targetUserIds = [userId];
    } else {
      // Default to current user
      targetUserIds = [session.user.id];
    }

    let result;
    
    if (targetUserIds.length === 1) {
      result = await sendPushNotification(targetUserIds[0], type, payload);
    } else {
      result = await broadcastNotification(targetUserIds, type, payload);
    }

    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de la notification" },
      { status: 500 }
    );
  }
}

// GET - Get supported notification types (for admin UI)
export async function GET() {
  const notificationTypes: Array<{
    type: NotificationType;
    title: string;
    description: string;
  }> = [
    {
      type: "reminder_sent",
      title: "Relance envoyée",
      description: "Notification quand une relance est envoyée avec succès",
    },
    {
      type: "reminder_delivered",
      title: "Relance délivrée",
      description: "Notification quand une relance est délivrée au client",
    },
    {
      type: "payment_received",
      title: "Paiement reçu",
      description: "Notification quand un paiement est enregistré",
    },
    {
      type: "new_debt",
      title: "Nouvelle créance",
      description: "Notification quand une nouvelle créance est ajoutée",
    },
    {
      type: "client_responded",
      title: "Réponse client",
      description: "Notification quand un client répond à une relance",
    },
    {
      type: "subscription_warning",
      title: "Avertissement abonnement",
      description: "Notification quand l'abonnement expire bientôt",
    },
    {
      type: "subscription_expired",
      title: "Abonnement expiré",
      description: "Notification quand l'abonnement a expiré",
    },
  ];

  return NextResponse.json({ notificationTypes });
}
