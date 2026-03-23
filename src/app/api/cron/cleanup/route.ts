// =====================================================
// RELANCEPRO AFRICA - API Cron for Data Cleanup
// Cleans old notifications, chat history, and expired demo accounts
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CLEANUP_CONFIG } from "@/lib/cron/config";

// =====================================================
// TYPES
// =====================================================

interface CleanupResult {
  notificationsDeleted: number;
  chatHistoryDeleted: number;
  reminderLogsDeleted: number;
  demoAccountsDeleted: number;
  oldQueueItemsDeleted: number;
  errors: string[];
}

// =====================================================
// AUTHENTICATION
// =====================================================

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "development") {
    return true;
  }

  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET not configured");
    return false;
  }

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return token === cronSecret;
  }

  const urlSecret = request.nextUrl.searchParams.get("secret");
  return urlSecret === cronSecret;
}

// =====================================================
// CLEANUP FUNCTIONS
// =====================================================

/**
 * Clean old notifications (30+ days)
 */
async function cleanOldNotifications(): Promise<number> {
  const cutoffDate = new Date(
    Date.now() - CLEANUP_CONFIG.NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );

  try {
    const result = await db.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        read: true, // Only delete read notifications
      },
    });

    console.log(`[Cleanup] Deleted ${result.count} old notifications`);
    return result.count;
  } catch (error) {
    console.error("[Cleanup] Error cleaning notifications:", error);
    throw error;
  }
}

/**
 * Clean old chat history (90+ days)
 * Note: If there's a chat history table, clean it here
 * For now, we'll clean old AI chat logs if they exist in reminder logs
 */
async function cleanOldChatHistory(): Promise<number> {
  const cutoffDate = new Date(
    Date.now() - CLEANUP_CONFIG.CHAT_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );

  try {
    // Clean reminder logs that are old
    const result = await db.reminderLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        action: { in: ["processed", "sent", "failed"] },
      },
    });

    console.log(`[Cleanup] Deleted ${result.count} old chat/log entries`);
    return result.count;
  } catch (error) {
    console.error("[Cleanup] Error cleaning chat history:", error);
    throw error;
  }
}

/**
 * Clean old reminder logs (365+ days)
 */
async function cleanOldReminderLogs(): Promise<number> {
  const cutoffDate = new Date(
    Date.now() - CLEANUP_CONFIG.REMINDER_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );

  try {
    const result = await db.reminderLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    console.log(`[Cleanup] Deleted ${result.count} old reminder logs`);
    return result.count;
  } catch (error) {
    console.error("[Cleanup] Error cleaning reminder logs:", error);
    throw error;
  }
}

/**
 * Clean expired demo accounts
 * Delete accounts that have been expired for more than X days
 */
async function cleanExpiredDemoAccounts(): Promise<number> {
  const cutoffDate = new Date(
    Date.now() - CLEANUP_CONFIG.DEMO_ACCOUNT_CLEANUP_DAYS * 24 * 60 * 60 * 1000
  );

  try {
    // Find expired demo accounts past cleanup threshold
    const expiredDemos = await db.profile.findMany({
      where: {
        subscriptionStatus: "expired",
        demoExpiresAt: { lt: cutoffDate },
        // Only delete if they never paid
        paystackCustomerId: null,
      },
      select: { id: true },
    });

    let deleted = 0;

    for (const profile of expiredDemos) {
      try {
        // Delete in transaction to ensure consistency
        await db.$transaction(async (tx) => {
          // Delete all related data
          await tx.reminderQueue.deleteMany({
            where: { profileId: profile.id },
          });
          await tx.reminderLog.deleteMany({
            where: { profileId: profile.id },
          });
          await tx.notification.deleteMany({
            where: { profileId: profile.id },
          });
          await tx.webhook.deleteMany({
            where: { profileId: profile.id },
          });
          await tx.session.deleteMany({
            where: { userId: profile.id },
          });
          await tx.auditLog.deleteMany({
            where: { userId: profile.id },
          });
          await tx.payment.deleteMany({
            where: { profileId: profile.id },
          });
          await tx.reminder.deleteMany({
            where: { profileId: profile.id },
          });
          await tx.debt.deleteMany({
            where: { profileId: profile.id },
          });
          await tx.client.deleteMany({
            where: { profileId: profile.id },
          });
          await tx.settings.deleteMany({
            where: { profileId: profile.id },
          });

          // Finally delete the profile
          await tx.profile.delete({
            where: { id: profile.id },
          });
        });

        deleted++;
      } catch (error) {
        console.error(
          `[Cleanup] Error deleting demo account ${profile.id}:`,
          error
        );
      }
    }

    console.log(`[Cleanup] Deleted ${deleted} expired demo accounts`);
    return deleted;
  } catch (error) {
    console.error("[Cleanup] Error cleaning demo accounts:", error);
    throw error;
  }
}

