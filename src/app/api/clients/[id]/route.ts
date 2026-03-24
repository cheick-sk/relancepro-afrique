import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { logClientAction, AuditAction } from "@/lib/audit/logger";
import { invalidateUserCache } from "@/lib/cache";

// GET - Détails d'un client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    const client = await db.client.findFirst({
      where: {
        id,
        profileId: session.user.id,
      },
      include: {
        debts: {
          orderBy: { dueDate: "desc" },
        },
        reminders: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 });
    }

    // Log client viewed action
    await logClientAction(AuditAction.CLIENT_VIEWED, client.id, {
      profileId: session.user.id,
      clientName: client.name,
      clientEmail: client.email,
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du client" },
      { status: 500 }
    );
  }
}

// PUT - Modifier un client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, company, address, notes, status } = body;

    // Vérifier que le client appartient à l'utilisateur
    const existing = await db.client.findFirst({
      where: { id, profileId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 });
    }

    const client = await db.client.update({
      where: { id },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        address: address || null,
        notes: notes || null,
        status: status || existing.status,
      },
    });

    // Invalidate cache
    await invalidateUserCache(session.user.id);

    // Log audit action
    await logClientAction(AuditAction.CLIENT_UPDATED, client.id, {
      profileId: session.user.id,
      clientName: client.name,
      clientEmail: client.email,
      oldValues: {
        name: existing.name,
        email: existing.email,
        phone: existing.phone,
        company: existing.company,
        status: existing.status,
      },
      newValues: {
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        status: client.status,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification du client" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    // Vérifier que le client appartient à l'utilisateur
    const existing = await db.client.findFirst({
      where: { id, profileId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 });
    }

    await db.client.delete({
      where: { id },
    });

    // Invalidate cache
    await invalidateUserCache(session.user.id);

    // Log audit action
    await logClientAction(AuditAction.CLIENT_DELETED, id, {
      profileId: session.user.id,
      clientName: existing.name,
      clientEmail: existing.email,
      oldValues: {
        name: existing.name,
        email: existing.email,
        phone: existing.phone,
        company: existing.company,
      },
    });

    return NextResponse.json({ message: "Client supprimé" });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du client" },
      { status: 500 }
    );
  }
}
