/**
 * Debt to Invoice Conversion API Route
 * POST: Convert a debt to an invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth/config'
import { getServerSession } from 'next-auth'
import { generateInvoiceNumber, calculateInvoiceTotals } from '@/lib/invoices/generator'

// POST /api/debts/[id]/invoice - Convert debt to invoice
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
    
    // Get debt with client
    const debt = await db.debt.findFirst({
      where: {
        id,
        profileId: session.user.id
      },
      include: {
        client: true
      }
    })
    
    if (!debt) {
      return NextResponse.json(
        { error: 'Créance non trouvée' },
        { status: 404 }
      )
    }
    
    // Check if debt already has an invoice
    const existingInvoice = await db.invoice.findFirst({
      where: {
        debtId: id
      }
    })
    
    if (existingInvoice) {
      return NextResponse.json(
        { error: 'Cette créance a déjà une facture associée', invoice: existingInvoice },
        { status: 400 }
      )
    }
    
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(session.user.id)
    
    // Create invoice from debt
    const invoice = await db.invoice.create({
      data: {
        profileId: session.user.id,
        clientId: debt.clientId,
        debtId: debt.id,
        number: invoiceNumber,
        status: 'draft',
        issueDate: new Date(),
        dueDate: debt.dueDate,
        subtotal: debt.amount,
        tax: 0,
        total: debt.amount,
        currency: debt.currency,
        notes: debt.description || `Facture pour la créance ${debt.reference || debt.id}`,
        terms: 'Paiement à réception de facture.',
        items: {
          create: {
            description: debt.description || `Créance - ${debt.reference || 'Référence non spécifiée'}`,
            quantity: 1,
            unitPrice: debt.amount,
            total: debt.amount
          }
        }
      },
      include: {
        client: true,
        items: true
      }
    })
    
    // Update debt reference
    await db.debt.update({
      where: { id: debt.id },
      data: {
        reference: debt.reference || invoiceNumber
      }
    })
    
    // Create notification
    await db.notification.create({
      data: {
        profileId: session.user.id,
        type: 'success',
        title: 'Facture créée',
        message: `La facture ${invoiceNumber} a été créée à partir de la créance de ${debt.client.name}`,
        actionUrl: `/invoices/${invoice.id}`,
        actionLabel: 'Voir la facture'
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Facture créée avec succès',
      invoice
    }, { status: 201 })
  } catch (error) {
    console.error('Error converting debt to invoice:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la conversion de la créance en facture' },
      { status: 500 }
    )
  }
}

// GET /api/debts/[id]/invoice - Get invoice for debt
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
    
    // Get invoice for debt
    const invoice = await db.invoice.findFirst({
      where: {
        debtId: id,
        profileId: session.user.id
      },
      include: {
        client: true,
        items: true,
        payments: true
      }
    })
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Aucune facture associée à cette créance' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error fetching invoice for debt:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la facture' },
      { status: 500 }
    )
  }
}
