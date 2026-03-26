import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { startDemo } from "@/lib/demo";

// POST - Start demo period
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const result = await startDemo(session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Période d'essai activée avec succès",
      expiresAt: result.expiresAt,
      duration: 7, // days
    });
  } catch (error) {
    console.error("Error starting demo:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'activation de la période d'essai" },
      { status: 500 }
    );
  }
}
