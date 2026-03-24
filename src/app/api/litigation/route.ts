import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/litigation - List all litigations for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const stage = searchParams.get('stage')
    const search = searchParams.get('search')
    const clientId = searchParams.get('clientId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Prisma.LitigationWhereInput = {
      profileId: session.user.id,
      ...(status && { status }),
      ...(type && { type }),
      ...(stage && { stage }),
      ...(clientId && { clientId }),
      ...(search && {
        OR: [
          { reference: { contains: search } },
          { client: { name: { contains: search } } },
          { client: { company: { contains: search } } },
        ]
      })
    }

    const [litigations, total] = await Promise.all([
      db.litigation.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              company: true,
              email: true,
              phone: true
            }
          },
          debt: {
            select: {
              id: true,
              reference: true,
              amount: true,
              currency: true
            }
          },
          events: {
            where: {
              status: 'scheduled',
              eventDate: { gte: new Date() }
            },
            orderBy: { eventDate: 'asc' },
            take: 1
          },
          _count: {
            select: {
              documents: true,
              parties: true,
              events: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      db.litigation.count({ where })
    ])

    // Transform data for frontend
    const transformedLitigations = litigations.map(lit => ({
      ...lit,
      nextEvent: lit.events[0] || null,
      events: undefined
    }))

    return NextResponse.json({
      data: transformedLitigations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching litigations:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des dossiers' },
      { status: 500 }
    )
  }
}

// POST /api/litigation - Create a new litigation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const {
      clientId,
      debtId,
      type,
      amount,
      currency = 'GNF',
      notes
    } = body

    // Validate required fields
    if (!clientId || !type || amount === undefined) {
      return NextResponse.json(
        { error: 'Client, type et montant sont requis' },
        { status: 400 }
      )
    }

    // Verify client belongs to user
    const client = await db.client.findFirst({
      where: { id: clientId, profileId: session.user.id }
    })
    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    // If debt is provided, verify it belongs to user and client
    if (debtId) {
      const debt = await db.debt.findFirst({
        where: { id: debtId, profileId: session.user.id, clientId }
      })
      if (!debt) {
        return NextResponse.json({ error: 'Créance non trouvée' }, { status: 404 })
      }
    }

    // Generate reference number
    const year = new Date().getFullYear()
    const count = await db.litigation.count({
      where: {
        profileId: session.user.id,
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
        }
      }
    })
    const reference = `LIT-${year}-${String(count + 1).padStart(4, '0')}`

    // Create litigation
    const litigation = await db.litigation.create({
      data: {
        profileId: session.user.id,
        clientId,
        debtId: debtId || null,
        reference,
        type,
        status: 'pending',
        stage: 'initial',
        amount,
        currency,
        notes,
        filedAt: new Date()
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true
          }
        }
      }
    })

    // Create initial event
    await db.litigationEvent.create({
      data: {
        litigationId: litigation.id,
        type: 'filing',
        title: 'Ouverture du dossier',
        description: 'Dossier contentieux créé',
        eventDate: new Date(),
        status: 'completed'
      }
    })

    // Create defendant party from client
    await db.litigationParty.create({
      data: {
        litigationId: litigation.id,
        type: 'defendant',
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        company: client.company
      }
    })

    return NextResponse.json(litigation, { status: 201 })
  } catch (error) {
    console.error('Error creating litigation:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du dossier' },
      { status: 500 }
    )
  }
}
