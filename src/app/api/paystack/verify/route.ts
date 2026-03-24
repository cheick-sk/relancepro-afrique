import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { verifyTransaction, calculateSubscriptionEnd } from "@/lib/services/paystack";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json(
        { error: "Référence manquante" },
        { status: 400 }
      );
    }

    // Vérifier la transaction
    const verification = await verifyTransaction(reference);

    if (!verification.status) {
      return NextResponse.json(
        { error: "Échec de la vérification", details: verification.message },
        { status: 400 }
      );
    }

    const { data } = verification;
    const plan = data.metadata?.plan as string | undefined;

    if (data.status === "success") {
      // Créer l'enregistrement de paiement
      await db.payment.create({
        data: {
          profileId: session.user.id,
          paystackRef: reference,
          paystackTransId: data.id.toString(),
          amount: data.amount / 100,
          currency: data.currency,
          status: "success",
          plan,
          paidAt: new Date(data.paid_at),
        },
      });

      // Mettre à jour le profil
      const subscriptionEnd = plan
        ? calculateSubscriptionEnd(plan as "monthly" | "yearly")
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.profile.update({
        where: { id: session.user.id },
        data: {
          subscriptionStatus: "active",
          subscriptionPlan: plan || "monthly",
          subscriptionEnd,
          paystackCustomerId: data.customer?.customer_code,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Paiement vérifié avec succès",
        subscription: {
          status: "active",
          plan,
          end: subscriptionEnd,
        },
      });
    } else {
      // Enregistrer l'échec
      await db.payment.create({
        data: {
          profileId: session.user.id,
          paystackRef: reference,
          amount: data.amount / 100,
          currency: data.currency,
          status: "failed",
          plan,
        },
      });

      return NextResponse.json(
        { error: "Paiement non réussi", status: data.status },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
}
