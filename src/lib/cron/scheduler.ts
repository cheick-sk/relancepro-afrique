// =====================================================
// RELANCEPRO AFRICA - Cron Job Scheduler
// Core scheduling logic for managing scheduled jobs
// =====================================================

import { db } from "@/lib/db";
import type { 
  ScheduleConfig, 
  CronJob, 
  JobResult, 
  ScheduledReminderWithDetails,
  CronJobStatus,
  JobPriority,
} from "./types";
import { 
  DEFAULT_REMINDER_CONFIG, 
  getPriorityValue,
  RETRY_CONFIG,
} from "./config";

/**
 * Schedule a new reminder job
 * @param profileId - The profile ID
 * @param debtId - The debt ID
 * @param schedule - Schedule configuration
 * @returns The created job
 */
export async function scheduleReminder(
  profileId: string,
  debtId: string,
  schedule: Omit<ScheduleConfig, "profileId" | "debtId">
): Promise<{ success: boolean; job?: ScheduledReminderWithDetails; error?: string }> {
  try {
    // Verify debt exists and belongs to profile
    const debt = await db.debt.findFirst({
      where: { id: debtId, profileId },
      include: { client: true },
    });

    if (!debt) {
      return { success: false, error: "Debt not found or access denied" };
    }

    // Check if a pending reminder already exists for this debt and type
    const existingReminder = await db.reminderQueue.findFirst({
      where: {
        debtId,
        reminderType: schedule.reminderType,
        status: "pending",
      },
    });

    if (existingReminder) {
      // Update existing reminder instead of creating new one
      const updated = await db.reminderQueue.update({
        where: { id: existingReminder.id },
        data: {
          scheduledAt: schedule.scheduledAt,
          channel: schedule.channel,
          priority: getPriorityValue(schedule.priority || "normal"),
          message: schedule.customMessage,
          subject: schedule.customSubject,
          maxAttempts: schedule.maxRetries || RETRY_CONFIG.maxRetries,
          updatedAt: new Date(),
        },
        include: {
          debt: {
            select: {
              id: true,
              amount: true,
              currency: true,
              dueDate: true,
              status: true,
              reference: true,
              reminderCount: true,
              paidAmount: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              company: true,
            },
          },
          profile: {
            select: {
              id: true,
              email: true,
              name: true,
              companyName: true,
              subscriptionStatus: true,
              remindersUsed: true,
              remindersLimit: true,
            },
          },
        },
      });

      return { 
        success: true, 
        job: updated as unknown as ScheduledReminderWithDetails 
      };
    }

    // Create new scheduled reminder
    const job = await db.reminderQueue.create({
      data: {
        debtId,
        clientId: debt.clientId,
        profileId,
        scheduledAt: schedule.scheduledAt,
        reminderType: schedule.reminderType,
        channel: schedule.channel,
        status: "pending",
        priority: getPriorityValue(schedule.priority || "normal"),
        message: schedule.customMessage,
        subject: schedule.customSubject,
        maxAttempts: schedule.maxRetries || RETRY_CONFIG.maxRetries,
      },
      include: {
        debt: {
          select: {
            id: true,
            amount: true,
            currency: true,
            dueDate: true,
            status: true,
            reference: true,
            reminderCount: true,
            paidAmount: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          },
        },
        profile: {
          select: {
            id: true,
            email: true,
            name: true,
            companyName: true,
            subscriptionStatus: true,
            remindersUsed: true,
            remindersLimit: true,
          },
        },
      },
    });

    // Log the scheduling action
    await db.reminderLog.create({
      data: {
        profileId,
        action: "scheduled",
        entityType: "ReminderQueue",
        entityId: job.id,
        details: JSON.stringify({
          debtId,
          clientId: debt.clientId,
          scheduledAt: schedule.scheduledAt,
          reminderType: schedule.reminderType,
          channel: schedule.channel,
        }),
        success: true,
      },
    });

    return { 
      success: true, 
      job: job as unknown as ScheduledReminderWithDetails 
    };
  } catch (error) {
    console.error("[Scheduler] Error scheduling reminder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Cancel a scheduled reminder job
 * @param jobId - The job ID to cancel
 * @param profileId - Optional profile ID for authorization
 * @returns Success status
 */
export async function cancelReminder(
  jobId: string,
  profileId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the job
    const job = await db.reminderQueue.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return { success: false, error: "Job not found" };
    }

    // Check authorization if profileId provided
    if (profileId && job.profileId !== profileId) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if job can be cancelled
    if (job.status === "sent") {
      return { success: false, error: "Cannot cancel a sent reminder" };
    }

    // Update job status to cancelled
    await db.reminderQueue.update({
      where: { id: jobId },
      data: {
        status: "cancelled",
        updatedAt: new Date(),
      },
    });

    // Log the cancellation
    await db.reminderLog.create({
      data: {
        profileId: job.profileId,
        action: "cancelled",
        entityType: "ReminderQueue",
        entityId: jobId,
        details: JSON.stringify({
          debtId: job.debtId,
          reminderType: job.reminderType,
          cancelledAt: new Date().toISOString(),
        }),
        success: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[Scheduler] Error cancelling reminder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all scheduled reminders for a profile
 * @param profileId - The profile ID
 * @param options - Filter options
 * @returns List of scheduled reminders
 */
export async function getScheduledReminders(
  profileId: string,
  options?: {
    status?: CronJobStatus | "pending" | "processing" | "sent" | "failed" | "cancelled";
    limit?: number;
    offset?: number;
    includePast?: boolean;
  }
): Promise<ScheduledReminderWithDetails[]> {
  try {
    const now = new Date();
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const where: Record<string, unknown> = {
      profileId,
    };

    if (options?.status) {
      where.status = options.status;
    }

    if (!options?.includePast) {
      where.scheduledAt = { gte: now };
    }

    const reminders = await db.reminderQueue.findMany({
      where,
      include: {
        debt: {
          select: {
            id: true,
            amount: true,
            currency: true,
            dueDate: true,
            status: true,
            reference: true,
            reminderCount: true,
            paidAmount: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          },
        },
        profile: {
          select: {
            id: true,
            email: true,
            name: true,
            companyName: true,
            subscriptionStatus: true,
            remindersUsed: true,
            remindersLimit: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" },
        { scheduledAt: "asc" },
      ],
      take: limit,
      skip: offset,
    });

    return reminders as unknown as ScheduledReminderWithDetails[];
  } catch (error) {
    console.error("[Scheduler] Error getting scheduled reminders:", error);
    return [];
  }
}

/**
 * Process all due reminders
 * Called by the cron job to send reminders that are due
 * @param maxToProcess - Maximum number of reminders to process
 * @returns Processing results
 */
export async function processDueReminders(
  maxToProcess: number = DEFAULT_REMINDER_CONFIG.maxPerRun
): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  results: Array<{
    jobId: string;
    debtId: string;
    status: "sent" | "failed" | "skipped";
    error?: string;
  }>;
}> {
  const results: Array<{
    jobId: string;
    debtId: string;
    status: "sent" | "failed" | "skipped";
    error?: string;
  }> = [];
  
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  try {
    const now = new Date();

    // Get all pending reminders that are due
    const dueReminders = await db.reminderQueue.findMany({
      where: {
        status: "pending",
        scheduledAt: { lte: now },
      },
      include: {
        debt: {
          include: {
            client: true,
            profile: {
              include: { settings: true },
            },
          },
        },
      },
      orderBy: [
        { priority: "desc" },
        { scheduledAt: "asc" },
      ],
      take: maxToProcess,
    });

    console.log(`[Scheduler] Found ${dueReminders.length} due reminders to process`);

    for (const reminder of dueReminders) {
      try {
        // Mark as processing
        await db.reminderQueue.update({
          where: { id: reminder.id },
          data: {
            status: "processing",
            attempts: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        // Check if debt is still valid for reminder
        const debt = reminder.debt;
        if (debt.status === "paid" || debt.status === "cancelled") {
          await db.reminderQueue.update({
            where: { id: reminder.id },
            data: {
              status: "cancelled",
              error: "Debt already paid or cancelled",
              updatedAt: new Date(),
            },
          });
          
          results.push({
            jobId: reminder.id,
            debtId: reminder.debtId,
            status: "skipped",
            error: "Debt already paid or cancelled",
          });
          skipped++;
          continue;
        }

        // Check subscription limits
        if (debt.profile.remindersUsed >= debt.profile.remindersLimit) {
          await db.reminderQueue.update({
            where: { id: reminder.id },
            data: {
              status: "failed",
              error: "Reminder limit reached",
              updatedAt: new Date(),
            },
          });
          
          results.push({
            jobId: reminder.id,
            debtId: reminder.debtId,
            status: "skipped",
            error: "Reminder limit reached",
          });
          skipped++;
          continue;
        }

        // The actual sending will be handled by the jobs.ts module
        // Here we just prepare and update the status
        // For now, mark as successful - the actual sending logic is in jobs.ts
        
        results.push({
          jobId: reminder.id,
          debtId: reminder.debtId,
          status: "sent",
        });
        sent++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        // Update job as failed
        const attempts = await db.reminderQueue.findUnique({
          where: { id: reminder.id },
          select: { attempts: true, maxAttempts: true },
        });

        const newStatus = attempts && attempts.attempts >= attempts.maxAttempts 
          ? "failed" 
          : "pending";

        await db.reminderQueue.update({
          where: { id: reminder.id },
          data: {
            status: newStatus,
            error: errorMessage,
            updatedAt: new Date(),
          },
        });

        results.push({
          jobId: reminder.id,
          debtId: reminder.debtId,
          status: "failed",
          error: errorMessage,
        });
        failed++;
      }
    }

    return {
      processed: dueReminders.length,
      sent,
      failed,
      skipped,
      results,
    };
  } catch (error) {
    console.error("[Scheduler] Error processing due reminders:", error);
    return {
      processed: 0,
      sent,
      failed,
      skipped,
      results,
    };
  }
}

/**
 * Get scheduled reminders for a specific debt
 * @param debtId - The debt ID
 * @returns List of scheduled reminders for the debt
 */
export async function getScheduledRemindersForDebt(
  debtId: string
): Promise<ScheduledReminderWithDetails[]> {
  try {
    const reminders = await db.reminderQueue.findMany({
      where: {
        debtId,
        status: "pending",
      },
      include: {
        debt: {
          select: {
            id: true,
            amount: true,
            currency: true,
            dueDate: true,
            status: true,
            reference: true,
            reminderCount: true,
            paidAmount: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          },
        },
        profile: {
          select: {
            id: true,
            email: true,
            name: true,
            companyName: true,
            subscriptionStatus: true,
            remindersUsed: true,
            remindersLimit: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return reminders as unknown as ScheduledReminderWithDetails[];
  } catch (error) {
    console.error("[Scheduler] Error getting scheduled reminders for debt:", error);
    return [];
  }
}

/**
 * Reschedule a reminder to a new time
 * @param jobId - The job ID
 * @param newScheduledAt - The new scheduled time
 * @param profileId - Optional profile ID for authorization
 * @returns Success status
 */
export async function rescheduleReminder(
  jobId: string,
  newScheduledAt: Date,
  profileId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const job = await db.reminderQueue.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return { success: false, error: "Job not found" };
    }

    if (profileId && job.profileId !== profileId) {
      return { success: false, error: "Unauthorized" };
    }

    if (job.status !== "pending") {
      return { success: false, error: "Can only reschedule pending jobs" };
    }

    await db.reminderQueue.update({
      where: { id: jobId },
      data: {
        scheduledAt: newScheduledAt,
        updatedAt: new Date(),
      },
    });

    // Log the rescheduling
    await db.reminderLog.create({
      data: {
        profileId: job.profileId,
        action: "scheduled",
        entityType: "ReminderQueue",
        entityId: jobId,
        details: JSON.stringify({
          oldScheduledAt: job.scheduledAt,
          newScheduledAt,
        }),
        success: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[Scheduler] Error rescheduling reminder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get reminder statistics for a profile
 * @param profileId - The profile ID
 * @returns Statistics object
 */
export async function getReminderStats(profileId: string): Promise<{
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  cancelled: number;
  nextScheduled: Date | null;
}> {
  try {
    const [pending, processing, sent, failed, cancelled, nextScheduled] = await Promise.all([
      db.reminderQueue.count({ where: { profileId, status: "pending" } }),
      db.reminderQueue.count({ where: { profileId, status: "processing" } }),
      db.reminderQueue.count({ where: { profileId, status: "sent" } }),
      db.reminderQueue.count({ where: { profileId, status: "failed" } }),
      db.reminderQueue.count({ where: { profileId, status: "cancelled" } }),
      db.reminderQueue.findFirst({
        where: { profileId, status: "pending" },
        orderBy: { scheduledAt: "asc" },
        select: { scheduledAt: true },
      }),
    ]);

    return {
      pending,
      processing,
      sent,
      failed,
      cancelled,
      nextScheduled: nextScheduled?.scheduledAt || null,
    };
  } catch (error) {
    console.error("[Scheduler] Error getting reminder stats:", error);
    return {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      nextScheduled: null,
    };
  }
}

/**
 * Clean up old completed jobs
 * @param daysToKeep - Number of days to keep completed jobs
 * @returns Number of jobs cleaned up
 */
export async function cleanupOldJobs(
  daysToKeep: number = 30
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db.reminderQueue.deleteMany({
      where: {
        status: { in: ["sent", "cancelled"] },
        updatedAt: { lt: cutoffDate },
      },
    });

    return result.count;
  } catch (error) {
    console.error("[Scheduler] Error cleaning up old jobs:", error);
    return 0;
  }
}
