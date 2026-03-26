// =====================================================
// RELANCEPRO AFRICA - Cron Job Handlers
// Individual job implementations for scheduled tasks
// =====================================================

import { db } from "@/lib/db";
import type { JobResult, BatchJobResult, AutoReminderConfig } from "./types";
import { 
  DEFAULT_REMINDER_CONFIG,
  DEMO_CLEANUP_CONFIG,
  PAYMENT_PREDICTION_CONFIG,
  RETRY_CONFIG,
  calculateReminderDate,
} from "./config";
import { processDueReminders } from "./scheduler";
import { sendReminderEmail, generateReminderEmailContent } from "@/lib/services/email";
import ZAI from "z-ai-web-dev-sdk";

// =====================================================
// AUTO REMINDER JOB
// =====================================================

interface OverdueDebtWithRelations {
  id: string;
  clientId: string;
  profileId: string;
  amount: number;
  currency: string;
  dueDate: Date;
  status: string;
  reminderCount: number;
  lastReminderAt: Date | null;
  nextReminderAt: Date | null;
  reference: string | null;
  description: string | null;
  paidAmount: number;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
  };
  profile: {
    id: string;
    email: string;
    name: string | null;
    companyName: string | null;
    subscriptionStatus: string;
    remindersUsed: number;
    remindersLimit: number;
    whatsappApiKey: string | null;
    resendApiKey: string | null;
    settings: {
      autoRemindEnabled: boolean;
      reminderDay1: number;
      reminderDay2: number;
      reminderDay3: number;
      skipWeekends: boolean;
      reminderStartTime: string;
      reminderEndTime: string;
      maxReminders: number;
      emailTemplateReminder1: string | null;
      emailTemplateReminder2: string | null;
      emailTemplateReminder3: string | null;
      whatsappTemplateReminder1: string | null;
      whatsappTemplateReminder2: string | null;
      whatsappTemplateReminder3: string | null;
    } | null;
  };
}

/**
 * Main automatic reminder job
 * Checks for overdue debts and sends reminders based on settings
 */
