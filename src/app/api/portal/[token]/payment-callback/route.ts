// Portal Payment Callback Route - Handle Paystack callback
import { NextRequest, NextResponse } from "next/server";
import { validatePortalToken } from "@/lib/portal/tokens";
import { db } from "@/lib/db";
import { verifyTransaction } from "@/lib/services/paystack";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");
    const trxref = searchParams.get("trxref");

    // Validate token (we don't want to block the callback, just log access)
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
                      request.headers.get("x-real-ip") ||
                      "unknown";

    await validatePortalToken(token, ipAddress);

    // Check if we have a reference
    if (!reference && !trxref) {
      return redirectToPortal(token, "error", "No payment reference provided");
    }

    const paymentRef = reference || trxref;

    // Find the payment record
    const payment = await db.clientPayment.findUnique({
      where: { paystackRef: paymentRef },
      include: {
        client: {
          include: {
            profile: true,
          },
        },
        debt: true,
      },
    });

    if (!payment) {
      return redirectToPortal(token, "error", "Payment record not found");
    }

    // If payment is already successful, redirect with success
    if (payment.status === "success") {
      return redirectToPortal(token, "success", "Payment already processed");
    }

    // Verify transaction with Paystack
    const verification = await verifyTransaction(paymentRef);

    if (!verification.status) {
      await db.clientPayment.update({
        where: { id: payment.id },
        data: {
          status: "failed",
          metadata: JSON.stringify({
            ...JSON.parse(payment.metadata || "{}"),
            verificationError: verification.message,
          }),
        },
      });

      return redirectToPortal(token, "error", verification.message || "Payment verification failed");
    }

    const paystackData = verification.data;

    // Check if payment was successful
    if (paystackData.status !== "success") {
      await db.clientPayment.update({
        where: { id: payment.id },
        data: {
          status: paystackData.status === "failed" ? "failed" : "pending",
          paystackTransId: paystackData.id.toString(),
          metadata: JSON.stringify({
            ...JSON.parse(payment.metadata || "{}"),
            paystackStatus: paystackData.status,
          }),
        },
      });

      return redirectToPortal(token, "error", `Payment ${paystackData.status}`);
    }

    // Payment was successful - update records
    const paidAmount = paystackData.amount / 100; // Convert from kobo/cents

    // Update payment record
    await db.clientPayment.update({
      where: { id: payment.id },
      data: {
        status: "success",
        paystackTransId: paystackData.id.toString(),
        paidAt: new Date(paystackData.paid_at),
        paymentMethod: paystackData.channel || "card",
        metadata: JSON.stringify({
          ...JSON.parse(payment.metadata || "{}"),
          paystackData: {
            channel: paystackData.channel,
            authorization: paystackData.authorization,
            customer: paystackData.customer,
          },
        }),
      },
    });

    // If this was a debt payment, update the debt
    if (payment.debtId && payment.debt) {
      const debt = payment.debt;
      const newPaidAmount = debt.paidAmount + paidAmount;
      const newStatus = newPaidAmount >= debt.amount ? "paid" : "partial";

      await db.debt.update({
        where: { id: debt.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          paidDate: newStatus === "paid" ? new Date() : null,
        },
      });

      // Create notification for the creditor
      await db.notification.create({
        data: {
          profileId: payment.client.profileId,
          type: "success",
          title: "Paiement reçu",
          message: `${payment.client.name} a effectué un paiement de ${paidAmount} ${payment.currency}${debt.reference ? ` pour la facture ${debt.reference}` : ""}`,
          actionUrl: `/clients/${payment.clientId}`,
          actionLabel: "Voir le client",
        },
      });
    } else {
      // General payment - create notification
      await db.notification.create({
        data: {
          profileId: payment.client.profileId,
          type: "success",
          title: "Paiement reçu",
          message: `${payment.client.name} a effectué un paiement de ${paidAmount} ${payment.currency}`,
          actionUrl: `/clients/${payment.clientId}`,
          actionLabel: "Voir le client",
        },
      });
    }

    // Send confirmation email (if configured)
    try {
      const { sendEmail } = await import("@/lib/services/email");
      const clientEmail = payment.client.email || JSON.parse(payment.metadata || "{}")?.clientEmail;
      
      if (clientEmail) {
        await sendEmail({
          to: clientEmail,
          subject: `Confirmation de paiement - ${payment.client.profile.companyName || "RelancePro"}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #22c55e;">Paiement confirmé</h2>
              <p>Bonjour ${payment.client.name},</p>
              <p>Nous confirmons la réception de votre paiement de <strong>${paidAmount} ${payment.currency}</strong>.</p>
              ${payment.debt?.reference ? `<p>Référence facture: ${payment.debt.reference}</p>` : ""}
              <p>Référence de transaction: ${paymentRef}</p>
              <p>Date: ${new Date().toLocaleDateString("fr-FR")}</p>
              <br/>
              <p>Merci pour votre paiement.</p>
              <p>${payment.client.profile.companyName || "L'équipe"}</p>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't fail the callback if email fails
    }

    return redirectToPortal(token, "success", "Payment successful");
  } catch (error) {
    console.error("Portal payment callback error:", error);
    return redirectToPortal(params ? await params.then((p) => p.token) : "", "error", "Internal server error");
  }
}

function redirectToPortal(token: string, status: string, message: string): NextResponse {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUrl = `${baseUrl}/portal/${token}?payment_status=${status}&message=${encodeURIComponent(message)}`;
  
  return NextResponse.redirect(redirectUrl);
}
