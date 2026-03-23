/**
 * Invoice PDF Templates
 * Professional African business style templates
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { InvoiceData } from './generator'

// Template types
export type InvoiceTemplate = 'modern' | 'classic' | 'african' | 'minimal'

// Template configuration
export interface TemplateConfig {
  name: string
  description: string
  primaryColor: [number, number, number]
  secondaryColor: [number, number, number]
  accentColor: [number, number, number]
  fontFamily: string
  showPattern: boolean
  showAfricanMotif: boolean
}

// Available templates
export const INVOICE_TEMPLATES: Record<InvoiceTemplate, TemplateConfig> = {
  modern: {
    name: 'Moderne',
    description: 'Design épuré et contemporain',
    primaryColor: [59, 130, 246], // Blue
    secondaryColor: [99, 102, 241], // Indigo
    accentColor: [139, 92, 246], // Purple
    fontFamily: 'helvetica',
    showPattern: false,
    showAfricanMotif: false
  },
  classic: {
    name: 'Classique',
    description: 'Style professionnel traditionnel',
    primaryColor: [30, 41, 59], // Slate
    secondaryColor: [71, 85, 105], // Slate lighter
    accentColor: [148, 163, 184], // Slate light
    fontFamily: 'helvetica',
    showPattern: false,
    showAfricanMotif: false
  },
  african: {
    name: 'Africain',
    description: 'Style africain avec motifs traditionnels',
    primaryColor: [234, 88, 12], // Orange (African sunset)
    secondaryColor: [251, 146, 60], // Orange lighter
    accentColor: [180, 83, 9], // Orange darker
    fontFamily: 'helvetica',
    showPattern: true,
    showAfricanMotif: true
  },
  minimal: {
    name: 'Minimaliste',
    description: 'Design simple et épuré',
    primaryColor: [100, 100, 100], // Gray
    secondaryColor: [150, 150, 150], // Gray lighter
    accentColor: [200, 200, 200], // Gray light
    fontFamily: 'helvetica',
    showPattern: false,
    showAfricanMotif: false
  }
}

/**
 * Draw African-inspired decorative pattern
 */
function drawAfricanPattern(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  color: [number, number, number]
): void {
  doc.setDrawColor(...color)
  doc.setLineWidth(0.3)
  
  const patternSize = 8
  const rows = Math.floor(height / patternSize)
  const cols = Math.floor(width / patternSize)
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = x + col * patternSize
      const py = y + row * patternSize
      
      // Draw geometric African-inspired shapes
      if ((row + col) % 3 === 0) {
        // Triangle
        doc.line(px + patternSize / 2, py, px, py + patternSize)
        doc.line(px + patternSize / 2, py, px + patternSize, py + patternSize)
      } else if ((row + col) % 3 === 1) {
        // Diamond
        doc.line(px + patternSize / 2, py, px + patternSize, py + patternSize / 2)
        doc.line(px + patternSize, py + patternSize / 2, px + patternSize / 2, py + patternSize)
        doc.line(px + patternSize / 2, py + patternSize, px, py + patternSize / 2)
        doc.line(px, py + patternSize / 2, px + patternSize / 2, py)
      }
    }
  }
}

/**
 * Generate PDF using specified template
 */
