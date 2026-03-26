export interface PaymentPattern {
  averageDaysToPay: number;
  onTimePaymentRate: number;
  preferredChannels: string[];
  bestContactTimes: string[];
}

export interface Anomaly {
  type: 'unusual_amount' | 'unusual_frequency' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: Date;
}

export async function analyzePaymentPatterns(clientId: string): Promise<PaymentPattern> {
  return {
    averageDaysToPay: 30,
    onTimePaymentRate: 0.75,
    preferredChannels: ['sms', 'whatsapp'],
    bestContactTimes: ['09:00', '14:00'],
  };
}

export async function detectAnomalies(clientId: string): Promise<Anomaly[]> {
  return [];
}

export function getOptimalReminderTime(clientId: string): string {
  return '09:00';
}

export function getPreferredChannel(clientId: string): 'sms' | 'whatsapp' | 'email' | 'voice' {
  return 'sms';
}
