// =====================================================
// RELANCEPRO AFRICA - Voice Call Scripts
// Pre-defined call scripts in French for voice calls
// =====================================================

import { VoiceLanguage } from '../sms/types';

// =====================================================
// SCRIPT TYPES
// =====================================================

export interface VoiceScript {
  id: string;
  name: string;
  description: string;
  category: 'reminder1' | 'reminder2' | 'reminder3' | 'payment_confirmation' | 'payment_plan' | 'custom';
  language: VoiceLanguage;
  template: string;
  variables: string[];
  estimatedDuration: number; // in seconds
  tone: 'friendly' | 'firm' | 'urgent';
}

export interface IVRMenu {
  id: string;
  name: string;
  description: string;
  options: IVROption[];
  defaultAction: string;
}

export interface IVROption {
  digit: string;
  action: string;
  description: string;
  nextMenu?: string;
}

// =====================================================
// VOICE CALL SCRIPTS (French)
// =====================================================

export const VOICE_SCRIPTS: VoiceScript[] = [
  // First Reminder - Friendly
  {
    id: 'reminder_1_friendly',
    name: '1er Rappel - Courtois',
    description: 'Premier rappel courtois pour facture impayée',
    category: 'reminder1',
    language: 'fr-FR',
    template: `Bonjour {{clientName}}. 

Je vous appelle de la part de {{companyName}}. 

Nous vous contactons concernant votre facture numéro {{reference}}, d'un montant de {{amount}} {{currency}}, qui était due le {{dueDate}}.

Nous vous prions de bien vouloir régulariser votre situation dans les meilleurs délais.

Pour toute question ou pour effectuer un paiement, veuillez nous contacter au {{contactPhone}}.

Merci de votre compréhension. Au revoir.`,
    variables: ['clientName', 'companyName', 'reference', 'amount', 'currency', 'dueDate', 'contactPhone'],
    estimatedDuration: 45,
    tone: 'friendly',
  },
  
  // Second Reminder - Firm
  {
    id: 'reminder_2_firm',
    name: '2ème Rappel - Ferme',
    description: 'Deuxième rappel avec ton plus ferme',
    category: 'reminder2',
    language: 'fr-FR',
    template: `Bonjour {{clientName}}.

C'est un deuxième rappel de la part de {{companyName}}.

Votre facture numéro {{reference}}, d'un montant de {{amount}} {{currency}}, reste toujours impayée malgré notre premier rappel.

Nous vous demandons de régler cette facture dans les plus brefs délais.

En cas de difficulté de paiement, nous vous invitons à nous contacter pour trouver une solution.

Notre numéro est le {{contactPhone}}.

Merci de traiter ce dossier rapidement. Au revoir.`,
    variables: ['clientName', 'companyName', 'reference', 'amount', 'currency', 'contactPhone'],
    estimatedDuration: 40,
    tone: 'firm',
  },
  
  // Third Reminder - Urgent
  {
    id: 'reminder_3_urgent',
    name: '3ème Rappel - Urgent',
    description: 'Dernier rappel avant transmission au recouvrement',
    category: 'reminder3',
    language: 'fr-FR',
    template: `Bonjour {{clientName}}.

Ceci est un rappel URGENT de {{companyName}}.

Votre facture numéro {{reference}}, d'un montant de {{amount}} {{currency}}, reste impayée depuis plusieurs semaines.

Sans régularisation de votre part dans les 7 prochains jours, votre dossier sera transmis à notre service de recouvrement, ce qui pourrait entraîner des frais supplémentaires.

Pour éviter cette situation, veuillez nous contacter immédiatement au {{contactPhone}} ou effectuer votre paiement sans délai.

Ceci est notre dernier rappel. Merci.`,
    variables: ['clientName', 'companyName', 'reference', 'amount', 'currency', 'contactPhone'],
    estimatedDuration: 45,
    tone: 'urgent',
  },
  
  // Payment Confirmation
  {
    id: 'payment_confirmation',
    name: 'Confirmation de Paiement',
    description: 'Confirmation de réception de paiement',
    category: 'payment_confirmation',
    language: 'fr-FR',
    template: `Bonjour {{clientName}}.

Nous vous appelons de la part de {{companyName}} pour confirmer la réception de votre paiement de {{amount}} {{currency}}.

Nous vous remercions pour votre règlement et vous souhaitons une excellente journée.

Au revoir.`,
    variables: ['clientName', 'companyName', 'amount', 'currency'],
    estimatedDuration: 20,
    tone: 'friendly',
  },
  
  // Payment Plan Proposal
  {
    id: 'payment_plan_proposal',
    name: 'Proposition de Plan de Paiement',
    description: 'Proposition d\'échéancier de paiement',
    category: 'payment_plan',
    language: 'fr-FR',
    template: `Bonjour {{clientName}}.

Je vous appelle de la part de {{companyName}} concernant votre facture de {{amount}} {{currency}}.

Nous comprenons que vous pourriez rencontrer des difficultés de paiement. Nous sommes prêts à vous proposer un plan de paiement échelonné.

Selon notre proposition, vous pourriez régler votre facture en {{installments}} versements de {{installmentAmount}} {{currency}} chacun, le premier étant dû le {{firstPaymentDate}}.

Si cette proposition vous convient ou pour discuter d'autres arrangements, veuillez nous contacter au {{contactPhone}}.

Merci et au revoir.`,
    variables: ['clientName', 'companyName', 'amount', 'currency', 'installments', 'installmentAmount', 'firstPaymentDate', 'contactPhone'],
    estimatedDuration: 50,
    tone: 'friendly',
  },
  
  // English Scripts
  {
    id: 'reminder_1_en',
    name: 'First Reminder - Friendly (English)',
    description: 'First friendly reminder for unpaid invoice',
    category: 'reminder1',
    language: 'en-US',
    template: `Hello {{clientName}}.

This is a call from {{companyName}}.

We are contacting you regarding your invoice number {{reference}}, with an amount of {{amount}} {{currency}}, which was due on {{dueDate}}.

We kindly ask you to settle your account at your earliest convenience.

For any questions or to make a payment, please contact us at {{contactPhone}}.

Thank you for your understanding. Goodbye.`,
    variables: ['clientName', 'companyName', 'reference', 'amount', 'currency', 'dueDate', 'contactPhone'],
    estimatedDuration: 40,
    tone: 'friendly',
  },
  
  {
    id: 'reminder_2_en',
    name: 'Second Reminder - Firm (English)',
    description: 'Second reminder with a firmer tone',
    category: 'reminder2',
    language: 'en-US',
    template: `Hello {{clientName}}.

This is a second reminder from {{companyName}}.

Your invoice number {{reference}}, with an amount of {{amount}} {{currency}}, remains unpaid despite our previous reminder.

We request that you settle this invoice as soon as possible.

If you are experiencing payment difficulties, please contact us to find a solution.

Our number is {{contactPhone}}.

Please address this matter promptly. Goodbye.`,
    variables: ['clientName', 'companyName', 'reference', 'amount', 'currency', 'contactPhone'],
    estimatedDuration: 35,
    tone: 'firm',
  },
];

