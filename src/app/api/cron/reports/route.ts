// =====================================================
// RELANCEPRO AFRICA - API Cron for Weekly Reports
// Protected endpoint for generating and sending reports
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { weeklyReportJob, paymentPredictionJob } from "@/lib/cron/jobs";
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
 * GET /api/cron/reports?secret=CRON_SECRET
 * Generate and send weekly reports
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

    console.log("[Cron] Starting weekly reports job...");

    // Check if there's a specific report type requested
    const reportType = request.nextUrl.searchParams.get("type");

    let result;
    
    if (reportType === "predictions") {
      // Only run payment predictions
      result = await paymentPredictionJob();
    } else if (reportType === "weekly") {
      // Only run weekly reports
      result = await weeklyReportJob();
    } else {
      // Run both by default
      const [weeklyResult, predictionResult] = await Promise.all([
        weeklyReportJob(),
        paymentPredictionJob(),
      ]);

      result = {
        totalProcessed: weeklyResult.totalProcessed + predictionResult.totalProcessed,
        successful: weeklyResult.successful + predictionResult.successful,
        failed: weeklyResult.failed + predictionResult.failed,
        skipped: weeklyResult.skipped + predictionResult.skipped,
        duration: Math.max(weeklyResult.duration, predictionResult.duration),
        results: {
          weekly: weeklyResult,
          predictions: predictionResult,
        },
      };
    }

    const duration = Date.now() - startTime;

    console.log(`[Cron] Reports job completed in ${duration}ms`);

    // Log the reports action
    await logReportsAction({
      reportsSent: result.successful,
      predictionsUpdated: reportType === "weekly" ? 0 : result.successful,
      duration,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        processed: result.totalProcessed,
        successful: result.successful,
        failed: result.failed,
        skipped: result.skipped,
      },
      details: result.results || result.results,
    });
  } catch (error) {
    console.error("[Cron] Error in reports job:", error);

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
 * POST /api/cron/reports
 * Support POST for webhooks
 */
export async function POST(request: NextRequest) {
  return GET(request);
}

/**
 * Log reports action to database
 */
async function logReportsAction(details: {
  reportsSent: number;
  predictionsUpdated: number;
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
          action: "reports",
          entityType: "Cron",
          entityId: "reports_job",
          details: JSON.stringify(details),
          success: true,
        },
      });
    }
  } catch (error) {
    console.error("[Cron] Failed to log reports action:", error);
  }
}
