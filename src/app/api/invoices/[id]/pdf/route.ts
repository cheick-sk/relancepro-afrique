/**
 * Invoice PDF API Route
 * GET: Download invoice as PDF
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth/config'
import { getServerSession } from 'next-auth'
import { generateInvoicePDF, getInvoiceWithRelations } from '@/lib/invoices/generator'
import { generateInvoiceWithTemplate } from '@/lib/invoices/templates'

// GET /api/invoices/[id]/pdf - Download PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const template = (searchParams.get('template') || 'african') as 'modern' | 'classic' | 'african' | 'minimal'
    
    // Verify ownership
    const invoice = await db.invoice.findFirst({
      where: {
        id,
        profileId: session.user.id
      }
    })
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }
    
    // Get invoice with all relations
    const invoiceData = await getInvoiceWithRelations(id)
    
    if (!invoiceData) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }
    
    // Generate payment link for QR code
    const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${id}`
    
    // Generate PDF based on template
    let pdfBuffer: Buffer
    
    if (template === 'african') {
      pdfBuffer = await generateInvoiceWithTemplate(invoiceData, 'african', {
        paymentLink,
        includeQRCode: true
      })
    } else if (template === 'modern') {
      pdfBuffer = await generateInvoiceWithTemplate(invoiceData, 'modern', {
        paymentLink,
        includeQRCode: true
      })
    } else if (template === 'classic') {
      pdfBuffer = await generateInvoiceWithTemplate(invoiceData, 'classic', {
        paymentLink,
        includeQRCode: true
      })
    } else {
      pdfBuffer = await generateInvoicePDF(invoiceData, {
        template: 'african',
        includeQRCode: true,
        paymentLink
      })
    }
    
    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="facture-${invoice.number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}
