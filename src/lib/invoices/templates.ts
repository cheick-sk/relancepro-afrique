// Invoice templates

export function generateInvoiceWithTemplate(invoice: any, template: string): string {
  return `Invoice ${invoice.invoiceNumber}`
}
