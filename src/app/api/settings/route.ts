import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";

// GET - Récupérer les paramètres
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const [profile, settings] = await Promise.all([
      db.profile.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          companyName: true,
          phone: true,
          email: true,
        },
      }),
      db.settings.findUnique({
        where: { profileId: session.user.id },
      }),
    ]);

    return NextResponse.json({ profile, settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des paramètres" },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour les paramètres
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      companyName,
      phone,
      emailSignature,
      emailSenderName,
      whatsappBusinessName,
      autoRemindEnabled,
      reminderDay1,
      reminderDay2,
      reminderDay3,
      skipWeekends,
      reminderStartTime,
      reminderEndTime,
      maxReminders,
    } = body;

    // Mettre à jour le profil
    await db.profile.update({
      where: { id: session.user.id },
      data: {
        name,
        companyName,
        phone,
      },
    });

    // Mettre à jour ou créer les paramètres
    await db.settings.upsert({
      where: { profileId: session.user.id },
      update: {
        emailSignature,
        emailSenderName,
        whatsappBusinessName,
        autoRemindEnabled,
        reminderDay1,
        reminderDay2,
        reminderDay3,
        skipWeekends,
        reminderStartTime,
        reminderEndTime,
        maxReminders,
      },
      create: {
        profileId: session.user.id,
        emailSignature,
        emailSenderName,
        whatsappBusinessName,
        autoRemindEnabled,
        reminderDay1,
        reminderDay2,
        reminderDay3,
        skipWeekends,
        reminderStartTime,
        reminderEndTime,
        maxReminders,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des paramètres" },
      { status: 500 }
    );
  }
}
