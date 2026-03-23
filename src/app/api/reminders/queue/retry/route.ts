// =====================================================
// RELANCEPRO AFRICA - API for Retrying Failed Queue Items
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";
import { retryFailedItems } from "@/lib/cron/reminder-queue";

/**
 * POST /api/reminders/queue/retry
 * Retry all failed queue items for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const result = await retryFailedItems(session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erreur lors de la reprogrammation" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      retried: result.retried,
    });
  } catch (error) {
    console.error("Error retrying failed items:", error);
    return NextResponse.json(
      { error: "Erreur lors de la reprogrammation" },
      { status: 500 }
    );
  }
}
