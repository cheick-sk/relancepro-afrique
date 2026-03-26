export interface WhatsAppMessage {
  to: string;
  message: string;
  type?: 'text' | 'template';
  templateName?: string;
  templateParams?: string[];
}

export async function sendReminder(to: string, message: string): Promise<{ success: boolean; messageId?: string }> {
  console.log('Sending WhatsApp reminder to:', to);
  
  return {
    success: true,
    messageId: `wa_${Date.now()}`,
  };
}

export async function sendWhatsApp(params: WhatsAppMessage): Promise<{ success: boolean; messageId?: string }> {
  return sendReminder(params.to, params.message);
}

export function validateWhatsAppNumber(phone: string): boolean {
  // WhatsApp numbers should be in international format
  const phoneRegex = /^\+?[1-9]\d{8,14}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}
