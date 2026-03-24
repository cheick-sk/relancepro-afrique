// Template Variables for RelancePro Africa
// All available variables with descriptions and formatting functions

export interface TemplateVariable {
  key: string;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  category: 'client' | 'debt' | 'company' | 'system';
  example: string;
  formatFunction?: (value: unknown, currency?: string) => string;
}

// =====================================================
// VARIABLE DEFINITIONS
// =====================================================
export const templateVariables: TemplateVariable[] = [
  // CLIENT VARIABLES
  {
    key: 'clientName',
    label: 'Nom du client',
    labelEn: 'Client name',
    description: 'Le nom complet du client',
    descriptionEn: "The client's full name",
    category: 'client',
    example: 'Jean Dupont',
  },
  {
    key: 'clientCompany',
    label: 'Entreprise du client',
    labelEn: 'Client company',
    description: 'Le nom de l\'entreprise du client',
    descriptionEn: "The client's company name",
    category: 'client',
    example: 'ACME SARL',
  },
  {
    key: 'clientEmail',
    label: 'Email du client',
    labelEn: 'Client email',
    description: 'L\'adresse email du client',
    descriptionEn: "The client's email address",
    category: 'client',
    example: 'jean.dupont@acme.com',
  },
  {
    key: 'clientPhone',
    label: 'Téléphone du client',
    labelEn: 'Client phone',
    description: 'Le numéro de téléphone du client',
    descriptionEn: "The client's phone number",
    category: 'client',
    example: '+224 620 00 00 00',
  },
  {
    key: 'clientAddress',
    label: 'Adresse du client',
    labelEn: 'Client address',
    description: 'L\'adresse postale du client',
    descriptionEn: "The client's postal address",
    category: 'client',
    example: 'Conakry, Guinée',
  },

  // DEBT VARIABLES
  {
    key: 'amount',
    label: 'Montant total',
    labelEn: 'Total amount',
    description: 'Le montant total de la créance',
    descriptionEn: 'The total debt amount',
    category: 'debt',
    example: '1 500 000 GNF',
    formatFunction: (value, currency = 'GNF') => formatCurrency(value as number, currency),
  },
  {
    key: 'remainingAmount',
    label: 'Montant restant',
    labelEn: 'Remaining amount',
    description: 'Le montant restant à payer',
    descriptionEn: 'The remaining amount to pay',
    category: 'debt',
    example: '1 200 000 GNF',
    formatFunction: (value, currency = 'GNF') => formatCurrency(value as number, currency),
  },
  {
    key: 'paidAmount',
    label: 'Montant payé',
    labelEn: 'Paid amount',
    description: 'Le montant déjà payé par le client',
    descriptionEn: 'The amount already paid by the client',
    category: 'debt',
    example: '300 000 GNF',
    formatFunction: (value, currency = 'GNF') => formatCurrency(value as number, currency),
  },
  {
    key: 'reference',
    label: 'Référence',
    labelEn: 'Reference',
    description: 'Le numéro de référence ou facture',
    descriptionEn: 'The reference or invoice number',
    category: 'debt',
    example: 'FAC-2025-001',
  },
  {
    key: 'description',
    label: 'Description',
    labelEn: 'Description',
    description: 'La description de la créance',
    descriptionEn: 'The debt description',
    category: 'debt',
    example: 'Prestation de consulting',
  },
  {
    key: 'dueDate',
    label: 'Date d\'échéance',
    labelEn: 'Due date',
    description: 'La date d\'échéance de la facture',
    descriptionEn: 'The invoice due date',
    category: 'debt',
    example: '15 janvier 2025',
    formatFunction: (value) => formatDate(value as Date | string),
  },
  {
    key: 'issueDate',
    label: 'Date d\'émission',
    labelEn: 'Issue date',
    description: 'La date d\'émission de la facture',
    descriptionEn: 'The invoice issue date',
    category: 'debt',
    example: '1er janvier 2025',
    formatFunction: (value) => formatDate(value as Date | string),
  },
  {
    key: 'daysOverdue',
    label: 'Jours de retard',
    labelEn: 'Days overdue',
    description: 'Le nombre de jours de retard',
    descriptionEn: 'The number of days overdue',
    category: 'debt',
    example: '45',
  },
  {
    key: 'reminderCount',
    label: 'Nombre de relances',
    labelEn: 'Reminder count',
    description: 'Le nombre de relances déjà envoyées',
    descriptionEn: 'The number of reminders already sent',
    category: 'debt',
    example: '2',
  },

  // COMPANY VARIABLES
  {
    key: 'companyName',
    label: 'Nom de l\'entreprise',
    labelEn: 'Company name',
    description: 'Le nom de votre entreprise',
    descriptionEn: 'Your company name',
    category: 'company',
    example: 'Ma Société SARL',
  },
  {
    key: 'companyPhone',
    label: 'Téléphone de l\'entreprise',
    labelEn: 'Company phone',
    description: 'Le numéro de téléphone de votre entreprise',
    descriptionEn: 'Your company phone number',
    category: 'company',
    example: '+224 620 00 00 00',
  },
  {
    key: 'companyEmail',
    label: 'Email de l\'entreprise',
    labelEn: 'Company email',
    description: 'L\'adresse email de votre entreprise',
    descriptionEn: 'Your company email address',
    category: 'company',
    example: 'contact@masociete.com',
  },
  {
    key: 'companyAddress',
    label: 'Adresse de l\'entreprise',
    labelEn: 'Company address',
    description: 'L\'adresse de votre entreprise',
    descriptionEn: 'Your company address',
    category: 'company',
    example: 'Conakry, Guinée',
  },

  // SYSTEM VARIABLES
  {
    key: 'currentDate',
    label: 'Date actuelle',
    labelEn: 'Current date',
    description: 'La date du jour',
    descriptionEn: "Today's date",
    category: 'system',
    example: '20 janvier 2025',
    formatFunction: () => formatDate(new Date()),
  },
  {
    key: 'currentTime',
    label: 'Heure actuelle',
    labelEn: 'Current time',
    description: 'L\'heure actuelle',
    descriptionEn: 'The current time',
    category: 'system',
    example: '14:30',
    formatFunction: () => formatTime(new Date()),
  },
  {
    key: 'reminderNumber',
    label: 'Numéro de relance',
    labelEn: 'Reminder number',
    description: 'Le numéro de la relance (1, 2 ou 3)',
    descriptionEn: 'The reminder number (1, 2, or 3)',
    category: 'system',
    example: '1',
  },
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Get variables by category
export function getVariablesByCategory(category: TemplateVariable['category']): TemplateVariable[] {
  return templateVariables.filter((v) => v.category === category);
}

// Get variable by key
export function getVariableByKey(key: string): TemplateVariable | undefined {
  return templateVariables.find((v) => v.key === key);
}

// Get all variable keys
export function getAllVariableKeys(): string[] {
  return templateVariables.map((v) => v.key);
}

// =====================================================
// FORMATTING FUNCTIONS
// =====================================================

// Format currency based on locale
export function formatCurrency(amount: number, currency: string = 'GNF'): string {
  const currencyLocales: Record<string, string> = {
    GNF: 'gn-GN',
    XOF: 'fr-SN',
    XAF: 'fr-CM',
    NGN: 'en-NG',
    GHS: 'en-GH',
    KES: 'en-KE',
    ZAR: 'en-ZA',
    MAD: 'ar-MA',
    TND: 'ar-TN',
    EGP: 'ar-EG',
    EUR: 'fr-FR',
    USD: 'en-US',
    GBP: 'en-GB',
  };

  const locale = currencyLocales[currency] || 'fr-FR';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'GNF' ? 0 : 2,
      maximumFractionDigits: currency === 'GNF' ? 0 : 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported currencies
    return `${amount.toLocaleString('fr-FR')} ${currency}`;
  }
}

