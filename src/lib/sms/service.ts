import type { SMSConfig, SMSResult } from './config';
import type { VoiceLanguage } from './types';

const defaultConfig: SMSConfig = {};

export function setSMSConfig(config: SMSConfig): void {
  Object.assign(defaultConfig, config);
}

export function getSMSConfig(): SMSConfig {
  return defaultConfig;
}

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  // Validate phone number format for African countries
  const phoneRegex = /^\+?(224|225|226|227|228|229|221|223|235|237|241|242|253|254|255|256|257|258|260|261|263|265|266|267|268|269)\d{7,12}$/;
  
  if (!phoneRegex.test(to.replace(/[\s-]/g, ''))) {
    return { success: false, error: 'Invalid African phone number format' };
  }

  // In production, implement actual SMS sending
  console.log(`SMS to ${to}: ${message}`);
  
  return { success: true, messageId: `msg_${Date.now()}` };
}

export function validateAfricanPhone(phone: string): boolean {
  const phoneRegex = /^\+?(224|225|226|227|228|229|221|223|235|237|241|242|253|254|255|256|257|258|260|261|263|265|266|267|268|269)\d{7,12}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

export function estimateSMSCost(message: string): number {
  // SMS cost in FG (Guinean Francs)
  const smsLength = message.length;
  const segments = Math.ceil(smsLength / 160);
  return segments * 50; // 50 FG per segment
}

export function estimateVoiceCost(duration: number): number {
  // Voice call cost in FG per minute
  return Math.ceil(duration / 60) * 200; // 200 FG per minute
}

export function selectBestProvider(): 'twilio' | 'africastalking' {
  // Africa's Talking is better for African numbers
  return 'africastalking';
}

export async function getAllBalances(): Promise<Record<string, { balance: number; currency: string }>> {
  return {
    twilio: { balance: 0, currency: 'USD' },
    africastalking: { balance: 0, currency: 'USD' },
  };
}

export function generateVoiceScript(type: string, data: Record<string, string>, language: VoiceLanguage = 'fr'): string {
  const templates: Record<string, string> = {
    reminder: `Bonjour ${data.clientName || ''}, nous vous appelons concernant votre facture de ${data.amount || ''}.`,
    overdue: `Bonjour ${data.clientName || ''}, votre facture est en retard de ${data.daysOverdue || ''} jours.`,
  };
  
  return templates[type] || templates.reminder;
}

export async function sendVoiceCall(to: string, message: string): Promise<SMSResult> {
  console.log(`Voice call to ${to}: ${message}`);
  return { success: true, messageId: `voice_${Date.now()}` };
}
