export const TEMPLATE_VARIABLES: Record<string, { description: string; example: string }> = {
  '{{client_name}}': { description: 'Nom du client', example: 'Mamadou Diallo' },
  '{{client_email}}': { description: 'Email du client', example: 'mamadou@email.com' },
  '{{client_phone}}': { description: 'Téléphone du client', example: '+224 628 12 34 56' },
  '{{amount}}': { description: 'Montant dû', example: '1 500 000 GNF' },
  '{{due_date}}': { description: 'Date d\'échéance', example: '15 janvier 2024' },
  '{{days_overdue}}': { description: 'Jours de retard', example: '7' },
  '{{invoice_number}}': { description: 'Numéro de facture', example: 'FAC-2024-001' },
  '{{company_name}}': { description: 'Nom de votre entreprise', example: 'Mon Entreprise SARL' },
  '{{payment_link}}': { description: 'Lien de paiement', example: 'https://pay.example.com/abc123' },
  '{{support_phone}}': { description: 'Téléphone support', example: '+224 628 00 00 00' },
};

// Array version for iteration
export const TEMPLATE_VARIABLES_ARRAY = Object.entries(TEMPLATE_VARIABLES).map(([key, value]) => ({
  key: key.replace(/{{|}}/g, ''),
  variable: key,
  label: value.description,
  description: value.description,
  example: value.example,
}));

export const VARIABLE_CATEGORIES: Record<string, string[]> = {
  client: ['{{client_name}}', '{{client_email}}', '{{client_phone}}'],
  debt: ['{{amount}}', '{{due_date}}', '{{days_overdue}}', '{{invoice_number}}'],
  company: ['{{company_name}}', '{{support_phone}}', '{{payment_link}}'],
};

export function replaceVariables(template: string, data: Record<string, string>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(key, 'g'), value);
  }
  
  // Replace any remaining variables with empty strings
  result = result.replace(/\{\{[^}]+\}\}/g, '');
  
  return result;
}

export function validateVariables(template: string): { valid: boolean; missing: string[]; unknown: string[] } {
  const usedVariables = template.match(/\{\{[^}]+\}\}/g) || [];
  const knownVariables = Object.keys(TEMPLATE_VARIABLES);
  
  const missing: string[] = [];
  const unknown: string[] = [];
  
  for (const variable of usedVariables) {
    if (!knownVariables.includes(variable)) {
      unknown.push(variable);
    }
  }
  
  return {
    valid: unknown.length === 0,
    missing,
    unknown,
  };
}

export function getCharacterInfo(text: string): { count: number; segments: number } {
  const count = text.length;
  const segments = Math.ceil(count / 160);
  return { count, segments };
}

export const SAMPLE_PREVIEW_DATA: Record<string, string> = {
  '{{client_name}}': 'Mamadou Diallo',
  '{{client_email}}': 'mamadou@email.com',
  '{{client_phone}}': '+224 628 12 34 56',
  '{{amount}}': '1 500 000 GNF',
  '{{due_date}}': '15 janvier 2024',
  '{{days_overdue}}': '7',
  '{{invoice_number}}': 'FAC-2024-001',
  '{{company_name}}': 'Mon Entreprise SARL',
  '{{payment_link}}': 'https://pay.example.com/abc123',
  '{{support_phone}}': '+224 628 00 00 00',
};
