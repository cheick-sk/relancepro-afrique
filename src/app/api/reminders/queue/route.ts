// =====================================================
// RELANCEPRO AFRICA - API for Reminder Queue
// Returns queue stats, items, and rate limit status
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";
import {
  getQueueStats,
  getPendingQueueItems,
  getRateLimitStatus,
} from "@/lib/cron/reminder-queue";

/**
 * GET /api/reminders/queue
 * Get queue statistics and pending items for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Get queue stats for the user
    const stats = await getQueueStats(session.user.id);

    // Get pending queue items
    const items = await getPendingQueueItems(session.user.id);

    // Get rate limit status
    const rateLimit = getRateLimitStatus(session.user.id);

    return NextResponse.json({
      stats,
      items,
      rateLimit,
    });
  } catch (error) {
    console.error("Error fetching queue data:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    );
  }
}
