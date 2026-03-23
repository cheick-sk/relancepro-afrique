// Template Types for RelancePro Africa

// =====================================================
// TEMPLATE TYPES
// =====================================================

export type TemplateType = 'email' | 'whatsapp' | 'sms';

export type TemplateCategory = 'reminder1' | 'reminder2' | 'reminder3' | 'custom';

export type TemplateTone = 'formal' | 'friendly' | 'urgent';

export type TemplateLanguage = 'fr' | 'en';

// =====================================================
// VARIABLE TYPES
// =====================================================

export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  example: string;
  category: 'client' | 'dette' | 'entreprise' | 'dates';
}

export interface VariableCategory {
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export type VariableKey = 
  // Client
  | 'client_name'
  | 'client_email'
  | 'client_phone'
  | 'client_company'
  // Dette
  | 'debt_reference'
  | 'debt_amount'
  | 'debt_remaining'
  | 'debt_paid'
  | 'debt_due_date'
  | 'debt_days_overdue'
  | 'debt_currency'
  // Entreprise
  | 'company_name'
  | 'sender_name'
  // Dates
  | 'current_date'
  | 'current_time';

// =====================================================
// TEMPLATE INTERFACE
// =====================================================

export interface Template {
  id: string;
  profileId: string;
  name: string;
  type: TemplateType;
  category: TemplateCategory;
  subject: string | null;
  body: string;
  tone: TemplateTone;
  language: TemplateLanguage;
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateCreate {
  name: string;
  type: TemplateType;
  category: TemplateCategory;
  subject?: string;
  body: string;
  tone?: TemplateTone;
  language?: TemplateLanguage;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface TemplateUpdate {
  name?: string;
  type?: TemplateType;
  category?: TemplateCategory;
  subject?: string;
  body?: string;
  tone?: TemplateTone;
  language?: TemplateLanguage;
  isDefault?: boolean;
  isActive?: boolean;
}

// =====================================================
// PREVIEW TYPES
// =====================================================

export interface PreviewData {
  // Client
  client_name: string;
  client_email: string;
  client_phone: string;
  client_company: string;
  
  // Dette
  debt_reference: string;
  debt_amount: string;
  debt_remaining: string;
  debt_paid: string;
  debt_due_date: string;
  debt_days_overdue: string;
  debt_currency: string;
  
  // Entreprise
  company_name: string;
  sender_name: string;
  
  // Dates
  current_date: string;
  current_time: string;
}

export interface PreviewRequest {
  templateId?: string;
  subject?: string;
  body: string;
  type: TemplateType;
  previewData?: Partial<PreviewData>;
}

export interface PreviewResponse {
  subject: string;
  body: string;
  characterCount: number;
  smsSegments: number;
}

// =====================================================
// TEST SEND TYPES
// =====================================================

export interface TestSendRequest {
  templateId?: string;
  subject?: string;
  body: string;
  type: TemplateType;
  testEmail?: string;
  testPhone?: string;
}

// =====================================================
// CATEGORY LABELS
// =====================================================

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  reminder1: 'Premier rappel',
  reminder2: 'Deuxième rappel',
  reminder3: 'Dernier rappel',
  custom: 'Personnalisé',
};

export const CATEGORY_DESCRIPTIONS: Record<TemplateCategory, string> = {
  reminder1: 'Première relance - Ton amical et courtois',
  reminder2: 'Deuxième relance - Ton plus formel',
  reminder3: 'Dernière relance - Ton urgent',
  custom: 'Template personnalisé',
};

// =====================================================
// TYPE LABELS
// =====================================================

export const TYPE_LABELS: Record<TemplateType, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
};

// =====================================================
// TONE LABELS
// =====================================================

export const TONE_LABELS: Record<TemplateTone, string> = {
  formal: 'Formel',
  friendly: 'Amical',
  urgent: 'Urgent',
};

export const TONE_DESCRIPTIONS: Record<TemplateTone, string> = {
  formal: 'Ton professionnel et respectueux',
  friendly: 'Ton chaleureux et décontracté',
  urgent: 'Ton pressant pour les cas urgents',
};

export const TONE_COLORS: Record<TemplateTone, string> = {
  formal: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  friendly: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

// =====================================================
// LANGUAGE LABELS
// =====================================================

export const LANGUAGE_LABELS: Record<TemplateLanguage, string> = {
  fr: 'Français',
  en: 'English',
};

export const LANGUAGE_FLAGS: Record<TemplateLanguage, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
};

// =====================================================
// CHARACTER LIMITS
// =====================================================

export const CHARACTER_LIMITS = {
  sms: {
    max: 160,
    warning: 140,
  },
  whatsapp: {
    max: 4096,
    warning: 1000,
  },
  email: {
    subject: {
      max: 78,
      warning: 60,
    },
    body: {
      max: 100000,
      warning: 50000,
    },
  },
};

// =====================================================
// DEFAULT TEMPLATES
// =====================================================

export interface DefaultTemplate {
  name: string;
  type: TemplateType;
  category: TemplateCategory;
  subject: string;
  body: string;
  tone: TemplateTone;
  language: TemplateLanguage;
}

// Default French Email Templates
export const DEFAULT_EMAIL_TEMPLATES_FR: DefaultTemplate[] = [
  {
    name: 'Premier rappel',
    type: 'email',
    category: 'reminder1',
    subject: 'Petit rappel amical 💛',
    body: `Bonjour {client_name},

J'espère que tout va bien de votre côté !

Je me permets de vous rappeler que la facture {debt_reference} de {debt_amount} {debt_currency} arrive à échéance le {debt_due_date}.

N'hésitez pas si vous avez des questions !

Bonne journée 🌞

{company_name}`,
    tone: 'friendly',
    language: 'fr',
  },
  {
    name: 'Deuxième rappel',
    type: 'email',
    category: 'reminder2',
    subject: 'Rappel de facture {debt_reference}',
    body: `Cher(e) {client_name},

Malgré notre précédent rappel, nous n'avons pas reçu le paiement de la facture {debt_reference} d'un montant de {debt_amount} {debt_currency}.

Cette créance est en retard de {debt_days_overdue} jours.

Nous vous prions de régulariser cette situation dans les meilleurs délais.

Cordialement,
{company_name}`,
    tone: 'formal',
    language: 'fr',
  },
  {
    name: 'Dernier rappel',
    type: 'email',
    category: 'reminder3',
    subject: '⚠️ DERNIER AVERTISSEMENT - Facture {debt_reference}',
    body: `{client_name},

Votre facture de {debt_remaining} {debt_currency} a maintenant {debt_days_overdue} jours de retard.

C'est notre dernier rappel avant transmission au service de recouvrement.

Merci de régler dans les 48h ou de nous contacter pour un arrangement.

{company_name}`,
    tone: 'urgent',
    language: 'fr',
  },
];

// Default English Email Templates
export const DEFAULT_EMAIL_TEMPLATES_EN: DefaultTemplate[] = [
  {
    name: 'First Reminder',
    type: 'email',
    category: 'reminder1',
    subject: 'Friendly reminder 💛',
    body: `Hello {client_name},

I hope this message finds you well!

Just a quick reminder that invoice {debt_reference} for {debt_amount} {debt_currency} is due on {debt_due_date}.

Feel free to reach out if you have any questions!

Best regards 🌞

{company_name}`,
    tone: 'friendly',
    language: 'en',
  },
  {
    name: 'Second Reminder',
    type: 'email',
    category: 'reminder2',
    subject: 'Invoice reminder - {debt_reference}',
    body: `Dear {client_name},

Despite our previous reminder, we have not received payment for invoice {debt_reference} in the amount of {debt_amount} {debt_currency}.

This invoice is now {debt_days_overdue} days overdue.

We kindly request that you settle this matter as soon as possible.

Best regards,
{company_name}`,
    tone: 'formal',
    language: 'en',
  },
  {
    name: 'Final Reminder',
    type: 'email',
    category: 'reminder3',
    subject: '⚠️ FINAL NOTICE - Invoice {debt_reference}',
    body: `{client_name},

Your invoice of {debt_remaining} {debt_currency} is now {debt_days_overdue} days overdue.

This is our final reminder before referring this matter to our collections department.

Please settle within 48 hours or contact us to make arrangements.

{company_name}`,
    tone: 'urgent',
    language: 'en',
  },
];

// Default French WhatsApp Templates
export const DEFAULT_WHATSAPP_TEMPLATES_FR: DefaultTemplate[] = [
  {
    name: 'Premier rappel',
    type: 'whatsapp',
    category: 'reminder1',
    subject: '',
    body: `👋 Bonjour {client_name},

J'espère que vous allez bien !

Petit rappel amical : la facture {debt_reference} de {debt_amount} {debt_currency} arrive à échéance le {debt_due_date}.

N'hésitez pas à me contacter si vous avez des questions ! 🌞

{company_name}`,
    tone: 'friendly',
    language: 'fr',
  },
  {
    name: 'Deuxième rappel',
    type: 'whatsapp',
    category: 'reminder2',
    subject: '',
    body: `Bonjour {client_name} 📋

Nous n'avons toujours pas reçu le paiement de la facture {debt_reference} ({debt_amount} {debt_currency}).

Retard : {debt_days_overdue} jours

Merci de régulariser la situation rapidement.

{company_name}`,
    tone: 'formal',
    language: 'fr',
  },
  {
    name: 'Dernier rappel',
    type: 'whatsapp',
    category: 'reminder3',
    subject: '',
    body: `⚠️ *DERNIER AVERTISSEMENT*

{client_name},

Facture {debt_reference}: {debt_remaining} {debt_currency}
Retard: {debt_days_overdue} jours

⚠️ Dernier rappel avant recouvrement.

Régularisez sous 48h ou contactez-nous.

{company_name}`,
    tone: 'urgent',
    language: 'fr',
  },
];

// Default English WhatsApp Templates
export const DEFAULT_WHATSAPP_TEMPLATES_EN: DefaultTemplate[] = [
  {
    name: 'First Reminder',
    type: 'whatsapp',
    category: 'reminder1',
    subject: '',
    body: `👋 Hello {client_name},

Hope you're doing well!

Just a friendly reminder: invoice {debt_reference} for {debt_amount} {debt_currency} is due on {debt_due_date}.

Feel free to reach out if you have any questions! 🌞

{company_name}`,
    tone: 'friendly',
    language: 'en',
  },
  {
    name: 'Second Reminder',
    type: 'whatsapp',
    category: 'reminder2',
    subject: '',
    body: `Hello {client_name} 📋

We still haven't received payment for invoice {debt_reference} ({debt_amount} {debt_currency}).

Overdue: {debt_days_overdue} days

Please settle this matter soon.

{company_name}`,
    tone: 'formal',
    language: 'en',
  },
  {
    name: 'Final Reminder',
    type: 'whatsapp',
    category: 'reminder3',
    subject: '',
    body: `⚠️ *FINAL NOTICE*

{client_name},

Invoice {debt_reference}: {debt_remaining} {debt_currency}
Overdue: {debt_days_overdue} days

⚠️ Final reminder before collections.

Settle within 48h or contact us.

{company_name}`,
    tone: 'urgent',
    language: 'en',
  },
];

// Legacy exports for backward compatibility
export const DEFAULT_EMAIL_TEMPLATES = DEFAULT_EMAIL_TEMPLATES_FR;
export const DEFAULT_WHATSAPP_TEMPLATES = DEFAULT_WHATSAPP_TEMPLATES_FR;
