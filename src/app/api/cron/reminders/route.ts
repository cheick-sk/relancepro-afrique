// =====================================================
// RELANCEPRO AFRICA - API Cron for Automatic Reminders
// Protected endpoint using CRON_SECRET
// Processes all due reminders and returns statistics
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { processAutomaticReminders } from "@/lib/cron/scheduler";
import {
  processQueue,
  getQueueStats,
  scheduleRemindersForOverdueDebts,
} from "@/lib/cron/reminder-queue";

// =====================================================
// AUTHENTICATION
// =====================================================

/**
 * Verify the cron secret for endpoint protection
 */
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In development, accept without secret
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET not configured");
    return false;
  }

  // Check Authorization header: Bearer <secret>
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return token === cronSecret;
  }

  // Check query parameter for Vercel Cron
  const urlSecret = request.nextUrl.searchParams.get("secret");
  return urlSecret === cronSecret;
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * GET /api/cron/reminders
 * Main cron endpoint to process automatic reminders
 * 
 * Query parameters:
 * - action: "process" (default) | "schedule" | "queue" | "stats"
 * - mode: "all" (default) | "queue"
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

    // Get query parameters
    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action") || "process";
    const mode = searchParams.get("mode") || "all";

    console.log(`[Cron] Starting ${action} operation (${mode} mode)...`);

    let result: Record<string, unknown> = {};

    switch (action) {
      case "process":
        // Process reminders based on mode
        if (mode === "queue") {
          // Process only the queue
          const queueResult = await processQueue();
          result = {
            mode: "queue",
            ...queueResult,
          };
        } else {
          // Process automatic reminders and queue
          const [reminderResult, queueResult] = await Promise.all([
            processAutomaticReminders(),
            processQueue(),
          ]);

          result = {
            mode: "all",
            reminders: reminderResult,
            queue: queueResult,
          };
        }
        break;

      case "schedule":
        // Schedule reminders for overdue debts
        const scheduleResult = await scheduleRemindersForOverdueDebts();
        result = {
          mode: "schedule",
          ...scheduleResult,
        };
        break;

      case "queue":
        // Process only the queue
        const queueOnlyResult = await processQueue();
        result = {
          mode: "queue",
          ...queueOnlyResult,
        };
        break;

      case "stats":
        // Get queue statistics
        const stats = await getQueueStats();
        result = {
          mode: "stats",
          stats,
        };
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action", message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const duration = Date.now() - startTime;

    console.log(`[Cron] Operation completed in ${duration}ms:`, result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      action,
      ...result,
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

/**
 * POST /api/cron/reminders
 * Support for webhooks and external triggers
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

    // Parse request body for additional options
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // No body, use defaults
    }

    const action = (body.action as string) || "process";
    const mode = (body.mode as string) || "all";

    console.log(`[Cron] POST request - ${action} operation (${mode} mode)...`);

    let result: Record<string, unknown> = {};

    switch (action) {
      case "process":
        if (mode === "queue") {
          const queueResult = await processQueue();
          result = { mode: "queue", ...queueResult };
        } else {
          const [reminderResult, queueResult] = await Promise.all([
            processAutomaticReminders(),
            processQueue(),
          ]);
          result = {
            mode: "all",
            reminders: reminderResult,
            queue: queueResult,
          };
        }
        break;

      case "schedule":
        const scheduleResult = await scheduleRemindersForOverdueDebts();
        result = { mode: "schedule", ...scheduleResult };
        break;

      case "queue":
        const queueResult = await processQueue();
        result = { mode: "queue", ...queueResult };
        break;

      case "stats":
        const stats = await getQueueStats();
        result = { mode: "stats", stats };
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action", message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      action,
      ...result,
    });
  } catch (error) {
    console.error("[Cron] Error in POST request:", error);

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
