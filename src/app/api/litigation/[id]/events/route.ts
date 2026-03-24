import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'

// GET /api/litigation/[id]/events - List events for a litigation
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

    const events = await db.litigationEvent.findMany({
      where: { litigationId: id },
      orderBy: { eventDate: 'desc' }
    })

    return NextResponse.json({ data: events })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des événements' },
      { status: 500 }
    )
  }
}

// POST /api/litigation/[id]/events - Add a new event
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
    const { type, title, description, eventDate, reminderDate, status } = body

    // Verify ownership
    const litigation = await db.litigation.findFirst({
      where: { id, profileId: session.user.id }
    })
    if (!litigation) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // Validate required fields
    if (!type || !title || !eventDate) {
      return NextResponse.json(
        { error: 'Type, titre et date sont requis' },
        { status: 400 }
      )
    }

    // Create event
    const event = await db.litigationEvent.create({
      data: {
        litigationId: id,
        type,
        title,
        description,
        eventDate: new Date(eventDate),
        reminderDate: reminderDate ? new Date(reminderDate) : null,
        status: status || 'scheduled',
        createdBy: session.user.id
      }
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'événement' },
      { status: 500 }
    )
  }
}
