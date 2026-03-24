// =====================================================
// RELANCEPRO AFRICA - API for Canceling Queue Items
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";
import { cancelQueueItem } from "@/lib/cron/reminder-queue";

/**
 * DELETE /api/reminders/queue/[id]
 * Cancel a pending queue item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    const result = await cancelQueueItem(id, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erreur lors de l'annulation" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error canceling queue item:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'annulation" },
      { status: 500 }
    );
  }
}
