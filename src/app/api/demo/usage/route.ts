import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getDemoUsage, isDemoActive, isInDemoMode } from "@/lib/demo";
import { db } from "@/lib/db";

// GET - Get demo usage stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Get profile
    const profile = await db.profile.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionStatus: true,
        demoStartedAt: true,
        demoExpiresAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get usage stats
    const usage = await getDemoUsage(session.user.id, profile);

    // Determine if demo is active or expired
    const inDemoMode = isInDemoMode(profile);
    const demoActive = isDemoActive(profile);

    return NextResponse.json({
      ...usage,
      inDemoMode,
      demoActive,
      limits: {
        clients: 5,
        emailReminders: 10,
        whatsappReminders: 5,
      },
    });
  } catch (error) {
    console.error("Error fetching demo usage:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données d'utilisation" },
      { status: 500 }
    );
  }
}
