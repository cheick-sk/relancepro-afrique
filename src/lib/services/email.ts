import { Resend } from 'resend';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Initialize Resend client
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const defaultFrom = process.env.RESEND_FROM_EMAIL || 'noreply@relancepro.africa';

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    // If Resend is not configured, log and return success (dev mode)
    if (!resend) {
      console.log('[Email] Resend not configured, would send:', {
        to: options.to,
        subject: options.subject,
      });
      return {
        success: true,
        messageId: `dev_${Date.now()}`,
      };
    }

    const { data, error } = await resend.emails.send({
      from: options.from || defaultFrom,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo,
      attachments: options.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
      })),
    });

    if (error) {
      console.error('[Email] Send error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Exception:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Pre-built email templates
export async function sendTeamInvitation(params: {
  to: string;
  teamName: string;
  inviterName: string;
  acceptUrl: string;
  role: string;
}): Promise<EmailResult> {
  const { to, teamName, inviterName, acceptUrl, role } = params;
  
  const roleLabels: Record<string, string> = {
    admin: 'Administrateur',
    manager: 'Gestionnaire',
    agent: 'Agent',
    viewer: 'Observateur',
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f97316, #f59e0b); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🦁 RelancePro Africa</h1>
        </div>
        <div class="content">
          <h2>Vous êtes invité à rejoindre ${teamName}</h2>
          <p>Bonjour,</p>
          <p><strong>${inviterName}</strong> vous invite à rejoindre l'équipe <strong>${teamName}</strong> sur RelancePro Africa en tant que <strong>${roleLabels[role] || role}</strong>.</p>
          <p>RelancePro Africa est une plateforme de gestion des créances clients qui vous aidera à suivre et récupérer vos impayés efficacement.</p>
          <a href="${acceptUrl}" class="button">Accepter l'invitation</a>
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            Ce lien expire dans 7 jours. Si vous ne souhaitez pas rejoindre cette équipe, vous pouvez ignorer cet email.
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} RelancePro Africa. Tous droits réservés.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `${inviterName} vous invite à rejoindre ${teamName} sur RelancePro Africa`,
    html,
  });
}

export async function sendPaymentReminder(params: {
  to: string;
  clientName: string;
  amount: string;
  currency: string;
  dueDate: string;
  reference?: string;
}): Promise<EmailResult> {
  const { to, clientName, amount, currency, dueDate, reference } = params;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f97316, #f59e0b); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .amount { font-size: 28px; font-weight: bold; color: #f97316; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🦁 Rappel de paiement</h1>
        </div>
        <div class="content">
          <p>Bonjour ${clientName},</p>
          <p>Nous vous rappelons qu'une facture est en attente de paiement :</p>
          <div class="details">
            <p><strong>Montant dû :</strong> <span class="amount">${amount} ${currency}</span></p>
            <p><strong>Date d'échéance :</strong> ${dueDate}</p>
            ${reference ? `<p><strong>Référence :</strong> ${reference}</p>` : ''}
          </div>
          <p>Merci de régulariser votre situation dans les meilleurs délais.</p>
          <p>Pour toute question, n'hésitez pas à nous contacter.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} RelancePro Africa</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Rappel : Facture de ${amount} ${currency} en attente`,
    html,
  });
}
