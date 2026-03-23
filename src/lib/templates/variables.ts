// Template Variables for RelancePro Africa
// Available variables for template personalization

import { TemplateVariable, PreviewData, VariableCategory } from './types';

// =====================================================
// AVAILABLE VARIABLES
// =====================================================

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // ========================================
  // Client Variables
  // ========================================
  {
    key: 'client_name',
    label: 'Nom du client',
    description: 'Le nom complet du client',
    example: 'Jean Dupont',
    category: 'client',
  },
  {
    key: 'client_email',
    label: 'Email du client',
    description: 'L\'adresse email du client',
    example: 'jean.dupont@email.com',
    category: 'client',
  },
  {
    key: 'client_phone',
    label: 'Téléphone du client',
    description: 'Le numéro de téléphone du client',
    example: '+224 620 00 00 00',
    category: 'client',
  },
  {
    key: 'client_company',
    label: 'Entreprise du client',
    description: 'Le nom de l\'entreprise du client',
    example: 'ABC SARL',
    category: 'client',
  },
  
  // ========================================
  // Dette Variables
  // ========================================
  {
    key: 'debt_reference',
    label: 'Référence de la créance',
    description: 'Le numéro de référence de la facture ou créance',
    example: 'FAC-2025-001',
    category: 'dette',
  },
  {
    key: 'debt_amount',
    label: 'Montant total dû',
    description: 'Le montant total de la créance',
    example: '1 500 000',
    category: 'dette',
  },
  {
    key: 'debt_remaining',
    label: 'Montant restant',
    description: 'Le montant restant à payer',
    example: '1 200 000',
    category: 'dette',
  },
  {
    key: 'debt_paid',
    label: 'Montant payé',
    description: 'Le montant déjà payé par le client',
    example: '300 000',
    category: 'dette',
  },
  {
    key: 'debt_due_date',
    label: 'Date d\'échéance',
    description: 'La date limite de paiement',
    example: '15 janvier 2025',
    category: 'dette',
  },
  {
    key: 'debt_days_overdue',
    label: 'Jours de retard',
    description: 'Nombre de jours après la date d\'échéance',
    example: '45',
    category: 'dette',
  },
  {
    key: 'debt_currency',
    label: 'Devise',
    description: 'La devise de la créance (GNF, XOF, XAF, EUR, USD)',
    example: 'GNF',
    category: 'dette',
  },
  
  // ========================================
  // Entreprise Variables
  // ========================================
  {
    key: 'company_name',
    label: 'Nom de l\'entreprise',
    description: 'Le nom de votre entreprise',
    example: 'Ma Société SARL',
    category: 'entreprise',
  },
  {
    key: 'sender_name',
    label: 'Nom de l\'expéditeur',
    description: 'Le nom de la personne qui envoie le message',
    example: 'Marie Koné',
    category: 'entreprise',
  },
  
  // ========================================
  // Dates Variables
  // ========================================
  {
    key: 'current_date',
    label: 'Date actuelle',
    description: 'La date du jour',
    example: '20 janvier 2025',
    category: 'dates',
  },
  {
    key: 'current_time',
    label: 'Heure actuelle',
    description: 'L\'heure actuelle',
    example: '14:30',
    category: 'dates',
  },
];

// =====================================================
// VARIABLE GROUPS/CATEGORIES
// =====================================================

