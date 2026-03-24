// Template variables and replacement utilities

import { TemplateVariable } from "./types"

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: "client_name", label: "Nom du client", description: "Le nom complet du client", example: "Jean Dupont" },
  { name: "client_email", label: "Email du client", description: "L'adresse email du client", example: "jean@example.com" },
  { name: "client_phone", label: "Téléphone", description: "Le numéro de téléphone", example: "+221 77 123 45 67" },
  { name: "invoice_number", label: "Numéro de facture", description: "Le numéro de la facture", example: "FAC-2024-001" },
  { name: "amount", label: "Montant", description: "Le montant dû", example: "150 000 FCFA" },
  { name: "due_date", label: "Date d'échéance", description: "La date limite de paiement", example: "15 janvier 2024" },
  { name: "days_overdue", label: "Jours de retard", description: "Nombre de jours de retard", example: "30" },
  { name: "company_name", label: "Nom de l'entreprise", description: "Votre nom d'entreprise", example: "Mon Entreprise SARL" },
  { name: "company_address", label: "Adresse", description: "L'adresse de l'entreprise", example: "Dakar, Sénégal" },
  { name: "company_phone", label: "Téléphone entreprise", description: "Votre numéro de téléphone", example: "+221 33 800 00 00" },
  { name: "payment_link", label: "Lien de paiement", description: "Lien pour payer en ligne", example: "https://pay.example.com/abc" },
  { name: "portal_link", label: "Lien portail", description: "Lien vers le portail client", example: "https://portal.example.com/xyz" },
]

export const VARIABLE_CATEGORIES = {
  client: ["client_name", "client_email", "client_phone"],
  debt: ["invoice_number", "amount", "due_date", "days_overdue"],
  company: ["company_name", "company_address", "company_phone"],
  links: ["payment_link", "portal_link"],
}

export function replaceVariables(template: string, data: Record<string, any>): string {
  let result = template
  
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{${key}\\}`, "g")
    result = result.replace(regex, String(value || ""))
  }
  
  return result
}

export function getCharacterInfo(text: string): { count: number; segments: number } {
  const count = text.length
  // SMS segments are 160 chars for GSM-7, 70 for UCS-2
  const hasUnicode = /[^\x00-\x7F]/.test(text)
  const segmentSize = hasUnicode ? 70 : 160
  const segments = Math.ceil(count / segmentSize)
  
  return { count, segments }
}

export function validateVariables(content: string): { valid: boolean; missing: string[] } {
  const regex = /\{([^}]+)\}/g
  const matches = content.match(regex) || []
  const usedVariables = matches.map(m => m.slice(1, -1))
  const definedVariables = TEMPLATE_VARIABLES.map(v => v.name)
  const missing = usedVariables.filter(v => !definedVariables.includes(v))
  
  return { valid: missing.length === 0, missing }
}

export const SAMPLE_PREVIEW_DATA: Record<string, any> = {
  client_name: "Mamadou Diallo",
  client_email: "mamadou.diallo@example.com",
  client_phone: "+221 77 123 45 67",
  invoice_number: "FAC-2024-0042",
  amount: "250 000 FCFA",
  due_date: "15 janvier 2024",
  days_overdue: "7",
  company_name: "Votre Entreprise",
  company_address: "Dakar, Sénégal",
  company_phone: "+221 33 800 00 00",
  payment_link: "https://pay.example.com/abc123",
  portal_link: "https://portal.example.com/xyz789",
}
