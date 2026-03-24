import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { handleSupportChat } from "@/lib/services/ai-service";
import { db } from "@/lib/db";

// Chat history storage key (in production, use Redis or database)
const chatHistories = new Map<string, Array<{ role: "user" | "assistant"; content: string }>>();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { message, context, clearHistory } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message requis" },
        { status: 400 }
      );
    }

    // Get profile for context
    const profile = await db.profile.findUnique({
      where: { id: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profil non trouvé" },
        { status: 404 }
      );
    }

    // Handle history clearing
    if (clearHistory) {
      chatHistories.delete(session.user.id);
      return NextResponse.json({ message: "Historique effacé" });
    }

    // Get or initialize chat history
    let history = chatHistories.get(session.user.id) || [];
    
    // Limit history to last 20 messages
    if (history.length > 20) {
      history = history.slice(-20);
    }

    // Get client context if provided
    let clientContext = null;
    if (context?.clientId) {
      clientContext = await db.client.findFirst({
        where: {
          id: context.clientId,
          profileId: session.user.id,
        },
      });
    }

    // Get debt context if provided
    let debtContext = null;
    if (context?.debtId) {
      debtContext = await db.debt.findFirst({
        where: {
          id: context.debtId,
          profileId: session.user.id,
        },
        include: { client: true },
      });
    }

    // Handle chat with AI
    const response = await handleSupportChat(message, {
      profile,
      client: clientContext || undefined,
      debt: debtContext || undefined,
      history,
      language: (profile.preferredLanguage as 'fr' | 'en') || 'fr',
    });

    // Update history
    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: response.message });
    chatHistories.set(session.user.id, history);

    return NextResponse.json(response);
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement du message" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve chat history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const history = chatHistories.get(session.user.id) || [];
    
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Get chat history error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'historique" },
      { status: 500 }
    );
  }
}

// DELETE endpoint to clear chat history
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    chatHistories.delete(session.user.id);
    
    return NextResponse.json({ message: "Historique effacé" });
  } catch (error) {
    console.error("Clear chat history error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'effacement de l'historique" },
      { status: 500 }
    );
  }
}
