/**
 * Invoice Send API Route
 * POST: Send invoice via email/WhatsApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth/config'
import { getServerSession } from 'next-auth'
import { Resend } from 'resend'
import { generateInvoicePDF, getInvoiceWithRelations } from '@/lib/invoices/generator'
import InvoiceEmail from '@/lib/emails/invoice-email'
import { render } from '@react-email/render'

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// POST /api/invoices/[id]/send - Send invoice
export async function POST(
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
    const body = await request.json()
    const { channel = 'email' } = body
    
    // Get invoice with relations
    const invoiceData = await getInvoiceWithRelations(id)
    
    if (!invoiceData) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }
    
    // Verify ownership
    const invoice = await db.invoice.findFirst({
      where: {
        id,
        profileId: session.user.id
      },
      include: { client: true }
    })
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }
    
    // Check if client has email/phone
    if (channel === 'email' && !invoice.client.email) {
      return NextResponse.json(
        { error: 'Le client n\'a pas d\'adresse email' },
        { status: 400 }
      )
    }
    
    if (channel === 'whatsapp' && !invoice.client.phone) {
      return NextResponse.json(
        { error: 'Le client n\'a pas de numéro WhatsApp' },
        { status: 400 }
      )
    }
    
    // Generate PDF
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${id}`
    const pdfBuffer = await generateInvoicePDF(invoiceData, {
      template: 'african',
      includeQRCode: true,
      paymentLink: portalUrl
    })
    
    let sendResult = { success: false, message: '' }
    
    if (channel === 'email') {
      // Send via email
      if (!resend) {
        return NextResponse.json(
          { error: 'Service email non configuré' },
          { status: 500 }
        )
      }
      
      const emailHtml = render(InvoiceEmail({
        invoiceNumber: invoice.number,
        clientName: invoice.client.name,
        companyName: invoiceData.profile.companyName || invoiceData.profile.name || 'RelancePro Africa',
        total: invoice.total,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        paymentLink: portalUrl,
        items: invoiceData.items
      }))
      
      const { data, error } = await resend.emails.send({
        from: `${invoiceData.profile.companyName || 'RelancePro Africa'} <noreply@relancepro.africa>`,
        to: invoice.client.email!,
        subject: `Facture ${invoice.number} - ${invoiceData.profile.companyName || 'RelancePro Africa'}`,
        html: emailHtml,
        attachments: [
          {
            filename: `facture-${invoice.number}.pdf`,
            content: pdfBuffer.toString('base64'),
            type: 'application/pdf'
          }
        ]
      })
      
      if (error) {
        console.error('Error sending email:', error)
        sendResult = { success: false, message: error.message }
      } else {
        sendResult = { success: true, message: 'Email envoyé avec succès' }
      }
    } else if (channel === 'whatsapp') {
      // Send via WhatsApp
      // Get WhatsApp settings
      const profile = await db.profile.findUnique({
        where: { id: session.user.id },
        select: { whatsappApiKey: true }
      })
      
      if (!profile?.whatsappApiKey) {
        return NextResponse.json(
          { error: 'WhatsApp non configuré' },
          { status: 400 }
        )
      }
      
      // Send WhatsApp message with PDF link
      // For now, we'll just send a text message with payment link
      const message = `📋 *Facture ${invoice.number}*\n\n` +
        `Bonjour ${invoice.client.name},\n\n` +
        `Veuillez trouver votre facture de ${invoice.total.toLocaleString()} ${invoice.currency}.\n\n` +
        `Date d'échéance: ${invoice.dueDate.toLocaleDateString('fr-FR')}\n\n` +
        `Cliquez ici pour payer: ${portalUrl}\n\n` +
        `Cordialement,\n${invoiceData.profile.companyName || 'RelancePro Africa'}`
      
      // Use Whapi.cloud API
      try {
        const response = await fetch('https://gate.whapi.cloud/messages/text', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${profile.whatsappApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: invoice.client.phone,
            body: message
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erreur WhatsApp')
        }
        
        sendResult = { success: true, message: 'Message WhatsApp envoyé avec succès' }
      } catch (error) {
        console.error('Error sending WhatsApp:', error)
        sendResult = { 
          success: false, 
          message: error instanceof Error ? error.message : 'Erreur WhatsApp' 
        }
      }
    }
    
    // Update invoice status if sent successfully
    if (sendResult.success) {
      await db.invoice.update({
        where: { id },
        data: {
          status: 'sent',
          sentAt: new Date()
        }
      })
      
      // Log the send action
      await db.notification.create({
        data: {
          profileId: session.user.id,
          type: 'info',
          title: 'Facture envoyée',
          message: `La facture ${invoice.number} a été envoyée à ${invoice.client.name}`,
          actionUrl: `/invoices/${id}`,
          actionLabel: 'Voir la facture'
        }
      })
      
      return NextResponse.json({
        success: true,
        message: sendResult.message,
        invoice: await db.invoice.findUnique({
          where: { id },
          include: { client: true }
        })
      })
    } else {
      return NextResponse.json(
        { error: sendResult.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error sending invoice:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de la facture' },
      { status: 500 }
    )
  }
}
