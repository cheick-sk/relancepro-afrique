import { TemplateCreate } from "./types"

export function getInitialTemplatesForNewUser(): TemplateCreate[] {
  return [
    {
      name: "Première relance email",
      type: "email",
      category: "reminder",
      subject: "Rappel : Facture en attente - {invoice_number}",
      content: `Bonjour {client_name},

Nous espérons que vous allez bien.

Nous vous rappelons que la facture {invoice_number} d'un montant de {amount} est en attente de paiement depuis le {due_date}.

Nous vous prions de bien vouloir régulariser cette situation dans les meilleurs délais.

Cordialement,
{company_name}`,
      tone: "professional",
      language: "fr",
    },
    {
      name: "Relance WhatsApp",
      type: "whatsapp",
      category: "reminder",
      content: `Bonjour {client_name},

Rappel : Votre facture {invoice_number} de {amount} est en attente.

Merci de régulariser votre situation.

{company_name}`,
      tone: "friendly",
      language: "fr",
    },
    {
      name: "SMS de rappel",
      type: "sms",
      category: "reminder",
      content: "Bonjour {client_name}, rappel: facture {invoice_number} de {amount} en attente. Echéance: {due_date}. {company_name}",
      tone: "professional",
      language: "fr",
    },
    {
      name: "Notification de retard",
      type: "email",
      category: "overdue",
      subject: "URGENT : Facture en retard - {invoice_number}",
      content: `Bonjour {client_name},

Nous constatons que votre facture {invoice_number} d'un montant de {amount} a plus de {days_overdue} jours de retard.

Nous vous prions de régulariser cette situation dans les plus brefs délais pour éviter des frais supplémentaires.

Pour tout arrangement de paiement, n'hésitez pas à nous contacter.

Cordialement,
{company_name}`,
      tone: "urgent",
      language: "fr",
    },
  ]
}

export function getDefaultTemplatesByType(type: string): TemplateCreate[] {
  return getInitialTemplatesForNewUser().filter(t => t.type === type)
}
