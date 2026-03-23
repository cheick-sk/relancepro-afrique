import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'

// GET /api/litigation/[id] - Get a specific litigation
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

    const litigation = await db.litigation.findFirst({
      where: {
        id,
        profileId: session.user.id
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
            phone: true,
            address: true
          }
        },
        debt: {
          select: {
            id: true,
            reference: true,
            amount: true,
            currency: true,
            status: true,
            description: true,
            dueDate: true
          }
        },
        parties: {
          orderBy: { createdAt: 'asc' }
        },
        documents: {
          orderBy: { uploadedAt: 'desc' }
        },
        events: {
          orderBy: { eventDate: 'desc' }
        },
        costs: {
          orderBy: { incurredAt: 'desc' }
        }
      }
    })

    if (!litigation) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // Calculate totals
    const totalCosts = litigation.costs.reduce((sum, c) => sum + c.amount, 0)
    
    return NextResponse.json({
      ...litigation,
      calculatedTotalCosts: totalCosts
    })
  } catch (error) {
    console.error('Error fetching litigation:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du dossier' },
      { status: 500 }
    )
  }
}

// PUT /api/litigation/[id] - Update a litigation
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

    // Verify ownership
    const existing = await db.litigation.findFirst({
      where: { id, profileId: session.user.id }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    const {
      status,
      type,
      stage,
      amount,
      amountRecovered,
      currency,
      legalCosts,
      courtCosts,
      bailiffCosts,
      notes,
      closedAt
    } = body

    // Calculate total costs
    const totalCosts = (legalCosts || existing.legalCosts) + 
                       (courtCosts || existing.courtCosts) + 
                       (bailiffCosts || existing.bailiffCosts)

    // Update litigation
    const litigation = await db.litigation.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(type !== undefined && { type }),
        ...(stage !== undefined && { stage }),
        ...(amount !== undefined && { amount }),
        ...(amountRecovered !== undefined && { amountRecovered }),
        ...(currency !== undefined && { currency }),
        ...(legalCosts !== undefined && { legalCosts }),
        ...(courtCosts !== undefined && { courtCosts }),
        ...(bailiffCosts !== undefined && { bailiffCosts }),
        totalCosts,
        ...(notes !== undefined && { notes }),
        ...(closedAt !== undefined && { closedAt: closedAt ? new Date(closedAt) : null })
      }
    })

    // Create status change event if status changed
    if (status && status !== existing.status) {
      await db.litigationEvent.create({
        data: {
          litigationId: id,
          type: 'status_change',
          title: `Statut modifié: ${status}`,
          description: `Le statut du dossier a été modifié de "${existing.status}" à "${status}"`,
          eventDate: new Date(),
          status: 'completed'
        }
      })
    }

    return NextResponse.json(litigation)
  } catch (error) {
    console.error('Error updating litigation:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du dossier' },
      { status: 500 }
    )
  }
}

// DELETE /api/litigation/[id] - Delete a litigation
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

    // Verify ownership
    const existing = await db.litigation.findFirst({
      where: { id, profileId: session.user.id }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // Delete litigation (cascade will delete related records)
    await db.litigation.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting litigation:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du dossier' },
      { status: 500 }
    )
  }
}
