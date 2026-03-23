// =====================================================
// RELANCEPRO AFRICA - SMS Configuration
// Provider configuration, pricing, and templates
// =====================================================

import { SMSProvider, VoiceLanguage } from './types';

// =====================================================
// PROVIDER CONFIGURATION
// =====================================================

export interface ProviderConfig {
  name: string;
  type: SMSProvider;
  enabled: boolean;
  features: {
    sms: boolean;
    voice: boolean;
    bulkSms: boolean;
    senderId: boolean;
    deliveryReports: boolean;
  };
  website: string;
  consoleUrl: string;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    name: 'Twilio',
    type: 'twilio',
    enabled: true,
    features: {
      sms: true,
      voice: true,
      bulkSms: true,
      senderId: false,
      deliveryReports: true,
    },
    website: 'https://www.twilio.com',
    consoleUrl: 'https://www.twilio.com/console',
  },
  {
    name: "Africa's Talking",
    type: 'africastalking',
    enabled: true,
    features: {
      sms: true,
      voice: true,
      bulkSms: true,
      senderId: true,
      deliveryReports: true,
    },
    website: 'https://africastalking.com',
    consoleUrl: 'https://account.africastalking.com',
  },
];

// =====================================================
// SMS PRICING PER COUNTRY (in GNF - Guinean Francs)
// =====================================================

export interface CountryPricing {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  currency: string;
  smsCost: number; // Cost per SMS segment in GNF
  voiceCost: number; // Cost per minute in GNF
  twilioSmsCost: number; // Twilio specific cost
  africastalkingSmsCost: number; // Africa's Talking specific cost
  supportedProviders: SMSProvider[];
  voiceEnabled: boolean;
}

export const SMS_PRICING: CountryPricing[] = [
  {
    code: 'GN',
    name: 'Guinée',
    dialCode: '+224',
    flag: '🇬🇳',
    currency: 'GNF',
    smsCost: 150,
    voiceCost: 500,
    twilioSmsCost: 180,
    africastalkingSmsCost: 150,
    supportedProviders: ['twilio', 'africastalking'],
    voiceEnabled: true,
  },
  {
    code: 'SN',
    name: 'Sénégal',
    dialCode: '+221',
    flag: '🇸🇳',
    currency: 'XOF',
    smsCost: 100,
    voiceCost: 400,
    twilioSmsCost: 120,
    africastalkingSmsCost: 100,
    supportedProviders: ['twilio', 'africastalking'],
    voiceEnabled: true,
  },
  {
    code: 'CI',
    name: "Côte d'Ivoire",
    dialCode: '+225',
    flag: '🇨🇮',
    currency: 'XOF',
    smsCost: 100,
    voiceCost: 400,
    twilioSmsCost: 110,
    africastalkingSmsCost: 100,
    supportedProviders: ['twilio', 'africastalking'],
    voiceEnabled: true,
  },
  {
    code: 'ML',
    name: 'Mali',
    dialCode: '+223',
    flag: '🇲🇱',
    currency: 'XOF',
    smsCost: 120,
    voiceCost: 450,
    twilioSmsCost: 140,
    africastalkingSmsCost: 120,
    supportedProviders: ['twilio', 'africastalking'],
    voiceEnabled: true,
  },
  {
    code: 'BF',
    name: 'Burkina Faso',
    dialCode: '+226',
    flag: '🇧🇫',
    currency: 'XOF',
    smsCost: 110,
    voiceCost: 420,
    twilioSmsCost: 130,
    africastalkingSmsCost: 110,
    supportedProviders: ['twilio', 'africastalking'],
    voiceEnabled: true,
  },
  {
    code: 'GH',
    name: 'Ghana',
    dialCode: '+233',
    flag: '🇬🇭',
    currency: 'GHS',
    smsCost: 80,
    voiceCost: 300,
    twilioSmsCost: 90,
    africastalkingSmsCost: 80,
    supportedProviders: ['twilio', 'africastalking'],
    voiceEnabled: true,
  },
  {
    code: 'NG',
    name: 'Nigeria',
    dialCode: '+234',
    flag: '🇳🇬',
    currency: 'NGN',
    smsCost: 70,
    voiceCost: 280,
    twilioSmsCost: 75,
    africastalkingSmsCost: 70,
    supportedProviders: ['twilio', 'africastalking'],
    voiceEnabled: true,
  },
  {
    code: 'CM',
    name: 'Cameroun',
    dialCode: '+237',
    flag: '🇨🇲',
    currency: 'XAF',
    smsCost: 100,
    voiceCost: 400,
    twilioSmsCost: 120,
    africastalkingSmsCost: 100,
    supportedProviders: ['twilio', 'africastalking'],
    voiceEnabled: true,
  },
  {
    code: 'TG',
    name: 'Togo',
    dialCode: '+228',
    flag: '🇹🇬',
    currency: 'XOF',
    smsCost: 110,
    voiceCost: 420,
    twilioSmsCost: 130,
    africastalkingSmsCost: 110,
    supportedProviders: ['africastalking'],
    voiceEnabled: true,
  },
  {
    code: 'BJ',
    name: 'Bénin',
    dialCode: '+229',
    flag: '🇧🇯',
    currency: 'XOF',
    smsCost: 110,
    voiceCost: 420,
    twilioSmsCost: 130,
    africastalkingSmsCost: 110,
    supportedProviders: ['africastalking'],
    voiceEnabled: true,
  },
];

