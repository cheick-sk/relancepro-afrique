import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { sendReminder } from "@/lib/services/whatsapp";
import { checkDemoLimits } from "@/lib/demo";
import { notifyReminderSent } from "@/lib/push/service";
import { logReminderAction, AuditAction } from "@/lib/audit/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { debtId, type, customMessage } = body;

    if (!debtId || !type) {
      return NextResponse.json(
        { error: "debtId et type sont obligatoires" },
        { status: 400 }
      );
    }

    // Get debt with client
    const debt = await db.debt.findFirst({
      where: {
        id: debtId,
        profileId: session.user.id,
      },
      include: {
        client: true,
      },
    });

    if (!debt) {
      return NextResponse.json(
        { error: "Créance non trouvée" },
        { status: 404 }
      );
    }

    if (debt.status === "paid") {
      return NextResponse.json(
        { error: "Cette créance est déjà payée" },
        { status: 400 }
      );
    }

    // Get profile
    const profile = await db.profile.findUnique({
      where: { id: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profil non trouvé" },
        { status: 404 }
      );
    }

    // Check demo limits before sending reminder
    const demoCheck = await checkDemoLimits(
      session.user.id,
      type === "email" ? "send_email" : "send_whatsapp"
    );
    if (!demoCheck.allowed) {
      return NextResponse.json(
        {
          error: demoCheck.reason || "Limite atteinte",
          limitType: type === "email" ? "email" : "whatsapp",
          currentUsage: demoCheck.currentUsage,
          limit: demoCheck.limit,
        },
        { status: 403 }
      );
    }

    // Check if client has contact info for the requested type
    if (type === "email" && !debt.client.email) {
      return NextResponse.json(
        { error: "Le client n'a pas d'adresse email" },
        { status: 400 }
      );
    }

    if (type === "whatsapp" && !debt.client.phone) {
      return NextResponse.json(
        { error: "Le client n'a pas de numéro WhatsApp" },
        { status: 400 }
      );
    }

    // Send reminder
    const result = await sendReminder(debt.client, debt, profile, type);

    // Create reminder records
    const reminders = [];

    if (result.email) {
      const emailReminder = await db.reminder.create({
        data: {
          debtId: debt.id,
          clientId: debt.clientId,
          profileId: session.user.id,
          type: "email",
          subject: `Relance #${result.reminderNumber} - Facture ${debt.reference || "en attente"}`,
          message: customMessage || `Email de relance #${result.reminderNumber}`,
          status: result.email.success ? "sent" : "failed",
          error: result.email.error,
          sentAt: result.email.success ? new Date() : null,
        },
      });
      reminders.push(emailReminder);
    }

    if (result.whatsapp) {
      const whatsappReminder = await db.reminder.create({
        data: {
          debtId: debt.id,
          clientId: debt.clientId,
          profileId: session.user.id,
          type: "whatsapp",
          message: customMessage || `WhatsApp de relance #${result.reminderNumber}`,
          status: result.whatsapp.success ? "sent" : "failed",
          error: result.whatsapp.error,
          sentAt: result.whatsapp.success ? new Date() : null,
        },
      });
      reminders.push(whatsappReminder);
    }

    // Update debt with reminder count
    await db.debt.update({
      where: { id: debt.id },
      data: {
        reminderCount: { increment: 1 },
        lastReminderAt: new Date(),
      },
    });

    // Send push notification for successful reminders
    if (result.email?.success || result.whatsapp?.success) {
      // Notify for each successful channel
      if (result.email?.success) {
        notifyReminderSent(
          session.user.id,
          debt.id,
          debt.client.name,
          'email'
        ).catch(err => console.error("Failed to send push notification:", err));

        // Log audit action for email
        await logReminderAction(AuditAction.REMINDER_SENT, emailReminder.id, {
          profileId: session.user.id,
          debtId: debt.id,
          clientId: debt.clientId,
          type: 'email',
          status: 'success',
        });
      }
      if (result.whatsapp?.success) {
        notifyReminderSent(
          session.user.id,
          debt.id,
          debt.client.name,
          'whatsapp'
        ).catch(err => console.error("Failed to send push notification:", err));

        // Log audit action for whatsapp
        await logReminderAction(AuditAction.REMINDER_SENT, whatsappReminder.id, {
          profileId: session.user.id,
          debtId: debt.id,
          clientId: debt.clientId,
          type: 'whatsapp',
          status: 'success',
        });
      }
    }

    // Log failed reminders
    if (result.email && !result.email.success) {
      await logReminderAction(AuditAction.REMINDER_FAILED, reminders.find(r => r.type === 'email')?.id || 'unknown', {
        profileId: session.user.id,
        debtId: debt.id,
        clientId: debt.clientId,
        type: 'email',
        status: 'failed',
        errorMessage: result.email.error,
      });
    }
    if (result.whatsapp && !result.whatsapp.success) {
      await logReminderAction(AuditAction.REMINDER_FAILED, reminders.find(r => r.type === 'whatsapp')?.id || 'unknown', {
        profileId: session.user.id,
        debtId: debt.id,
        clientId: debt.clientId,
        type: 'whatsapp',
        status: 'failed',
        errorMessage: result.whatsapp.error,
      });
    }

    return NextResponse.json({
      success: true,
      reminders,
      reminderNumber: result.reminderNumber,
    });
  } catch (error) {
    console.error("Error sending reminder:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de la relance" },
      { status: 500 }
    );
  }
}
