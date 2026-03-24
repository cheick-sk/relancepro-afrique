import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";

// GET - Détails d'une créance
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

    const debt = await db.debt.findFirst({
      where: {
        id,
        profileId: session.user.id,
      },
      include: {
        client: true,
        reminders: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!debt) {
      return NextResponse.json({ error: "Créance non trouvée" }, { status: 404 });
    }

    return NextResponse.json(debt);
  } catch (error) {
    console.error("Error fetching debt:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la créance" },
      { status: 500 }
    );
  }
}

// PUT - Modifier une créance
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
    const { reference, description, amount, currency, dueDate, status, paidAmount, paidDate, nextReminderAt } = body;

    // Vérifier que la créance appartient à l'utilisateur
    const existing = await db.debt.findFirst({
      where: { id, profileId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Créance non trouvée" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    
    if (reference !== undefined) updateData.reference = reference || null;
    if (description !== undefined) updateData.description = description || null;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (currency !== undefined) updateData.currency = currency;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (status !== undefined) updateData.status = status;
    if (paidAmount !== undefined) updateData.paidAmount = parseFloat(paidAmount);
    if (paidDate !== undefined) updateData.paidDate = paidDate ? new Date(paidDate) : null;
    if (nextReminderAt !== undefined) updateData.nextReminderAt = nextReminderAt ? new Date(nextReminderAt) : null;

    const debt = await db.debt.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
      },
    });

    return NextResponse.json(debt);
  } catch (error) {
    console.error("Error updating debt:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification de la créance" },
      { status: 500 }
    );
  }
}

// PATCH - Mise à jour partielle d'une créance
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}

// DELETE - Supprimer une créance
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

    // Vérifier que la créance appartient à l'utilisateur
    const existing = await db.debt.findFirst({
      where: { id, profileId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Créance non trouvée" }, { status: 404 });
    }

    await db.debt.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Créance supprimée" });
  } catch (error) {
    console.error("Error deleting debt:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la créance" },
      { status: 500 }
    );
  }
}
