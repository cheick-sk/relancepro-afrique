// Default Templates for RelancePro Africa
// Contains default templates in French and English for all reminder levels

import {
  DefaultTemplate,
  TemplateType,
  TemplateCategory,
  TemplateTone,
  TemplateLanguage,
} from './types';

// =====================================================
// DEFAULT TEMPLATES
// =====================================================

// French Email Templates
export const DEFAULT_EMAIL_TEMPLATES_FR: DefaultTemplate[] = [
  {
    name: 'Premier rappel - Amical',
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
    name: 'Deuxième rappel - Formel',
    type: 'email',
    category: 'reminder2',
    subject: 'Rappel de facture {debt_reference}',
    body: `Cher(e) {client_name},

Malgré notre précédent rappel, nous n'avons pas reçu le paiement de la facture {debt_reference} d'un montant de {debt_amount} {debt_currency}.

Cette créance est en retard de {debt_days_overdue} jours.

Nous vous prions de régulariser cette situation dans les meilleurs délais.

Cordialement,
{sender_name}
{company_name}`,
    tone: 'formal',
    language: 'fr',
  },
  {
    name: 'Dernier rappel - Urgent',
    type: 'email',
    category: 'reminder3',
    subject: '⚠️ DERNIER AVERTISSEMENT - Facture {debt_reference}',
    body: `{client_name},

Votre facture de {debt_remaining} {debt_currency} a maintenant {debt_days_overdue} jours de retard.

C'est notre dernier rappel avant transmission au service de recouvrement.

Merci de régler dans les 48h ou de nous contacter pour un arrangement.

{sender_name}
{company_name}`,
    tone: 'urgent',
    language: 'fr',
  },
];

// English Email Templates
export const DEFAULT_EMAIL_TEMPLATES_EN: DefaultTemplate[] = [
  {
    name: 'First Reminder - Friendly',
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
    name: 'Second Reminder - Formal',
    type: 'email',
    category: 'reminder2',
    subject: 'Invoice reminder - {debt_reference}',
    body: `Dear {client_name},

Despite our previous reminder, we have not received payment for invoice {debt_reference} in the amount of {debt_amount} {debt_currency}.

This invoice is now {debt_days_overdue} days overdue.

We kindly request that you settle this matter as soon as possible.

Best regards,
{sender_name}
{company_name}`,
    tone: 'formal',
    language: 'en',
  },
  {
    name: 'Final Reminder - Urgent',
    type: 'email',
    category: 'reminder3',
    subject: '⚠️ FINAL NOTICE - Invoice {debt_reference}',
    body: `{client_name},

Your invoice of {debt_remaining} {debt_currency} is now {debt_days_overdue} days overdue.

This is our final reminder before referring this matter to our collections department.

Please settle within 48 hours or contact us to make arrangements.

{sender_name}
{company_name}`,
    tone: 'urgent',
    language: 'en',
  },
];