/**
 * Clean old queue items (completed/failed 30+ days ago)
 */
async function cleanOldQueueItems(): Promise<number> {
  const cutoffDate = new Date(
    Date.now() - CLEANUP_CONFIG.NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );

  try {
    const result = await db.reminderQueue.deleteMany({
      where: {
        status: { in: ["sent", "failed", "cancelled"] },
        updatedAt: { lt: cutoffDate },
      },
    });

    console.log(`[Cleanup] Deleted ${result.count} old queue items`);
    return result.count;
  } catch (error) {
    console.error("[Cleanup] Error cleaning queue items:", error);
    throw error;
  }
}

/**
 * Main cleanup function
 */
async function performCleanup(): Promise<CleanupResult> {
  const result: CleanupResult = {
    notificationsDeleted: 0,
    chatHistoryDeleted: 0,
    reminderLogsDeleted: 0,
    demoAccountsDeleted: 0,
    oldQueueItemsDeleted: 0,
    errors: [],
  };

  try {
    // Run all cleanup tasks
    result.notificationsDeleted = await cleanOldNotifications();
  } catch (error) {
    result.errors.push(
      `Notifications cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  try {
    result.chatHistoryDeleted = await cleanOldChatHistory();
  } catch (error) {
    result.errors.push(
      `Chat history cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  try {
    result.reminderLogsDeleted = await cleanOldReminderLogs();
  } catch (error) {
    result.errors.push(
      `Reminder logs cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  try {
    result.oldQueueItemsDeleted = await cleanOldQueueItems();
  } catch (error) {
    result.errors.push(
      `Queue items cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  try {
    result.demoAccountsDeleted = await cleanExpiredDemoAccounts();
  } catch (error) {
    result.errors.push(
      `Demo accounts cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return result;
}

/**
 * Optimize database (vacuum/analyze)
 * Note: SQLite doesn't need vacuum often, but we can run PRAGMA optimize
 */
async function optimizeDatabase(): Promise<void> {
  try {
    // Run SQLite optimization
    await db.$executeRawUnsafe(`PRAGMA optimize;`);
    console.log("[Cleanup] Database optimization completed");
  } catch (error) {
    console.error("[Cleanup] Database optimization failed:", error);
  }
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * GET /api/cron/cleanup
 * Run cleanup tasks
 * 
 * Query parameters:
 * - optimize: "true" to also run database optimization
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authentication
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing cron secret" },
        { status: 401 }
      );
    }

    console.log("[Cron] Starting cleanup tasks...");

    const result = await performCleanup();

    // Check if optimization is requested
    const shouldOptimize = request.nextUrl.searchParams.get("optimize") === "true";
    if (shouldOptimize) {
      await optimizeDatabase();
    }

    const duration = Date.now() - startTime;

    const totalDeleted =
      result.notificationsDeleted +
      result.chatHistoryDeleted +
      result.reminderLogsDeleted +
      result.demoAccountsDeleted +
      result.oldQueueItemsDeleted;

    console.log(`[Cron] Cleanup completed in ${duration}ms. Total deleted: ${totalDeleted}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        totalDeleted,
        notificationsDeleted: result.notificationsDeleted,
        chatHistoryDeleted: result.chatHistoryDeleted,
        reminderLogsDeleted: result.reminderLogsDeleted,
        demoAccountsDeleted: result.demoAccountsDeleted,
        oldQueueItemsDeleted: result.oldQueueItemsDeleted,
        optimized: shouldOptimize,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("[Cron] Error in cleanup:", error);

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

/**
 * POST /api/cron/cleanup
 * Support for webhooks
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authentication
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing cron secret" },
        { status: 401 }
      );
    }

    // Parse options from body
    let options: Record<string, unknown> = {};
    try {
      options = await request.json();
    } catch {
      // No body, use defaults
    }

    console.log("[Cron] Starting cleanup tasks (POST)...");

    const result = await performCleanup();

    // Check if optimization is requested
    const shouldOptimize = options.optimize === true;
    if (shouldOptimize) {
      await optimizeDatabase();
    }

    const duration = Date.now() - startTime;

    const totalDeleted =
      result.notificationsDeleted +
      result.chatHistoryDeleted +
      result.reminderLogsDeleted +
      result.demoAccountsDeleted +
      result.oldQueueItemsDeleted;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        totalDeleted,
        notificationsDeleted: result.notificationsDeleted,
        chatHistoryDeleted: result.chatHistoryDeleted,
        reminderLogsDeleted: result.reminderLogsDeleted,
        demoAccountsDeleted: result.demoAccountsDeleted,
        oldQueueItemsDeleted: result.oldQueueItemsDeleted,
        optimized: shouldOptimize,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("[Cron] Error in cleanup:", error);

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
