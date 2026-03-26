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

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  console.log('Sending email:', options.subject, 'to', options.to);
  
  // In production, integrate with Resend, SendGrid, or similar
  return {
    success: true,
    messageId: `email_${Date.now()}`,
  };
}
