// =====================================================
// RELANCEPRO AFRICA - API Skip Reminder
// POST endpoint to skip the next scheduled reminder
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { skipNextReminder } from "@/lib/services/reminder-scheduler";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get user
    const user = await db.profile.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { debtId } = body;
    
    if (!debtId) {
      return NextResponse.json(
        { error: "Debt ID is required" },
        { status: 400 }
      );
    }
    
    // Verify the debt belongs to this user
    const debt = await db.debt.findUnique({
      where: { id: debtId },
      select: { profileId: true },
    });
    
    if (!debt || debt.profileId !== user.id) {
      return NextResponse.json(
        { error: "Debt not found or access denied" },
        { status: 404 }
      );
    }
    
    // Skip the reminder
    const result = await skipNextReminder(debtId, user.id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to skip reminder" },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      nextReminderAt: result.nextReminderAt,
    });
    
  } catch (error) {
    console.error("Error skipping reminder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