export const VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    key: 'client',
    label: 'Client',
    description: 'Informations sur le client',
    icon: 'user',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  {
    key: 'dette',
    label: 'Créance',
    description: 'Informations sur la créance',
    icon: 'file-text',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
  {
    key: 'entreprise',
    label: 'Entreprise',
    description: 'Informations sur votre entreprise',
    icon: 'building',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
  {
    key: 'dates',
    label: 'Dates',
    description: 'Dates importantes',
    icon: 'calendar',
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
];

// Legacy export for backward compatibility
export const VARIABLE_GROUPS = {
  client: {
    label: 'Client',
    description: 'Informations sur le client',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    variables: TEMPLATE_VARIABLES.filter(v => v.category === 'client'),
  },
  dette: {
    label: 'Créance',
    description: 'Informations sur la créance',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    variables: TEMPLATE_VARIABLES.filter(v => v.category === 'dette'),
  },
  entreprise: {
    label: 'Entreprise',
    description: 'Informations sur votre entreprise',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    variables: TEMPLATE_VARIABLES.filter(v => v.category === 'entreprise'),
  },
  dates: {
    label: 'Dates',
    description: 'Dates importantes',
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    variables: TEMPLATE_VARIABLES.filter(v => v.category === 'dates'),
  },
};

// =====================================================
// SAMPLE PREVIEW DATA
// =====================================================

export const SAMPLE_PREVIEW_DATA: PreviewData = {
  // Client
  client_name: 'Jean Dupont',
  client_email: 'jean.dupont@email.com',
  client_phone: '+224 620 00 00 00',
  client_company: 'ABC SARL',
  
  // Dette
  debt_reference: 'FAC-2025-001',
  debt_amount: '1 500 000',
  debt_remaining: '1 200 000',
  debt_paid: '300 000',
  debt_due_date: '15 janvier 2025',
  debt_days_overdue: '45',
  debt_currency: 'GNF',
  
  // Entreprise
  company_name: 'Ma Société SARL',
  sender_name: 'Marie Koné',
  
  // Dates
  current_date: '20 janvier 2025',
  current_time: '14:30',
};

// =====================================================
// VARIABLE VALIDATION
// =====================================================

/**
 * Extract all variables from a template string
 */
export function extractVariables(text: string): string[] {
  const regex = /\{([a-z_]+)\}/g;
  const matches: string[] = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }
  
  return matches;
}

/**
 * Check if a variable key is valid
 */
export function isValidVariable(key: string): boolean {
  return TEMPLATE_VARIABLES.some(v => v.key === key);
}

/**
 * Validate template variables
 * Returns list of invalid variables found
 */
export function validateVariables(text: string): { valid: string[]; invalid: string[] } {
  const found = extractVariables(text);
  const valid: string[] = [];
  const invalid: string[] = [];
  
  for (const key of found) {
    if (isValidVariable(key)) {
      valid.push(key);
    } else {
      invalid.push(key);
    }
  }
  
  return { valid, invalid };
}

/**
 * Replace variables in text with preview data
 */
export function replaceVariables(
  text: string,
  data: Partial<PreviewData> = {}
): string {
  const previewData = { ...SAMPLE_PREVIEW_DATA, ...data };
  let result = text;
  
  for (const [key, value] of Object.entries(previewData)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, String(value));
  }
  
  return result;
}

/**
 * Get variable by key
 */
export function getVariableByKey(key: string): TemplateVariable | undefined {
  return TEMPLATE_VARIABLES.find(v => v.key === key);
}

/**
 * Get variables by category
 */
export function getVariablesByCategory(category: TemplateVariable['category']): TemplateVariable[] {
  return TEMPLATE_VARIABLES.filter(v => v.category === category);
}

/**
 * Get all variable keys
 */
export function getAllVariableKeys(): string[] {
  return TEMPLATE_VARIABLES.map(v => v.key);
}

// =====================================================
// CHARACTER COUNT HELPERS
// =====================================================

/**
 * Count characters in text (excluding variables)
 */
export function countCharacters(text: string): number {
  // Replace variables with sample data to get accurate count
  const expanded = replaceVariables(text);
  return expanded.length;
}

/**
 * Calculate SMS segments
 * SMS is limited to 160 characters for GSM-7, 67 for UCS-2
 */
export function calculateSmsSegments(text: string): number {
  const expanded = replaceVariables(text);
  const length = expanded.length;
  
  // Check if text contains non-GSM characters (emojis, accents, etc.)
  const hasNonGsm = /[^a-zA-Z0-9@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#$%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|]/.test(expanded);
  
  if (hasNonGsm) {
    // UCS-2 encoding
    if (length <= 67) return 1;
    return Math.ceil(length / 67);
  } else {
    // GSM-7 encoding
    if (length <= 160) return 1;
    return Math.ceil(length / 153);
  }
}

/**
 * Get character count info for template type
 */
export function getCharacterInfo(text: string, type: 'email' | 'whatsapp' | 'sms'): {
  count: number;
  max: number;
  warning: number;
  isOverLimit: boolean;
  isNearLimit: boolean;
  segments?: number;
} {
  const count = countCharacters(text);
  
  switch (type) {
    case 'sms':
      return {
        count,
        max: 160,
        warning: 140,
        isOverLimit: count > 160,
        isNearLimit: count > 140 && count <= 160,
        segments: calculateSmsSegments(text),
      };
    case 'whatsapp':
      return {
        count,
        max: 4096,
        warning: 1000,
        isOverLimit: count > 4096,
        isNearLimit: count > 1000 && count <= 4096,
      };
    case 'email':
    default:
      return {
        count,
        max: 100000,
        warning: 50000,
        isOverLimit: count > 100000,
        isNearLimit: count > 50000 && count <= 100000,
      };
  }
}
