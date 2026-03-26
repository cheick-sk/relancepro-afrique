// =====================================================
// RELANCEPRO AFRICA - API Manual Reminder Processing
// POST endpoint to manually trigger reminder processing
// For testing and admin use
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { processAutomaticReminders } from "@/lib/cron/reminders";
import { scheduleReminders } from "@/lib/services/reminder-scheduler";
import { db } from "@/lib/db";

// Verify authorization - either CRON_SECRET or authenticated admin
async function isAuthorized(request: NextRequest): Promise<{ authorized: boolean; error?: string; userId?: string }> {
  // Check for CRON_SECRET (for automated calls)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (cronSecret && token === cronSecret) {
      return { authorized: true };
    }
  }
  
  // Check for authenticated session (for manual admin calls)
  try {
    const session = await getServerSession();
    
    if (session?.user) {
      // Get user from database to check role
      const user = await db.profile.findUnique({
        where: { email: session.user.email || "" },
        select: { id: true, role: true },
      });
      
      if (user?.role === "admin") {
        return { authorized: true, userId: user.id };
      }
      
      // Regular users can trigger their own reminders
      return { authorized: true, userId: user?.id };
    }
  } catch (error) {
    console.error("Auth check error:", error);
  }
  
  return { authorized: false, error: "Unauthorized" };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify authorization
    const authResult = await isAuthorized(request);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: "Unauthorized", message: authResult.error },
        { status: 401 }
      );
    }
    
    // Parse request body for options
    let options: {
      profileId?: string;
      action?: "process" | "schedule" | "both";
    } = {};
    
    try {
      const body = await request.json();
      options = body || {};
    } catch {
      // No body, use defaults
    }
    
    const action = options.action || "process";
    const results: {
      processed?: Awaited<ReturnType<typeof processAutomaticReminders>>;
      scheduled?: Awaited<ReturnType<typeof scheduleReminders>>;
    } = {};
    
    // Process reminders
    if (action === "process" || action === "both") {
      console.log("[Manual] Processing due reminders...");
      results.processed = await processAutomaticReminders();
    }
    
    // Schedule reminders for a specific profile
    if (action === "schedule" || action === "both") {
      if (options.profileId) {
        console.log(`[Manual] Scheduling reminders for profile ${options.profileId}...`);
        results.scheduled = await scheduleReminders(options.profileId);
      } else if (authResult.userId) {
        // Schedule for the authenticated user's profile
        console.log(`[Manual] Scheduling reminders for current user...`);
        results.scheduled = await scheduleReminders(authResult.userId);
      }
    }
    
    const duration = Date.now() - startTime;
    
    // Log the manual trigger
    if (authResult.userId) {
      await db.reminderLog.create({
        data: {
          profileId: authResult.userId,
          action: "manual_trigger",
          entityType: "API",
          entityId: "/api/reminders/process",
          details: JSON.stringify({
            action,
            options,
            duration,
            timestamp: new Date().toISOString(),
          }),
          success: true,
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      action,
      results: {
        processed: results.processed ? {
          summary: {
            processed: results.processed.processed,
            sent: results.processed.sent,
            failed: results.processed.failed,
            skipped: results.processed.skipped,
          },
          duration: results.processed.duration,
        } : undefined,
        scheduled: results.scheduled ? {
          scheduled: results.scheduled.scheduled,
          skipped: results.scheduled.skipped,
          errors: results.scheduled.errors,
        } : undefined,
      },
    });
    
  } catch (error) {
    console.error("[Manual] Error processing reminders:", error);
    
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

// GET endpoint to check reminder status
export async function GET(request: NextRequest) {
  const authResult = await isAuthorized(request);
  
  if (!authResult.authorized) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    // Get reminder queue stats
    const queueStats = await db.reminderQueue.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    });
    
    // Get upcoming reminders
    const now = new Date();
    const upcomingReminders = await db.debt.count({
      where: {
        status: { in: ["pending", "partial"] },
        nextReminderAt: { gt: now },
      },
    });
    
    // Get overdue debts needing reminders
    const overdueCount = await db.debt.count({
      where: {
        status: { in: ["pending", "partial"] },
        nextReminderAt: { lte: now },
      },
    });
    
    // Get today's sent reminders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayReminders = await db.reminder.count({
      where: {
        sentAt: { gte: today },
        status: "sent",
      },
    });
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      queue: queueStats.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      stats: {
        upcomingReminders,
        overdueNeedingReminders: overdueCount,
        sentToday: todayReminders,
      },
    });
    
  } catch (error) {
    console.error("[Manual] Error getting reminder status:", error);
    return NextResponse.json(
      { error: "Failed to get reminder status" },
      { status: 500 }
    );
  }
}
