import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { generateAIReminder, predictBestSendTime, predictPaymentProbability } from "@/lib/services/ai-service";
import { sendReminder } from "@/lib/services/whatsapp";

// Auto-generate and send AI reminders
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Get settings and profile
    const [settings, profile] = await Promise.all([
      db.settings.findUnique({ where: { profileId: session.user.id } }),
      db.profile.findUnique({ where: { id: session.user.id } }),
    ]);

    if (!profile) {
      return NextResponse.json({ error: "Profil non trouvé" }, { status: 404 });
    }

    if (!settings?.autoRemindEnabled) {
      return NextResponse.json({ message: "Relances automatiques désactivées" });
    }

    const language = (profile.preferredLanguage as 'fr' | 'en') || 'fr';

    // Get overdue debts
    const overdueDebts = await db.debt.findMany({
      where: {
        profileId: session.user.id,
        status: { in: ["pending", "partial"] },
        dueDate: { lt: new Date() },
        OR: [
          { nextReminderAt: { lte: new Date() } },
          { nextReminderAt: null },
        ],
      },
      include: {
        client: true,
      },
      take: 50,
    });

    const results: Array<{
      debtId: string;
      success: boolean;
      type?: string;
      error?: string;
      reminder?: {
        subject: string;
        message: string;
        tone: string;
      };
    }> = [];

    for (const debt of overdueDebts) {
      const client = debt.client;
      if (!client) continue;

      // Determine reminder number
      const reminderNumber = Math.min((debt.reminderCount + 1) as 1 | 2 | 3, 3);

      try {
        // Generate AI-powered reminder
        const reminder = await generateAIReminder(
          client,
          debt,
          reminderNumber,
          undefined, // Let AI determine the best tone
          language
        );

        // Send based on available channels
        if (client.email) {
          const result = await sendReminder(client, debt, profile, "email", {
            subject: reminder.subject,
            message: reminder.message,
          });
          results.push({
            debtId: debt.id,
            success: result.email?.success || false,
            type: "email",
            error: result.email?.error,
            reminder: {
              subject: reminder.subject,
              message: reminder.message,
              tone: reminder.tone,
            },
          });
        }

        if (client.phone && reminder.whatsappMessage) {
          const result = await sendReminder(client, debt, profile, "whatsapp", {
            message: reminder.whatsappMessage,
          });
          results.push({
            debtId: debt.id,
            success: result.whatsapp?.success || false,
            type: "whatsapp",
            error: result.whatsapp?.error,
          });
        }

        // Update debt with reminder count and next reminder time
        const nextReminder = predictBestSendTime(client);
        
        // Optionally update payment probability
        let paymentProbability = debt.paymentProbability;
        try {
          if (client) {
            const prediction = await predictPaymentProbability(debt, client, language);
            paymentProbability = prediction.probability;
          }
        } catch {
          // Keep existing probability if prediction fails
        }

        await db.debt.update({
          where: { id: debt.id },
          data: {
            reminderCount: { increment: 1 },
            lastReminderAt: new Date(),
            nextReminderAt: nextReminder,
            paymentProbability,
          },
        });
      } catch (error) {
        results.push({
          debtId: debt.id,
          success: false,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    console.error("AI reminders error:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement des relances automatiques" },
      { status: 500 }
    );
  }
}

// Get AI reminder suggestions for a specific debt
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const debtId = searchParams.get("debtId");
    const tone = searchParams.get("tone") as "formal" | "friendly" | "urgent" | null;

    if (!debtId) {
      return NextResponse.json(
        { error: "debtId requis" },
        { status: 400 }
      );
    }

    const debt = await db.debt.findFirst({
      where: {
        id: debtId,
        profileId: session.user.id,
      },
      include: { client: true },
    });

    if (!debt || !debt.client) {
      return NextResponse.json(
        { error: "Créance non trouvée" },
        { status: 404 }
      );
    }

    const profile = await db.profile.findUnique({
      where: { id: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profil non trouvé" },
        { status: 404 }
      );
    }

    const language = (profile.preferredLanguage as 'fr' | 'en') || 'fr';

    // Generate AI reminder suggestions
    const reminderNumber = Math.min((debt.reminderCount + 1) as 1 | 2 | 3, 3);
    const reminder = await generateAIReminder(
      debt.client, 
      debt, 
      reminderNumber,
      tone || undefined,
      language
    );

    // Get payment prediction
    const prediction = await predictPaymentProbability(debt, debt.client, language);

    return NextResponse.json({
      debt: {
        id: debt.id,
        reference: debt.reference,
        amount: debt.amount,
        amountDue: debt.amount - debt.paidAmount,
        currency: debt.currency,
        dueDate: debt.dueDate,
        status: debt.status,
        reminderCount: debt.reminderCount,
      },
      client: {
        id: debt.client.id,
        name: debt.client.name,
        email: debt.client.email,
        phone: debt.client.phone,
        company: debt.client.company,
      },
      reminder,
      reminderNumber,
      prediction,
      channels: {
        email: !!debt.client.email,
        whatsapp: !!debt.client.phone,
      },
      nextOptimalTime: predictBestSendTime(debt.client),
    });
  } catch (error) {
    console.error("AI suggestions error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération des suggestions" },
      { status: 500 }
    );
  }
}
