import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getInitialTemplatesForNewUser } from "@/lib/templates/default-templates";

// GET - Liste des templates
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Get user's templates
    let templates = await db.template.findMany({
      where: { profileId: session.user.id },
      orderBy: [
        { type: "asc" },
        { category: "asc" },
        { isDefault: "desc" },
        { createdAt: "desc" }
      ],
    });

    // If no templates exist, create defaults based on user's preferred language
    if (templates.length === 0) {
      // Get user's preferred language
      const user = await db.profile.findUnique({
        where: { id: session.user.id },
        select: { preferredLanguage: true },
      });
      
      const language = (user?.preferredLanguage === 'en' ? 'en' : 'fr') as 'fr' | 'en';
      const defaultTemplates = getInitialTemplatesForNewUser(language);

      // Create default templates
      for (const template of defaultTemplates) {
        await db.template.create({
          data: {
            profileId: session.user.id,
            name: template.name,
            type: template.type,
            category: template.category,
            subject: template.subject,
            body: template.body,
            tone: template.tone,
            language: template.language,
            isDefault: true,
            isActive: true,
          },
        });
      }

      // Fetch again
      templates = await db.template.findMany({
        where: { profileId: session.user.id },
        orderBy: [
          { type: "asc" },
          { category: "asc" },
          { isDefault: "desc" },
          { createdAt: "desc" }
        ],
      });
    }

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
    const { 
      name, 
      type, 
      category, 
      subject, 
      body: templateBody, 
      tone,
      language,
      isDefault, 
      isActive 
    } = body;

    if (!name || !type || !category || !templateBody) {
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
        body: templateBody,
        tone: tone || "formal",
        language: language || "fr",
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
