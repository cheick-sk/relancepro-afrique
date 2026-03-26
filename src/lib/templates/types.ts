// Template types
export type TemplateType = 'email' | 'sms' | 'whatsapp' | 'voice';
export type TemplateCategory = 'reminder' | 'overdue' | 'payment' | 'legal' | 'welcome';
export type TemplateTone = 'formal' | 'friendly' | 'urgent' | 'professional';
export type TemplateLanguage = 'fr' | 'en' | 'ar' | 'wo';

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  category: TemplateCategory;
  subject?: string;
  content: string;
  tone: TemplateTone;
  language: TemplateLanguage;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateCreate {
  name: string;
  type: TemplateType;
  category: TemplateCategory;
  subject?: string;
  content: string;
  tone: TemplateTone;
  language: TemplateLanguage;
}

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  reminder: 'Relance',
  overdue: 'Retard',
  payment: 'Paiement',
  legal: 'Juridique',
  welcome: 'Bienvenue',
};

export const CATEGORY_DESCRIPTIONS: Record<TemplateCategory, string> = {
  reminder: 'Relances pour les paiements en attente',
  overdue: 'Notifications pour les paiements en retard',
  payment: 'Confirmations et reçus de paiement',
  legal: 'Mises en demeure et procédures juridiques',
  welcome: 'Messages de bienvenue pour les nouveaux clients',
};

export const TONE_LABELS: Record<TemplateTone, string> = {
  formal: 'Formel',
  friendly: 'Amical',
  urgent: 'Urgent',
  professional: 'Professionnel',
};

export const TONE_DESCRIPTIONS: Record<TemplateTone, string> = {
  formal: 'Ton formel et respectueux',
  friendly: 'Ton amical et décontracté',
  urgent: 'Ton urgent pour les cas prioritaires',
  professional: 'Ton professionnel équilibré',
};

export const TONE_COLORS: Record<TemplateTone, string> = {
  formal: 'bg-blue-500',
  friendly: 'bg-green-500',
  urgent: 'bg-red-500',
  professional: 'bg-purple-500',
};

export const LANGUAGE_LABELS: Record<TemplateLanguage, string> = {
  fr: 'Français',
  en: 'Anglais',
  ar: 'Arabe',
  wo: 'Wolof',
};

export const LANGUAGE_FLAGS: Record<TemplateLanguage, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  ar: '🇸🇦',
  wo: '🇸🇳',
};

// Default templates
export const DEFAULT_EMAIL_TEMPLATES: Partial<Template>[] = [
  {
    name: 'Relance - Premier rappel',
    type: 'email',
    category: 'reminder',
    subject: 'Rappel de paiement - {{company_name}}',
    content: 'Bonjour {{client_name}}, nous vous rappelons que votre facture de {{amount}} est due le {{due_date}}.',
    tone: 'professional',
    language: 'fr',
  },
];

export const DEFAULT_WHATSAPP_TEMPLATES: Partial<Template>[] = [
  {
    name: 'Relance WhatsApp',
    type: 'whatsapp',
    category: 'reminder',
    content: 'Bonjour {{client_name}}, rappel: votre facture de {{amount}} arrive à échéance.',
    tone: 'friendly',
    language: 'fr',
  },
];
