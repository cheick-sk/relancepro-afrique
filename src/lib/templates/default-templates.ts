// Default templates for RelancePro Africa
// Templates in French and English for Email and WhatsApp

export type TemplateType = 'email' | 'whatsapp';
export type TemplateCategory = 'reminder1' | 'reminder2' | 'reminder3' | 'custom';
export type TemplateLanguage = 'fr' | 'en';
export type TemplateTone = 'formal' | 'friendly' | 'urgent';

export interface DefaultTemplate {
  name: string;
  type: TemplateType;
  category: TemplateCategory;
  subject?: string;
  content: string;
  language: TemplateLanguage;
  tone: TemplateTone;
}

// =====================================================
// EMAIL TEMPLATES - FRENCH
// =====================================================
const emailTemplatesFr: DefaultTemplate[] = [
  // First Reminder - Formal
  {
    name: 'Premier rappel - Formel',
    type: 'email',
    category: 'reminder1',
    subject: 'Rappel : Facture {{reference}} en attente de paiement',
    content: `Bonjour {{clientName}},

Nous espérons que vous allez bien.

Nous vous rappelons que la facture {{reference}} d'un montant de {{amount}} est arrivée à échéance le {{dueDate}}.

Nous vous prions de bien vouloir procéder au paiement dans les meilleurs délais.

En cas de difficulté ou pour toute question, n'hésitez pas à nous contacter.

Cordialement,
{{companyName}}`,
    language: 'fr',
    tone: 'formal',
  },
  // First Reminder - Friendly
  {
    name: 'Premier rappel - Amical',
    type: 'email',
    category: 'reminder1',
    subject: 'Petit rappel concernant la facture {{reference}}',
    content: `Bonjour {{clientName}},

J'espère que vous allez bien !

Je me permets de vous contacter concernant la facture {{reference}} d'un montant de {{amount}}, qui est arrivée à échéance le {{dueDate}}.

Si le paiement a déjà été effectué, merci de ne pas tenir compte de ce message. Sinon, pourriez-vous nous en informer ?

Merci beaucoup pour votre compréhension.

Bien cordialement,
{{companyName}}`,
    language: 'fr',
    tone: 'friendly',
  },
  // Second Reminder - Formal
  {
    name: 'Deuxième rappel - Formel',
    type: 'email',
    category: 'reminder2',
    subject: 'Deuxième rappel : Facture {{reference}} - Action requise',
    content: `Bonjour {{clientName}},

Malgré notre précédent rappel, nous n'avons toujours pas reçu le paiement de la facture {{reference}} d'un montant de {{remainingAmount}}.

Cette facture est en retard de {{daysOverdue}} jours.

Nous vous invitons à régulariser cette situation dans les plus brefs délais pour éviter d'éventuels frais de retard.

Merci de votre compréhension.

Cordialement,
{{companyName}}`,
    language: 'fr',
    tone: 'formal',
  },
  // Second Reminder - Urgent
  {
    name: 'Deuxième rappel - Urgent',
    type: 'email',
    category: 'reminder2',
    subject: 'URGENT : Facture {{reference}} en attente de paiement',
    content: `Bonjour {{clientName}},

Nous vous contactons à nouveau concernant la facture {{reference}} d'un montant de {{remainingAmount}}, qui présente maintenant un retard de {{daysOverdue}} jours.

Il est impératif de régulariser cette situation dans les 48 heures pour éviter des mesures supplémentaires.

Pour toute question, contactez-nous immédiatement.

Cordialement,
{{companyName}}`,
    language: 'fr',
    tone: 'urgent',
  },
  // Third Reminder - Formal
  {
    name: 'Dernier rappel - Formel',
    type: 'email',
    category: 'reminder3',
    subject: 'Dernier rappel : Facture {{reference}} - Urgent',
    content: `Bonjour {{clientName}},

Nous vous contactons pour la troisième fois concernant la facture {{reference}} d'un montant de {{remainingAmount}}, en retard de {{daysOverdue}} jours.

À défaut de règlement sous 7 jours, nous serons contraints de procéder à des actions de recouvrement.

Nous restons à votre disposition pour trouver une solution amiable.

Cordialement,
{{companyName}}`,
    language: 'fr',
    tone: 'formal',
  },
  // Third Reminder - Urgent
  {
    name: 'Dernier rappel - Urgent',
    type: 'email',
    category: 'reminder3',
    subject: 'DERNIER AVIS : Facture {{reference}} - Mesures de recouvrement imminentes',
    content: `Bonjour {{clientName}},

Malgré nos multiples rappels, la facture {{reference}} d'un montant de {{remainingAmount}} reste impayée depuis {{daysOverdue}} jours.

Sans règlement ou contact de votre part sous 7 jours, nous transmettrons le dossier à notre service de recouvrement.

Cette démarche pourra entraîner des frais supplémentaires et une incidence sur votre dossier de crédit.

Pour éviter ces mesures, contactez-nous immédiatement au {{companyPhone}}.

Cordialement,
{{companyName}}`,
    language: 'fr',
    tone: 'urgent',
  },
];

