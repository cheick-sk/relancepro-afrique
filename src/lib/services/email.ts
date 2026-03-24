import { Resend } from "resend";
import { Debt, Client, Profile } from "@/types";
import { formatCurrency, formatDate } from "@/components/shared/status-badge";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
  replyTo,
}: SendEmailParams) {
  const defaultFrom = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  try {
    const { data, error } = await resend.emails.send({
      from: from || defaultFrom,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

interface ReminderEmailParams {
  client: Client;
  debt: Debt;
  profile: Profile;
  reminderNumber: 1 | 2 | 3;
  companyName?: string;
}

export function generateReminderEmailContent({
  client,
  debt,
  profile,
  reminderNumber,
  companyName,
}: ReminderEmailParams): { subject: string; html: string } {
  const amount = formatCurrency(debt.amount, debt.currency);
  const balance = formatCurrency(debt.amount - debt.paidAmount, debt.currency);
  const dueDate = formatDate(debt.dueDate);
  const today = formatDate(new Date());
  const company = companyName || profile.companyName || profile.name || "Votre fournisseur";

  const templates = {
    1: {
      subject: `Rappel : Facture ${debt.reference || "en attente"} - ${amount}`,
      greeting: `Bonjour ${client.name},`,
      body: `
        <p>Nous espérons que vous allez bien.</p>
        <p>Nous vous rappelons que la facture <strong>${debt.reference || "en attente"}</strong> 
        d'un montant de <strong>${amount}</strong>, dont l'échéance était le <strong>${dueDate}</strong>, 
        n'a pas encore été réglée.</p>
        ${debt.paidAmount > 0 ? `<p>Montant déjà payé : ${formatCurrency(debt.paidAmount, debt.currency)}. 
        Solde restant : <strong>${balance}</strong>.</p>` : ""}
        <p>Nous vous prions de bien vouloir procéder au paiement dans les meilleurs délais.</p>
      `,
    },
    2: {
      subject: `2ème rappel : Facture ${debt.reference || "en attente"} - ${amount}`,
      greeting: `Bonjour ${client.name},`,
      body: `
        <p>Malgré notre précédent rappel, nous n'avons pas encore reçu le paiement 
        de la facture <strong>${debt.reference || "en attente"}</strong> d'un montant de <strong>${amount}</strong>.</p>
        ${debt.paidAmount > 0 ? `<p>Montant déjà payé : ${formatCurrency(debt.paidAmount, debt.currency)}. 
        Solde restant : <strong>${balance}</strong>.</p>` : ""}
        <p>Nous vous prions de régulariser cette situation dans les plus brefs délais 
        pour éviter des frais de retard supplémentaires.</p>
      `,
    },
    3: {
      subject: `DERNIER RAPPEL - Facture ${debt.reference || "en attente"} - ${amount}`,
      greeting: `Bonjour ${client.name},`,
      body: `
        <p><strong>ATTENTION : Dernier rappel avant recouvrement</strong></p>
        <p>C'est notre troisième et dernier rappel concernant la facture 
        <strong>${debt.reference || "en attente"}</strong> d'un montant de <strong>${amount}</strong>, 
        impayée depuis le <strong>${dueDate}</strong>.</p>
        ${debt.paidAmount > 0 ? `<p>Montant déjà payé : ${formatCurrency(debt.paidAmount, debt.currency)}. 
        Solde restant : <strong>${balance}</strong>.</p>` : ""}
        <p><strong>À défaut de paiement sous 7 jours, nous serons contraints de confier 
        ce dossier à notre service de recouvrement.</strong></p>
      `,
    },
  };

  const template = templates[reminderNumber];

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${template.subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f97316 0%, #f59e0b 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${company}</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <p style="font-size: 16px;">${template.greeting}</p>
        ${template.body}
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Détails de la facture</h3>
          <p style="margin: 5px 0;"><strong>Référence :</strong> ${debt.reference || "N/A"}</p>
          <p style="margin: 5px 0;"><strong>Montant :</strong> ${amount}</p>
          <p style="margin: 5px 0;"><strong>Échéance :</strong> ${dueDate}</p>
          <p style="margin: 5px 0;"><strong>Date du jour :</strong> ${today}</p>
        </div>
        <p>Nous restons à votre disposition pour tout arrangement de paiement.</p>
        <p>Cordialement,<br><strong>${profile.name || "L'équipe"}</strong><br>${company}</p>
      </div>
      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>Cet email a été envoyé via RelancePro Africa</p>
        <p>Date d'envoi : ${today}</p>
      </div>
    </body>
    </html>
  `;

  return { subject: template.subject, html };
}

export async function sendReminderEmail(
  client: Client,
  debt: Debt,
  profile: Profile,
  reminderNumber: 1 | 2 | 3,
  customContent?: { subject?: string; message?: string }
) {
  if (!client.email) {
    return { success: false, error: "Le client n'a pas d'adresse email" };
  }

  let subject: string;
  let html: string;

  // Use custom content if provided, otherwise use template
  if (customContent?.subject && customContent?.message) {
    subject = customContent.subject;
    // Convert plain text message to HTML
    html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #f59e0b 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${profile.companyName || profile.name || "RelancePro Africa"}</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          ${customContent.message.replace(/\n/g, '<br>')}
          <p style="margin-top: 30px;">Cordialement,<br><strong>${profile.name || "L'équipe"}</strong><br>${profile.companyName || ""}</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>Cet email a été envoyé via RelancePro Africa</p>
        </div>
      </body>
      </html>
    `;
  } else {
    const content = generateReminderEmailContent({
      client,
      debt,
      profile,
      reminderNumber,
    });
    subject = content.subject;
    html = content.html;
  }

  return sendEmail({
    to: client.email,
    subject,
    html,
    replyTo: profile.email,
  });
}
