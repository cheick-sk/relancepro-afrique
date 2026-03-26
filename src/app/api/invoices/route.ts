/**
 * Invoices API Route
 * GET: List invoices with filters
 * POST: Create new invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth/config'
import { getServerSession } from 'next-auth'
import { generateInvoiceNumber, calculateInvoiceTotals } from '@/lib/invoices/generator'
import { z } from 'zod'

// Validation schema for creating invoice
const createInvoiceSchema = z.object({
  clientId: z.string(),
  debtId: z.string().optional(),
  dueDate: z.string().transform((val) => new Date(val)),
  currency: z.string().default('GNF'),
  taxRate: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().min(0.01),
    unitPrice: z.number().min(0)
  })).min(1)
})

// GET /api/invoices - List invoices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit
    
    // Filters
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    
    // Build where clause
    const where: Record<string, unknown> = {
      profileId: session.user.id
    }
    
    if (status && status !== 'all') {
      where.status = status
    }
    
    if (clientId) {
      where.clientId = clientId
    }
    
    if (search) {
      where.OR = [
        { number: { contains: search } },
        { client: { name: { contains: search } } },
        { client: { company: { contains: search } } }
      ]
    }
    
    if (dateFrom || dateTo) {
      where.issueDate = {}
      if (dateFrom) {
        (where.issueDate as Record<string, unknown>).gte = new Date(dateFrom)
      }
      if (dateTo) {
        (where.issueDate as Record<string, unknown>).lte = new Date(dateTo)
      }
    }
    
    // Get invoices
    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              company: true
            }
          },
          items: {
            select: {
              id: true,
              description: true,
              quantity: true,
              unitPrice: true,
              total: true
            }
          },
          _count: {
            select: { payments: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      db.invoice.count({ where })
    ])
    
    // Calculate stats
    const stats = await db.invoice.aggregate({
      where: { profileId: session.user.id },
      _count: true,
      _sum: {
        total: true
      }
    })
    
    const statusStats = await db.invoice.groupBy({
      by: ['status'],
      where: { profileId: session.user.id },
      _count: true,
      _sum: {
        total: true
      }
    })
    
    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        total: stats._count || 0,
        totalAmount: stats._sum.total || 0,
        byStatus: statusStats.reduce((acc, stat) => {
          acc[stat.status] = {
            count: stat._count,
            total: stat._sum.total || 0
          }
          return acc
        }, {} as Record<string, { count: number; total: number }>)
      }
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des factures' },
      { status: 500 }
    )
  }
}

// POST /api/invoices - Create invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const validatedData = createInvoiceSchema.parse(body)
    
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
    
    // Verify debt if provided
    if (validatedData.debtId) {
      const debt = await db.debt.findFirst({
        where: {
          id: validatedData.debtId,
          profileId: session.user.id,
          clientId: validatedData.clientId
        }
      })
      
      if (!debt) {
        return NextResponse.json(
          { error: 'Créance non trouvée' },
          { status: 404 }
        )
      }
    }
    
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(session.user.id)
    
    // Calculate totals
    const itemsWithTotals = validatedData.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice
    }))
    
    const totals = calculateInvoiceTotals(itemsWithTotals, validatedData.taxRate)
    
    // Create invoice with items
    const invoice = await db.invoice.create({
      data: {
        profileId: session.user.id,
        clientId: validatedData.clientId,
        debtId: validatedData.debtId,
        number: invoiceNumber,
        status: 'draft',
        issueDate: new Date(),
        dueDate: validatedData.dueDate,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        currency: validatedData.currency,
        notes: validatedData.notes,
        terms: validatedData.terms,
        items: {
          create: itemsWithTotals
        }
      },
      include: {
        client: true,
        items: true
      }
    })
    
    // If linked to a debt, update the debt reference
    if (validatedData.debtId) {
      await db.debt.update({
        where: { id: validatedData.debtId },
        data: {
          reference: invoiceNumber
        }
      })
    }
    
    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erreur lors de la création de la facture' },
      { status: 500 }
    )
  }
}
