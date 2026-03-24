import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getDefaultTemplate } from "@/lib/templates/default-templates";

// GET - Récupérer un template spécifique
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

    const template = await db.template.findFirst({
      where: {
        id,
        profileId: session.user.id,
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template non trouvé" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du template" },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un template
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
    const { name, type, category, subject, content, language, tone, isDefault, isActive } = body;

    // Vérifier que le template appartient à l'utilisateur
    const existing = await db.template.findFirst({
      where: { id, profileId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template non trouvé" }, { status: 404 });
    }

    // Si c'est un template par défaut, retirer le flag des autres
    if (isDefault && !existing.isDefault) {
      await db.template.updateMany({
        where: {
          profileId: session.user.id,
          type: type || existing.type,
          category: category || existing.category,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const template = await db.template.update({
      where: { id },
      data: {
        name: name || existing.name,
        type: type || existing.type,
        category: category || existing.category,
        subject: subject !== undefined ? subject : existing.subject,
        content: content || existing.content,
        language: language || existing.language,
        tone: tone || existing.tone,
        isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du template" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un template
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

    // Vérifier que le template appartient à l'utilisateur
    const existing = await db.template.findFirst({
      where: { id, profileId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template non trouvé" }, { status: 404 });
    }

    await db.template.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du template" },
      { status: 500 }
    );
  }
}

// POST - Reset template to default
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    // Vérifier que le template appartient à l'utilisateur
    const existing = await db.template.findFirst({
      where: { id, profileId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template non trouvé" }, { status: 404 });
    }

    // Récupérer le template par défaut correspondant
    const defaultTemplate = getDefaultTemplate(
      existing.type as "email" | "whatsapp",
      existing.category as "reminder1" | "reminder2" | "reminder3" | "custom",
      existing.language as "fr" | "en",
      existing.tone as "formal" | "friendly" | "urgent"
    );

    if (!defaultTemplate) {
      return NextResponse.json(
        { error: "Aucun template par défaut disponible pour cette configuration" },
        { status: 404 }
      );
    }

    // Mettre à jour le template avec le contenu par défaut
    const template = await db.template.update({
      where: { id },
      data: {
        name: defaultTemplate.name,
        subject: defaultTemplate.subject,
        content: defaultTemplate.content,
        tone: defaultTemplate.tone,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error resetting template:", error);
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation du template" },
      { status: 500 }
    );
  }
}