export async function generateInvoiceWithTemplate(
  invoice: InvoiceData,
  templateType: InvoiceTemplate = 'african',
  options: {
    paymentLink?: string
    includeQRCode?: boolean
    logo?: string
  } = {}
): Promise<Buffer> {
  const config = INVOICE_TEMPLATES[templateType]
  const { paymentLink, includeQRCode = true, logo } = options
  
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })
  
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  
  // ====================
  // HEADER SECTION
  // ====================
  
  // Background pattern for African template
  if (config.showAfricanMotif) {
    doc.setFillColor(...config.accentColor)
    doc.setGlobalAlpha(0.1)
    drawAfricanPattern(doc, 0, 0, pageWidth, 50, config.primaryColor)
    doc.setGlobalAlpha(1)
  }
  
  // Header background
  doc.setFillColor(...config.primaryColor)
  doc.rect(0, 0, pageWidth, 45, 'F')
  
  // African decorative stripe for African template
  if (config.showAfricanMotif) {
    doc.setFillColor(...config.accentColor)
    doc.rect(0, 45, pageWidth, 3, 'F')
  }
  
  // Company branding
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  const companyName = invoice.profile.companyName || invoice.profile.name || 'RelancePro Africa'
  doc.text(companyName, margin, 25)
  
  // Invoice label
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('FACTURE', pageWidth - margin, 18, { align: 'right' })
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.number, pageWidth - margin, 28, { align: 'right' })
  
  // ====================
  // FROM/TO SECTION
  // ====================
  
  doc.setTextColor(0, 0, 0)
  let yPos = 60
  
  // From section
  doc.setFillColor(...config.secondaryColor)
  doc.setGlobalAlpha(0.1)
  doc.rect(margin, yPos - 5, 80, 40, 'F')
  doc.setGlobalAlpha(1)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...config.primaryColor)
  doc.text('ÉMETTEUR', margin + 5, yPos + 5)
  
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.setFontSize(9)
  yPos += 12
  doc.text(companyName, margin + 5, yPos)
  if (invoice.profile.email) {
    yPos += 5
    doc.text(invoice.profile.email, margin + 5, yPos)
  }
  if (invoice.profile.phone) {
    yPos += 5
    doc.text(invoice.profile.phone, margin + 5, yPos)
  }
  
  // To section
  yPos = 60
  const toX = pageWidth - margin - 80
  
  doc.setFillColor(...config.primaryColor)
  doc.setGlobalAlpha(0.1)
  doc.rect(toX, yPos - 5, 80, 40, 'F')
  doc.setGlobalAlpha(1)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...config.primaryColor)
  doc.text('FACTURÉ À', toX + 5, yPos + 5)
  
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  yPos += 12
  doc.text(invoice.client.name, toX + 5, yPos)
  
  if (invoice.client.company) {
    yPos += 5
    doc.text(invoice.client.company, toX + 5, yPos)
  }
  
  if (invoice.client.email) {
    yPos += 5
    doc.text(invoice.client.email, toX + 5, yPos)
  }
  
  // ====================
  // DATES SECTION
  // ====================
  
  yPos = 110
  
  // Dates box
  doc.setDrawColor(...config.secondaryColor)
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 20, 3, 3, 'S')
  
  const dateWidth = (pageWidth - 2 * margin) / 4
  
  // Issue date
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('DATE D\'ÉMISSION', margin + 10, yPos + 8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40, 40, 40)
  doc.text(format(invoice.issueDate, 'dd MMM yyyy', { locale: fr }), margin + 10, yPos + 15)
  
  // Due date
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('DATE D\'ÉCHÉANCE', margin + dateWidth + 10, yPos + 8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40, 40, 40)
  doc.text(format(invoice.dueDate, 'dd MMM yyyy', { locale: fr }), margin + dateWidth + 10, yPos + 15)
  
  // Status
  const statusLabels: Record<string, string> = {
    draft: 'BROUILLON',
    sent: 'ENVOYÉE',
    paid: 'PAYÉE',
    overdue: 'EN RETARD',
    cancelled: 'ANNULÉE'
  }
  const statusColors: Record<string, [number, number, number]> = {
    draft: [128, 128, 128],
    sent: [59, 130, 246],
    paid: [34, 197, 94],
    overdue: [239, 68, 68],
    cancelled: [75, 85, 99]
  }
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('STATUT', margin + dateWidth * 2 + 10, yPos + 8)
  doc.setTextColor(...(statusColors[invoice.status] || [128, 128, 128]))
  doc.text(statusLabels[invoice.status] || invoice.status.toUpperCase(), margin + dateWidth * 2 + 10, yPos + 15)
  
  // Currency
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('DEVISE', margin + dateWidth * 3 + 10, yPos + 8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40, 40, 40)
  doc.text(invoice.currency, margin + dateWidth * 3 + 10, yPos + 15)
  
  // ====================
  // ITEMS TABLE
  // ====================
  
  yPos = 145
  
  const tableData = invoice.items.map((item, index) => [
    (index + 1).toString(),
    item.description,
    item.quantity.toString(),
    formatCurrency(item.unitPrice, invoice.currency),
    formatCurrency(item.total, invoice.currency)
  ])
  
  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Description', 'Qté', 'Prix unit.', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: config.primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [40, 40, 40]
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      // Add footer to each page
      addFooter(doc, pageWidth, pageHeight, companyName, config)
    }
  })
  
  // Get the Y position after the table
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  
  // ====================
  // TOTALS SECTION
  // ====================
  
  yPos = finalY + 10
  
  // Totals box
  const totalsBoxX = pageWidth - margin - 90
  const totalsBoxWidth = 90
  
  // Draw totals box
  doc.setDrawColor(...config.primaryColor)
  doc.setLineWidth(1)
  doc.roundedRect(totalsBoxX, yPos, totalsBoxWidth, 45, 3, 3, 'S')
  
  // Subtotal
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text('Sous-total HT', totalsBoxX + 8, yPos + 12)
  doc.text(formatCurrency(invoice.subtotal, invoice.currency), totalsBoxX + totalsBoxWidth - 8, yPos + 12, { align: 'right' })
  
  // Tax
  doc.text('TVA', totalsBoxX + 8, yPos + 22)
  doc.text(formatCurrency(invoice.tax, invoice.currency), totalsBoxX + totalsBoxWidth - 8, yPos + 22, { align: 'right' })
  
  // Total
  doc.setFillColor(...config.primaryColor)
  doc.roundedRect(totalsBoxX + 3, yPos + 28, totalsBoxWidth - 6, 13, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL TTC', totalsBoxX + 8, yPos + 37)
  doc.text(formatCurrency(invoice.total, invoice.currency), totalsBoxX + totalsBoxWidth - 8, yPos + 37, { align: 'right' })
  
  // ====================
  // PAYMENT HISTORY
  // ====================
  
  yPos += 60
  
  if (invoice.payments && invoice.payments.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...config.primaryColor)
    doc.text('HISTORIQUE DES PAIEMENTS', margin, yPos)
    
    yPos += 8
    
    const paymentData = invoice.payments.map((payment) => [
      format(payment.paidAt, 'dd/MM/yyyy'),
      formatPaymentMethod(payment.method),
      payment.reference || '-',
      formatCurrency(payment.amount, invoice.currency)
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Mode', 'Référence', 'Montant']],
      body: paymentData,
      theme: 'plain',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [100, 100, 100],
        fontStyle: 'bold',
        fontSize: 8
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [60, 60, 60]
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: margin, right: margin }
    })
  }
  
  // ====================
  // NOTES & TERMS
  // ====================
  
  yPos = pageHeight - 90
  
  if (invoice.notes) {
    doc.setFillColor(...config.secondaryColor)
    doc.setGlobalAlpha(0.1)
    doc.rect(margin, yPos, pageWidth - 2 * margin, 20, 'F')
    doc.setGlobalAlpha(1)
    
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...config.primaryColor)
    doc.text('NOTES', margin + 5, yPos + 7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin - 10)
    doc.text(notesLines.slice(0, 2), margin + 5, yPos + 14)
    yPos += 25
  }
  
  if (invoice.terms) {
    doc.setFillColor(...config.secondaryColor)
    doc.setGlobalAlpha(0.1)
    doc.rect(margin, yPos, pageWidth - 2 * margin, 20, 'F')
    doc.setGlobalAlpha(1)
    
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...config.primaryColor)
    doc.text('CONDITIONS', margin + 5, yPos + 7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const termsLines = doc.splitTextToSize(invoice.terms, pageWidth - 2 * margin - 10)
    doc.text(termsLines.slice(0, 2), margin + 5, yPos + 14)
  }
  
  // ====================
  // QR CODE
  // ====================
  
  if (includeQRCode && paymentLink) {
    try {
      const qrDataUrl = await QRCode.toDataURL(paymentLink, {
        width: 100,
        margin: 1,
        color: {
          dark: `#${config.primaryColor.map(c => c.toString(16).padStart(2, '0')).join('')}`,
          light: '#ffffff'
        }
      })
      
      const qrSize = 25
      const qrX = margin
      const qrY = pageHeight - 55
      
      doc.setDrawColor(...config.secondaryColor)
      doc.setLineWidth(0.5)
      doc.roundedRect(qrX - 2, qrY - 2, qrSize + 20, qrSize + 12, 2, 2, 'S')
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
      doc.setFontSize(7)
      doc.setTextColor(100, 100, 100)
      doc.text('Scannez pour payer', qrX + qrSize + 3, qrY + qrSize / 2 + 2)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }
  
  // Footer
  addFooter(doc, pageWidth, pageHeight, companyName, config)
  
  return Buffer.from(doc.output('arraybuffer'))
}