// =====================================================
// EMAIL TEMPLATES - ENGLISH
// =====================================================
const emailTemplatesEn: DefaultTemplate[] = [
  // First Reminder - Formal
  {
    name: 'First Reminder - Formal',
    type: 'email',
    category: 'reminder1',
    subject: 'Reminder: Invoice {{reference}} pending payment',
    content: `Dear {{clientName}},

We hope this message finds you well.

We would like to remind you that invoice {{reference}} for the amount of {{amount}} was due on {{dueDate}}.

We kindly request that you proceed with payment at your earliest convenience.

If you have any questions or are experiencing difficulties, please do not hesitate to contact us.

Best regards,
{{companyName}}`,
    language: 'en',
    tone: 'formal',
  },
  // First Reminder - Friendly
  {
    name: 'First Reminder - Friendly',
    type: 'email',
    category: 'reminder1',
    subject: 'Quick reminder about invoice {{reference}}',
    content: `Hi {{clientName}},

Hope you're doing well!

Just wanted to reach out about invoice {{reference}} for {{amount}}, which was due on {{dueDate}}.

If you've already sent payment, please disregard this message. Otherwise, could you please let us know the status?

Thanks so much for your understanding.

Best regards,
{{companyName}}`,
    language: 'en',
    tone: 'friendly',
  },
  // Second Reminder - Formal
  {
    name: 'Second Reminder - Formal',
    type: 'email',
    category: 'reminder2',
    subject: 'Second Reminder: Invoice {{reference}} - Action Required',
    content: `Dear {{clientName}},

Despite our previous reminder, we have not yet received payment for invoice {{reference}} for the amount of {{remainingAmount}}.

This invoice is now {{daysOverdue}} days overdue.

We urge you to settle this matter promptly to avoid any late fees.

Thank you for your cooperation.

Best regards,
{{companyName}}`,
    language: 'en',
    tone: 'formal',
  },
  // Second Reminder - Urgent
  {
    name: 'Second Reminder - Urgent',
    type: 'email',
    category: 'reminder2',
    subject: 'URGENT: Invoice {{reference}} payment required',
    content: `Dear {{clientName}},

We are contacting you again regarding invoice {{reference}} for {{remainingAmount}}, which is now {{daysOverdue}} days overdue.

Payment must be received within 48 hours to avoid additional measures.

Please contact us immediately if you have any questions.

Best regards,
{{companyName}}`,
    language: 'en',
    tone: 'urgent',
  },
  // Third Reminder - Formal
  {
    name: 'Final Reminder - Formal',
    type: 'email',
    category: 'reminder3',
    subject: 'Final Reminder: Invoice {{reference}} - Urgent',
    content: `Dear {{clientName}},

This is our third and final reminder regarding invoice {{reference}} for {{remainingAmount}}, now {{daysOverdue}} days overdue.

If payment is not received within 7 days, we will be compelled to initiate collection proceedings.

We remain available to discuss a payment arrangement if needed.

Best regards,
{{companyName}}`,
    language: 'en',
    tone: 'formal',
  },
  // Third Reminder - Urgent
  {
    name: 'Final Reminder - Urgent',
    type: 'email',
    category: 'reminder3',
    subject: 'FINAL NOTICE: Invoice {{reference}} - Collection action imminent',
    content: `Dear {{clientName}},

Despite multiple reminders, invoice {{reference}} for {{remainingAmount}} remains unpaid after {{daysOverdue}} days.

Without payment or contact within 7 days, your file will be transferred to our collection department.

This action may result in additional fees and impact your credit record.

To avoid these measures, contact us immediately at {{companyPhone}}.

Best regards,
{{companyName}}`,
    language: 'en',
    tone: 'urgent',
  },
];

// =====================================================
// WHATSAPP TEMPLATES - FRENCH
// =====================================================
const whatsappTemplatesFr: DefaultTemplate[] = [
  // First Reminder - Friendly
  {
    name: 'Premier rappel WhatsApp - Amical',
    type: 'whatsapp',
    category: 'reminder1',
    content: `Bonjour {{clientName}} 👋

J'espère que vous allez bien !

Je vous écris concernant la facture {{reference}} d'un montant de {{amount}} arrivée à échéance le {{dueDate}}.

Si le paiement a déjà été effectué, merci de ne pas tenir compte de ce message.

Bien cordialement,
{{companyName}}`,
    language: 'fr',
    tone: 'friendly',
  },
  // First Reminder - Formal
  {
    name: 'Premier rappel WhatsApp - Formel',
    type: 'whatsapp',
    category: 'reminder1',
    content: `Bonjour {{clientName}},

Nous vous rappelons que la facture {{reference}} ({{amount}}) est arrivée à échéance le {{dueDate}}.

Nous vous prions de procéder au paiement dans les meilleurs délais.

Cordialement,
{{companyName}}`,
    language: 'fr',
    tone: 'formal',
  },
  // Second Reminder - Formal
  {
    name: 'Deuxième rappel WhatsApp - Formel',
    type: 'whatsapp',
    category: 'reminder2',
    content: `Bonjour {{clientName}},

Suite à notre précédent message, nous n'avons toujours pas reçu le paiement de {{remainingAmount}} pour la facture {{reference}} ({{daysOverdue}} jours de retard).

Merci de régulariser cette situation rapidement.

{{companyName}}`,
    language: 'fr',
    tone: 'formal',
  },
  // Second Reminder - Urgent
  {
    name: 'Deuxième rappel WhatsApp - Urgent',
    type: 'whatsapp',
    category: 'reminder2',
    content: `⚠️ URGENT - {{clientName}}

La facture {{reference}} de {{remainingAmount}} a maintenant {{daysOverdue}} jours de retard.

Merci de régler ce montant dans les 48h ou de nous contacter.

{{companyName}}`,
    language: 'fr',
    tone: 'urgent',
  },
  // Third Reminder - Urgent
  {
    name: 'Dernier rappel WhatsApp - Urgent',
    type: 'whatsapp',
    category: 'reminder3',
    content: `🚨 DERNIER AVIS - {{clientName}}

Facture {{reference}} : {{remainingAmount}} en retard de {{daysOverdue}} jours.

Sans règlement sous 7 jours, le dossier sera transmis au recouvrement.

Appelez-nous : {{companyPhone}}

{{companyName}}`,
    language: 'fr',
    tone: 'urgent',
  },
];