// =====================================================
// IVR MENU OPTIONS
// =====================================================

export const IVR_MENUS: IVRMenu[] = [
  {
    id: 'main_menu',
    name: 'Menu Principal',
    description: 'Menu principal pour les appels entrants',
    options: [
      { digit: '1', action: 'repeat_message', description: 'Réécouter le message' },
      { digit: '2', action: 'transfer_agent', description: 'Parler à un conseiller' },
      { digit: '3', action: 'payment_info', description: 'Informations de paiement' },
      { digit: '4', action: 'payment_plan', description: 'Demander un plan de paiement' },
      { digit: '5', action: 'dispute', description: 'Contester la facture' },
    ],
    defaultAction: 'repeat_menu',
  },
  {
    id: 'payment_menu',
    name: 'Menu Paiement',
    description: 'Options de paiement',
    options: [
      { digit: '1', action: 'bank_transfer', description: 'Virement bancaire' },
      { digit: '2', action: 'mobile_money', description: 'Mobile Money' },
      { digit: '3', action: 'card_payment', description: 'Paiement par carte' },
      { digit: '0', action: 'back_main', description: 'Retour au menu principal' },
    ],
    defaultAction: 'repeat_menu',
  },
  {
    id: 'dispute_menu',
    name: 'Menu Réclamation',
    description: 'Options pour contester une facture',
    options: [
      { digit: '1', action: 'wrong_amount', description: 'Montant incorrect' },
      { digit: '2', action: 'already_paid', description: 'Déjà payé' },
      { digit: '3', action: 'wrong_invoice', description: 'Facture non reconnue' },
      { digit: '4', action: 'record_message', description: 'Laisser un message' },
      { digit: '0', action: 'back_main', description: 'Retour au menu principal' },
    ],
    defaultAction: 'transfer_agent',
  },
];

// =====================================================
// TEXT-TO-SPEECH TEMPLATES
// =====================================================

export const TTS_TEMPLATES = {
  greeting: {
    fr: 'Bonjour, merci de nous contacter.',
    en: 'Hello, thank you for contacting us.',
  },
  hold: {
    fr: 'Veuillez patienter, un conseiller va vous répondre.',
    en: 'Please hold, an advisor will be with you shortly.',
  },
  transfer: {
    fr: 'Nous vous transférons vers un conseiller.',
    en: 'We are transferring you to an advisor.',
  },
  goodbye: {
    fr: 'Merci de votre appel. Au revoir.',
    en: 'Thank you for calling. Goodbye.',
  },
  payment_received: {
    fr: 'Votre paiement a bien été enregistré.',
    en: 'Your payment has been successfully recorded.',
  },
  callback_request: {
    fr: 'Nous vous rappellerons dans les plus brefs délais.',
    en: 'We will call you back as soon as possible.',
  },
};

