/**
 * Single Invoice API Route
 * GET: Get invoice details
 * PUT: Update invoice
 * DELETE: Delete invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth/config'
import { getServerSession } from 'next-auth'
import { calculateInvoiceTotals } from '@/lib/invoices/generator'
import { z } from 'zod'

// Validation schema for updating invoice
const updateInvoiceSchema = z.object({
  clientId: z.string().optional(),
  dueDate: z.string().transform((val) => new Date(val)).optional(),
  currency: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    description: z.string().min(1),
    quantity: z.number().min(0.01),
    unitPrice: z.number().min(0)
  })).optional()
})

// GET /api/invoices/[id] - Get invoice details
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
        client: true,
        profile: {
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
            phone: true,
            avatarUrl: true
          }
        },
        items: {
          orderBy: { createdAt: 'asc' }
        },
        payments: {
          orderBy: { paidAt: 'desc' }
        },
        debt: true
      }
    })
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }
    
    // Calculate paid amount
    const paidAmount = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)
    const remainingAmount = invoice.total - paidAmount
    
    return NextResponse.json({
      ...invoice,
      paidAmount,
      remainingAmount,
      isFullyPaid: remainingAmount <= 0
    })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la facture' },
      { status: 500 }
    )
  }
}

// PUT /api/invoices/[id] - Update invoice
export async function PUT(
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
    const validatedData = updateInvoiceSchema.parse(body)
    
    // Check if invoice exists and belongs to user
    const existingInvoice = await db.invoice.findFirst({
      where: {
        id,
        profileId: session.user.id
      },
      include: { items: true }
    })
    
    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }
    
    // Check if invoice can be modified
    if (existingInvoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Impossible de modifier une facture payée' },
        { status: 400 }
      )
    }
    
    if (existingInvoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Impossible de modifier une facture annulée' },
        { status: 400 }
      )
    }
    
    // Prepare update data
    const updateData: Record<string, unknown> = {}
    
    if (validatedData.clientId) {
      // Verify client belongs to user
      const client = await db.client.findFirst({
        where: {
          id: validatedData.clientId,
          profileId: session.user.id
        }
      })
      
      if (!client) {
        return NextResponse.json(
          { error: 'Client non trouvé' },
          { status: 404 }
        )
      }
      updateData.clientId = validatedData.clientId
    }
    
    if (validatedData.dueDate) {
      updateData.dueDate = validatedData.dueDate
    }
    
    if (validatedData.currency) {
      updateData.currency = validatedData.currency
    }
    
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }
    
    if (validatedData.terms !== undefined) {
      updateData.terms = validatedData.terms
    }
    
    if (validatedData.status) {
      updateData.status = validatedData.status
      
      if (validatedData.status === 'cancelled') {
        updateData.cancelledAt = new Date()
      }
    }
    
    // Handle items update
    if (validatedData.items) {
      // Delete existing items
      await db.invoiceItem.deleteMany({
        where: { invoiceId: id }
      })
      
      // Create new items
      const itemsWithTotals = validatedData.items.map((item) => ({
        invoiceId: id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice
      }))
      
      await db.invoiceItem.createMany({
        data: itemsWithTotals
      })
      
      // Recalculate totals
      const taxRate = validatedData.taxRate ?? 0
      const totals = calculateInvoiceTotals(
        itemsWithTotals.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        taxRate
      )
      
      updateData.subtotal = totals.subtotal
      updateData.tax = totals.tax
      updateData.total = totals.total
    }
    
    // Update invoice
    const invoice = await db.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        items: true,
        payments: true
      }
    })
    
    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error updating invoice:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la facture' },
      { status: 500 }
    )
  }
}

// DELETE /api/invoices/[id] - Delete invoice
export async function DELETE(
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
    
    // Check if invoice exists and belongs to user
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
    
    // Check if invoice can be deleted
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Impossible de supprimer une facture payée' },
        { status: 400 }
      )
    }
    
    if (invoice.status === 'sent') {
      return NextResponse.json(
        { error: 'Impossible de supprimer une facture envoyée. Annulez-la d\'abord.' },
        { status: 400 }
      )
    }
    
    // Delete invoice (items will be cascade deleted)
    await db.invoice.delete({
      where: { id }
    })
    
    return NextResponse.json({ message: 'Facture supprimée avec succès' })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la facture' },
      { status: 500 }
    )
  }
}
