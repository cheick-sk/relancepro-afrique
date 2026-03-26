import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyTransaction } from "@/lib/services/paystack";

// Webhook Paystack pour les notifications de paiement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = body.event;
    const data = body.data;

    // Vérifier la signature (en production, utiliser crypto pour vérifier)
    // const signature = request.headers.get("x-paystack-signature");

    console.log("Paystack webhook:", event);

    switch (event) {
      case "charge.success": {
        const reference = data.reference;
        const metadata = data.metadata || {};
        const profileId = metadata.profileId as string;
        const plan = metadata.plan as string;

        if (!profileId) {
          console.error("No profileId in metadata");
          return NextResponse.json({ error: "Missing profileId" }, { status: 400 });
        }

        // Vérifier la transaction
        const verification = await verifyTransaction(reference);

        if (verification.status && verification.data.status === "success") {
          // Créer l'enregistrement de paiement
          await db.payment.create({
            data: {
              profileId,
              paystackRef: reference,
              paystackTransId: verification.data.id.toString(),
              amount: verification.data.amount / 100, // Convertir depuis centimes
              currency: verification.data.currency,
              status: "success",
              plan,
              paidAt: new Date(),
            },
          });

          // Mettre à jour le profil
          const subscriptionEnd = plan === "yearly"
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          await db.profile.update({
            where: { id: profileId },
            data: {
              subscriptionStatus: "active",
              subscriptionPlan: plan,
              subscriptionEnd,
              paystackCustomerId: data.customer?.customer_code,
            },
          });
        }
        break;
      }

      case "subscription.create":
      case "subscription.enable": {
        // Activer l'abonnement
        const customerCode = data.customer?.customer_code;
        if (customerCode) {
          await db.profile.updateMany({
            where: { paystackCustomerId: customerCode },
            data: {
              subscriptionStatus: "active",
            },
          });
        }
        break;
      }

      case "subscription.disable":
      case "subscription.expired": {
        // Désactiver l'abonnement
        const customerCode = data.customer?.customer_code;
        if (customerCode) {
          await db.profile.updateMany({
            where: { paystackCustomerId: customerCode },
            data: {
              subscriptionStatus: "expired",
            },
          });
        }
        break;
      }

      default:
        console.log("Unhandled event:", event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
