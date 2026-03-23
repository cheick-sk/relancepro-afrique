/**
 * Invoice Generator Library
 * Functions for generating invoice numbers, calculating totals, and generating PDFs
 */

import { db } from '@/lib/db'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// Types
export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface InvoiceData {
  id: string
  number: string
  status: string
  issueDate: Date
  dueDate: Date
  subtotal: number
  tax: number
  total: number
  currency: string
  notes: string | null
  terms: string | null
  client: {
    name: string
    email: string | null
    phone: string | null
    company: string | null
    address: string | null
  }
  profile: {
    name: string | null
    companyName: string | null
    email: string
    phone: string | null
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  payments: Array<{
    amount: number
    method: string
    reference: string | null
    paidAt: Date
  }>
}

export interface InvoiceTotals {
  subtotal: number
  tax: number
  total: number
}

/**
 * Generate a unique invoice number
 * Format: INV-{YEAR}-{MONTH}-{SEQUENCE}
 * Example: INV-2024-03-0001
 */
export async function generateInvoiceNumber(profileId: string): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  
  // Get the prefix for this month
  const prefix = `INV-${year}-${month}-`
  
  // Find the last invoice number for this profile with the same prefix
  const lastInvoice = await db.invoice.findFirst({
    where: {
      profileId,
      number: {
        startsWith: prefix
      }
    },
    orderBy: {
      number: 'desc'
    }
  })
  
  let sequence = 1
  
  if (lastInvoice) {
    // Extract the sequence number from the last invoice
    const lastNumber = lastInvoice.number
    const lastSequence = parseInt(lastNumber.split('-')[3], 10)
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }
  
  // Format the sequence with leading zeros (4 digits)
  const sequenceStr = String(sequence).padStart(4, '0')
  
  return `${prefix}${sequenceStr}`
}

/**
 * Calculate invoice totals from items
 */
