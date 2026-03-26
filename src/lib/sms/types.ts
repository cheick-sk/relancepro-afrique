export interface SMSMessage {
  id: string;
  to: string;
  message: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  provider: 'twilio' | 'africastalking';
  cost?: number;
  createdAt: Date;
}

export interface VoiceCallMessage {
  id: string;
  to: string;
  message: string;
  status: 'pending' | 'initiated' | 'completed' | 'failed';
  duration?: number;
  cost?: number;
  createdAt: Date;
}

export type VoiceLanguage = 'fr' | 'en' | 'ar' | 'wo' | 'bm';

export interface AfricanCountry {
  code: string;
  name: string;
  phoneCode: string;
  currency: string;
  flag: string;
}

export const AFRICAN_COUNTRIES: AfricanCountry[] = [
  { code: 'GN', name: 'Guinée', phoneCode: '+224', currency: 'GNF', flag: '🇬🇳' },
  { code: 'CI', name: "Côte d'Ivoire", phoneCode: '+225', currency: 'XOF', flag: '🇨🇮' },
  { code: 'SN', name: 'Sénégal', phoneCode: '+221', currency: 'XOF', flag: '🇸🇳' },
  { code: 'ML', name: 'Mali', phoneCode: '+223', currency: 'XOF', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', phoneCode: '+226', currency: 'XOF', flag: '🇧🇫' },
  { code: 'CM', name: 'Cameroun', phoneCode: '+237', currency: 'XAF', flag: '🇨🇲' },
  { code: 'NG', name: 'Nigeria', phoneCode: '+234', currency: 'NGN', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', phoneCode: '+233', currency: 'GHS', flag: '🇬🇭' },
  { code: 'MA', name: 'Maroc', phoneCode: '+212', currency: 'MAD', flag: '🇲🇦' },
  { code: 'TN', name: 'Tunisie', phoneCode: '+216', currency: 'TND', flag: '🇹🇳' },
  { code: 'DZ', name: 'Algérie', phoneCode: '+213', currency: 'DZD', flag: '🇩🇿' },
  { code: 'EG', name: 'Égypte', phoneCode: '+20', currency: 'EGP', flag: '🇪🇬' },
  { code: 'KE', name: 'Kenya', phoneCode: '+254', currency: 'KES', flag: '🇰🇪' },
  { code: 'RW', name: 'Rwanda', phoneCode: '+250', currency: 'RWF', flag: '🇷🇼' },
  { code: 'CD', name: 'RD Congo', phoneCode: '+243', currency: 'CDF', flag: '🇨🇩' },
];

// Webhook types
export interface TwilioSMSWebhook {
  MessageSid: string;
  MessageStatus: string;
  From: string;
  To: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

export interface TwilioVoiceWebhook {
  CallSid: string;
  CallStatus: string;
  From: string;
  To: string;
  CallDuration?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

export interface AfricasTalkingSMSWebhook {
  id: string;
  phoneNumber: string;
  statusCode: string;
  status: string;
  cost: string;
}

export interface AfricasTalkingVoiceWebhook {
  isActive: string;
  sessionId: string;
  direction: string;
  callerNumber: string;
  destinationNumber: string;
  dtmfDigits?: string;
  recordingUrl?: string;
  durationInSeconds?: string;
  currencyCode?: string;
  amount?: string;
}
