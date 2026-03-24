// API pour les webhooks externes
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Webhook endpoints pour intégrations externes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data, signature } = body;

    // Verify webhook signature (implement based on your security needs)
    // const isValid = verifyWebhookSignature(signature, body);
    // if (!isValid) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    // Handle different webhook events
    switch (event) {
      case "payment.success":
        // External payment notification
        await handlePaymentWebhook(data);
        break;

      case "client.created":
        // Client created from external system
        await handleClientCreatedWebhook(data);
        break;

      case "debt.paid":
        // Debt paid from external system
        await handleDebtPaidWebhook(data);
        break;

      default:
        console.log("Unknown webhook event:", event);
    }

    return NextResponse.json({ received: true, event });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Get registered webhooks for a profile
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");

  if (!profileId) {
    return NextResponse.json({ error: "profileId required" }, { status: 400 });
  }

  // Return registered webhooks (implement storage as needed)
  return NextResponse.json({
    webhooks: [
      {
        id: "wh_1",
        url: "https://example.com/webhook",
        events: ["payment.success", "debt.paid"],
        active: true,
      },
    ],
  });
}

// Register a new webhook
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, url, events, secret } = body;

    if (!profileId || !url || !events) {
      return NextResponse.json(
        { error: "profileId, url, and events are required" },
        { status: 400 }
      );
    }

    // Store webhook configuration (implement storage as needed)
    const webhook = {
      id: `wh_${Date.now()}`,
      profileId,
      url,
      events,
      secret,
      active: true,
      createdAt: new Date(),
    };

    return NextResponse.json(webhook);
  } catch (error) {
    console.error("Webhook registration error:", error);
    return NextResponse.json(
      { error: "Failed to register webhook" },
      { status: 500 }
    );
  }
}

// Delete a webhook
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const webhookId = searchParams.get("id");

  if (!webhookId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Delete webhook (implement storage as needed)
  return NextResponse.json({ deleted: true, id: webhookId });
}

// Helper functions
async function handlePaymentWebhook(data: Record<string, unknown>) {
  const { profileId, debtId, amount, reference } = data;

  if (!profileId || !debtId) return;

  // Update debt payment
  await db.debt.update({
    where: { id: debtId as string },
    data: {
      paidAmount: { increment: amount as number },
      status: "partial", // Will be updated to 'paid' if fully paid
    },
  });
}

async function handleClientCreatedWebhook(data: Record<string, unknown>) {
  const { profileId, name, email, phone, company } = data;

  if (!profileId || !name) return;

  // Create client
  await db.client.create({
    data: {
      profileId: profileId as string,
      name: name as string,
      email: email as string | null,
      phone: phone as string | null,
      company: company as string | null,
    },
  });
}

async function handleDebtPaidWebhook(data: Record<string, unknown>) {
  const { debtId, paidAmount, paidDate } = data;

  if (!debtId) return;

  const debt = await db.debt.findUnique({
    where: { id: debtId as string },
  });

  if (!debt) return;

  const newPaidAmount = (debt.paidAmount || 0) + (paidAmount as number || 0);
  const status = newPaidAmount >= debt.amount ? "paid" : "partial";

  await db.debt.update({
    where: { id: debtId as string },
    data: {
      paidAmount: newPaidAmount,
      status,
      paidDate: status === "paid" ? new Date(paidDate as string) : null,
    },
  });
}

// Trigger webhook to external URL
export async function triggerWebhook(
  url: string,
  event: string,
  data: Record<string, unknown>,
  secret?: string
) {
  try {
    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": secret || "",
        "X-Webhook-Event": event,
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to trigger webhook:", error);
    return false;
  }
}
