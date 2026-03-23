import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";

// GET - Liste des templates
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const templates = await db.template.findMany({
      where: { profileId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { category: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des templates" },
      { status: 500 }
    );
  }
}

// POST - Créer un nouveau template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, category, subject, content, isDefault, isActive } = body;

    if (!name || !type || !category || !content) {
      return NextResponse.json(
        { error: "Le nom, le type, la catégorie et le contenu sont requis" },
        { status: 400 }
      );
    }

    if (type === "email" && !subject) {
      return NextResponse.json(
        { error: "L'objet est requis pour les templates email" },
        { status: 400 }
      );
    }

    // Si c'est un template par défaut, retirer le flag des autres
    if (isDefault) {
      await db.template.updateMany({
        where: {
          profileId: session.user.id,
          type,
          category,
        },
        data: { isDefault: false },
      });
    }

    const template = await db.template.create({
      data: {
        profileId: session.user.id,
        name,
        type,
        category,
        subject,
        content,
        isDefault: isDefault || false,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du template" },
      { status: 500 }
    );
  }
}
