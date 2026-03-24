// Template types and constants

export type TemplateType = "email" | "sms" | "whatsapp" | "voice"
export type TemplateCategory = "reminder" | "overdue" | "legal" | "payment" | "welcome"
export type TemplateTone = "formal" | "friendly" | "urgent" | "professional"
export type TemplateLanguage = "fr" | "en"

export interface TemplateVariable {
  name: string
  label: string
  description: string
  example: string
}

export interface TemplateCreate {
  name: string
  type: TemplateType
  category: TemplateCategory
  subject?: string
  content: string
  tone?: TemplateTone
  language?: TemplateLanguage
}

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  reminder: "Relance",
  overdue: "Retard",
  legal: "Juridique",
  payment: "Paiement",
  welcome: "Bienvenue",
}

export const CATEGORY_DESCRIPTIONS: Record<TemplateCategory, string> = {
  reminder: "Messages de rappel pour les factures en attente",
  overdue: "Messages pour les factures en retard",
  legal: "Messages liés aux procédures judiciaires",
  payment: "Messages de confirmation de paiement",
  welcome: "Messages de bienvenue pour les nouveaux clients",
}

export const TONE_LABELS: Record<TemplateTone, string> = {
  formal: "Formel",
  friendly: "Amical",
  urgent: "Urgent",
  professional: "Professionnel",
}

export const TONE_DESCRIPTIONS: Record<TemplateTone, string> = {
  formal: "Ton formel et respectueux",
  friendly: "Ton amical et détendu",
  urgent: "Ton urgent et pressant",
  professional: "Ton professionnel standard",
}

export const TONE_COLORS: Record<TemplateTone, string> = {
  formal: "bg-blue-100 text-blue-800",
  friendly: "bg-green-100 text-green-800",
  urgent: "bg-red-100 text-red-800",
  professional: "bg-gray-100 text-gray-800",
}

export const LANGUAGE_LABELS: Record<TemplateLanguage, string> = {
  fr: "Français",
  en: "English",
}

export const LANGUAGE_FLAGS: Record<TemplateLanguage, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
}

// Default email templates
export const DEFAULT_EMAIL_TEMPLATES: TemplateCreate[] = [
  {
    name: "Première relance",
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
]

// Default WhatsApp templates
export const DEFAULT_WHATSAPP_TEMPLATES: TemplateCreate[] = [
  {
    name: "Rappel WhatsApp",
    type: "whatsapp",
    category: "reminder",
    content: `Bonjour {client_name}, 

Rappel : Votre facture {invoice_number} de {amount} est en attente.

Merci de régulariser votre situation.

{company_name}`,
    tone: "friendly",
    language: "fr",
  },
]
