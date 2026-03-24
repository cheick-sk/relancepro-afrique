// =====================================================
// RELANCEPRO AFRICA - API Cron for Cleanup Tasks
// Protected endpoint for demo cleanup and maintenance
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredDemosJob } from "@/lib/cron/jobs";
import { cleanupOldJobs } from "@/lib/cron/scheduler";
import { verifyCronSecret, isCronEnabled } from "@/lib/cron/config";
import { db } from "@/lib/db";

/**
 * Verify cron request authentication
 */
function authenticateRequest(request: NextRequest): boolean {
  // Check cron secret in query params
  const urlSecret = request.nextUrl.searchParams.get("secret");
  if (urlSecret && verifyCronSecret(urlSecret)) {
    return true;
  }

  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return verifyCronSecret(token);
  }

  return false;
}

/**
 * GET /api/cron/cleanup?secret=CRON_SECRET
 * Trigger cleanup tasks (demo accounts, old jobs, etc.)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check if cron is enabled
    if (!isCronEnabled()) {
      return NextResponse.json(
        { error: "Cron jobs are disabled" },
        { status: 503 }
      );
    }

    // Verify authentication
    if (!authenticateRequest(request)) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing cron secret" },
        { status: 401 }
      );
    }

    console.log("[Cron] Starting cleanup tasks...");

    // Run cleanup jobs in parallel
    const [demoResult, oldJobsResult] = await Promise.all([
      cleanupExpiredDemosJob(),
      cleanupOldJobs(30), // Clean jobs older than 30 days
    ]);

    // Clean up orphaned data
    const orphanResult = await cleanupOrphanedData();

    const duration = Date.now() - startTime;

    console.log(`[Cron] Cleanup completed in ${duration}ms`);

    // Log the cleanup action
    await logCleanupAction({
      demosProcessed: demoResult.totalProcessed,
      demosExpired: demoResult.successful,
      oldJobsCleaned: oldJobsResult,
      orphansCleaned: orphanResult,
      duration,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      results: {
        demoCleanup: {
          processed: demoResult.totalProcessed,
          expired: demoResult.successful,
          failed: demoResult.failed,
        },
        oldJobsCleaned: oldJobsResult,
        orphanedDataCleaned: orphanResult,
      },
    });
  } catch (error) {
    console.error("[Cron] Error in cleanup job:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/cleanup
 * Support POST for webhooks
 */
export async function POST(request: NextRequest) {
  return GET(request);
}

/**
 * Clean up orphaned data in the database
 */
async function cleanupOrphanedData(): Promise<{
  expiredSessions: number;
  oldNotifications: number;
  failedReminders: number;
}> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    // Delete expired sessions
    const expiredSessions = await db.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { isRevoked: true, revokedAt: { lt: thirtyDaysAgo } },
        ],
      },
    });

    // Delete old read notifications
    const oldNotifications = await db.notification.deleteMany({
      where: {
        read: true,
        readAt: { lt: thirtyDaysAgo },
      },
    });

    // Mark very old failed reminders as cancelled
    const failedReminders = await db.reminderQueue.updateMany({
      where: {
        status: "failed",
        updatedAt: { lt: thirtyDaysAgo },
      },
      data: {
        status: "cancelled",
      },
    });

    return {
      expiredSessions: expiredSessions.count,
      oldNotifications: oldNotifications.count,
      failedReminders: failedReminders.count,
    };
  } catch (error) {
    console.error("[Cron] Error cleaning orphaned data:", error);
    return {
      expiredSessions: 0,
      oldNotifications: 0,
      failedReminders: 0,
    };
  }
}

/**
 * Log cleanup action to database
 */
async function logCleanupAction(details: {
  demosProcessed: number;
  demosExpired: number;
  oldJobsCleaned: number;
  orphansCleaned: { expiredSessions: number; oldNotifications: number; failedReminders: number };
  duration: number;
}): Promise<void> {
  try {
    const admin = await db.profile.findFirst({
      where: { role: "admin" },
    });

    if (admin) {
      await db.reminderLog.create({
        data: {
          profileId: admin.id,
          action: "cleanup",
          entityType: "Cron",
          entityId: "cleanup_job",
          details: JSON.stringify(details),
          success: true,
        },
      });
    }
  } catch (error) {
    console.error("[Cron] Failed to log cleanup action:", error);
  }
}