// =====================================================
// WHATSAPP TEMPLATES - ENGLISH
// =====================================================
const whatsappTemplatesEn: DefaultTemplate[] = [
  // First Reminder - Friendly
  {
    name: 'First WhatsApp Reminder - Friendly',
    type: 'whatsapp',
    category: 'reminder1',
    content: `Hi {{clientName}} 👋

Hope you're doing well!

Just reaching out about invoice {{reference}} for {{amount}} that was due on {{dueDate}}.

If payment has already been sent, please disregard this message.

Best regards,
{{companyName}}`,
    language: 'en',
    tone: 'friendly',
  },
  // First Reminder - Formal
  {
    name: 'First WhatsApp Reminder - Formal',
    type: 'whatsapp',
    category: 'reminder1',
    content: `Dear {{clientName}},

This is a reminder that invoice {{reference}} ({{amount}}) was due on {{dueDate}}.

Please proceed with payment at your earliest convenience.

Best regards,
{{companyName}}`,
    language: 'en',
    tone: 'formal',
  },
  // Second Reminder - Formal
  {
    name: 'Second WhatsApp Reminder - Formal',
    type: 'whatsapp',
    category: 'reminder2',
    content: `Dear {{clientName}},

Following our previous message, we still haven't received payment of {{remainingAmount}} for invoice {{reference}} ({{daysOverdue}} days overdue).

Please settle this promptly.

{{companyName}}`,
    language: 'en',
    tone: 'formal',
  },
  // Second Reminder - Urgent
  {
    name: 'Second WhatsApp Reminder - Urgent',
    type: 'whatsapp',
    category: 'reminder2',
    content: `⚠️ URGENT - {{clientName}}

Invoice {{reference}} for {{remainingAmount}} is now {{daysOverdue}} days overdue.

Please settle within 48 hours or contact us.

{{companyName}}`,
    language: 'en',
    tone: 'urgent',
  },
  // Third Reminder - Urgent
  {
    name: 'Final WhatsApp Reminder - Urgent',
    type: 'whatsapp',
    category: 'reminder3',
    content: `🚨 FINAL NOTICE - {{clientName}}

Invoice {{reference}}: {{remainingAmount}} overdue by {{daysOverdue}} days.

Without payment within 7 days, your file will be sent to collections.

Call us: {{companyPhone}}

{{companyName}}`,
    language: 'en',
    tone: 'urgent',
  },
];

// Export all default templates
export const defaultTemplates: DefaultTemplate[] = [
  ...emailTemplatesFr,
  ...emailTemplatesEn,
  ...whatsappTemplatesFr,
  ...whatsappTemplatesEn,
];

// Get templates by type and language
export function getDefaultTemplates(
  type: TemplateType,
  language: TemplateLanguage
): DefaultTemplate[] {
  return defaultTemplates.filter((t) => t.type === type && t.language === language);
}

// Get templates by category
export function getDefaultTemplatesByCategory(
  type: TemplateType,
  category: TemplateCategory,
  language: TemplateLanguage
): DefaultTemplate[] {
  return defaultTemplates.filter(
    (t) => t.type === type && t.category === category && t.language === language
  );
}

// Get default template for a specific use case
export function getDefaultTemplate(
  type: TemplateType,
  category: TemplateCategory,
  language: TemplateLanguage,
  tone: TemplateTone = 'formal'
): DefaultTemplate | undefined {
  return defaultTemplates.find(
    (t) => t.type === type && t.category === category && t.language === language && t.tone === tone
  );
}

// Get all template names for a type
export function getTemplateNames(type: TemplateType, language: TemplateLanguage): string[] {
  return defaultTemplates
    .filter((t) => t.type === type && t.language === language)
    .map((t) => t.name);
}
