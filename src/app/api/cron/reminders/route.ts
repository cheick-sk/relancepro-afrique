// =====================================================
// RELANCEPRO AFRICA - API Cron pour Relances Automatiques
// Endpoint protégé par CRON_SECRET
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { processAutomaticReminders } from "@/lib/cron/reminders";

// Vérification du secret pour sécuriser l'endpoint
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // En développement, accepter sans secret
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  
  if (!cronSecret) {
    console.error("CRON_SECRET not configured");
    return false;
  }
  
  // Vérifier le header Authorization: Bearer <secret>
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return token === cronSecret;
  }
  
  // Vérifier le query param pour Vercel Cron
  const urlSecret = request.nextUrl.searchParams.get("secret");
  return urlSecret === cronSecret;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Vérifier l'authentification
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing cron secret" },
        { status: 401 }
      );
    }
    
    console.log("[Cron] Starting automatic reminders processing...");
    
    // Traiter les relances automatiques
    const result = await processAutomaticReminders();
    
    const duration = Date.now() - startTime;
    
    console.log(`[Cron] Reminders processed in ${duration}ms:`, result);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        processed: result.processed,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
      },
      details: result.results.slice(0, 50), // Limiter les détails retournés
    });
    
  } catch (error) {
    console.error("[Cron] Error processing reminders:", error);
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}

// Support POST pour les webhooks externes
export async function POST(request: NextRequest) {
  return GET(request);
}