export function calculateInvoiceTotals(
  items: InvoiceItem[],
  taxRate: number = 0
): InvoiceTotals {
  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unitPrice
    return sum + itemTotal
  }, 0)
  
  // Calculate tax
  const tax = subtotal * (taxRate / 100)
  
  // Calculate total
  const total = subtotal + tax
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'GNF'): string {
  const currencySymbols: Record<string, string> = {
    'GNF': 'GNF',
    'XOF': 'CFA',
    'XAF': 'FCFA',
    'EUR': '€',
    'USD': '$',
    'GBP': '£'
  }
  
  const symbol = currencySymbols[currency] || currency
  
  // For GNF and CFA, no decimal places
  if (['GNF', 'XOF', 'XAF'].includes(currency)) {
    return `${symbol} ${amount.toLocaleString('fr-FR')}`
  }
  
  return `${symbol} ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string = 'GNF'): string {
  const symbols: Record<string, string> = {
    'GNF': 'GNF',
    'XOF': 'CFA',
    'XAF': 'FCFA',
    'EUR': '€',
    'USD': '$',
    'GBP': '£'
  }
  return symbols[currency] || currency
}

/**
 * Format payment method for display
 */
export function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    'card': 'Carte bancaire',
    'mobile_money': 'Mobile Money',
    'bank_transfer': 'Virement bancaire',
    'cash': 'Espèces',
    'check': 'Chèque'
  }
  return methods[method] || method
}

/**
 * Get status label in French
 */
export function getStatusLabel(status: string): string {
  const statuses: Record<string, string> = {
    'draft': 'Brouillon',
    'sent': 'Envoyée',
    'paid': 'Payée',
    'overdue': 'En retard',
    'cancelled': 'Annulée'
  }
  return statuses[status] || status
}

/**
 * Generate invoice PDF
 */
export async function generateInvoicePDF(
  invoice: InvoiceData,
  options: {
    template?: 'modern' | 'classic' | 'african'
    includeQRCode?: boolean
    paymentLink?: string
  } = {}
): Promise<Buffer> {
  const { template = 'african', includeQRCode = true, paymentLink } = options
  
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })
  
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  
  // Colors based on template
  const colors = {
    modern: { primary: [59, 130, 246], secondary: [99, 102, 241] },
    classic: { primary: [0, 0, 0], secondary: [100, 100, 100] },
    african: { primary: [234, 88, 12], secondary: [251, 146, 60] } // Orange theme for Africa
  }
  
  const color = colors[template]
  
  // Header
  doc.setFillColor(...color.primary)
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  // Company name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  const companyName = invoice.profile.companyName || invoice.profile.name || 'RelancePro Africa'
  doc.text(companyName, margin, 20)
  
  // Invoice title
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('FACTURE', pageWidth - margin, 15, { align: 'right' })
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.number, pageWidth - margin, 25, { align: 'right' })
  
  // Reset text color
  doc.setTextColor(0, 0, 0)
  
  // Invoice info and dates
  let yPos = 55
  
  // Left: Client info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURÉ À:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  yPos += 6
  doc.text(invoice.client.name, margin, yPos)
  
  if (invoice.client.company) {
    yPos += 5
    doc.text(invoice.client.company, margin, yPos)
  }
  
  if (invoice.client.email) {
    yPos += 5
    doc.text(invoice.client.email, margin, yPos)
  }
  
  if (invoice.client.phone) {
    yPos += 5
    doc.text(invoice.client.phone, margin, yPos)
  }
  
  if (invoice.client.address) {
    yPos += 5
    const addressLines = doc.splitTextToSize(invoice.client.address, 60)
    addressLines.forEach((line: string) => {
      doc.text(line, margin, yPos)
      yPos += 5
    })
  }
  
  // Right: Dates
  yPos = 55
  const rightX = pageWidth - margin - 60
  
  doc.setFont('helvetica', 'bold')
  doc.text('Date d\'émission:', rightX, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(format(invoice.issueDate, 'dd MMMM yyyy', { locale: fr }), rightX + 35, yPos)
  
  yPos += 8
  doc.setFont('helvetica', 'bold')
  doc.text('Date d\'échéance:', rightX, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(format(invoice.dueDate, 'dd MMMM yyyy', { locale: fr }), rightX + 35, yPos)
  
  yPos += 8
  doc.setFont('helvetica', 'bold')
  doc.text('Statut:', rightX, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(getStatusLabel(invoice.status), rightX + 35, yPos)
  
  // Items table
  yPos = 100
  
  const tableData = invoice.items.map((item) => [
    item.description,
    item.quantity.toString(),
    formatCurrency(item.unitPrice, invoice.currency),
    formatCurrency(item.total, invoice.currency)
  ])
  
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Qté', 'Prix unitaire', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: color.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  })
  
  // Get the Y position after the table
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  
  // Totals section
  yPos = finalY + 10
  
  // Draw totals box
  const totalsBoxX = pageWidth - margin - 80
  const totalsBoxWidth = 80
  
  doc.setDrawColor(...color.primary)
  doc.setLineWidth(0.5)
  doc.rect(totalsBoxX, yPos, totalsBoxWidth, 40)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  // Subtotal
  doc.text('Sous-total:', totalsBoxX + 5, yPos + 10)
  doc.text(formatCurrency(invoice.subtotal, invoice.currency), totalsBoxX + totalsBoxWidth - 5, yPos + 10, { align: 'right' })
  
  // Tax
  doc.text('TVA:', totalsBoxX + 5, yPos + 20)
  doc.text(formatCurrency(invoice.tax, invoice.currency), totalsBoxX + totalsBoxWidth - 5, yPos + 20, { align: 'right' })
  
  // Total
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(...color.secondary)
  doc.rect(totalsBoxX + 3, yPos + 25, totalsBoxWidth - 6, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL:', totalsBoxX + 5, yPos + 33)
  doc.text(formatCurrency(invoice.total, invoice.currency), totalsBoxX + totalsBoxWidth - 5, yPos + 33, { align: 'right' })
  
  // Reset text color
  doc.setTextColor(0, 0, 0)
  
  // Payment history (if any)
  yPos += 55
  
  if (invoice.payments && invoice.payments.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Historique des paiements', margin, yPos)
    
    yPos += 8
    
    invoice.payments.forEach((payment) => {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `${format(payment.paidAt, 'dd/MM/yyyy')} - ${formatPaymentMethod(payment.method)} - ${formatCurrency(payment.amount, invoice.currency)}`,
        margin,
        yPos
      )
      yPos += 5
    })
  }
  
  // Notes and terms
  yPos = pageHeight - 80
  
  if (invoice.notes) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Notes:', margin, yPos)
    doc.setFont('helvetica', 'normal')
    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin)
    doc.text(notesLines.slice(0, 3), margin, yPos + 5)
    yPos += 15
  }
  
  if (invoice.terms) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Conditions:', margin, yPos)
    doc.setFont('helvetica', 'normal')
    const termsLines = doc.splitTextToSize(invoice.terms, pageWidth - 2 * margin)
    doc.text(termsLines.slice(0, 3), margin, yPos + 5)
  }
  
  // QR Code for payment link
  if (includeQRCode && paymentLink) {
    try {
      const qrDataUrl = await QRCode.toDataURL(paymentLink, {
        width: 80,
        margin: 1
      })
      doc.addImage(qrDataUrl, 'PNG', margin, pageHeight - 50, 25, 25)
      doc.setFontSize(8)
      doc.text('Scannez pour payer', margin, pageHeight - 22)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }
  
  // Footer
  doc.setFillColor(...color.primary)
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.text(
    `${companyName} - ${invoice.profile.email} ${invoice.profile.phone ? '| ' + invoice.profile.phone : ''}`,
    pageWidth / 2,
    pageHeight - 7,
    { align: 'center' }
  )
  
  // Return as buffer
  return Buffer.from(doc.output('arraybuffer'))
}

/**
 * Get invoice with all relations
 */
export async function getInvoiceWithRelations(invoiceId: string): Promise<InvoiceData | null> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      profile: true,
      items: {
        orderBy: { createdAt: 'asc' }
      },
      payments: {
        orderBy: { paidAt: 'desc' }
      }
    }
  })
  
  if (!invoice) return null
  
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    currency: invoice.currency,
    notes: invoice.notes,
    terms: invoice.terms,
    client: {
      name: invoice.client.name,
      email: invoice.client.email,
      phone: invoice.client.phone,
      company: invoice.client.company,
      address: invoice.client.address
    },
    profile: {
      name: invoice.profile.name,
      companyName: invoice.profile.companyName,
      email: invoice.profile.email,
      phone: invoice.profile.phone
    },
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total
    })),
    payments: invoice.payments.map((payment) => ({
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference,
      paidAt: payment.paidAt
    }))
  }
}
