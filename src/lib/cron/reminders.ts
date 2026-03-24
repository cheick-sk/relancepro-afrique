// =====================================================
// RELANCEPRO AFRICA - Cron Jobs pour Relances Automatiques
// Système de relances planifiées avec gestion d'erreurs
// =====================================================

import { db } from "@/lib/db";
import {
  shouldSendReminder,
  calculateNextReminderDate,
  type ReminderSettings,
  type DebtWithClient,
  DEFAULT_SETTINGS,
} from "@/lib/services/reminder-scheduler";

// Types
interface OverdueDebt {
  id: string;
  clientId: string;
  profileId: string;
  amount: number;
  currency: string;
  dueDate: Date;
  reminderCount: number;
  lastReminderAt: Date | null;
  nextReminderAt: Date | null;
  reference: string | null;
  description: string | null;
  paidAmount: number;
  status: string;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
  };
  profile: {
    id: string;
    email: string;
    name: string | null;
    companyName: string | null;
    subscriptionStatus: string;
    subscriptionPlan: string | null;
    remindersUsed: number;
    remindersLimit: number;
    whatsappApiKey: string | null;
    resendApiKey: string | null;
    settings: {
      autoRemindEnabled: boolean;
      reminderDay1: number;
      reminderDay2: number;
      reminderDay3: number;
      skipWeekends: boolean;
      reminderStartTime: string;
      reminderEndTime: string;
      maxReminders: number;
      emailTemplateReminder1: string | null;
      emailTemplateReminder2: string | null;
      emailTemplateReminder3: string | null;
      whatsappTemplateReminder1: string | null;
      whatsappTemplateReminder2: string | null;
      whatsappTemplateReminder3: string | null;
    } | null;
  };
}

interface ReminderResult {
  debtId: string;
  clientId: string;
  type: "email" | "whatsapp";
  status: "sent" | "failed" | "skipped";
  error?: string;
  reminderNumber: number;
  clientName?: string;
  amount?: number;
}