// French WhatsApp Templates
export const DEFAULT_WHATSAPP_TEMPLATES_FR: DefaultTemplate[] = [
  {
    name: 'Premier rappel - Amical',
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
    name: 'Deuxième rappel - Formel',
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
    name: 'Dernier rappel - Urgent',
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

// English WhatsApp Templates
export const DEFAULT_WHATSAPP_TEMPLATES_EN: DefaultTemplate[] = [
  {
    name: 'First Reminder - Friendly',
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
    name: 'Second Reminder - Formal',
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
    name: 'Final Reminder - Urgent',
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

// French SMS Templates
export const DEFAULT_SMS_TEMPLATES_FR: DefaultTemplate[] = [
  {
    name: 'Premier rappel - SMS',
    type: 'sms',
    category: 'reminder1',
    subject: '',
    body: `Bonjour {client_name}, rappel amical: facture {debt_reference} de {debt_amount} {debt_currency} à régler avant le {debt_due_date}. {company_name}`,
    tone: 'friendly',
    language: 'fr',
  },
  {
    name: 'Deuxième rappel - SMS',
    type: 'sms',
    category: 'reminder2',
    subject: '',
    body: `{client_name}, rappel: facture {debt_reference} ({debt_amount} {debt_currency}) en retard de {debt_days_overdue} jours. Merci de régulariser. {company_name}`,
    tone: 'formal',
    language: 'fr',
  },
  {
    name: 'Dernier rappel - SMS',
    type: 'sms',
    category: 'reminder3',
    subject: '',
    body: `⚠️ {client_name}: Dernier rappel - {debt_remaining} {debt_currency} en retard ({debt_days_overdue}j). Régler sous 48h. {company_name}`,
    tone: 'urgent',
    language: 'fr',
  },
];

// English SMS Templates
export const DEFAULT_SMS_TEMPLATES_EN: DefaultTemplate[] = [
  {
    name: 'First Reminder - SMS',
    type: 'sms',
    category: 'reminder1',
    subject: '',
    body: `Hello {client_name}, friendly reminder: invoice {debt_reference} of {debt_amount} {debt_currency} due by {debt_due_date}. {company_name}`,
    tone: 'friendly',
    language: 'en',
  },
  {
    name: 'Second Reminder - SMS',
    type: 'sms',
    category: 'reminder2',
    subject: '',
    body: `{client_name}, reminder: invoice {debt_reference} ({debt_amount} {debt_currency}) is {debt_days_overdue} days overdue. Please settle. {company_name}`,
    tone: 'formal',
    language: 'en',
  },
  {
    name: 'Final Reminder - SMS',
    type: 'sms',
    category: 'reminder3',
    subject: '',
    body: `⚠️ {client_name}: Final notice - {debt_remaining} {debt_currency} overdue ({debt_days_overdue}d). Settle within 48h. {company_name}`,
    tone: 'urgent',
    language: 'en',
  },
];

// =====================================================
// ALL DEFAULT TEMPLATES
// =====================================================

export const ALL_DEFAULT_TEMPLATES: DefaultTemplate[] = [
  ...DEFAULT_EMAIL_TEMPLATES_FR,
  ...DEFAULT_EMAIL_TEMPLATES_EN,
  ...DEFAULT_WHATSAPP_TEMPLATES_FR,
  ...DEFAULT_WHATSAPP_TEMPLATES_EN,
  ...DEFAULT_SMS_TEMPLATES_FR,
  ...DEFAULT_SMS_TEMPLATES_EN,
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get all default templates for a specific language
 */
export function getDefaultTemplatesByLanguage(language: TemplateLanguage): DefaultTemplate[] {
  return ALL_DEFAULT_TEMPLATES.filter(t => t.language === language);
}

/**
 * Get all default templates for a specific type
 */
export function getDefaultTemplatesByType(type: TemplateType, language?: TemplateLanguage): DefaultTemplate[] {
  let templates = ALL_DEFAULT_TEMPLATES.filter(t => t.type === type);
  if (language) {
    templates = templates.filter(t => t.language === language);
  }
  return templates;
}

/**
 * Get default templates for a specific category
 */
export function getDefaultTemplatesByCategory(
  category: TemplateCategory,
  type?: TemplateType,
  language?: TemplateLanguage
): DefaultTemplate[] {
  let templates = ALL_DEFAULT_TEMPLATES.filter(t => t.category === category);
  if (type) {
    templates = templates.filter(t => t.type === type);
  }
  if (language) {
    templates = templates.filter(t => t.language === language);
  }
  return templates;
}

/**
 * Get default templates for a specific tone
 */
export function getDefaultTemplatesByTone(
  tone: TemplateTone,
  type?: TemplateType,
  language?: TemplateLanguage
): DefaultTemplate[] {
  let templates = ALL_DEFAULT_TEMPLATES.filter(t => t.tone === tone);
  if (type) {
    templates = templates.filter(t => t.type === type);
  }
  if (language) {
    templates = templates.filter(t => t.language === language);
  }
  return templates;
}

/**
 * Get default templates for initializing a new user
 * By default, returns French templates only
 */
export function getInitialTemplatesForNewUser(language: TemplateLanguage = 'fr'): DefaultTemplate[] {
  return ALL_DEFAULT_TEMPLATES.filter(t => t.language === language);
}

/**
 * Check if templates exist for a user
 * This should be used in the API to determine if we need to create defaults
 */
export function shouldInitializeDefaultTemplates(existingCount: number): boolean {
  return existingCount === 0;
}

// =====================================================
// LEGACY EXPORTS (for backward compatibility)
// =====================================================

export const DEFAULT_EMAIL_TEMPLATES = DEFAULT_EMAIL_TEMPLATES_FR;
export const DEFAULT_WHATSAPP_TEMPLATES = DEFAULT_WHATSAPP_TEMPLATES_FR;
