import { Debt, Client, Profile } from "@/types";
import { formatCurrency, formatDate } from "@/components/shared/status-badge";

interface WhatsAppMessage {
  to: string;
  message: string;
}

interface SendWhatsAppResult {
  success: boolean;
  id?: string;
  error?: string;
}

// Format phone number for WhatsApp API (remove spaces, add country code if needed)
function formatPhoneNumber(phone: string): string {
  // Remove spaces, dashes, parentheses
  let formatted = phone.replace(/[\s\-\(\)]/g, "");

  // If starts with 0, replace with + country code (default: Senegal +221)
  if (formatted.startsWith("0")) {
    formatted = "+221" + formatted.substring(1);
  }

  // If doesn't start with +, add +
  if (!formatted.startsWith("+")) {
    formatted = "+" + formatted;
  }

  return formatted;
}

// Generate WhatsApp reminder message
interface WhatsAppReminderParams {
  client: Client;
  debt: Debt;
  profile: Profile;
  reminderNumber: 1 | 2 | 3;
  companyName?: string;
}

export function generateWhatsAppMessage({
  client,
  debt,
  profile,
  reminderNumber,
  companyName,
}: WhatsAppReminderParams): string {
  const amount = formatCurrency(debt.amount, debt.currency);
  const balance = formatCurrency(debt.amount - debt.paidAmount, debt.currency);
  const dueDate = formatDate(debt.dueDate);
  const company = companyName || profile.companyName || profile.name || "Nous";

  const templates = {
    1: `Bonjour ${client.name},

📋 *Rappel de facture*

Référence: ${debt.reference || "N/A"}
Montant: ${amount}
Échéance: ${dueDate}

${debt.paidAmount > 0 ? `✅ Déjà payé: ${formatCurrency(debt.paidAmount, debt.currency)}
💰 Reste à payer: ${balance}` : ""}

Merci de régulariser votre situation.

Cordialement,
${company}`,

    2: `Bonjour ${client.name},

⚠️ *2ème Rappel - Facture impayée*

Référence: ${debt.reference || "N/A"}
Montant: ${amount}
En retard depuis: ${dueDate}

${debt.paidAmount > 0 ? `✅ Déjà payé: ${formatCurrency(debt.paidAmount, debt.currency)}
💰 Reste à payer: ${balance}` : ""}

⚠️ Merci de régler rapidement pour éviter des frais supplémentaires.

${company}`,

    3: `🚨 *DERNIER RAPPEL* 🚨

Bonjour ${client.name},

Facture: ${debt.reference || "N/A"}
Montant: ${amount}
Impayée depuis: ${dueDate}

${debt.paidAmount > 0 ? `✅ Déjà payé: ${formatCurrency(debt.paidAmount, debt.currency)}
💰 Reste à payer: ${balance}` : ""}

⚠️ *Sans paiement sous 7 jours, ce dossier sera transmis au service de recouvrement.*

Contactez-nous rapidement pour un arrangement.

${company}`,
  };

  return templates[reminderNumber];
}

// Send WhatsApp message via Whapi.cloud
export async function sendWhatsAppMessage(
  params: WhatsAppReminderParams
): Promise<SendWhatsAppResult> {
  const { client } = params;

  if (!client.phone) {
    return { success: false, error: "Le client n'a pas de numéro WhatsApp" };
  }

  const apiKey = process.env.WHAPI_API_KEY;
  if (!apiKey) {
    // En développement, simuler l'envoi
    console.log("WhatsApp API key not configured, simulating send...");
    return {
      success: true,
      id: `simulated_${Date.now()}`,
    };
  }

  const message = generateWhatsAppMessage(params);
  const to = formatPhoneNumber(client.phone);

  try {
    const response = await fetch("https://gate.whapi.cloud/messages/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to,
        body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("WhatsApp API error:", error);
      return {
        success: false,
        error: `Erreur WhatsApp: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      id: data.id || data.messages?.[0]?.id,
    };
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Custom message content interface
interface CustomMessageContent {
  subject?: string;
  message?: string;
}

// Send reminder (smart routing based on available channels)
export async function sendReminder(
  client: Client,
  debt: Debt,
  profile: Profile,
  type: "email" | "whatsapp" | "auto",
  customContent?: CustomMessageContent
): Promise<{
  email?: SendWhatsAppResult;
  whatsapp?: SendWhatsAppResult;
  reminderNumber: number;
}> {
  // Determine reminder number based on count
  const reminderNumber = Math.min((debt.reminderCount + 1) as 1 | 2 | 3, 3);

  const result: {
    email?: SendWhatsAppResult;
    whatsapp?: SendWhatsAppResult;
    reminderNumber: number;
  } = { reminderNumber };

  // Import email service dynamically to avoid circular deps
  const { sendReminderEmail } = await import("./email");

  if (type === "auto") {
    // Smart routing: use both if available
    if (client.email) {
      result.email = await sendReminderEmail(
        client,
        debt,
        profile,
        reminderNumber,
        customContent
      );
    }
    if (client.phone) {
      // Use custom message if provided, otherwise use template
      if (customContent?.message) {
        result.whatsapp = await sendCustomWhatsAppMessage(client.phone, customContent.message);
      } else {
        result.whatsapp = await sendWhatsAppMessage({
          client,
          debt,
          profile,
          reminderNumber,
        });
      }
    }
  } else if (type === "email" && client.email) {
    result.email = await sendReminderEmail(
      client,
      debt,
      profile,
      reminderNumber,
      customContent
    );
  } else if (type === "whatsapp" && client.phone) {
    // Use custom message if provided, otherwise use template
    if (customContent?.message) {
      result.whatsapp = await sendCustomWhatsAppMessage(client.phone, customContent.message);
    } else {
      result.whatsapp = await sendWhatsAppMessage({
        client,
        debt,
        profile,
        reminderNumber,
      });
    }
  }

  return result;
}

// Send custom WhatsApp message
export async function sendCustomWhatsAppMessage(
  phone: string,
  message: string
): Promise<SendWhatsAppResult> {
  const apiKey = process.env.WHAPI_API_KEY;
  if (!apiKey) {
    // En développement, simuler l'envoi
    console.log("WhatsApp API key not configured, simulating send...");
    return {
      success: true,
      id: `simulated_${Date.now()}`,
    };
  }

  const to = formatPhoneNumber(phone);

  try {
    const response = await fetch("https://gate.whapi.cloud/messages/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to,
        body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("WhatsApp API error:", error);
      return {
        success: false,
        error: `Erreur WhatsApp: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      id: data.id || data.messages?.[0]?.id,
    };
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