export async function autoReminderJob(): Promise<BatchJobResult> {
  const startTime = Date.now();
  const results: JobResult[] = [];
  let totalProcessed = 0;
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  console.log("[Jobs] Starting auto reminder job...");

  try {
    // Get all overdue debts that need reminders
    const overdueDebts = await getOverdueDebtsNeedingReminders();
    totalProcessed = overdueDebts.length;

    console.log(`[Jobs] Found ${totalProcessed} debts to check for reminders`);

    for (const debt of overdueDebts) {
      const jobResult = await processDebtReminderJob(debt);
      results.push(jobResult);

      if (jobResult.status === "completed") {
        successful++;
      } else if (jobResult.status === "failed") {
        failed++;
      } else {
        skipped++;
      }
    }

    // Also process any scheduled reminders that are due
    const scheduledResult = await processDueReminders();
    totalProcessed += scheduledResult.processed;
    successful += scheduledResult.sent;
    failed += scheduledResult.failed;
    skipped += scheduledResult.skipped;

    const duration = Date.now() - startTime;

    console.log(`[Jobs] Auto reminder job completed: ${successful} sent, ${failed} failed, ${skipped} skipped in ${duration}ms`);

    // Log summary
    await logJobSummary("auto_reminder", {
      totalProcessed,
      successful,
      failed,
      skipped,
      duration,
    });

    return {
      totalProcessed,
      successful,
      failed,
      skipped,
      results,
      duration,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Jobs] Critical error in auto reminder job:", error);
    
    return {
      totalProcessed,
      successful,
      failed: failed + 1,
      skipped,
      results: [{
        success: false,
        jobId: "auto_reminder_job",
        jobType: "auto_reminder",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }],
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get overdue debts that need reminders
 */
async function getOverdueDebtsNeedingReminders(): Promise<OverdueDebtWithRelations[]> {
  const now = new Date();

  const debts = await db.debt.findMany({
    where: {
      status: { in: ["pending", "partial"] },
      dueDate: { lt: now },
      OR: [
        { nextReminderAt: { lte: now } },
        { nextReminderAt: null },
      ],
    },
    include: {
      client: true,
      profile: {
        include: { settings: true },
      },
    },
    orderBy: { nextReminderAt: "asc" },
    take: DEFAULT_REMINDER_CONFIG.maxPerRun,
  });

  return debts as unknown as OverdueDebtWithRelations[];
}

/**
 * Process a single debt for reminder
 */
async function processDebtReminderJob(debt: OverdueDebtWithRelations): Promise<JobResult> {
  const startTime = Date.now();
  const jobId = `reminder_${debt.id}_${Date.now()}`;

  try {
    const settings: AutoReminderConfig = debt.profile.settings ? {
      enabled: debt.profile.settings.autoRemindEnabled,
      day1: debt.profile.settings.reminderDay1,
      day2: debt.profile.settings.reminderDay2,
      day3: debt.profile.settings.reminderDay3,
      skipWeekends: debt.profile.settings.skipWeekends,
      startTime: debt.profile.settings.reminderStartTime,
      endTime: debt.profile.settings.reminderEndTime,
      maxReminders: debt.profile.settings.maxReminders,
    } : DEFAULT_REMINDER_CONFIG;

    // Check if we should send a reminder
    const checkResult = shouldSendReminderForDebt(debt, settings);
    
    if (!checkResult.shouldSend) {
      // Update next reminder date if needed
      const nextReminder = calculateReminderDate(
        debt.dueDate,
        (debt.reminderCount + 1) as 1 | 2 | 3,
        settings
      );
      
      if (nextReminder && nextReminder.getTime() !== debt.nextReminderAt?.getTime()) {
        await db.debt.update({
          where: { id: debt.id },
          data: { nextReminderAt: nextReminder },
        });
      }

      return {
        success: true,
        jobId,
        jobType: "auto_reminder",
        status: "completed",
        processed: 1,
        succeeded: 0,
        failed: 0,
        skipped: 1,
        details: { reason: checkResult.reason },
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // Check subscription limits
    if (debt.profile.remindersUsed >= debt.profile.remindersLimit) {
      return {
        success: false,
        jobId,
        jobType: "auto_reminder",
        status: "failed",
        error: "Reminder limit reached for subscription",
        processed: 1,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // Determine channel
    const hasEmail = !!debt.client.email && !!debt.profile.resendApiKey;
    const hasWhatsApp = !!debt.client.phone && !!debt.profile.whatsappApiKey;

    if (!hasEmail && !hasWhatsApp) {
      return {
        success: false,
        jobId,
        jobType: "auto_reminder",
        status: "failed",
        error: "No contact method available",
        processed: 1,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const channel = hasEmail ? "email" : "whatsapp";
    const reminderNumber = checkResult.reminderNumber || debt.reminderCount + 1;

    // Send the reminder with retry logic
    let lastError: string | undefined;
    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const message = await generateReminderMessageForDebt(debt, reminderNumber, channel);
        
        if (channel === "email") {
          await sendEmailReminderForDebt(debt, message, reminderNumber);
        } else {
          await sendWhatsAppReminderForDebt(debt, message, reminderNumber);
        }

        // Record successful reminder
        await db.reminder.create({
          data: {
            debtId: debt.id,
            clientId: debt.clientId,
            profileId: debt.profileId,
            type: channel,
            subject: `Rappel de paiement - ${debt.reference || "Créance"}`,
            message,
            status: "sent",
            tone: getReminderTone(reminderNumber),
            sentAt: new Date(),
          },
        });

        // Update debt
        const nextReminderAt = calculateReminderDate(
          debt.dueDate,
          Math.min(debt.reminderCount + 2, 3) as 1 | 2 | 3,
          settings
        );

        await db.debt.update({
          where: { id: debt.id },
          data: {
            reminderCount: { increment: 1 },
            lastReminderAt: new Date(),
            nextReminderAt: debt.reminderCount + 1 >= settings.maxReminders ? null : nextReminderAt,
          },
        });

        // Update profile's reminder count
        await db.profile.update({
          where: { id: debt.profileId },
          data: { remindersUsed: { increment: 1 } },
        });

        return {
          success: true,
          jobId,
          jobType: "auto_reminder",
          status: "completed",
          processed: 1,
          succeeded: 1,
          details: {
            channel,
            reminderNumber,
            clientName: debt.client.name,
            amount: debt.amount - debt.paidAmount,
            currency: debt.currency,
          },
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Jobs] Attempt ${attempt}/${RETRY_CONFIG.maxRetries} failed for debt ${debt.id}:`, error);

        if (attempt < RETRY_CONFIG.maxRetries) {
          await sleep(RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1));
        }
      }
    }

    // All retries failed
    await db.reminder.create({
      data: {
        debtId: debt.id,
        clientId: debt.clientId,
        profileId: debt.profileId,
        type: channel,
        subject: `Rappel de paiement - ${debt.reference || "Créance"}`,
        message: "",
        status: "failed",
        error: lastError,
        tone: getReminderTone(reminderNumber),
      },
    });

    return {
      success: false,
      jobId,
      jobType: "auto_reminder",
      status: "failed",
      error: lastError,
      processed: 1,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      jobId,
      jobType: "auto_reminder",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      processed: 1,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Check if a reminder should be sent for a debt
 */
function shouldSendReminderForDebt(
  debt: OverdueDebtWithRelations,
  settings: AutoReminderConfig
): { shouldSend: boolean; reason?: string; reminderNumber?: number } {
  if (!settings.enabled) {
    return { shouldSend: false, reason: "Auto reminders disabled" };
  }

  if (debt.status === "paid" || debt.status === "cancelled") {
    return { shouldSend: false, reason: "Debt is paid or cancelled" };
  }

  if (debt.reminderCount >= settings.maxReminders) {
    return { shouldSend: false, reason: "Maximum reminders reached" };
  }

  const now = new Date();
  const dueDate = new Date(debt.dueDate);

  if (dueDate > now) {
    return { shouldSend: false, reason: "Debt is not yet overdue" };
  }

  const daysOverdue = Math.floor(
    (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const nextReminderNumber = debt.reminderCount + 1;
  let targetDaysAfterDue: number;

  switch (nextReminderNumber) {
    case 1:
      targetDaysAfterDue = settings.day1;
      break;
    case 2:
      targetDaysAfterDue = settings.day2;
      break;
    case 3:
      targetDaysAfterDue = settings.day3;
      break;
    default:
      return { shouldSend: false, reason: "No more reminders scheduled" };
  }

  if (daysOverdue < targetDaysAfterDue) {
    return { shouldSend: false, reason: `Not yet time for reminder ${nextReminderNumber}` };
  }

  if (debt.nextReminderAt && new Date(debt.nextReminderAt) > now) {
    return { shouldSend: false, reason: "Future reminder already scheduled" };
  }

  // Check if recently sent
  if (debt.lastReminderAt) {
    const hoursSinceLastReminder =
      (now.getTime() - new Date(debt.lastReminderAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastReminder < 23) {
      return { shouldSend: false, reason: "Reminder sent recently" };
    }
  }

  // Check time window
  const [startHours, startMinutes] = settings.startTime.split(":").map(Number);
  const [endHours, endMinutes] = settings.endTime.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutesTotal = startHours * 60 + startMinutes;
  const endMinutesTotal = endHours * 60 + endMinutes;

  if (currentMinutes < startMinutesTotal || currentMinutes > endMinutesTotal) {
    return { shouldSend: false, reason: "Outside reminder time window" };
  }

  // Check weekend
  if (settings.skipWeekends) {
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { shouldSend: false, reason: "Weekend - reminders skipped" };
    }
  }

  return { shouldSend: true, reminderNumber: nextReminderNumber };
}

// =====================================================
// CLEANUP EXPIRED DEMOS JOB
// =====================================================

/**
 * Clean up expired demo accounts
 */
export async function cleanupExpiredDemosJob(): Promise<BatchJobResult> {
  const startTime = Date.now();
  const results: JobResult[] = [];
  let totalProcessed = 0;
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  console.log("[Jobs] Starting demo cleanup job...");

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DEMO_CLEANUP_CONFIG.gracePeriodDays);

    // Find expired demo accounts
    const expiredDemos = await db.profile.findMany({
      where: {
        subscriptionStatus: "demo",
        demoExpiresAt: { lt: cutoffDate },
      },
      take: DEMO_CLEANUP_CONFIG.maxPerRun,
    });

    totalProcessed = expiredDemos.length;

    console.log(`[Jobs] Found ${totalProcessed} expired demo accounts to clean up`);

    for (const demo of expiredDemos) {
      const jobId = `demo_cleanup_${demo.id}`;

      try {
        // Update subscription status
        await db.profile.update({
          where: { id: demo.id },
          data: {
            subscriptionStatus: "expired",
            updatedAt: new Date(),
          },
        });

        // Optionally archive data
        if (DEMO_CLEANUP_CONFIG.archiveBeforeDelete) {
          // Create an archive log entry
          await db.auditLog.create({
            data: {
              userId: demo.id,
              action: "demo_archive",
              entityType: "Profile",
              entityId: demo.id,
              details: JSON.stringify({
                email: demo.email,
                companyName: demo.companyName,
                demoExpiresAt: demo.demoExpiresAt,
                archivedAt: new Date().toISOString(),
              }),
              status: "success",
            },
          });
        }

        results.push({
          success: true,
          jobId,
          jobType: "cleanup_demos",
          status: "completed",
          processed: 1,
          succeeded: 1,
          details: { email: demo.email },
          duration: 0,
          timestamp: new Date().toISOString(),
        });

        successful++;
      } catch (error) {
        results.push({
          success: false,
          jobId,
          jobType: "cleanup_demos",
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          processed: 1,
          duration: 0,
          timestamp: new Date().toISOString(),
        });
        failed++;
      }
    }

    const duration = Date.now() - startTime;

    console.log(`[Jobs] Demo cleanup completed: ${successful} cleaned, ${failed} failed in ${duration}ms`);

    // Log summary
    await logJobSummary("cleanup_demos", {
      totalProcessed,
      successful,
      failed,
      duration,
    });

    return {
      totalProcessed,
      successful,
      failed,
      skipped,
      results,
      duration,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Jobs] Critical error in demo cleanup job:", error);

    return {
      totalProcessed,
      successful,
      failed: failed + 1,
      skipped,
      results: [{
        success: false,
        jobId: "demo_cleanup_job",
        jobType: "cleanup_demos",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }],
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

// =====================================================
// PAYMENT PREDICTION JOB
// =====================================================

/**
 * Update payment predictions using AI
 */
export async function paymentPredictionJob(): Promise<BatchJobResult> {
  const startTime = Date.now();
  const results: JobResult[] = [];
  let totalProcessed = 0;
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  console.log("[Jobs] Starting payment prediction job...");

  try {
    const minDueDate = new Date();
    minDueDate.setDate(minDueDate.getDate() - 30); // Debts up to 30 days overdue

    // Find debts that need prediction updates
    const debts = await db.debt.findMany({
      where: {
        status: { in: ["pending", "partial"] },
        dueDate: { lte: minDueDate },
      },
      include: {
        client: true,
        reminders: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      take: PAYMENT_PREDICTION_CONFIG.maxPerRun,
    });

    totalProcessed = debts.length;

    console.log(`[Jobs] Found ${totalProcessed} debts for payment prediction`);

    // Initialize AI client
    let zai;
    try {
      zai = await ZAI.create();
    } catch {
      console.log("[Jobs] AI not available, using fallback prediction");
    }

    for (const debt of debts) {
      const jobId = `prediction_${debt.id}`;

      try {
        let probability = 50; // Default
        let predictedDays = 14; // Default prediction

        // Use AI to predict payment probability
        if (zai) {
          try {
            const prompt = `Analyze this debt and predict payment probability.
            
Debt Details:
- Amount: ${debt.amount} ${debt.currency}
- Due Date: ${debt.dueDate}
- Days Overdue: ${Math.floor((Date.now() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24))}
- Reminders Sent: ${debt.reminderCount}
- Client: ${debt.client.name}
- Client has email: ${debt.client.email ? "yes" : "no"}
- Client has phone: ${debt.client.phone ? "yes" : "no"}

Return JSON with:
- probability (0-100): likelihood of payment
- predictedDays (1-60): estimated days until payment
- reason: brief explanation

Only return the JSON object.`;

            const completion = await zai.chat.completions.create({
              messages: [
                { role: "system", content: "You are a payment prediction AI. Return only valid JSON." },
                { role: "user", content: prompt },
              ],
              temperature: 0.3,
              max_tokens: 200,
            });

            const response = completion.choices[0]?.message?.content;
            if (response) {
              const parsed = JSON.parse(response);
              probability = Math.min(100, Math.max(0, parsed.probability || 50));
              predictedDays = Math.min(60, Math.max(1, parsed.predictedDays || 14));
            }
          } catch (aiError) {
            console.log(`[Jobs] AI prediction failed for debt ${debt.id}, using fallback`);
          }
        } else {
          // Fallback: simple rule-based prediction
          const daysOverdue = Math.floor(
            (Date.now() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // More reminders = lower probability
          probability = Math.max(10, 80 - (debt.reminderCount * 20) - (daysOverdue * 0.5));
          predictedDays = Math.min(30, daysOverdue + 7);
        }

        // Only store if confidence threshold met
        if (probability >= PAYMENT_PREDICTION_CONFIG.confidenceThreshold) {
          const predictedPayDate = new Date();
          predictedPayDate.setDate(predictedPayDate.getDate() + predictedDays);

          await db.debt.update({
            where: { id: debt.id },
            data: {
              paymentProbability: probability,
              predictedPayDate,
              updatedAt: new Date(),
            },
          });

          successful++;
        } else {
          skipped++;
        }

        results.push({
          success: true,
          jobId,
          jobType: "payment_prediction",
          status: "completed",
          processed: 1,
          succeeded: 1,
          details: { probability, predictedDays },
          duration: 0,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        results.push({
          success: false,
          jobId,
          jobType: "payment_prediction",
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          processed: 1,
          duration: 0,
          timestamp: new Date().toISOString(),
        });
        failed++;
      }
    }

    const duration = Date.now() - startTime;

    console.log(`[Jobs] Payment prediction completed: ${successful} updated, ${failed} failed in ${duration}ms`);

    return {
      totalProcessed,
      successful,
      failed,
      skipped,
      results,
      duration,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Jobs] Critical error in payment prediction job:", error);

    return {
      totalProcessed,
      successful,
      failed: failed + 1,
      skipped,
      results: [{
        success: false,
        jobId: "payment_prediction_job",
        jobType: "payment_prediction",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }],
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

// =====================================================
// WEEKLY REPORT JOB
// =====================================================

/**
 * Send weekly summary reports to users
 */
export async function weeklyReportJob(): Promise<BatchJobResult> {
  const startTime = Date.now();
  const results: JobResult[] = [];
  let totalProcessed = 0;
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  console.log("[Jobs] Starting weekly report job...");

  try {
    // Find all active users
    const activeUsers = await db.profile.findMany({
      where: {
        subscriptionStatus: { in: ["active", "demo"] },
      },
      include: {
        settings: true,
        debts: {
          where: {
            status: { in: ["pending", "partial"] },
          },
          include: { client: true },
        },
        reminders: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });

    totalProcessed = activeUsers.length;

    console.log(`[Jobs] Found ${totalProcessed} users for weekly reports`);

    for (const user of activeUsers) {
      const jobId = `weekly_report_${user.id}`;

      try {
        // Check if user has debts
        if (user.debts.length === 0) {
          skipped++;
          continue;
        }

        // Generate report content
        const report = generateWeeklyReport(user);

        // Send email if user has email notifications enabled
        if (user.settings?.emailNotificationsEnabled && user.email) {
          const emailResult = await sendEmail({
            to: user.email,
            subject: `RelancePro Africa - Votre rapport hebdomadaire`,
            html: report,
          });

          if (emailResult.success) {
            successful++;

            results.push({
              success: true,
              jobId,
              jobType: "weekly_report",
              status: "completed",
              processed: 1,
              succeeded: 1,
              details: { email: user.email },
              duration: 0,
              timestamp: new Date().toISOString(),
            });
          } else {
            failed++;

            results.push({
              success: false,
              jobId,
              jobType: "weekly_report",
              status: "failed",
              error: emailResult.error,
              processed: 1,
              duration: 0,
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          skipped++;

          results.push({
            success: true,
            jobId,
            jobType: "weekly_report",
            status: "completed",
            processed: 1,
            skipped: 1,
            details: { reason: "Email notifications disabled" },
            duration: 0,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        results.push({
          success: false,
          jobId,
          jobType: "weekly_report",
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          processed: 1,
          duration: 0,
          timestamp: new Date().toISOString(),
        });
        failed++;
      }
    }

    const duration = Date.now() - startTime;

    console.log(`[Jobs] Weekly report job completed: ${successful} sent, ${failed} failed, ${skipped} skipped in ${duration}ms`);

    return {
      totalProcessed,
      successful,
      failed,
      skipped,
      results,
      duration,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Jobs] Critical error in weekly report job:", error);

    return {
      totalProcessed,
      successful,
      failed: failed + 1,
      skipped,
      results: [{
        success: false,
        jobId: "weekly_report_job",
        jobType: "weekly_report",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }],
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Generate reminder message
 */
async function generateReminderMessageForDebt(
  debt: OverdueDebtWithRelations,
  reminderNumber: number,
  _type: "email" | "whatsapp"
): Promise<string> {
  const templates = debt.profile.settings ? {
    1: debt.profile.settings.emailTemplateReminder1,
    2: debt.profile.settings.emailTemplateReminder2,
    3: debt.profile.settings.emailTemplateReminder3,
  } : {};

  const template = templates[reminderNumber as 1 | 2 | 3];
  if (template) {
    return replaceTemplateVariables(template, debt);
  }

  return getDefaultReminderMessage(debt, reminderNumber);
}

/**
 * Replace template variables
 */
function replaceTemplateVariables(template: string, debt: OverdueDebtWithRelations): string {
  const daysOverdue = Math.floor(
    (Date.now() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const balance = debt.amount - debt.paidAmount;

  return template
    .replace(/\{\{client_name\}\}/g, debt.client.name)
    .replace(/\{\{company_name\}\}/g, debt.client.company || "")
    .replace(/\{\{amount\}\}/g, formatAmount(balance, debt.currency))
    .replace(/\{\{total_amount\}\}/g, formatAmount(debt.amount, debt.currency))
    .replace(/\{\{paid_amount\}\}/g, formatAmount(debt.paidAmount, debt.currency))
    .replace(/\{\{balance\}\}/g, formatAmount(balance, debt.currency))
    .replace(/\{\{currency\}\}/g, debt.currency)
    .replace(/\{\{reference\}\}/g, debt.reference || "N/A")
    .replace(/\{\{due_date\}\}/g, formatDate(debt.dueDate))
    .replace(/\{\{days_overdue\}\}/g, daysOverdue.toString())
    .replace(/\{\{business_name\}\}/g, debt.profile.companyName || "Notre entreprise")
    .replace(/\{\{reminder_number\}\}/g, (debt.reminderCount + 1).toString());
}

/**
 * Get default reminder message
 */
function getDefaultReminderMessage(
  debt: OverdueDebtWithRelations,
  reminderNumber: number
): string {
  const daysOverdue = Math.floor(
    (Date.now() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const balance = debt.amount - debt.paidAmount;
  const businessName = debt.profile.companyName || "Notre entreprise";

  switch (reminderNumber) {
    case 1:
      return `Bonjour ${debt.client.name},

Nous espérons que vous allez bien.

Nous vous rappelons que la facture ${debt.reference || ""} d'un montant de ${formatAmount(balance, debt.currency)}, échéante le ${formatDate(debt.dueDate)}, n'a pas encore été réglée.

Le paiement est en retard de ${daysOverdue} jours.

Nous vous prions de bien vouloir régulariser cette situation dans les meilleurs délais.

Cordialement,
${businessName}`;

    case 2:
      return `Bonjour ${debt.client.name},

Malgré notre précédent rappel, nous n'avons toujours pas reçu le paiement de la facture ${debt.reference || ""} d'un montant de ${formatAmount(balance, debt.currency)}.

Le retard est maintenant de ${daysOverdue} jours.

Nous vous prions de régler ce montant dans les 48 heures pour éviter toute action supplémentaire.

Cordialement,
${businessName}`;

    case 3:
      return `URGENT - Dernier rappel

Bonjour ${debt.client.name},

Après deux rappels restés sans réponse, nous vous informons que la facture ${debt.reference || ""} de ${formatAmount(balance, debt.currency)} est en retard de ${daysOverdue} jours.

Sans régularisation sous 7 jours, nous serons contraints de transmettre ce dossier à notre service de recouvrement.

Veuillez régler cette situation immédiatement.

${businessName}`;

    default:
      return "";
  }
}

/**
 * Send email reminder
 */
async function sendEmailReminderForDebt(
  debt: OverdueDebtWithRelations,
  message: string,
  _reminderNumber: number
): Promise<void> {
  if (!debt.profile.resendApiKey || !debt.client.email) {
    throw new Error("Email configuration missing");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${debt.profile.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${debt.profile.companyName || "RelancePro"} <noreply@relancepro.africa>`,
      to: debt.client.email,
      subject: `Rappel de paiement - ${debt.reference || "Créance"}`,
      text: message,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email send failed: ${response.status} - ${errorText}`);
  }
}

/**
 * Send WhatsApp reminder
 */
async function sendWhatsAppReminderForDebt(
  debt: OverdueDebtWithRelations,
  message: string,
  _reminderNumber: number
): Promise<void> {
  if (!debt.profile.whatsappApiKey || !debt.client.phone) {
    throw new Error("WhatsApp configuration missing");
  }

  let phone = debt.client.phone.replace(/\D/g, "");
  if (!phone.startsWith("225") && !phone.startsWith("221") && !phone.startsWith("233")) {
    phone = "225" + phone;
  }

  const response = await fetch("https://gate.whapi.cloud/messages/text", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${debt.profile.whatsappApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: phone + "@c.us",
      body: message,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp send failed: ${response.status} - ${errorText}`);
  }
}

/**
 * Get reminder tone based on number
 */
function getReminderTone(reminderNumber: number): string {
  switch (reminderNumber) {
    case 1:
      return "friendly";
    case 2:
      return "formal";
    case 3:
      return "urgent";
    default:
      return "formal";
  }
}

/**
 * Generate weekly report HTML
 */
function generateWeeklyReport(user: {
  id: string;
  email: string;
  name: string | null;
  companyName: string | null;
  debts: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    dueDate: Date;
    reference: string | null;
    paidAmount: number;
    client: { name: string };
  }>;
  reminders: Array<{ id: string }>;
}): string {
  const totalDebts = user.debts.length;
  const totalAmount = user.debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = user.debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const remindersSent = user.reminders.length;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Rapport Hebdomadaire - RelancePro Africa</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f97316 0%, #f59e0b 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">RelancePro Africa</h1>
    <p style="color: white; margin: 10px 0 0 0;">Rapport Hebdomadaire</p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
    <p>Bonjour ${user.name || user.companyName || "Cher client"},</p>
    
    <p>Voici votre résumé hebdomadaire de l'activité de vos créances :</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #374151;">Résumé</h3>
      <ul style="list-style: none; padding: 0;">
        <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>Créances actives :</strong> ${totalDebts}
        </li>
        <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>Montant total :</strong> ${formatAmount(totalAmount, "GNF")}
        </li>
        <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>Montant encaissé :</strong> ${formatAmount(totalPaid, "GNF")}
        </li>
        <li style="padding: 8px 0;">
          <strong>Relances envoyées cette semaine :</strong> ${remindersSent}
        </li>
      </ul>
    </div>
    
    <p>Connectez-vous à votre tableau de bord pour plus de détails.</p>
    
    <p>Cordialement,<br>L'équipe RelancePro Africa</p>
  </div>
</body>
</html>
  `;
}

/**
 * Log job summary to database
 */
async function logJobSummary(
  jobType: string,
  summary: {
    totalProcessed: number;
    successful: number;
    failed: number;
    skipped?: number;
    duration: number;
  }
): Promise<void> {
  try {
    const admin = await db.profile.findFirst({
      where: { role: "admin" },
    });

    if (admin) {
      await db.reminderLog.create({
        data: {
          profileId: admin.id,
          action: "processed",
          entityType: "CronJob",
          entityId: jobType,
          details: JSON.stringify(summary),
          success: summary.failed === 0,
        },
      });
    }
  } catch (error) {
    console.error("[Jobs] Failed to log job summary:", error);
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format date
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Format amount
 */
function formatAmount(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const symbols: Record<string, string> = {
    GNF: "FG",
    XOF: "FCFA",
    XAF: "FCFA",
    EUR: "€",
    USD: "$",
    NGN: "₦",
    GHS: "GH₵",
  };

  return formatter.format(amount) + " " + (symbols[currency] || currency);
}

/**
 * Simple sendEmail function for weekly reports
 */
async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "noreply@relancepro.africa",
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      return { success: false, error: `Email failed: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
