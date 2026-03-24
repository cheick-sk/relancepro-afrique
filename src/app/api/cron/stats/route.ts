// =====================================================
// RELANCEPRO AFRICA - API Cron pour Statistiques
// Calcul des statistiques quotidiennes et rapports
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

/**
 * GET /api/cron/stats
 * Calculate and return daily statistics
 */
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
    
    console.log("[Cron Stats] Starting statistics calculation...");
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    // Calculate daily stats
    const dailyStats = await calculateDailyStats(today, now);
    
    // Calculate weekly stats
    const weeklyStats = await calculateWeeklyStats(weekAgo, now);
    
    // Calculate system health
    const systemHealth = await calculateSystemHealth();
    
    // Get pending jobs count
    const pendingJobs = await db.scheduledJob.count({
      where: { status: "pending" },
    });
    
    // Clean up old data
    const cleanupResult = await cleanupOldData();
    
    const duration = Date.now() - startTime;
    
    console.log(`[Cron Stats] Completed in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      duration: `${duration}ms`,
      stats: {
        daily: dailyStats,
        weekly: weeklyStats,
        systemHealth,
        pendingJobs,
      },
      cleanup: cleanupResult,
    });
    
  } catch (error) {
    console.error("[Cron Stats] Error:", error);
    
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
 * Calculate daily statistics
 */
async function calculateDailyStats(start: Date, end: Date) {
  try {
    // Total reminders sent today
    const remindersSentToday = await db.reminder.count({
      where: {
        sentAt: { gte: start, lte: end },
        status: "sent",
      },
    });
    
    // Total reminders failed today
    const remindersFailedToday = await db.reminder.count({
      where: {
        createdAt: { gte: start, lte: end },
        status: "failed",
      },
    });
    
    // New debts created today
    const newDebtsToday = await db.debt.count({
      where: {
        createdAt: { gte: start, lte: end },
      },
    });
    
    // Debts paid today
    const debtsPaidToday = await db.debt.count({
      where: {
        paidDate: { gte: start, lte: end },
        status: "paid",
      },
    });
    
    // Total amount collected today
    const collectedToday = await db.debt.aggregate({
      where: {
        paidDate: { gte: start, lte: end },
        status: "paid",
      },
      _sum: { amount: true },
    });
    
    // New clients today
    const newClientsToday = await db.client.count({
      where: {
        createdAt: { gte: start, lte: end },
      },
    });
    
    // New registrations today
    const newRegistrationsToday = await db.profile.count({
      where: {
        createdAt: { gte: start, lte: end },
      },
    });
    
    // Active users today
    const activeUsersToday = await db.session.count({
      where: {
        lastActive: { gte: start, lte: end },
        isRevoked: false,
      },
    });
    
    return {
      remindersSent: remindersSentToday,
      remindersFailed: remindersFailedToday,
      newDebts: newDebtsToday,
      debtsPaid: debtsPaidToday,
      amountCollected: collectedToday._sum.amount || 0,
      newClients: newClientsToday,
      newRegistrations: newRegistrationsToday,
      activeUsers: activeUsersToday,
    };
  } catch (error) {
    console.error("[Cron Stats] Error calculating daily stats:", error);
    return null;
  }
}

/**
 * Calculate weekly statistics
 */
async function calculateWeeklyStats(start: Date, end: Date) {
  try {
    // Total reminders sent this week
    const remindersSentWeek = await db.reminder.count({
      where: {
        sentAt: { gte: start, lte: end },
        status: "sent",
      },
    });
    
    // Total debts paid this week
    const debtsPaidWeek = await db.debt.count({
      where: {
        paidDate: { gte: start, lte: end },
        status: "paid",
      },
    });
    
    // Total amount collected this week
    const collectedWeek = await db.debt.aggregate({
      where: {
        paidDate: { gte: start, lte: end },
        status: "paid",
      },
      _sum: { amount: true },
    });
    
    // Reminder success rate
    const totalReminders = await db.reminder.count({
      where: {
        createdAt: { gte: start, lte: end },
      },
    });
    
    const successRate = totalReminders > 0 
      ? Math.round((remindersSentWeek / totalReminders) * 100) 
      : 0;
    
    // Average response time (time between reminder and payment)
    const recentPayments = await db.debt.findMany({
      where: {
        paidDate: { gte: start, lte: end },
        status: "paid",
        lastReminderAt: { not: null },
      },
      select: {
        paidDate: true,
        lastReminderAt: true,
      },
    });
    
    let avgResponseTime = 0;
    if (recentPayments.length > 0) {
      const totalHours = recentPayments.reduce((sum, debt) => {
        if (debt.paidDate && debt.lastReminderAt) {
          const hours = Math.floor(
            (new Date(debt.paidDate).getTime() - new Date(debt.lastReminderAt).getTime()) 
            / (1000 * 60 * 60)
          );
          return sum + Math.max(0, hours);
        }
        return sum;
      }, 0);
      avgResponseTime = Math.round(totalHours / recentPayments.length);
    }
    
    // Top performing channels
    const emailSuccess = await db.reminder.count({
      where: {
        type: "email",
        status: "sent",
        sentAt: { gte: start, lte: end },
      },
    });
    
    const whatsappSuccess = await db.reminder.count({
      where: {
        type: "whatsapp",
        status: "sent",
        sentAt: { gte: start, lte: end },
      },
    });
    
    return {
      remindersSent: remindersSentWeek,
      debtsPaid: debtsPaidWeek,
      amountCollected: collectedWeek._sum.amount || 0,
      successRate,
      avgResponseTimeHours: avgResponseTime,
      channelPerformance: {
        email: emailSuccess,
        whatsapp: whatsappSuccess,
      },
    };
  } catch (error) {
    console.error("[Cron Stats] Error calculating weekly stats:", error);
    return null;
  }
}

/**
 * Calculate system health metrics
 */
async function calculateSystemHealth() {
  try {
    // Database health
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;
    
    // Pending jobs
    const pendingJobs = await db.scheduledJob.count({
      where: { status: "pending" },
    });
    
    // Failed jobs in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const failedJobsHour = await db.scheduledJob.count({
      where: {
        status: "failed",
        updatedAt: { gte: oneHourAgo },
      },
    });
    
    // Overdue pending reminders
    const now = new Date();
    const overdueReminders = await db.reminderQueue.count({
      where: {
        status: "pending",
        scheduledAt: { lt: now },
      },
    });
    
    // Active subscriptions
    const activeSubscriptions = await db.profile.count({
      where: {
        subscriptionStatus: "active",
      },
    });
    
    // Demo accounts expiring soon
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const expiringDemos = await db.profile.count({
      where: {
        subscriptionStatus: "demo",
        demoExpiresAt: { lte: threeDaysFromNow, gte: now },
      },
    });
    
    return {
      database: {
        status: "healthy",
        latency: dbLatency,
      },
      jobs: {
        pending: pendingJobs,
        failedLastHour: failedJobsHour,
        overdueReminders,
      },
      subscriptions: {
        active: activeSubscriptions,
        expiringDemos,
      },
    };
  } catch (error) {
    console.error("[Cron Stats] Error calculating system health:", error);
    return {
      database: { status: "error" },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Clean up old data
 */
async function cleanupOldData(): Promise<{
  reminderLogsDeleted: number;
  oldSessionsDeleted: number;
  oldJobsDeleted: number;
}> {
  try {
    const result = {
      reminderLogsDeleted: 0,
      oldSessionsDeleted: 0,
      oldJobsDeleted: 0,
    };
    
    // Delete reminder logs older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const deletedLogs = await db.reminderLog.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
      },
    });
    result.reminderLogsDeleted = deletedLogs.count;
    
    // Delete expired sessions older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deletedSessions = await db.session.deleteMany({
      where: {
        expiresAt: { lt: thirtyDaysAgo },
      },
    });
    result.oldSessionsDeleted = deletedSessions.count;
    
    // Delete completed/failed jobs older than 30 days
    const deletedJobs = await db.scheduledJob.deleteMany({
      where: {
        status: { in: ["completed", "failed", "cancelled"] },
        updatedAt: { lt: thirtyDaysAgo },
      },
    });
    result.oldJobsDeleted = deletedJobs.count;
    
    return result;
  } catch (error) {
    console.error("[Cron Stats] Error cleaning up old data:", error);
    return {
      reminderLogsDeleted: 0,
      oldSessionsDeleted: 0,
      oldJobsDeleted: 0,
    };
  }
}

// Support POST for external triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
