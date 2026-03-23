import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'

// GET /api/litigation/[id]/documents - List documents for a litigation
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

    const documents = await db.litigationDocument.findMany({
      where: { litigationId: id },
      orderBy: { uploadedAt: 'desc' }
    })

    return NextResponse.json({ data: documents })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des documents' },
      { status: 500 }
    )
  }
}

// POST /api/litigation/[id]/documents - Upload a document
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

    // Verify ownership
    const litigation = await db.litigation.findFirst({
      where: { id, profileId: session.user.id }
    })
    if (!litigation) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const type = formData.get('type') as string
    const description = formData.get('description') as string

    if (!file || !name || !type) {
      return NextResponse.json(
        { error: 'Fichier, nom et type sont requis' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `${litigation.reference}-${timestamp}.${extension}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'litigation')
    const filepath = path.join(uploadDir, filename)

    // Create directory if it doesn't exist
    try {
      await writeFile(filepath, Buffer.from(await file.arrayBuffer()))
    } catch {
      // If write fails, create directory and try again
      const { mkdir } = await import('fs/promises')
      await mkdir(uploadDir, { recursive: true })
      await writeFile(filepath, Buffer.from(await file.arrayBuffer()))
    }

    // Create document record
    const document = await db.litigationDocument.create({
      data: {
        litigationId: id,
        name,
        type,
        description: description || null,
        fileUrl: `/uploads/litigation/${filename}`,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: session.user.id
      }
    })

    // Create event for document upload
    await db.litigationEvent.create({
      data: {
        litigationId: id,
        type: 'document',
        title: `Document ajouté: ${name}`,
        description: type,
        eventDate: new Date(),
        status: 'completed',
        createdBy: session.user.id
      }
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Erreur lors du téléversement du document' },
      { status: 500 }
    )
  }
}

// DELETE /api/litigation/[id]/documents - Delete a document
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
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'ID du document requis' }, { status: 400 })
    }

    // Verify ownership
    const litigation = await db.litigation.findFirst({
      where: { id, profileId: session.user.id }
    })
    if (!litigation) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // Get document
    const document = await db.litigationDocument.findFirst({
      where: { id: documentId, litigationId: id }
    })
    if (!document) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    // Delete file from filesystem
    try {
      const filepath = path.join(process.cwd(), 'public', document.fileUrl)
      await unlink(filepath)
    } catch (e) {
      console.log('File not found, continuing with database delete')
    }

    // Delete document record
    await db.litigationDocument.delete({
      where: { id: documentId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du document' },
      { status: 500 }
    )
  }
}
