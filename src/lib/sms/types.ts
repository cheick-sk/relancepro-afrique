// SMS types and configurations

export interface SMSConfig {
  provider: "twilio" | "africastalking" | "infobip"
  apiKey: string
  apiSecret?: string
  senderId?: string
}

export interface SMSMessage {
  to: string
  message: string
  from?: string
}

export interface SMSResponse {
  success: boolean
  messageId?: string
  error?: string
}

export interface AfricanCountry {
  code: string
  name: string
  dialCode: string
  minLength: number
  maxLength: number
}

export const AFRICAN_COUNTRIES: AfricanCountry[] = [
  { code: "SN", name: "Sénégal", dialCode: "+221", minLength: 9, maxLength: 9 },
  { code: "CI", name: "Côte d'Ivoire", dialCode: "+225", minLength: 10, maxLength: 10 },
  { code: "ML", name: "Mali", dialCode: "+223", minLength: 8, maxLength: 8 },
  { code: "BF", name: "Burkina Faso", dialCode: "+226", minLength: 8, maxLength: 8 },
  { code: "BJ", name: "Bénin", dialCode: "+229", minLength: 8, maxLength: 8 },
  { code: "TG", name: "Togo", dialCode: "+228", minLength: 8, maxLength: 8 },
  { code: "NE", name: "Niger", dialCode: "+227", minLength: 8, maxLength: 8 },
  { code: "GN", name: "Guinée", dialCode: "+224", minLength: 9, maxLength: 9 },
  { code: "CM", name: "Cameroun", dialCode: "+237", minLength: 9, maxLength: 9 },
  { code: "NG", name: "Nigeria", dialCode: "+234", minLength: 10, maxLength: 10 },
  { code: "GH", name: "Ghana", dialCode: "+233", minLength: 9, maxLength: 9 },
  { code: "KE", name: "Kenya", dialCode: "+254", minLength: 9, maxLength: 10 },
  { code: "ZA", name: "Afrique du Sud", dialCode: "+27", minLength: 9, maxLength: 9 },
  { code: "MA", name: "Maroc", dialCode: "+212", minLength: 9, maxLength: 9 },
  { code: "TN", name: "Tunisie", dialCode: "+216", minLength: 8, maxLength: 8 },
  { code: "DZ", name: "Algérie", dialCode: "+213", minLength: 9, maxLength: 9 },
  { code: "EG", name: "Égypte", dialCode: "+20", minLength: 10, maxLength: 10 },
]

export const SMS_RATE_LIMITS = {
  perMinute: 10,
  perHour: 100,
  perDay: 1000,
}

export type VoiceLanguage = "fr" | "en" | "wo" | "ar"

export interface TwilioSMSWebhook {
  MessageSid: string
  AccountSid: string
  From: string
  To: string
  MessageStatus: string
}

export interface TwilioVoiceWebhook {
  CallSid: string
  AccountSid: string
  From: string
  To: string
  CallStatus: string
}

export interface AfricasTalkingSMSWebhook {
  id: string
  phoneNumber: string
  statusCode: string
  status: string
}

export interface AfricasTalkingVoiceWebhook {
  isActive: string
  sessionId: string
  direction: string
  callerNumber: string
  destinationNumber: string
  dtmfDigits?: string
}
