// =====================================================
// RELANCEPRO AFRICA - Cron Jobs pour Relances Automatiques
// =====================================================

import { db } from "@/lib/db";

// Configuration des relances automatiques
const REMINDER_CONFIG = {
  // Délais en jours après l'échéance
  day1: 3,   // Première relance
  day2: 7,   // Deuxième relance
  day3: 14,  // Dernière relance
};

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
  reference: string | null;
  description: string | null;
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
}

// Fonction principale pour traiter les relances automatiques
export async function processAutomaticReminders(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  results: ReminderResult[];
}> {
  const results: ReminderResult[] = [];
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Récupérer toutes les créances en retard avec les infos client et profil
    const overdueDebts = await getOverdueDebts();
    processed = overdueDebts.length;

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
        console.error(`Error processing debt ${debt.id}:`, error);
        failed++;
        results.push({
          debtId: debt.id,
          clientId: debt.clientId,
          type: "email",
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          reminderNumber: debt.reminderCount + 1,
        });
      }
    }

    return { processed, sent, failed, skipped, results };
  } catch (error) {
    console.error("Error in processAutomaticReminders:", error);
    throw error;
  }
}

// Récupérer les créances en retard
async function getOverdueDebts(): Promise<OverdueDebt[]> {
  const now = new Date();
  
  const debts = await db.debt.findMany({
    where: {
      status: { in: ["pending", "partial"] },
      dueDate: { lt: now },
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

  return debts as unknown as OverdueDebt[];
}

// Traiter une relance pour une créance
async function processDebtReminder(debt: OverdueDebt): Promise<ReminderResult> {
  const { profile, client } = debt;
  const settings = profile.settings;

  // Vérifier si les relances automatiques sont activées
  if (!settings?.autoRemindEnabled) {
    return {
      debtId: debt.id,
      clientId: client.id,
      type: "email",
      status: "skipped",
      error: "Automatic reminders disabled",
      reminderNumber: debt.reminderCount + 1,
    };
  }

  // Vérifier la limite de relances du plan
  if (profile.remindersUsed >= profile.remindersLimit) {
    return {
      debtId: debt.id,
      clientId: client.id,
      type: "email",
      status: "skipped",
      error: "Reminder limit reached",
      reminderNumber: debt.reminderCount + 1,
    };
  }

  // Calculer les jours de retard
  const daysOverdue = Math.floor(
    (Date.now() - debt.dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Déterminer le numéro de relance
  const reminderDay1 = settings.reminderDay1 || REMINDER_CONFIG.day1;
  const reminderDay2 = settings.reminderDay2 || REMINDER_CONFIG.day2;
  const reminderDay3 = settings.reminderDay3 || REMINDER_CONFIG.day3;

  let reminderNumber = 0;
  let shouldSendReminder = false;

  // Logique de déclenchement des relances
  if (debt.reminderCount === 0 && daysOverdue >= reminderDay1) {
    reminderNumber = 1;
    shouldSendReminder = true;
  } else if (
    debt.reminderCount === 1 &&
    daysOverdue >= reminderDay2 &&
    debt.lastReminderAt &&
    daysSince(debt.lastReminderAt) >= (reminderDay2 - reminderDay1)
  ) {
    reminderNumber = 2;
    shouldSendReminder = true;
  } else if (
    debt.reminderCount === 2 &&
    daysOverdue >= reminderDay3 &&
    debt.lastReminderAt &&
    daysSince(debt.lastReminderAt) >= (reminderDay3 - reminderDay2)
  ) {
    reminderNumber = 3;
    shouldSendReminder = true;
  }

  if (!shouldSendReminder) {
    return {
      debtId: debt.id,
      clientId: client.id,
      type: "email",
      status: "skipped",
      error: "Not time for next reminder yet",
      reminderNumber: debt.reminderCount + 1,
    };
  }

  // Ne pas dépasser 3 relances automatiques
  if (debt.reminderCount >= 3) {
    return {
      debtId: debt.id,
      clientId: client.id,
      type: "email",
      status: "skipped",
      error: "Maximum reminders reached",
      reminderNumber: debt.reminderCount + 1,
    };
  }

  // Déterminer le type de relance (Email ou WhatsApp)
  const hasEmail = !!client.email && !!profile.resendApiKey;
  const hasWhatsApp = !!client.phone && !!profile.whatsappApiKey;

  if (!hasEmail && !hasWhatsApp) {
    return {
      debtId: debt.id,
      clientId: client.id,
      type: "email",
      status: "skipped",
      error: "No contact method available",
      reminderNumber,
    };
  }

  // Envoyer la relance
  const type: "email" | "whatsapp" = hasEmail ? "email" : "whatsapp";

  try {
    // Générer le message de relance
    const message = await generateReminderMessage(
      debt,
      reminderNumber,
      type,
      settings
    );

    // Envoyer via le service approprié
    if (type === "email") {
      await sendEmailReminder(debt, message, reminderNumber);
    } else {
      await sendWhatsAppReminder(debt, message, reminderNumber);
    }

    // Enregistrer la relance dans la DB
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

    // Mettre à jour la créance
    await db.debt.update({
      where: { id: debt.id },
      data: {
        reminderCount: { increment: 1 },
        lastReminderAt: new Date(),
        nextReminderAt: calculateNextReminderDate(reminderNumber, settings),
      },
    });

    // Mettre à jour le compteur de relances du profil
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
    };
  } catch (error) {
    console.error(`Failed to send reminder for debt ${debt.id}:`, error);
    
    // Enregistrer l'échec
    await db.reminder.create({
      data: {
        debtId: debt.id,
        clientId: client.id,
        profileId: profile.id,
        type,
        subject: type === "email" ? `Rappel de paiement - ${debt.reference || "Créance"}` : null,
        message: "",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        tone: getReminderTone(reminderNumber),
      },
    });

    return {
      debtId: debt.id,
      clientId: client.id,
      type,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      reminderNumber,
    };
  }
}

// Générer le message de relance
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

  // Utiliser le template personnalisé ou le template par défaut
  const template = templates[reminderNumber as 1 | 2 | 3];
  if (template) {
    return replaceTemplateVariables(template, debt);
  }

  // Template par défaut
  return getDefaultMessage(debt, reminderNumber, type);
}

// Remplacer les variables dans le template
function replaceTemplateVariables(template: string, debt: OverdueDebt): string {
  const daysOverdue = Math.floor(
    (Date.now() - debt.dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return template
    .replace(/\{\{client_name\}\}/g, debt.client.name)
    .replace(/\{\{company_name\}\}/g, debt.client.company || "")
    .replace(/\{\{amount\}\}/g, formatAmount(debt.amount, debt.currency))
    .replace(/\{\{currency\}\}/g, debt.currency)
    .replace(/\{\{reference\}\}/g, debt.reference || "N/A")
    .replace(/\{\{due_date\}\}/g, formatDate(debt.dueDate))
    .replace(/\{\{days_overdue\}\}/g, daysOverdue.toString())
    .replace(/\{\{business_name\}\}/g, debt.profile.companyName || "Notre entreprise");
}

// Message par défaut
function getDefaultMessage(
  debt: OverdueDebt,
  reminderNumber: number,
  type: "email" | "whatsapp"
): string {
  const daysOverdue = Math.floor(
    (Date.now() - debt.dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const businessName = debt.profile.companyName || "Notre entreprise";
  const tone = getReminderTone(reminderNumber);

  if (type === "email") {
    switch (reminderNumber) {
      case 1:
        return `Bonjour ${debt.client.name},

Nous espérons que vous allez bien.

Nous vous rappelons que la facture ${debt.reference || ""} d'un montant de ${formatAmount(debt.amount, debt.currency)}, échéante le ${formatDate(debt.dueDate)}, n'a pas encore été réglée.

Le paiement est en retard de ${daysOverdue} jours.

Nous vous prions de bien vouloir régulariser cette situation dans les meilleurs délais.

Cordialement,
${businessName}`;

      case 2:
        return `Bonjour ${debt.client.name},

Malgré notre précédent rappel, nous n'avons toujours pas reçu le paiement de la facture ${debt.reference || ""} d'un montant de ${formatAmount(debt.amount, debt.currency)}.

Le retard est maintenant de ${daysOverdue} jours.

Nous vous prions de régler ce montant dans les 48 heures pour éviter toute action supplémentaire.

Cordialement,
${businessName}`;

      case 3:
        return `URGENT - Dernier rappel

Bonjour ${debt.client.name},

Après deux rappels restés sans réponse, nous vous informons que la facture ${debt.reference || ""} de ${formatAmount(debt.amount, debt.currency)} est en retard de ${daysOverdue} jours.

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

Petit rappel: la facture ${debt.reference || ""} de ${formatAmount(debt.amount, debt.currency)} est en retard de ${daysOverdue} jours.

Pourriez-vous régler ce paiement rapidement ?

Merci! 🙏
${businessName}`;

    case 2:
      return `Bonjour ${debt.client.name}

Rappel: Facture ${debt.reference || ""} de ${formatAmount(debt.amount, debt.currency)} en retard de ${daysOverdue} jours.

⚠️ Merci de régler dans les 48h.

${businessName}`;

    case 3:
      return `⚠️ DERNIER RAPPEL

${debt.client.name},
Facture ${debt.reference || ""}: ${formatAmount(debt.amount, debt.currency)}
Retard: ${daysOverdue} jours

⚠️ Sans paiement sous 7 jours, transmission au recouvrement.

${businessName}`;

    default:
      return "";
  }
}

// Envoyer un email de relance
async function sendEmailReminder(
  debt: OverdueDebt,
  message: string,
  _reminderNumber: number
): Promise<void> {
  // Utiliser l'API Resend
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
    throw new Error(`Email send failed: ${response.statusText}`);
  }
}

// Envoyer un WhatsApp de relance
async function sendWhatsAppReminder(
  debt: OverdueDebt,
  message: string,
  _reminderNumber: number
): Promise<void> {
  // Utiliser l'API Whapi.cloud
  const whatsappApiKey = debt.profile.whatsappApiKey;
  
  if (!whatsappApiKey || !debt.client.phone) {
    throw new Error("WhatsApp configuration missing");
  }

  // Normaliser le numéro de téléphone
  let phone = debt.client.phone.replace(/\D/g, "");
  if (!phone.startsWith("225") && !phone.startsWith("221") && !phone.startsWith("233")) {
    // Ajouter le préfixe pays par défaut (Côte d'Ivoire)
    phone = "225" + phone;
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
    throw new Error(`WhatsApp send failed: ${response.statusText}`);
  }
}

// Utilitaires
function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
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

function calculateNextReminderDate(
  currentReminder: number,
  settings: OverdueDebt["profile"]["settings"]
): Date | null {
  if (currentReminder >= 3) return null;

  const now = new Date();
  const days = currentReminder === 1
    ? (settings?.reminderDay2 || REMINDER_CONFIG.day2) - (settings?.reminderDay1 || REMINDER_CONFIG.day1)
    : (settings?.reminderDay3 || REMINDER_CONFIG.day3) - (settings?.reminderDay2 || REMINDER_CONFIG.day2);

  now.setDate(now.getDate() + days);
  return now;
}

// Export pour utilisation dans l'API cron
export { getOverdueDebts, processDebtReminder };
