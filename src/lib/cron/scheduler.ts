// =====================================================
// RELANCEPRO AFRICA - Reminder Scheduler
// Main scheduler functions for automatic reminders
// Tous les textes sont en français
// =====================================================

import { db } from "@/lib/db";
import {
  REMINDER_INTERVALS,
  DEFAULT_REMINDER_INTERVALS,
  DEFAULT_TIMEZONE,
  RATE_LIMITS,
  MAX_REMINDERS_PER_DEBT,
  isWithinSendWindow,
  isInQuietHours,
  getNextSendTime,
  calculateNextReminderDate,
  type Channel,
  type ReminderType,
  type PriorityLevel,
} from "./config";
import { generateAIReminder } from "@/lib/services/ai-service";
import { sendReminderEmail } from "@/lib/services/email";
import { sendCustomWhatsAppMessage } from "@/lib/services/whatsapp";

// =====================================================
// TYPES
// =====================================================

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
  autoRemindEnabled: boolean;
  paidAmount: number;
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
    preferredLanguage: string;
    settings: {
      autoRemindEnabled: boolean;
      reminderDay1: number;
      reminderDay2: number;
      reminderDay3: number;
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
  message?: string;
}

interface ProcessingStats {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  queued: number;
  results: ReminderResult[];
}

interface ScheduleReminderOptions {
  debtId: string;
  clientId: string;
  profileId: string;
  scheduledAt: Date;
  type: "email" | "whatsapp";
  priority?: PriorityLevel;
  timezone?: string;
  message?: string;
  subject?: string;
}

// =====================================================
// MAIN SCHEDULING FUNCTIONS
// =====================================================

/**
 * Planifie une nouvelle relance
 */