// Format date
export function formatDate(date: Date | string, locale: string = 'fr-FR'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

// Format time
export function formatTime(date: Date | string, locale: string = 'fr-FR'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toLocaleTimeString();
  }
}

// =====================================================
// VARIABLE REPLACEMENT
// =====================================================

// Interface for template data
export interface TemplateData {
  clientName?: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  amount?: number;
  remainingAmount?: number;
  paidAmount?: number;
  reference?: string;
  description?: string;
  dueDate?: Date | string;
  issueDate?: Date | string;
  daysOverdue?: number;
  reminderCount?: number;
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  currentDate?: Date | string;
  currentTime?: Date | string;
  reminderNumber?: number;
  currency?: string;
}

// Replace variables in a template string
export function replaceVariables(
  template: string,
  data: TemplateData,
  currency: string = 'GNF'
): string {
  let result = template;

  // Client variables
  if (data.clientName !== undefined) {
    result = result.replace(/\{\{clientName\}\}/g, data.clientName);
  }
  if (data.clientCompany !== undefined) {
    result = result.replace(/\{\{clientCompany\}\}/g, data.clientCompany);
  }
  if (data.clientEmail !== undefined) {
    result = result.replace(/\{\{clientEmail\}\}/g, data.clientEmail);
  }
  if (data.clientPhone !== undefined) {
    result = result.replace(/\{\{clientPhone\}\}/g, data.clientPhone);
  }
  if (data.clientAddress !== undefined) {
    result = result.replace(/\{\{clientAddress\}\}/g, data.clientAddress);
  }

  // Debt variables
  if (data.amount !== undefined) {
    result = result.replace(/\{\{amount\}\}/g, formatCurrency(data.amount, currency));
  }
  if (data.remainingAmount !== undefined) {
    result = result.replace(/\{\{remainingAmount\}\}/g, formatCurrency(data.remainingAmount, currency));
  }
  if (data.paidAmount !== undefined) {
    result = result.replace(/\{\{paidAmount\}\}/g, formatCurrency(data.paidAmount, currency));
  }
  if (data.reference !== undefined) {
    result = result.replace(/\{\{reference\}\}/g, data.reference);
  }
  if (data.description !== undefined) {
    result = result.replace(/\{\{description\}\}/g, data.description);
  }
  if (data.dueDate !== undefined) {
    result = result.replace(/\{\{dueDate\}\}/g, formatDate(data.dueDate));
  }
  if (data.issueDate !== undefined) {
    result = result.replace(/\{\{issueDate\}\}/g, formatDate(data.issueDate));
  }
  if (data.daysOverdue !== undefined) {
    result = result.replace(/\{\{daysOverdue\}\}/g, String(data.daysOverdue));
  }
  if (data.reminderCount !== undefined) {
    result = result.replace(/\{\{reminderCount\}\}/g, String(data.reminderCount));
  }

  // Company variables
  if (data.companyName !== undefined) {
    result = result.replace(/\{\{companyName\}\}/g, data.companyName);
  }
  if (data.companyPhone !== undefined) {
    result = result.replace(/\{\{companyPhone\}\}/g, data.companyPhone);
  }
  if (data.companyEmail !== undefined) {
    result = result.replace(/\{\{companyEmail\}\}/g, data.companyEmail);
  }
  if (data.companyAddress !== undefined) {
    result = result.replace(/\{\{companyAddress\}\}/g, data.companyAddress);
  }

  // System variables
  result = result.replace(/\{\{currentDate\}\}/g, formatDate(new Date()));
  result = result.replace(/\{\{currentTime\}\}/g, formatTime(new Date()));
  if (data.reminderNumber !== undefined) {
    result = result.replace(/\{\{reminderNumber\}\}/g, String(data.reminderNumber));
  }

  return result;
}

// Get sample data for preview
export function getSampleTemplateData(): TemplateData {
  return {
    clientName: 'Jean Dupont',
    clientCompany: 'ACME SARL',
    clientEmail: 'jean.dupont@acme.com',
    clientPhone: '+224 620 00 00 00',
    clientAddress: 'Conakry, Guinée',
    amount: 1500000,
    remainingAmount: 1200000,
    paidAmount: 300000,
    reference: 'FAC-2025-001',
    description: 'Prestation de consulting',
    dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
    issueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    daysOverdue: 45,
    reminderCount: 2,
    companyName: 'Ma Société SARL',
    companyPhone: '+224 620 11 11 11',
    companyEmail: 'contact@masociete.com',
    companyAddress: 'Conakry, Guinée',
    reminderNumber: 1,
    currency: 'GNF',
  };
}

// Export categories for UI
export const variableCategories = [
  { key: 'client', label: 'Client', labelEn: 'Client', icon: 'user' },
  { key: 'debt', label: 'Créance', labelEn: 'Debt', icon: 'file-text' },
  { key: 'company', label: 'Entreprise', labelEn: 'Company', icon: 'building' },
  { key: 'system', label: 'Système', labelEn: 'System', icon: 'settings' },
];