// =====================================================
// PAYMENT REMINDER SCRIPTS
// =====================================================

export const PAYMENT_REMINDER_SCRIPTS = {
  overdue_1_day: {
    id: 'overdue_1_day',
    name: 'Échu 1 jour',
    template: `Bonjour {{clientName}}, votre facture de {{amount}} {{currency}} est échue depuis hier. Merci de régulariser rapidement.`,
    duration: 15,
  },
  overdue_7_days: {
    id: 'overdue_7_days',
    name: 'Échu 7 jours',
    template: `Bonjour {{clientName}}, rappel: votre facture de {{amount}} {{currency}} est impayée depuis une semaine. Merci de contacter notre service.`,
    duration: 15,
  },
  overdue_15_days: {
    id: 'overdue_15_days',
    name: 'Échu 15 jours',
    template: `Bonjour {{clientName}}, votre facture de {{amount}} {{currency}} reste impayée depuis 15 jours. Merci de régler ce dossier rapidement.`,
    duration: 15,
  },
  overdue_30_days: {
    id: 'overdue_30_days',
    name: 'Échu 30 jours - Dernier rappel',
    template: `URGENT: Bonjour {{clientName}}, votre facture de {{amount}} {{currency}} est impayée depuis 30 jours. Sans règlement sous 48h, le dossier sera transmis au recouvrement.`,
    duration: 20,
  },
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get script by ID
 */
export function getScriptById(scriptId: string): VoiceScript | undefined {
  return VOICE_SCRIPTS.find(s => s.id === scriptId);
}

/**
 * Get scripts by category
 */
export function getScriptsByCategory(category: VoiceScript['category']): VoiceScript[] {
  return VOICE_SCRIPTS.filter(s => s.category === category);
}

/**
 * Get scripts by language
 */
export function getScriptsByLanguage(language: VoiceLanguage): VoiceScript[] {
  return VOICE_SCRIPTS.filter(s => s.language === language);
}

/**
 * Get scripts by tone
 */
export function getScriptsByTone(tone: VoiceScript['tone']): VoiceScript[] {
  return VOICE_SCRIPTS.filter(s => s.tone === tone);
}

/**
 * Fill script template with variables
 */
export function fillScriptTemplate(
  scriptId: string,
  variables: Record<string, string>
): string {
  const script = getScriptById(scriptId);
  if (!script) {
    throw new Error(`Script not found: ${scriptId}`);
  }
  
  let filledTemplate = script.template;
  
  for (const variable of script.variables) {
    const value = variables[variable] || `{{${variable}}}`;
    filledTemplate = filledTemplate.replace(new RegExp(`{{${variable}}}`, 'g'), value);
  }
  
  // Clean up extra whitespace
  filledTemplate = filledTemplate
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
  
  return filledTemplate;
}

/**
 * Generate IVR TwiML for Twilio
 */
export function generateIVRTwiML(menuId: string, options?: {
  language?: VoiceLanguage;
  loop?: number;
}): string {
  const menu = IVR_MENUS.find(m => m.id === menuId);
  if (!menu) {
    return `<Response><Say>Menu non trouvé. Au revoir.</Say></Response>`;
  }
  
  const language = options?.language || 'fr-FR';
  const loop = options?.loop || 3;
  
  let optionsPrompt = menu.options.map(opt => 
    `Pour ${opt.description}, appuyez sur ${opt.digit}.`
  ).join(' ');
  
  return `
    <Response>
      <Gather numDigits="1" action="/api/webhooks/voice/ivr" method="POST" loop="${loop}">
        <Say language="${language}">${optionsPrompt}</Say>
      </Gather>
      <Say language="${language}">Aucune réponse. Au revoir.</Say>
    </Response>
  `;
}

/**
 * Get estimated call duration
 */
export function getEstimatedDuration(scriptId: string): number {
  const script = getScriptById(scriptId);
  return script?.estimatedDuration || 30;
}

/**
 * Calculate voice call cost
 */
export function calculateCallCost(
  scriptId: string,
  costPerMinute: number
): { duration: number; cost: number } {
  const duration = getEstimatedDuration(scriptId);
  const cost = (duration / 60) * costPerMinute;
  return { duration, cost };
}

export default {
  VOICE_SCRIPTS,
  IVR_MENUS,
  TTS_TEMPLATES,
  PAYMENT_REMINDER_SCRIPTS,
  getScriptById,
  getScriptsByCategory,
  getScriptsByLanguage,
  getScriptsByTone,
  fillScriptTemplate,
  generateIVRTwiML,
  getEstimatedDuration,
  calculateCallCost,
};
