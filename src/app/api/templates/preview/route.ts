import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { replaceVariables, getCharacterInfo, SAMPLE_PREVIEW_DATA } from "@/lib/templates/variables";

// POST - Preview template with sample data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, subject, body: templateBody, type, previewData } = body;

    let templateSubject = subject;
    let templateContent = templateBody;
    let templateType = type;

    // If templateId is provided, get the template from database
    if (templateId) {
      const template = await db.template.findFirst({
        where: {
          id: templateId,
          profileId: session.user.id,
        },
      });

      if (!template) {
        return NextResponse.json({ error: "Template non trouvé" }, { status: 404 });
      }

      templateSubject = template.subject;
      templateContent = template.body;
      templateType = template.type;
    }

    if (!templateContent) {
      return NextResponse.json({ error: "Le contenu du template est requis" }, { status: 400 });
    }

    // Merge sample data with custom preview data
    const data = { ...SAMPLE_PREVIEW_DATA, ...previewData };

    // Replace variables
    const previewSubject = templateSubject ? replaceVariables(templateSubject, data) : undefined;
    const previewBody = replaceVariables(templateContent, data);

    // Get character info
    const charInfo = getCharacterInfo(templateContent, templateType);

    return NextResponse.json({
      subject: previewSubject,
      body: previewBody,
      characterCount: charInfo.count,
      smsSegments: charInfo.segments,
      isOverLimit: charInfo.isOverLimit,
    });
  } catch (error) {
    console.error("Error previewing template:", error);
    return NextResponse.json(
      { error: "Erreur lors de la prévisualisation du template" },
      { status: 500 }
    );
  }
}
