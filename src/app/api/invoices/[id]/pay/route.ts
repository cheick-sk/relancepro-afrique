/**
 * Invoice Payment API Route
 * POST: Mark invoice as paid / Record payment
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth/config'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

// Validation schema for payment
const recordPaymentSchema = z.object({
  amount: z.number().min(0.01),
  method: z.enum(['card', 'mobile_money', 'bank_transfer', 'cash', 'check']),
  reference: z.string().optional(),
  paidAt: z.string().transform((val) => new Date(val)).optional()
})

// POST /api/invoices/[id]/pay - Record payment
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
    const validatedData = recordPaymentSchema.parse(body)
    
    // Get invoice
    const invoice = await db.invoice.findFirst({
      where: {
        id,
        profileId: session.user.id
      },
      include: {
        payments: true,
        client: true,
        debt: true
      }
    })
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }
    
    // Check if invoice is cancelled
    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Impossible d\'enregistrer un paiement sur une facture annulée' },
        { status: 400 }
      )
    }
    
    // Calculate current paid amount
    const currentPaidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
    const newPaidAmount = currentPaidAmount + validatedData.amount
    
    // Validate payment amount
    if (newPaidAmount > invoice.total) {
      return NextResponse.json(
        { error: 'Le montant du paiement dépasse le total de la facture' },
        { status: 400 }
      )
    }
    
    // Create payment record
    const payment = await db.invoicePayment.create({
      data: {
        invoiceId: id,
        amount: validatedData.amount,
        method: validatedData.method,
        reference: validatedData.reference,
        paidAt: validatedData.paidAt || new Date()
      }
    })
    
    // Update invoice status
    const isFullyPaid = newPaidAmount >= invoice.total
    const updateData: Record<string, unknown> = {}
    
    if (isFullyPaid) {
      updateData.status = 'paid'
      updateData.paidAt = new Date()
    } else {
      updateData.status = 'partial'
    }
    
    await db.invoice.update({
      where: { id },
      data: updateData
    })
    
    // If linked to a debt, update the debt
    if (invoice.debtId && invoice.debt) {
      const debtPayments = await db.clientPayment.findMany({
        where: { debtId: invoice.debtId }
      })
      const debtPaidAmount = debtPayments.reduce((sum, p) => sum + p.amount, 0)
      
      // Create a client payment record
      await db.clientPayment.create({
        data: {
          clientId: invoice.clientId,
          debtId: invoice.debtId,
          paystackRef: `MANUAL-${Date.now()}`,
          amount: validatedData.amount,
          currency: invoice.currency,
          status: 'success',
          paymentMethod: validatedData.method,
          paidAt: validatedData.paidAt || new Date()
        }
      })
      
      // Update debt
      const newDebtPaidAmount = invoice.debt.paidAmount + validatedData.amount
      const isDebtFullyPaid = newDebtPaidAmount >= invoice.debt.amount
      
      await db.debt.update({
        where: { id: invoice.debtId },
        data: {
          paidAmount: newDebtPaidAmount,
          status: isDebtFullyPaid ? 'paid' : 'partial',
          paidDate: isDebtFullyPaid ? new Date() : undefined
        }
      })
    }
    
    // Create notification
    await db.notification.create({
      data: {
        profileId: session.user.id,
        type: 'success',
        title: 'Paiement enregistré',
        message: `Paiement de ${validatedData.amount.toLocaleString()} ${invoice.currency} enregistré pour la facture ${invoice.number}`,
        actionUrl: `/invoices/${id}`,
        actionLabel: 'Voir la facture'
      }
    })
    
    // Get updated invoice
    const updatedInvoice = await db.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        items: true,
        payments: {
          orderBy: { paidAt: 'desc' }
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      message: isFullyPaid 
        ? 'Paiement complet enregistré. Facture marquée comme payée.' 
        : 'Paiement partiel enregistré.',
      payment,
      invoice: updatedInvoice,
      isFullyPaid,
      paidAmount: newPaidAmount,
      remainingAmount: invoice.total - newPaidAmount
    })
  } catch (error) {
    console.error('Error recording payment:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement du paiement' },
      { status: 500 }
    )
  }
}

// GET /api/invoices/[id]/pay - Get payment history
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
    
    const invoice = await db.invoice.findFirst({
      where: {
        id,
        profileId: session.user.id
      },
      include: {
        payments: {
          orderBy: { paidAt: 'desc' }
        }
      }
    })
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }
    
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
    
    return NextResponse.json({
      payments: invoice.payments,
      summary: {
        total: invoice.total,
        paid: totalPaid,
        remaining: invoice.total - totalPaid,
        isFullyPaid: totalPaid >= invoice.total
      }
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paiements' },
      { status: 500 }
    )
  }
}
