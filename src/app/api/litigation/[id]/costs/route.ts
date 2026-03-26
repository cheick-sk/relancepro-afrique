import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'

// GET /api/litigation/[id]/costs - List costs for a litigation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const litigation = await db.litigation.findFirst({
      where: { id, profileId: session.user.id }
    })
    if (!litigation) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    const costs = await db.litigationCost.findMany({
      where: { litigationId: id },
      orderBy: { incurredAt: 'desc' }
    })

    return NextResponse.json({ data: costs })
  } catch (error) {
    console.error('Error fetching costs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des coûts' },
      { status: 500 }
    )
  }
}

// POST /api/litigation/[id]/costs - Add a new cost
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { 
      type, 
      description, 
      amount, 
      currency, 
      incurredAt, 
      paidAt, 
      status, 
      receiptUrl, 
      notes 
    } = body

    // Verify ownership
    const litigation = await db.litigation.findFirst({
      where: { id, profileId: session.user.id }
    })
    if (!litigation) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // Validate required fields
    if (!type || !description || amount === undefined) {
      return NextResponse.json(
        { error: 'Type, description et montant sont requis' },
        { status: 400 }
      )
    }

    // Create cost
    const cost = await db.litigationCost.create({
      data: {
        litigationId: id,
        type,
        description,
        amount: parseFloat(amount),
        currency: currency || litigation.currency,
        incurredAt: incurredAt ? new Date(incurredAt) : new Date(),
        paidAt: paidAt ? new Date(paidAt) : null,
        status: status || 'pending',
        receiptUrl: receiptUrl || null,
        notes: notes || null
      }
    })

    // Update litigation total costs
    const allCosts = await db.litigationCost.findMany({
      where: { litigationId: id }
    })
    const totalCosts = allCosts.reduce((sum, c) => sum + c.amount, 0)
    
    await db.litigation.update({
      where: { id },
      data: { totalCosts }
    })

    return NextResponse.json(cost, { status: 201 })
  } catch (error) {
    console.error('Error creating cost:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du coût' },
      { status: 500 }
    )
  }
}

// PUT /api/litigation/[id]/costs - Update a cost
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { 
      costId,
      type, 
      description, 
      amount, 
      currency, 
      incurredAt, 
      paidAt, 
      status, 
      receiptUrl, 
      notes 
    } = body

    // Verify ownership
    const litigation = await db.litigation.findFirst({
      where: { id, profileId: session.user.id }
    })
    if (!litigation) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    if (!costId) {
      return NextResponse.json({ error: 'ID du coût requis' }, { status: 400 })
    }

    // Update cost
    const cost = await db.litigationCost.update({
      where: { id: costId },
      data: {
        type,
        description,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        currency,
        incurredAt: incurredAt ? new Date(incurredAt) : undefined,
        paidAt: paidAt ? new Date(paidAt) : null,
        status,
        receiptUrl: receiptUrl || null,
        notes: notes || null
      }
    })

    // Update litigation total costs
    const allCosts = await db.litigationCost.findMany({
      where: { litigationId: id }
    })
    const totalCosts = allCosts.reduce((sum, c) => sum + c.amount, 0)
    
    await db.litigation.update({
      where: { id },
      data: { totalCosts }
    })

    return NextResponse.json(cost)
  } catch (error) {
    console.error('Error updating cost:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du coût' },
      { status: 500 }
    )
  }
}

// DELETE /api/litigation/[id]/costs - Delete a cost
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const costId = searchParams.get('costId')

    if (!costId) {
      return NextResponse.json({ error: 'ID du coût requis' }, { status: 400 })
    }

    // Verify ownership
    const litigation = await db.litigation.findFirst({
      where: { id, profileId: session.user.id }
    })
    if (!litigation) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // Delete cost
    await db.litigationCost.delete({
      where: { id: costId }
    })

    // Update litigation total costs
    const allCosts = await db.litigationCost.findMany({
      where: { litigationId: id }
    })
    const totalCosts = allCosts.reduce((sum, c) => sum + c.amount, 0)
    
    await db.litigation.update({
      where: { id },
      data: { totalCosts }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting cost:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du coût' },
      { status: 500 }
    )
  }
}
