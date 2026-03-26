export interface SMSCredentials {
  provider: 'twilio' | 'africastalking';
  accountSid?: string;
  authToken?: string;
  apiKey?: string;
  username?: string;
  senderId?: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
}

export interface SMSConfig {
  twilio?: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  africastalking?: {
    apiKey: string;
    username: string;
    senderId: string;
  };
}

export const SMS_RATE_LIMITS = {
  perMinute: 10,
  perHour: 100,
  perDay: 500,
};
