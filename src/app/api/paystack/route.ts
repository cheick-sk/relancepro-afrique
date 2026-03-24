import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import {
  initializeTransaction,
  generateReference,
  PAYSTACK_PLANS,
  isPaystackConfigured,
} from "@/lib/services/paystack";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si Paystack est configuré
    if (!isPaystackConfigured()) {
      return NextResponse.json({
        success: false,
        error: "Paiement non configuré - Mode démo",
        demo: true,
        mockUrl: "/subscription?demo=success",
      });
    }

    const body = await request.json();
    const { plan } = body as { plan: "monthly" | "yearly" };

    if (!plan || !PAYSTACK_PLANS[plan]) {
      return NextResponse.json(
        { error: "Plan invalide" },
        { status: 400 }
      );
    }

    const planDetails = PAYSTACK_PLANS[plan];
    const reference = generateReference("RP");

    // URL de callback
    const callbackUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/paystack/verify?reference=${reference}`;

    // Initialiser la transaction
    const result = await initializeTransaction({
      email: session.user.email,
      amount: planDetails.amount,
      reference,
      callback_url: callbackUrl,
      metadata: {
        profileId: session.user.id,
        plan,
        userEmail: session.user.email,
      },
    });

    if (!result.status) {
      return NextResponse.json(
        { error: result.message || "Erreur lors de l'initialisation" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      authorizationUrl: result.data.authorization_url,
      reference: result.data.reference,
    });
  } catch (error) {
    console.error("Payment initialization error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'initialisation du paiement" },
      { status: 500 }
    );
  }
}