// =====================================================
// SUPPORTED COUNTRIES FOR VOICE
// =====================================================

export const VOICE_SUPPORTED_COUNTRIES = SMS_PRICING.filter(c => c.voiceEnabled).map(c => ({
  code: c.code,
  name: c.name,
  flag: c.flag,
  dialCode: c.dialCode,
}));

// =====================================================
// MESSAGE TEMPLATES
// =====================================================

export interface MessageTemplate {
  id: string;
  name: string;
  type: 'sms' | 'voice';
  category: 'reminder1' | 'reminder2' | 'reminder3' | 'payment_received' | 'custom';
  language: VoiceLanguage;
  subject?: string;
  body: string;
  variables: string[];
  maxLength: number;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  // SMS Templates - French
  {
    id: 'sms_reminder_1_fr',
    name: '1er rappel - Courtois',
    type: 'sms',
    category: 'reminder1',
    language: 'fr-FR',
    body: 'Bonjour {{clientName}},\n\nRappel: Facture {{reference}} de {{amount}} {{currency}} échue le {{dueDate}}.\n\nMerci de régulariser votre situation.\n\n{{companyName}}',
    variables: ['clientName', 'reference', 'amount', 'currency', 'dueDate', 'companyName'],
    maxLength: 160,
  },
  {
    id: 'sms_reminder_2_fr',
    name: '2ème rappel - Ferme',
    type: 'sms',
    category: 'reminder2',
    language: 'fr-FR',
    body: 'Bonjour {{clientName}},\n\n⚠️ 2ème Rappel\nFacture {{reference}} de {{amount}} {{currency}} toujours impayée.\n\nMerci de régler rapidement.\n\n{{companyName}}',
    variables: ['clientName', 'reference', 'amount', 'currency', 'companyName'],
    maxLength: 160,
  },
  {
    id: 'sms_reminder_3_fr',
    name: '3ème rappel - Urgent',
    type: 'sms',
    category: 'reminder3',
    language: 'fr-FR',
    body: '🚨 URGENT\n\n{{clientName}},\nFacture {{reference}} de {{amount}} {{currency}} impayée.\n\nSans règlement sous 7j, le dossier sera transmis au recouvrement.\n\n{{companyName}}',
    variables: ['clientName', 'reference', 'amount', 'currency', 'companyName'],
    maxLength: 160,
  },
  {
    id: 'sms_payment_received_fr',
    name: 'Confirmation paiement',
    type: 'sms',
    category: 'payment_received',
    language: 'fr-FR',
    body: 'Bonjour {{clientName}},\n\nNous confirmons la réception de votre paiement de {{amount}} {{currency}}.\n\nMerci pour votre confiance.\n\n{{companyName}}',
    variables: ['clientName', 'amount', 'currency', 'companyName'],
    maxLength: 160,
  },
  // SMS Templates - English
  {
    id: 'sms_reminder_1_en',
    name: 'First reminder - Friendly',
    type: 'sms',
    category: 'reminder1',
    language: 'en-US',
    body: 'Hello {{clientName}},\n\nReminder: Invoice {{reference}} of {{amount}} {{currency}} due on {{dueDate}}.\n\nPlease settle your account.\n\n{{companyName}}',
    variables: ['clientName', 'reference', 'amount', 'currency', 'dueDate', 'companyName'],
    maxLength: 160,
  },
  {
    id: 'sms_reminder_2_en',
    name: 'Second reminder - Firm',
    type: 'sms',
    category: 'reminder2',
    language: 'en-US',
    body: 'Hello {{clientName}},\n\n⚠️ 2nd Reminder\nInvoice {{reference}} of {{amount}} {{currency}} still unpaid.\n\nPlease settle promptly.\n\n{{companyName}}',
    variables: ['clientName', 'reference', 'amount', 'currency', 'companyName'],
    maxLength: 160,
  },
  {
    id: 'sms_reminder_3_en',
    name: 'Final reminder - Urgent',
    type: 'sms',
    category: 'reminder3',
    language: 'en-US',
    body: '🚨 URGENT\n\n{{clientName}},\nInvoice {{reference}} of {{amount}} {{currency}} unpaid.\n\nWithout payment in 7 days, your file will be sent to collections.\n\n{{companyName}}',
    variables: ['clientName', 'reference', 'amount', 'currency', 'companyName'],
    maxLength: 160,
  },
];