export async function scheduleReminder(
  options: ScheduleReminderOptions
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const {
      debtId,
      clientId,
      profileId,
      scheduledAt,
      type,
      priority = "normal",
      timezone = DEFAULT_TIMEZONE,
      message,
      subject,
    } = options;

    // Vérifier si une relance similaire existe déjà
    const existing = await db.scheduledReminder.findFirst({
      where: {
        debtId,
        type,
        status: { in: ["pending"] },
        scheduledAt: {
          gte: new Date(scheduledAt.getTime() - 60 * 60 * 1000), // Dans l'heure
          lte: new Date(scheduledAt.getTime() + 60 * 60 * 1000),
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: "Une relance similaire est déjà planifiée",
      };
    }

    // S'assurer que l'heure est valide (hors heures de repos)
    let finalScheduledAt = scheduledAt;
    if (isInQuietHours(scheduledAt)) {
      finalScheduledAt = getNextSendTime(scheduledAt, timezone);
    }

    // Créer la relance planifiée
    const reminder = await db.scheduledReminder.create({
      data: {
        debtId,
        clientId,
        profileId,
        scheduledAt: finalScheduledAt,
        type,
        status: "pending",
        priority,
        timezone,
        message,
        subject,
        maxRetries: RATE_LIMITS.MAX_RETRY_ATTEMPTS,
      },
    });

    // Enregistrer dans le log
    await db.reminderLog.create({
      data: {
        profileId,
        action: "scheduled",
        entityType: "ScheduledReminder",
        entityId: reminder.id,
        details: JSON.stringify({
          debtId,
          type,
          scheduledAt: finalScheduledAt.toISOString(),
          priority,
        }),
        success: true,
      },
    });

    return { success: true, id: reminder.id };
  } catch (error) {
    console.error("[Scheduler] Erreur lors de la planification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Annule une relance planifiée
 */
export async function cancelReminder(
  reminderId: string,
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const reminder = await db.scheduledReminder.findFirst({
      where: { id: reminderId, profileId },
    });

    if (!reminder) {
      return { success: false, error: "Relance non trouvée" };
    }

    if (reminder.status !== "pending") {
      return { success: false, error: "Seules les relances en attente peuvent être annulées" };
    }

    await db.scheduledReminder.update({
      where: { id: reminderId },
      data: { status: "cancelled" },
    });

    await db.reminderLog.create({
      data: {
        profileId,
        action: "cancelled",
        entityType: "ScheduledReminder",
        entityId: reminderId,
        success: true,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Traite toutes les relances planifiées dues
 */
export async function processScheduledReminders(): Promise<ProcessingStats> {
  const results: ReminderResult[] = [];
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let queued = 0;

  try {
    // Vérifier si on est dans la fenêtre d'envoi
    if (!isWithinSendWindow()) {
      console.log("[Scheduler] Hors fenêtre d'envoi, traitement ignoré");
      return { processed: 0, sent: 0, failed: 0, skipped: 0, queued: 0, results: [] };
    }

    // Récupérer toutes les dettes nécessitant une relance
    const overdueDebts = await checkDueReminders();
    processed = overdueDebts.length;

    console.log(`[Scheduler] ${processed} dettes à traiter`);

    for (const debt of overdueDebts) {
      try {
        const result = await sendScheduledReminder(debt);
        results.push(result);

        if (result.status === "sent") {
          sent++;
        } else if (result.status === "failed") {
          failed++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`[Scheduler] Erreur pour la dette ${debt.id}:`, error);
        failed++;
        results.push({
          debtId: debt.id,
          clientId: debt.clientId,
          type: "email",
          status: "failed",
          error: error instanceof Error ? error.message : "Erreur inconnue",
          reminderNumber: debt.reminderCount + 1,
        });
      }
    }

    return { processed, sent, failed, skipped, queued, results };
  } catch (error) {
    console.error("[Scheduler] Erreur dans processScheduledReminders:", error);
    throw error;
  }
}

/**
 * Calcule la prochaine date de relance pour une dette
 */
export async function calculateNextReminderDateForDebt(
  debt: {
    dueDate: Date;
    reminderCount: number;
    profileId: string;
  }
): Promise<Date | null> {
  try {
    // Récupérer les paramètres de l'utilisateur
    const profile = await db.profile.findUnique({
      where: { id: debt.profileId },
      include: { settings: true },
    });

    if (!profile) return null;

    const settings = profile.settings;
    const reminderDays = {
      day1: settings?.reminderDay1 || DEFAULT_REMINDER_INTERVALS.reminderDay1,
      day2: settings?.reminderDay2 || DEFAULT_REMINDER_INTERVALS.reminderDay2,
      day3: settings?.reminderDay3 || DEFAULT_REMINDER_INTERVALS.reminderDay3,
    };

    return calculateNextReminderDate(debt.reminderCount, reminderDays);
  } catch {
    return null;
  }
}

// =====================================================
// REMINDER CHECKING FUNCTIONS
// =====================================================

/**
 * Trouve toutes les dettes nécessitant une relance
 */
export async function checkDueReminders(): Promise<OverdueDebt[]> {
  const now = new Date();

  const debts = await db.debt.findMany({
    where: {
      // Statut en attente ou partiel (non entièrement payé)
      status: { in: ["pending", "partial"] },
      // Date d'échéance dépassée
      dueDate: { lt: now },
      // Relances automatiques activées
      OR: [
        { autoRemindEnabled: true },
        { autoRemindEnabled: null },
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
          preferredLanguage: true,
          settings: {
            select: {
              autoRemindEnabled: true,
              reminderDay1: true,
              reminderDay2: true,
              reminderDay3: true,
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
  });

  // Filtrer les dettes qui nécessitent réellement une relance
  const dueDebts: OverdueDebt[] = [];

  for (const debt of debts) {
    const settings = debt.profile.settings;
    const autoRemindEnabled = settings?.autoRemindEnabled ?? true;

    // Vérifier si les relances automatiques sont désactivées
    if (!autoRemindEnabled) {
      continue;
    }

    // Vérifier les limites d'abonnement
    if (debt.profile.remindersUsed >= debt.profile.remindersLimit) {
      continue;
    }

    // Vérifier si cette dette nécessite une relance
    const needsReminder = await checkIfReminderNeeded(debt, settings);
    if (needsReminder) {
      dueDebts.push(debt as unknown as OverdueDebt);
    }
  }

  return dueDebts;
}

/**
 * Vérifie si une dette spécifique nécessite une relance
 */
async function checkIfReminderNeeded(
  debt: {
    id: string;
    dueDate: Date;
    reminderCount: number;
    lastReminderAt: Date | null;
    nextReminderAt: Date | null;
  },
  settings: {
    reminderDay1: number;
    reminderDay2: number;
    reminderDay3: number;
  } | null
): Promise<boolean> {
  const now = new Date();
  const daysOverdue = Math.floor(
    (now.getTime() - debt.dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const day1 = settings?.reminderDay1 || REMINDER_INTERVALS.DAY_1;
  const day2 = settings?.reminderDay2 || REMINDER_INTERVALS.DAY_2;
  const day3 = settings?.reminderDay3 || REMINDER_INTERVALS.DAY_3;

  // Vérifier si le nombre maximum de relances est atteint
  if (debt.reminderCount >= MAX_REMINDERS_PER_DEBT) {
    return false;
  }

  // Vérifier si une relance planifiée est due
  if (debt.nextReminderAt && debt.nextReminderAt <= now) {
    return true;
  }

  // Vérification première relance
  if (debt.reminderCount === 0 && daysOverdue >= day1) {
    return true;
  }

  // Vérification deuxième relance
  if (
    debt.reminderCount === 1 &&
    daysOverdue >= day2 &&
    debt.lastReminderAt &&
    daysSince(debt.lastReminderAt) >= (day2 - day1)
  ) {
    return true;
  }

  // Vérification troisième relance
  if (
    debt.reminderCount === 2 &&
    daysOverdue >= day3 &&
    debt.lastReminderAt &&
    daysSince(debt.lastReminderAt) >= (day3 - day2)
  ) {
    return true;
  }

  return false;
}

// =====================================================
// SENDING FUNCTIONS
// =====================================================

/**
 * Envoie une relance planifiée pour une dette
 */
export async function sendScheduledReminder(debt: OverdueDebt): Promise<ReminderResult> {
  const { profile, client } = debt;
  const settings = profile.settings;

  // Déterminer le numéro de relance
  const reminderNumber = Math.min(debt.reminderCount + 1, MAX_REMINDERS_PER_DEBT) as 1 | 2 | 3;
  const reminderType = getReminderType(reminderNumber);

  // Déterminer le canal à utiliser
  const hasEmail = !!client.email && !!profile.resendApiKey;
  const hasWhatsApp = !!client.phone && !!profile.whatsappApiKey;
  const channel: Channel = hasEmail ? "email" : hasWhatsApp ? "whatsapp" : "both";

  if (!hasEmail && !hasWhatsApp) {
    return {
      debtId: debt.id,
      clientId: client.id,
      type: "email",
      status: "skipped",
      error: "Aucune méthode de contact disponible",
      reminderNumber,
    };
  }

  // Vérifier les limites de taux
  const rateLimitOk = await checkRateLimit(profile.id);
  if (!rateLimitOk) {
    return {
      debtId: debt.id,
      clientId: client.id,
      type: channel === "both" ? "email" : channel,
      status: "skipped",
      error: "Limite de taux dépassée",
      reminderNumber,
    };
  }

  try {
    // Générer le message de relance avec IA
    const language = (profile.preferredLanguage || 'fr') as 'fr' | 'en';
    const aiContent = await generateAIReminder(
      client as any,
      debt as any,
      reminderNumber,
      undefined,
      language
    );

    // Utiliser le template personnalisé si disponible
    const template = getTemplate(settings, reminderNumber, channel);
    const message = template
      ? replaceTemplateVariables(template, debt)
      : aiContent.message;

    const subject = aiContent.subject || `Relance - ${debt.reference || "Créance"}`;

    // Envoyer via le canal approprié
    let sendResult: { success: boolean; error?: string } = { success: false };

    if (channel === "email" || channel === "both") {
      sendResult = await sendEmailReminder(debt, subject, message);
    }

    if (channel === "whatsapp" || (channel === "both" && !sendResult.success)) {
      sendResult = await sendWhatsAppReminder(debt, aiContent.whatsappMessage || message);
    }

    if (!sendResult.success) {
      // Enregistrer l'échec
      await recordReminder(debt, channel === "both" ? "email" : channel, message, subject, "failed", sendResult.error);

      return {
        debtId: debt.id,
        clientId: client.id,
        type: channel === "both" ? "email" : channel,
        status: "failed",
        error: sendResult.error,
        reminderNumber,
      };
    }

    // Enregistrer le succès
    await recordReminder(debt, channel === "both" ? "email" : channel, message, subject, "sent");

    // Mettre à jour la dette
    await updateNextReminderDate(debt, reminderNumber, settings);

    // Mettre à jour le compteur de l'utilisateur
    await db.profile.update({
      where: { id: profile.id },
      data: { remindersUsed: { increment: 1 } },
    });

    return {
      debtId: debt.id,
      clientId: client.id,
      type: channel === "both" ? "email" : channel,
      status: "sent",
      reminderNumber,
      message: message.substring(0, 100) + "...",
    };
  } catch (error) {
    console.error(`[Scheduler] Échec de la relance pour la dette ${debt.id}:`, error);

    return {
      debtId: debt.id,
      clientId: client.id,
      type: channel === "both" ? "email" : channel,
      status: "failed",
      error: error instanceof Error ? error.message : "Erreur inconnue",
      reminderNumber,
    };
  }
}

/**
 * Met à jour la prochaine date de relance
 */
export async function updateNextReminderDate(
  debt: OverdueDebt,
  currentReminder: number,
  settings: OverdueDebt["profile"]["settings"]
): Promise<void> {
  const now = new Date();
  let nextReminderAt: Date | null = null;

  // Calculer la prochaine relance si pas au maximum
  if (currentReminder < MAX_REMINDERS_PER_DEBT) {
    const day1 = settings?.reminderDay1 || REMINDER_INTERVALS.DAY_1;
    const day2 = settings?.reminderDay2 || REMINDER_INTERVALS.DAY_2;
    const day3 = settings?.reminderDay3 || REMINDER_INTERVALS.DAY_3;

    const daysUntilNext =
      currentReminder === 1
        ? day2 - day1
        : currentReminder === 2
        ? day3 - day2
        : 0;

    if (daysUntilNext > 0) {
      nextReminderAt = new Date(now);
      nextReminderAt.setDate(nextReminderAt.getDate() + daysUntilNext);

      // S'assurer que c'est dans la fenêtre d'envoi
      nextReminderAt = getNextSendTime(nextReminderAt);
    }
  }

  await db.debt.update({
    where: { id: debt.id },
    data: {
      reminderCount: { increment: 1 },
      lastReminderAt: now,
      nextReminderAt,
    },
  });
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Vérifie les limites de taux pour un utilisateur
 */
async function checkRateLimit(profileId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentReminders = await db.reminder.count({
    where: {
      profileId,
      createdAt: { gte: oneHourAgo },
    },
  });

  return recentReminders < RATE_LIMITS.MAX_REMINDERS_PER_HOUR;
}

/**
 * Obtient le type de relance basé sur le numéro
 */
function getReminderType(number: number): ReminderType {
  switch (number) {
    case 1:
      return "first";
    case 2:
      return "second";
    case 3:
      return "third";
    default:
      return "first";
  }
}

/**
 * Obtient le template depuis les paramètres
 */
function getTemplate(
  settings: OverdueDebt["profile"]["settings"],
  reminderNumber: 1 | 2 | 3,
  channel: Channel
): string | null {
  if (!settings) return null;

  if (channel === "email") {
    switch (reminderNumber) {
      case 1:
        return settings.emailTemplateReminder1;
      case 2:
        return settings.emailTemplateReminder2;
      case 3:
        return settings.emailTemplateReminder3;
    }
  } else {
    switch (reminderNumber) {
      case 1:
        return settings.whatsappTemplateReminder1;
      case 2:
        return settings.whatsappTemplateReminder2;
      case 3:
        return settings.whatsappTemplateReminder3;
    }
  }

  return null;
}

/**
 * Remplace les variables du template
 */
function replaceTemplateVariables(template: string, debt: OverdueDebt): string {
  const daysOverdue = Math.floor(
    (Date.now() - debt.dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return template
    .replace(/\{\{client_name\}\}/g, debt.client.name)
    .replace(/\{\{company_name\}\}/g, debt.client.company || "")
    .replace(/\{\{amount\}\}/g, formatAmount(debt.amount - debt.paidAmount, debt.currency))
    .replace(/\{\{total_amount\}\}/g, formatAmount(debt.amount, debt.currency))
    .replace(/\{\{currency\}\}/g, debt.currency)
    .replace(/\{\{reference\}\}/g, debt.reference || "N/A")
    .replace(/\{\{due_date\}\}/g, formatDate(debt.dueDate))
    .replace(/\{\{days_overdue\}\}/g, daysOverdue.toString())
    .replace(/\{\{business_name\}\}/g, debt.profile.companyName || "Notre entreprise");
}

/**
 * Envoie une relance par email
 */
async function sendEmailReminder(
  debt: OverdueDebt,
  subject: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await sendReminderEmail(
      debt.client as any,
      debt as any,
      debt.profile as any,
      Math.min(debt.reminderCount + 1, MAX_REMINDERS_PER_DEBT) as 1 | 2 | 3,
      { subject, message }
    );

    return { success: result.success, error: result.error };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Envoie une relance par WhatsApp
 */
async function sendWhatsAppReminder(
  debt: OverdueDebt,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!debt.client.phone) {
      return { success: false, error: "Pas de numéro de téléphone" };
    }

    const result = await sendCustomWhatsAppMessage(debt.client.phone, message);
    return { success: result.success, error: result.error };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Enregistre la relance dans la base de données
 */
async function recordReminder(
  debt: OverdueDebt,
  type: "email" | "whatsapp",
  message: string,
  subject: string | null,
  status: "sent" | "failed",
  error?: string | null
): Promise<void> {
  await db.reminder.create({
    data: {
      debtId: debt.id,
      clientId: debt.clientId,
      profileId: debt.profileId,
      type,
      subject: type === "email" ? subject : null,
      message,
      status,
      error: error || null,
      tone: getTone(debt.reminderCount + 1),
      sentAt: status === "sent" ? new Date() : null,
    },
  });
}

/**
 * Obtient le ton basé sur le numéro de relance
 */
function getTone(reminderNumber: number): string {
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

/**
 * Calcule les jours écoulés depuis une date
 */
function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Formate une date pour l'affichage
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Formate un montant pour l'affichage
 */
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

// =====================================================
// EXPORTS
// =====================================================

export { checkIfReminderNeeded, checkRateLimit };
export type { ScheduleReminderOptions, ReminderResult, ProcessingStats };