/**
 * Add footer to the PDF
 */
function addFooter(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  companyName: string,
  config: TemplateConfig
): void {
  // Footer background
  doc.setFillColor(...config.primaryColor)
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F')
  
  // Footer text
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.text(
    `${companyName} | Document généré par RelancePro Africa`,
    pageWidth / 2,
    pageHeight - 7,
    { align: 'center' }
  )
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number, currency: string = 'GNF'): string {
  const symbols: Record<string, string> = {
    'GNF': 'GNF',
    'XOF': 'CFA',
    'XAF': 'FCFA',
    'EUR': '€',
    'USD': '$',
    'GBP': '£'
  }
  
  const symbol = symbols[currency] || currency
  
  if (['GNF', 'XOF', 'XAF'].includes(currency)) {
    return `${symbol} ${amount.toLocaleString('fr-FR')}`
  }
  
  return `${symbol} ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format payment method for display
 */
function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    'card': 'Carte',
    'mobile_money': 'Mobile Money',
    'bank_transfer': 'Virement',
    'cash': 'Espèces',
    'check': 'Chèque'
  }
  return methods[method] || method
}

/**
 * Get template preview data
 */
export function getTemplatePreview(template: InvoiceTemplate): {
  thumbnail: string
  accentColors: string[]
} {
  const config = INVOICE_TEMPLATES[template]
  
  return {
    thumbnail: `/templates/${template}.png`,
    accentColors: [
      `#${config.primaryColor.map(c => c.toString(16).padStart(2, '0')).join('')}`,
      `#${config.secondaryColor.map(c => c.toString(16).padStart(2, '0')).join('')}`,
      `#${config.accentColor.map(c => c.toString(16).padStart(2, '0')).join('')}`
    ]
  }
}