interface ProcessResult {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  results: ReminderResult[];
  duration: number;
  timestamp: string;
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Main function to process automatic reminders
 * Called by cron job or manual trigger
 */
export async function processAutomaticReminders(): Promise<ProcessResult> {
  const startTime = Date.now();
  const results: ReminderResult[] = [];
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  try {
    console.log("[Cron] Starting automatic reminders processing...");

    // Get all debts that might need reminders
    const overdueDebts = await getOverdueDebts();
    processed = overdueDebts.length;

    console.log(`[Cron] Found ${processed} debts to check`);

    for (const debt of overdueDebts) {
      try {
        const result = await processDebtReminder(debt);
        results.push(result);

        if (result.status === "sent") {
          sent++;
        } else if (result.status === "failed") {
          failed++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`[Cron] Error processing debt ${debt.id}:`, error);
        failed++;
        results.push({
          debtId: debt.id,
          clientId: debt.clientId,
          type: "email",
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          reminderNumber: debt.reminderCount + 1,
          clientName: debt.client.name,
          amount: debt.amount,
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron] Completed: ${sent} sent, ${failed} failed, ${skipped} skipped in ${duration}ms`);

    // Log summary
    await logReminderSummary(processed, sent, failed, skipped, duration);

    return {
      processed,
      sent,
      failed,
      skipped,
      results,
      duration,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Cron] Critical error in processAutomaticReminders:", error);
    throw error;
  }
}

/**
 * Get overdue debts that might need reminders
 */
async function getOverdueDebts(): Promise<OverdueDebt[]> {
  const now = new Date();

  const debts = await db.debt.findMany({
    where: {
      status: { in: ["pending", "partial"] },
      dueDate: { lt: now },
      // Only get debts where nextReminderAt is in the past or null
      OR: [
        { nextReminderAt: { lte: now } },
        { nextReminderAt: null },
      ],
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
        },
      },
      profile: {
        select: {
          id: true,
          email: true,
          name: true,
          companyName: true,
          subscriptionStatus: true,
          subscriptionPlan: true,
          remindersUsed: true,
          remindersLimit: true,
          whatsappApiKey: true,
          resendApiKey: true,
          settings: {
            select: {
              autoRemindEnabled: true,
              reminderDay1: true,
              reminderDay2: true,
              reminderDay3: true,
              skipWeekends: true,
              reminderStartTime: true,
              reminderEndTime: true,
              maxReminders: true,
              emailTemplateReminder1: true,
              emailTemplateReminder2: true,
              emailTemplateReminder3: true,
              whatsappTemplateReminder1: true,
              whatsappTemplateReminder2: true,
              whatsappTemplateReminder3: true,
            },
          },
        },
      },
    },
    orderBy: {
      nextReminderAt: "asc",
    },
    take: 100, // Process in batches
  });

  return debts as unknown as OverdueDebt[];
}

/**
 * Process a single debt reminder
 */
async function processDebtReminder(debt: OverdueDebt): Promise<ReminderResult> {
  const { profile, client } = debt;
  const settings: ReminderSettings = profile.settings ? {
    autoRemindEnabled: profile.settings.autoRemindEnabled,
    reminderDay1: profile.settings.reminderDay1,
    reminderDay2: profile.settings.reminderDay2,
    reminderDay3: profile.settings.reminderDay3,
    skipWeekends: profile.settings.skipWeekends,
    reminderStartTime: profile.settings.reminderStartTime,
    reminderEndTime: profile.settings.reminderEndTime,
    maxReminders: profile.settings.maxReminders,
  } : DEFAULT_SETTINGS;

  // Check if reminder should be sent
  const checkResult = shouldSendReminder(
    debt as DebtWithClient,
    settings
  );

  if (!checkResult.shouldSend) {
    // Update next reminder date if needed
    const nextReminder = calculateNextReminderDate(debt as DebtWithClient, settings);
    if (nextReminder && nextReminder.getTime() !== debt.nextReminderAt?.getTime()) {
      await db.debt.update({
        where: { id: debt.id },
        data: { nextReminderAt: nextReminder },
      });
    }

    return {
      debtId: debt.id,
      clientId: client.id,
      type: "email",
      status: "skipped",
      error: checkResult.reason,
      reminderNumber: debt.reminderCount + 1,
      clientName: client.name,
      amount: debt.amount - debt.paidAmount,
    };
  }

  // Check subscription limits
  if (profile.remindersUsed >= profile.remindersLimit) {
    return {
      debtId: debt.id,
      clientId: client.id,
      type: "email",
      status: "skipped",
      error: "Reminder limit reached for subscription",
      reminderNumber: checkResult.reminderNumber || debt.reminderCount + 1,
      clientName: client.name,
      amount: debt.amount - debt.paidAmount,
    };
  }

  // Determine channel (Email or WhatsApp)
  const hasEmail = !!client.email && !!profile.resendApiKey;
  const hasWhatsApp = !!client.phone && !!profile.whatsappApiKey;

  if (!hasEmail && !hasWhatsApp) {
    return {
      debtId: debt.id,
      clientId: client.id,
      type: "email",
      status: "skipped",
      error: "No contact method available",
      reminderNumber: checkResult.reminderNumber || debt.reminderCount + 1,
      clientName: client.name,
      amount: debt.amount - debt.paidAmount,
    };
  }

  const type: "email" | "whatsapp" = hasEmail ? "email" : "whatsapp";
  const reminderNumber = checkResult.reminderNumber || debt.reminderCount + 1;

  // Send the reminder with retry logic
  let lastError: string | undefined;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Generate the message
      const message = await generateReminderMessage(debt, reminderNumber, type, profile.settings);

      // Send via appropriate channel
      if (type === "email") {
        await sendEmailReminder(debt, message, reminderNumber);
      } else {
        await sendWhatsAppReminder(debt, message, reminderNumber);
      }

      // Record successful reminder
      await db.reminder.create({
        data: {
          debtId: debt.id,
          clientId: client.id,
          profileId: profile.id,
          type,
          subject: type === "email" ? `Rappel de paiement - ${debt.reference || "Créance"}` : null,
          message,
          status: "sent",
          tone: getReminderTone(reminderNumber),
          sentAt: new Date(),
        },
      });

      // Update debt
      const nextReminderAt = calculateNextReminderDate(
        { ...debt, reminderCount: debt.reminderCount + 1 } as DebtWithClient,
        settings
      );

      await db.debt.update({
        where: { id: debt.id },
        data: {
          reminderCount: { increment: 1 },
          lastReminderAt: new Date(),
          nextReminderAt,
        },
      });

      // Update profile's reminder count
      await db.profile.update({
        where: { id: profile.id },
        data: {
          remindersUsed: { increment: 1 },
        },
      });

      return {
        debtId: debt.id,
        clientId: client.id,
        type,
        status: "sent",
        reminderNumber,
        clientName: client.name,
        amount: debt.amount - debt.paidAmount,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Cron] Attempt ${attempt}/${MAX_RETRIES} failed for debt ${debt.id}:`, error);

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  // All retries failed
  await db.reminder.create({
    data: {
      debtId: debt.id,
      clientId: client.id,
      profileId: profile.id,
      type,
      subject: type === "email" ? `Rappel de paiement - ${debt.reference || "Créance"}` : null,
      message: "",
      status: "failed",
      error: lastError,
      tone: getReminderTone(reminderNumber),
    },
  });

  return {
    debtId: debt.id,
    clientId: client.id,
    type,
    status: "failed",
    error: lastError,
    reminderNumber,
    clientName: client.name,
    amount: debt.amount - debt.paidAmount,
  };
}

/**
 * Generate reminder message from template or default
 */
async function generateReminderMessage(
  debt: OverdueDebt,
  reminderNumber: number,
  type: "email" | "whatsapp",
  settings: OverdueDebt["profile"]["settings"]
): Promise<string> {
  const templates = type === "email"
    ? {
        1: settings?.emailTemplateReminder1,
        2: settings?.emailTemplateReminder2,
        3: settings?.emailTemplateReminder3,
      }
    : {
        1: settings?.whatsappTemplateReminder1,
        2: settings?.whatsappTemplateReminder2,
        3: settings?.whatsappTemplateReminder3,
      };

  const template = templates[reminderNumber as 1 | 2 | 3];
  if (template) {
    return replaceTemplateVariables(template, debt);
  }

  return getDefaultMessage(debt, reminderNumber, type);
}

/**
 * Replace template variables
 */
function replaceTemplateVariables(template: string, debt: OverdueDebt): string {
  const daysOverdue = Math.floor(
    (Date.now() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const balance = debt.amount - debt.paidAmount;

  return template
    .replace(/\{\{client_name\}\}/g, debt.client.name)
    .replace(/\{\{company_name\}\}/g, debt.client.company || "")
    .replace(/\{\{amount\}\}/g, formatAmount(balance, debt.currency))
    .replace(/\{\{total_amount\}\}/g, formatAmount(debt.amount, debt.currency))
    .replace(/\{\{paid_amount\}\}/g, formatAmount(debt.paidAmount, debt.currency))
    .replace(/\{\{balance\}\}/g, formatAmount(balance, debt.currency))
    .replace(/\{\{currency\}\}/g, debt.currency)
    .replace(/\{\{reference\}\}/g, debt.reference || "N/A")
    .replace(/\{\{due_date\}\}/g, formatDate(debt.dueDate))
    .replace(/\{\{days_overdue\}\}/g, daysOverdue.toString())
    .replace(/\{\{business_name\}\}/g, debt.profile.companyName || "Notre entreprise")
    .replace(/\{\{reminder_number\}\}/g, (debt.reminderCount + 1).toString());
}

/**
 * Get default message for reminder
 */
function getDefaultMessage(
  debt: OverdueDebt,
  reminderNumber: number,
  type: "email" | "whatsapp"
): string {
  const daysOverdue = Math.floor(
    (Date.now() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const balance = debt.amount - debt.paidAmount;
  const businessName = debt.profile.companyName || "Notre entreprise";

  if (type === "email") {
    switch (reminderNumber) {
      case 1:
        return `Bonjour ${debt.client.name},

Nous espérons que vous allez bien.

Nous vous rappelons que la facture ${debt.reference || ""} d'un montant de ${formatAmount(balance, debt.currency)}, échéante le ${formatDate(debt.dueDate)}, n'a pas encore été réglée.

Le paiement est en retard de ${daysOverdue} jours.

Nous vous prions de bien vouloir régulariser cette situation dans les meilleurs délais.

Cordialement,
${businessName}`;

      case 2:
        return `Bonjour ${debt.client.name},

Malgré notre précédent rappel, nous n'avons toujours pas reçu le paiement de la facture ${debt.reference || ""} d'un montant de ${formatAmount(balance, debt.currency)}.

Le retard est maintenant de ${daysOverdue} jours.

Nous vous prions de régler ce montant dans les 48 heures pour éviter toute action supplémentaire.

Cordialement,
${businessName}`;

      case 3:
        return `URGENT - Dernier rappel

Bonjour ${debt.client.name},

Après deux rappels restés sans réponse, nous vous informons que la facture ${debt.reference || ""} de ${formatAmount(balance, debt.currency)} est en retard de ${daysOverdue} jours.

Sans régularisation sous 7 jours, nous serons contraints de transmettre ce dossier à notre service de recouvrement.

Veuillez régler cette situation immédiatement.

${businessName}`;

      default:
        return "";
    }
  }

  // WhatsApp format
  switch (reminderNumber) {
    case 1:
      return `Bonjour ${debt.client.name} 👋

Petit rappel: la facture ${debt.reference || ""} de ${formatAmount(balance, debt.currency)} est en retard de ${daysOverdue} jours.

Pourriez-vous régler ce paiement rapidement ?

Merci! 🙏
${businessName}`;

    case 2:
      return `Bonjour ${debt.client.name}

Rappel: Facture ${debt.reference || ""} de ${formatAmount(balance, debt.currency)} en retard de ${daysOverdue} jours.

⚠️ Merci de régler dans les 48h.

${businessName}`;

    case 3:
      return `⚠️ DERNIER RAPPEL

${debt.client.name},
Facture ${debt.reference || ""}: ${formatAmount(balance, debt.currency)}
Retard: ${daysOverdue} jours

⚠️ Sans paiement sous 7 jours, transmission au recouvrement.

${businessName}`;

    default:
      return "";
  }
}

/**
 * Send email reminder via Resend
 */
async function sendEmailReminder(
  debt: OverdueDebt,
  message: string,
  _reminderNumber: number
): Promise<void> {
  const resendApiKey = debt.profile.resendApiKey;

  if (!resendApiKey || !debt.client.email) {
    throw new Error("Email configuration missing");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${debt.profile.companyName || "RelancePro"} <noreply@relancepro.africa>`,
      to: debt.client.email,
      subject: `Rappel de paiement - ${debt.reference || "Créance"}`,
      text: message,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email send failed: ${response.status} - ${errorText}`);
  }
}

/**
 * Send WhatsApp reminder via Whapi.cloud
 */
async function sendWhatsAppReminder(
  debt: OverdueDebt,
  message: string,
  _reminderNumber: number
): Promise<void> {
  const whatsappApiKey = debt.profile.whatsappApiKey;

  if (!whatsappApiKey || !debt.client.phone) {
    throw new Error("WhatsApp configuration missing");
  }

  // Normalize phone number
  let phone = debt.client.phone.replace(/\D/g, "");
  if (!phone.startsWith("225") && !phone.startsWith("221") && !phone.startsWith("233")) {
    phone = "225" + phone; // Default to Côte d'Ivoire
  }

  const response = await fetch("https://gate.whapi.cloud/messages/text", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${whatsappApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: phone + "@c.us",
      body: message,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp send failed: ${response.status} - ${errorText}`);
  }
}

/**
 * Log reminder summary to database
 */
async function logReminderSummary(
  processed: number,
  sent: number,
  failed: number,
  skipped: number,
  duration: number
): Promise<void> {
  try {
    // Find a profile to log this under (use first admin or create system log)
    const admin = await db.profile.findFirst({
      where: { role: "admin" },
    });

    if (admin) {
      await db.reminderLog.create({
        data: {
          profileId: admin.id,
          action: "processed",
          entityType: "Cron",
          entityId: "automatic_reminders",
          details: JSON.stringify({
            processed,
            sent,
            failed,
            skipped,
            duration,
            timestamp: new Date().toISOString(),
          }),
          success: failed === 0,
        },
      });
    }
  } catch (error) {
    console.error("[Cron] Failed to log summary:", error);
  }
}

// Utility functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function formatAmount(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const symbols: Record<string, string> = {
    GNF: "FG",
    XOF: "FCFA",
    XAF: "FCFA",
    EUR: "€",
    USD: "$",
    NGN: "₦",
    GHS: "GH₵",
  };

  return formatter.format(amount) + " " + (symbols[currency] || currency);
}

function getReminderTone(reminderNumber: number): string {
  switch (reminderNumber) {
    case 1:
      return "friendly";
    case 2:
      return "formal";
    case 3:
      return "urgent";
    default:
      return "formal";
  }
}

// Export for use in API routes
export { getOverdueDebts, processDebtReminder };
export type { ReminderResult, ProcessResult };
