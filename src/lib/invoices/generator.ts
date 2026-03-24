// Invoice generation utilities

import { db } from "@/lib/db"

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  return `FAC-${year}-${random}`
}

export function calculateInvoiceTotals(items: any[]): { subtotal: number; tax: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0)
  const tax = subtotal * 0.18 // 18% VAT
  const total = subtotal + tax
  return { subtotal, tax, total }
}

export function formatCurrency(amount: number, currency: string = "XOF"): string {
  return `${amount.toLocaleString("fr-FR")} ${currency}`
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    PENDING: "En attente",
    PAID: "Payée",
    OVERDUE: "En retard",
    CANCELLED: "Annulée",
  }
  return labels[status] || status
}

export async function generateInvoicePDF(invoiceId: string): Promise<Buffer> {
  return Buffer.from("PDF content")
}

export async function getInvoiceWithRelations(invoiceId: string): Promise<any> {
  return db.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, client: true },
  })
}
