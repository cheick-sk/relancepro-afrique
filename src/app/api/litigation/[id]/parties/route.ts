import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'

// GET /api/litigation/[id]/parties - List parties for a litigation
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

    const parties = await db.litigationParty.findMany({
      where: { litigationId: id },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }]
    })

    return NextResponse.json({ data: parties })
  } catch (error) {
    console.error('Error fetching parties:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des parties' },
      { status: 500 }
    )
  }
}

// POST /api/litigation/[id]/parties - Add a new party
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
    const { type, name, email, phone, address, company, role, notes } = body

    // Verify ownership
    const litigation = await db.litigation.findFirst({
      where: { id, profileId: session.user.id }
    })
    if (!litigation) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // Validate required fields
    if (!type || !name) {
      return NextResponse.json(
        { error: 'Type et nom sont requis' },
        { status: 400 }
      )
    }

    // Create party
    const party = await db.litigationParty.create({
      data: {
        litigationId: id,
        type,
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        company: company || null,
        role: role || null,
        notes: notes || null
      }
    })

    return NextResponse.json(party, { status: 201 })
  } catch (error) {
    console.error('Error creating party:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout de la partie' },
      { status: 500 }
    )
  }
}

// PUT /api/litigation/[id]/parties - Update a party
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
    const { partyId, type, name, email, phone, address, company, role, notes } = body

    // Verify ownership
    const litigation = await db.litigation.findFirst({
      where: { id, profileId: session.user.id }
    })
    if (!litigation) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    if (!partyId) {
      return NextResponse.json({ error: 'ID de la partie requis' }, { status: 400 })
    }

    // Update party
    const party = await db.litigationParty.update({
      where: { id: partyId },
      data: {
        type,
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        company: company || null,
        role: role || null,
        notes: notes || null
      }
    })

    return NextResponse.json(party)
  } catch (error) {
    console.error('Error updating party:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la partie' },
      { status: 500 }
    )
  }
}

// DELETE /api/litigation/[id]/parties - Delete a party
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
    const partyId = searchParams.get('partyId')

    if (!partyId) {
      return NextResponse.json({ error: 'ID de la partie requis' }, { status: 400 })
    }

    // Verify ownership
    const litigation = await db.litigation.findFirst({
      where: { id, profileId: session.user.id }
    })
    if (!litigation) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // Delete party
    await db.litigationParty.delete({
      where: { id: partyId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting party:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la partie' },
      { status: 500 }
    )
  }
}
