import type { Template } from './types';

export function getInitialTemplatesForNewUser(userId: string): Omit<Template, 'id' | 'createdAt' | 'updatedAt'>[] {
  return [
    {
      name: 'Relance email - Premier rappel',
      type: 'email',
      category: 'reminder',
      subject: 'Rappel de paiement - {{company_name}}',
      content: `Bonjour {{client_name}},

Nous vous rappelons que votre facture n°{{invoice_number}} d'un montant de {{amount}} est due le {{due_date}}.

Merci de régulariser votre situation dans les meilleurs délais.

Cordialement,
{{company_name}}`,
      tone: 'professional',
      language: 'fr',
      variables: ['client_name', 'invoice_number', 'amount', 'due_date', 'company_name'],
      userId,
    },
    {
      name: 'Relance SMS',
      type: 'sms',
      category: 'reminder',
      content: 'Bonjour {{client_name}}, rappel: facture {{invoice_number}} de {{amount}} due le {{due_date}}. {{company_name}}',
      tone: 'friendly',
      language: 'fr',
      variables: ['client_name', 'invoice_number', 'amount', 'due_date', 'company_name'],
      userId,
    },
    {
      name: 'Relance WhatsApp',
      type: 'whatsapp',
      category: 'reminder',
      content: `🔔 *Rappel de paiement*

Bonjour {{client_name}},

Votre facture n°{{invoice_number}} de *{{amount}}* arrive à échéance le {{due_date}}.

Cliquez ici pour payer: {{payment_link}}

{{company_name}}`,
      tone: 'friendly',
      language: 'fr',
      variables: ['client_name', 'invoice_number', 'amount', 'due_date', 'payment_link', 'company_name'],
      userId,
    },
  ];
}

export function getDefaultTemplatesByType(type: string): Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'userId'>[] {
  const templates: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'userId'>[] = [];
  
  if (type === 'email') {
    templates.push({
      name: 'Email de relance standard',
      type: 'email',
      category: 'reminder',
      subject: 'Rappel - Facture en attente',
      content: 'Bonjour {{client_name}}, votre facture de {{amount}} est due.',
      tone: 'professional',
      language: 'fr',
      variables: ['client_name', 'amount'],
    });
  }
  
  if (type === 'sms') {
    templates.push({
      name: 'SMS de relance',
      type: 'sms',
      category: 'reminder',
      content: 'Rappel: Facture {{amount}}. {{company_name}}',
      tone: 'friendly',
      language: 'fr',
      variables: ['amount', 'company_name'],
    });
  }
  
  if (type === 'whatsapp') {
    templates.push({
      name: 'WhatsApp de relance',
      type: 'whatsapp',
      category: 'reminder',
      content: '🔔 Relance: {{amount}}',
      tone: 'friendly',
      language: 'fr',
      variables: ['amount'],
    });
  }
  
  return templates;
}
