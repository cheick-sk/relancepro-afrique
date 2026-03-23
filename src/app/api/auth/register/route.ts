import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, companyName, password } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Tous les champs obligatoires doivent être remplis" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db.profile.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create user
    const user = await db.profile.create({
      data: {
        email,
        name,
        companyName: companyName || null,
        password: hashedPassword,
        subscriptionStatus: "free",
      },
    });

    // Create default settings
    await db.settings.create({
      data: {
        profileId: user.id,
        emailSignature: `${name}\n${companyName || ""}`,
        emailSenderName: companyName || name,
        whatsappBusinessName: companyName || name,
      },
    });

    return NextResponse.json(
      { message: "Compte créé avec succès", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la création du compte" },
      { status: 500 }
    );
  }
}
