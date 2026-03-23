// =====================================================
// RELANCEPRO AFRICA - SMS & Voice Types
// Types for SMS and Voice call integration
// =====================================================

// =====================================================
// SMS PROVIDER TYPES
// =====================================================

export type SMSProvider = 'twilio' | 'africastalking' | 'auto';

export interface SMSProviderConfig {
  provider: SMSProvider;
  twilio?: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  africastalking?: {
    apiKey: string;
    username: string;
    senderId?: string;
  };
}

export interface SMSCredentials {
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  africastalkingApiKey?: string;
  africastalkingUsername?: string;
  africastalkingSenderId?: string;
}

// =====================================================
// MESSAGE STATUS
// =====================================================

export type SMSStatus = 
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed'
  | 'accepted'
  | 'rejected'
  | 'pending';

export interface SMSMessageResult {
  success: boolean;
  messageId?: string;
  status: SMSStatus;
  cost?: number;
  segments?: number;
  error?: string;
  provider: SMSProvider;
  to: string;
}

export interface SMSDeliveryReport {
  messageId: string;
  status: SMSStatus;
  to: string;
  errorCode?: string;
  errorMessage?: string;
  deliveredAt?: Date;
  provider: SMSProvider;
}

// =====================================================
// VOICE CALL STATUS
// =====================================================

export type VoiceCallStatus = 
  | 'queued'
  | 'ringing'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'busy'
  | 'no-answer'
  | 'canceled'
  | 'initiated';

export interface VoiceCallResult {
  success: boolean;
  callId?: string;
  status: VoiceCallStatus;
  duration?: number;
  cost?: number;
  error?: string;
  provider: SMSProvider;
  to: string;
  recordingUrl?: string;
}

export interface VoiceCallReport {
  callId: string;
  status: VoiceCallStatus;
  duration?: number;
  recordingUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  provider: SMSProvider;
}

// =====================================================
// SMS MESSAGE TYPES
// =====================================================

export interface SendSMSParams {
  to: string;
  message: string;
  profileId: string;
  senderId?: string;
  scheduledAt?: Date;
  priority?: 'low' | 'normal' | 'high';
}

export interface SendBulkSMSParams {
  recipients: string[];
  message: string;
  profileId: string;
  senderId?: string;
}

export interface BulkSMSResult {
  success: boolean;
  totalSent: number;
  totalFailed: number;
  results: SMSMessageResult[];
  totalCost: number;
}

// =====================================================
// VOICE CALL TYPES
// =====================================================

export interface VoiceCallParams {
  to: string;
  profileId: string;
  message?: string; // Text-to-speech message
  audioUrl?: string; // Pre-recorded audio URL
  language?: VoiceLanguage;
  voice?: VoiceType;
  scheduledAt?: Date;
  callbackUrl?: string;
}

export type VoiceLanguage = 
  | 'fr-FR'  // French (France)
  | 'fr-SN'  // French (Senegal)
  | 'en-US'  // English (US)
  | 'en-GH'  // English (Ghana)
  | 'en-NG'; // English (Nigeria)

export type VoiceType = 
  | 'male'
  | 'female'
  | 'alice'
  | 'man';

export interface VoiceScript {
  id: string;
  name: string;
  language: VoiceLanguage;
  template: string;
  variables: string[];
}

// =====================================================
// AFRICAN COUNTRY CODES
// =====================================================

export interface AfricanCountry {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  currency: string;
  smsCost: number; // Cost in GNF per SMS
  voiceCost: number; // Cost in GNF per minute
}

export const AFRICAN_COUNTRIES: AfricanCountry[] = [
  {
    code: 'GN',
    name: 'Guinée',
    dialCode: '+224',
    flag: '🇬🇳',
    currency: 'GNF',
    smsCost: 50,
    voiceCost: 200,
  },
  {
    code: 'SN',
    name: 'Sénégal',
    dialCode: '+221',
    flag: '🇸🇳',
    currency: 'XOF',
    smsCost: 45,
    voiceCost: 180,
  },
  {
    code: 'CI',
    name: 'Côte d\'Ivoire',
    dialCode: '+225',
    flag: '🇨🇮',
    currency: 'XOF',
    smsCost: 40,
    voiceCost: 150,
  },
  {
    code: 'ML',
    name: 'Mali',
    dialCode: '+223',
    flag: '🇲🇱',
    currency: 'XOF',
    smsCost: 45,
    voiceCost: 180,
  },
  {
    code: 'BF',
    name: 'Burkina Faso',
    dialCode: '+226',
    flag: '🇧🇫',
    currency: 'XOF',
    smsCost: 45,
    voiceCost: 180,
  },
  {
    code: 'GH',
    name: 'Ghana',
    dialCode: '+233',
    flag: '🇬🇭',
    currency: 'GHS',
    smsCost: 35,
    voiceCost: 120,
  },
  {
    code: 'NG',
    name: 'Nigeria',
    dialCode: '+234',
    flag: '🇳🇬',
    currency: 'NGN',
    smsCost: 30,
    voiceCost: 100,
  },
];

export const COUNTRY_DIAL_CODES = AFRICAN_COUNTRIES.map(c => c.dialCode);

// =====================================================
// PROVIDER BALANCE
// =====================================================

export interface ProviderBalance {
  provider: SMSProvider;
  balance: number;
  currency: string;
  lastUpdated: Date;
}

// =====================================================
// SMS LOG TYPES (for database)
// =====================================================

export interface SMSLogData {
  id?: string;
  profileId: string;
  to: string;
  message: string;
  provider: SMSProvider;
  status: SMSStatus;
  cost: number;
  messageId?: string;
  segments?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// =====================================================
// VOICE CALL DATA (for database)
// =====================================================

export interface VoiceCallData {
  id?: string;
  profileId: string;
  to: string;
  provider: SMSProvider;
  status: VoiceCallStatus;
  duration?: number;
  cost?: number;
  callId?: string;
  message?: string;
  audioUrl?: string;
  recordingUrl?: string;
  scheduledAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// =====================================================
// WEBHOOK PAYLOADS
// =====================================================

export interface TwilioSMSWebhook {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  MessageStatus: SMSStatus;
  ErrorCode?: string;
  ErrorMessage?: string;
  NumSegments?: string;
  Price?: string;
  PriceUnit?: string;
}

export interface TwilioVoiceWebhook {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: VoiceCallStatus;
  CallDuration?: string;
  RecordingUrl?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  Price?: string;
  PriceUnit?: string;
}

export interface AfricasTalkingSMSWebhook {
  id: string;
  phoneNumber: string;
  statusCode: number;
  status: string;
  cost: string;
}

export interface AfricasTalkingVoiceWebhook {
  callSessionId: string;
  callerNumber: string;
  destinationNumber: string;
  callStartTime: string;
  callDirection: string;
  status: VoiceCallStatus;
  durationInSeconds?: number;
  recordingUrl?: string;
  currencyCode?: string;
  amount?: number;
}

// =====================================================
// PRICING ESTIMATION
// =====================================================

export interface SMSPricing {
  country: string;
  provider: SMSProvider;
  pricePerSMS: number;
  currency: string;
  segments: number;
  totalPrice: number;
}

export interface VoicePricing {
  country: string;
  provider: SMSProvider;
  pricePerMinute: number;
  currency: string;
  estimatedDuration: number; // in minutes
  totalPrice: number;
}

// =====================================================
// ERROR TYPES
// =====================================================

export class SMSError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: SMSProvider,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'SMSError';
  }
}

export class VoiceCallError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: SMSProvider,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'VoiceCallError';
  }
}