// =====================================================
// PROVIDER SELECTION CONFIGURATION
// =====================================================

export interface ProviderPreference {
  country: string;
  primaryProvider: SMSProvider;
  fallbackProvider: SMSProvider | null;
  reason: string;
}

export const PROVIDER_PREFERENCES: ProviderPreference[] = [
  {
    country: 'GN',
    primaryProvider: 'africastalking',
    fallbackProvider: 'twilio',
    reason: "Africa's Talking a de meilleurs tarifs pour la Guinée",
  },
  {
    country: 'SN',
    primaryProvider: 'africastalking',
    fallbackProvider: 'twilio',
    reason: "Africa's Talking est optimisé pour le Sénégal",
  },
  {
    country: 'CI',
    primaryProvider: 'africastalking',
    fallbackProvider: 'twilio',
    reason: "Africa's Talking a une meilleure couverture en Côte d'Ivoire",
  },
  {
    country: 'ML',
    primaryProvider: 'africastalking',
    fallbackProvider: 'twilio',
    reason: "Africa's Talking est le choix optimal pour le Mali",
  },
  {
    country: 'NG',
    primaryProvider: 'twilio',
    fallbackProvider: 'africastalking',
    reason: 'Twilio a de meilleurs tarifs pour le Nigeria',
  },
  {
    country: 'GH',
    primaryProvider: 'africastalking',
    fallbackProvider: 'twilio',
    reason: "Africa's Talking est optimal pour le Ghana",
  },
];

// =====================================================
// RATE LIMITING CONFIGURATION
// =====================================================

export const SMS_RATE_LIMITS = {
  maxPerMinute: 10,
  maxPerHour: 100,
  maxPerDay: 500,
  bulkBatchSize: 50,
  bulkDelayMs: 1000, // Delay between bulk batches
};

