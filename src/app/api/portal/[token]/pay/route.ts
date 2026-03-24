// Portal Payment API Route - Initiate payment
import { NextRequest, NextResponse } from "next/server";
import { validatePortalToken } from "@/lib/portal/tokens";
import { db } from "@/lib/db";
import { initializeTransaction, generateReference } from "@/lib/services/paystack";

interface RouteParams {
  params: Promise<{ token: string }>;
}

interface PaymentRequest {
  debtId?: string; // If paying a specific debt
  amount: number; // Amount to pay
  email: string; // Payer email
  paymentMethod?: "card" | "mobile_money";
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    
    // Get client IP address
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
                      request.headers.get("x-real-ip") ||
                      "unknown";

    // Validate token
    const tokenResult = await validatePortalToken(token, ipAddress);

    if (!tokenResult.valid || !tokenResult.client || !tokenResult.profile) {
      return NextResponse.json(
        { error: tokenResult.error || "Invalid token" },
        { status: 401 }
      );
    }

    const body: PaymentRequest = await request.json();
    const { debtId, amount, email, paymentMethod = "card" } = body;

    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    // If debtId is provided, validate the debt
    let debt = null;
    if (debtId) {
      debt = await db.debt.findFirst({
        where: {
          id: debtId,
          clientId: tokenResult.client.id,
          status: { in: ["pending", "partial"] },
        },
      });

      if (!debt) {
        return NextResponse.json(
          { error: "Debt not found or already paid" },
          { status: 404 }
        );
      }

      // Check if amount doesn't exceed balance
      const balance = debt.amount - debt.paidAmount;
      if (amount > balance) {
        return NextResponse.json(
          { error: `Payment amount exceeds balance of ${balance} ${debt.currency}` },
          { status: 400 }
        );
      }
    }

    // Generate payment reference
    const reference = generateReference("PRT");

    // Create payment record
    const payment = await db.clientPayment.create({
      data: {
        clientId: tokenResult.client.id,
        debtId: debtId || null,
        paystackRef: reference,
        amount,
        currency: debt?.currency || "GNF",
        status: "pending",
        metadata: JSON.stringify({
          paymentMethod,
          clientEmail: email,
          clientName: tokenResult.client.name,
        }),
        portalTokenId: tokenResult.tokenData?.id,
      },
    });

    // Build callback URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${baseUrl}/portal/${token}/payment-callback?reference=${reference}`;

    // Initialize Paystack transaction
    const paystackResponse = await initializeTransaction({
      email: email || tokenResult.client.email || tokenResult.profile.email,
      amount,
      reference,
      callback_url: callbackUrl,
      metadata: {
        paymentId: payment.id,
        clientId: tokenResult.client.id,
        debtId: debtId || null,
        type: "portal_payment",
        custom_fields: [
          {
            display_name: "Client Name",
            variable_name: "client_name",
            value: tokenResult.client.name,
          },
          {
            display_name: "Payment Type",
            variable_name: "payment_type",
            value: debtId ? "Debt Payment" : "General Payment",
          },
        ],
      },
    });

    if (!paystackResponse.status) {
      // Update payment status to failed
      await db.clientPayment.update({
        where: { id: payment.id },
        data: { status: "failed" },
      });

      return NextResponse.json(
        { error: paystackResponse.message || "Failed to initialize payment" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl: paystackResponse.data.authorization_url,
        reference: paystackResponse.data.reference,
        accessCode: paystackResponse.data.access_code,
        paymentId: payment.id,
      },
    });
  } catch (error) {
    console.error("Portal payment API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
