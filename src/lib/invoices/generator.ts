export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

export function calculateInvoiceTotals(items: InvoiceItem[], taxRate: number = 0): InvoiceTotals {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  
  return { subtotal, tax, total };
}

export function formatCurrency(amount: number, currency: string = 'GNF'): string {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    sent: 'Envoyée',
    paid: 'Payée',
    overdue: 'En retard',
    cancelled: 'Annulée',
  };
  return labels[status] || status;
}

export async function generateInvoicePDF(invoiceId: string): Promise<Buffer> {
  // Would need PDF library
  return Buffer.from('');
}

export async function getInvoiceWithRelations(invoiceId: string): Promise<unknown> {
  return null;
}