export const VOICE_RATE_LIMITS = {
  maxPerMinute: 5,
  maxPerHour: 30,
  maxPerDay: 100,
  maxConcurrent: 10,
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get pricing for a specific country
 */
export function getPricingForCountry(countryCode: string): CountryPricing | undefined {
  return SMS_PRICING.find(c => c.code === countryCode);
}

/**
 * Get pricing by phone number
 */
export function getPricingForPhone(phone: string): CountryPricing | undefined {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  for (const pricing of SMS_PRICING) {
    if (cleaned.startsWith(pricing.dialCode.replace('+', '')) || 
        cleaned.startsWith(pricing.dialCode)) {
      return pricing;
    }
  }
  
  return undefined;
}

/**
 * Get preferred provider for a country
 */
export function getPreferredProvider(countryCode: string): SMSProvider {
  const preference = PROVIDER_PREFERENCES.find(p => p.country === countryCode);
  return preference?.primaryProvider || 'africastalking';
}

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): MessageTemplate | undefined {
  return MESSAGE_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: MessageTemplate['category']): MessageTemplate[] {
  return MESSAGE_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get templates by type
 */
export function getTemplatesByType(type: MessageTemplate['type']): MessageTemplate[] {
  return MESSAGE_TEMPLATES.filter(t => t.type === type);
}

/**
 * Calculate SMS segments
 */
export function calculateSegments(message: string): number {
  // Check for non-GSM characters (Unicode)
  const hasUnicode = /[^\x00-\x7F]/.test(message);
  const charsPerSegment = hasUnicode ? 70 : 160;
  return Math.ceil(message.length / charsPerSegment);
}

/**
 * Estimate SMS cost
 */
export function estimateSMSCostByCountry(
  message: string,
  countryCode: string,
  provider?: SMSProvider
): { segments: number; cost: number; currency: string } {
  const pricing = getPricingForCountry(countryCode);
  const segments = calculateSegments(message);
  
  let costPerSegment = pricing?.smsCost || 150;
  
  if (provider === 'twilio' && pricing) {
    costPerSegment = pricing.twilioSmsCost;
  } else if (provider === 'africastalking' && pricing) {
    costPerSegment = pricing.africastalkingSmsCost;
  }
  
  return {
    segments,
    cost: segments * costPerSegment,
    currency: 'GNF',
  };
}

/**
 * Detect country from phone number
 */
export function detectCountryFromPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  for (const pricing of SMS_PRICING) {
    const dialCode = pricing.dialCode.replace('+', '');
    if (cleaned.startsWith(dialCode) || cleaned.startsWith('+' + dialCode)) {
      return pricing.code;
    }
  }
  
  return 'UNKNOWN';
}

/**
 * Validate phone number for African countries
 */
export function validatePhoneForAfrica(phone: string): {
  valid: boolean;
  country?: string;
  formatted?: string;
  error?: string;
} {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  if (!cleaned) {
    return { valid: false, error: 'Numéro de téléphone requis' };
  }
  
  // Check format
  if (!/^(\+|00|0)/.test(cleaned)) {
    return { valid: false, error: 'Le numéro doit commencer par +, 00 ou 0' };
  }
  
  const countryCode = detectCountryFromPhone(phone);
  
  if (countryCode === 'UNKNOWN') {
    return { 
      valid: false, 
      error: 'Code pays non supporté' 
    };
  }
  
  const pricing = getPricingForCountry(countryCode);
  
  // Format phone number
  let formatted = cleaned;
  if (formatted.startsWith('00')) {
    formatted = '+' + formatted.substring(2);
  } else if (formatted.startsWith('0') && !formatted.startsWith('00')) {
    formatted = pricing?.dialCode + formatted.substring(1);
  } else if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }
  
  return {
    valid: true,
    country: pricing?.name,
    formatted,
  };
}

export default {
  PROVIDERS,
  SMS_PRICING,
  VOICE_SUPPORTED_COUNTRIES,
  MESSAGE_TEMPLATES,
  PROVIDER_PREFERENCES,
  SMS_RATE_LIMITS,
  VOICE_RATE_LIMITS,
  getPricingForCountry,
  getPricingForPhone,
  getPreferredProvider,
  getTemplate,
  getTemplatesByCategory,
  getTemplatesByType,
  calculateSegments,
  estimateSMSCostByCountry,
  detectCountryFromPhone,
  validatePhoneForAfrica,
};
