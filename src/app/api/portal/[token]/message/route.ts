// Portal Message API Route - Handle contact support messages
import { NextRequest, NextResponse } from "next/server";
import { validatePortalToken } from "@/lib/portal/tokens";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ token: string }>;
}

interface MessageRequest {
  type: "contact" | "payment_plan_request" | "dispute";
  subject?: string;
  message: string;
  debtId?: string | null;
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

    const body: MessageRequest = await request.json();
    const { type, subject, message, debtId } = body;

    // Validate message
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Validate debt if provided
    if (debtId) {
      const debt = await db.debt.findFirst({
        where: {
          id: debtId,
          clientId: tokenResult.client.id,
        },
      });

      if (!debt) {
        return NextResponse.json(
          { error: "Debt not found" },
          { status: 404 }
        );
      }
    }

    // Get default subject based on type
    const defaultSubjects: Record<string, string> = {
      contact: "Message du client",
      payment_plan_request: "Demande de plan de paiement",
      dispute: "Contestation de facture",
    };

    // Create message
    const portalMessage = await db.portalMessage.create({
      data: {
        clientId: tokenResult.client.id,
        profileId: tokenResult.profile.id,
        type,
        subject: subject || defaultSubjects[type] || "Message du client",
        message,
        debtId: debtId || null,
        status: "pending",
      },
    });

    // Create notification for the creditor
    const notificationTitles: Record<string, string> = {
      contact: "Nouveau message client",
      payment_plan_request: "Demande de plan de paiement",
      dispute: "Contestation de facture",
    };

    await db.notification.create({
      data: {
        profileId: tokenResult.profile.id,
        type: type === "dispute" ? "warning" : "info",
        title: notificationTitles[type] || "Nouveau message",
        message: `${tokenResult.client.name}: ${message.slice(0, 100)}${message.length > 100 ? "..." : ""}`,
        actionUrl: `/clients/${tokenResult.client.id}`,
        actionLabel: "Voir le message",
      },
    });

    // Try to send email notification to creditor
    try {
      const { sendEmail } = await import("@/lib/services/email");
      
      await sendEmail({
        to: tokenResult.profile.email,
        subject: `[RelancePro] ${subject || defaultSubjects[type]}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">${subject || defaultSubjects[type]}</h2>
            <p><strong>De:</strong> ${tokenResult.client.name}</p>
            ${tokenResult.client.email ? `<p><strong>Email:</strong> ${tokenResult.client.email}</p>` : ""}
            ${tokenResult.client.phone ? `<p><strong>Téléphone:</strong> ${tokenResult.client.phone}</p>` : ""}
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
            <p style="white-space: pre-wrap;">${message}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
            <p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/clients/${tokenResult.client.id}" 
                 style="background: #f97316; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Répondre dans RelancePro
              </a>
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      data: {
        id: portalMessage.id,
        status: portalMessage.status,
      },
    });
  } catch (error) {
    console.error("Portal message API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
