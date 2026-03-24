// =====================================================
// RELANCEPRO AFRICA - Reminder Scheduler
// Handles scheduling and processing of reminders
// =====================================================

import { db } from "@/lib/db";

// =====================================================
// PROCESS DUE REMINDERS
// =====================================================

interface ProcessDueRemindersResult {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Process all reminders that are due
 * This is called by the auto reminder job
 */
export async function processDueReminders(): Promise<ProcessDueRemindersResult> {
  const result: ProcessDueRemindersResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    const now = new Date();

    // Find all scheduled reminders that are due
    const dueReminders = await db.scheduledReminder.findMany({
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
      take: 50, // Process in batches
    });

    result.processed = dueReminders.length;

    for (const reminder of dueReminders) {
      try {
        // Mark as processing
        await db.scheduledReminder.update({
          where: { id: reminder.id },
          data: { status: "pending" },
        });

        // Check if debt is still pending
        if (reminder.debt.status === "paid" || reminder.debt.status === "cancelled") {
          await db.scheduledReminder.update({
            where: { id: reminder.id },
            data: { status: "cancelled" },
          });
          result.skipped++;
          continue;
        }

        // Send the reminder based on type
        if (reminder.type === "email" && reminder.debt.client.email) {
          // Email sending would be handled here
          // For now, we'll create a reminder record
          await db.reminder.create({
            data: {
              debtId: reminder.debtId,
              clientId: reminder.clientId,
              profileId: reminder.profileId,
              type: "email",
              subject: reminder.subject || "Rappel de paiement",
              message: reminder.message || "",
              status: "sent",
              sentAt: new Date(),
            },
          });
        } else if (reminder.type === "whatsapp" && reminder.debt.client.phone) {
          // WhatsApp sending would be handled here
          await db.reminder.create({
            data: {
              debtId: reminder.debtId,
              clientId: reminder.clientId,
              profileId: reminder.profileId,
              type: "whatsapp",
              message: reminder.message || "",
              status: "sent",
              sentAt: new Date(),
            },
          });
        } else {
          result.skipped++;
          continue;
        }

        // Mark reminder as sent
        await db.scheduledReminder.update({
          where: { id: reminder.id },
          data: {
            status: "sent",
            sentAt: new Date(),
          },
        });

        // Update debt reminder count
        await db.debt.update({
          where: { id: reminder.debtId },
          data: {
            reminderCount: { increment: 1 },
            lastReminderAt: new Date(),
          },
        });

        result.sent++;
      } catch (error) {
        console.error(`[Scheduler] Failed to process reminder ${reminder.id}:`, error);
        
        // Mark as failed
        await db.scheduledReminder.update({
          where: { id: reminder.id },
          data: {
            status: "failed",
            lastError: error instanceof Error ? error.message : "Unknown error",
            retryCount: { increment: 1 },
          },
        });
        
        result.failed++;
      }
    }

    return result;
  } catch (error) {
    console.error("[Scheduler] Error processing due reminders:", error);
    return result;
  }
}

// =====================================================
// AUTOMATIC REMINDERS
// =====================================================

/**
 * Process automatic reminders for overdue debts
 */
export async function processAutomaticReminders(): Promise<{ processed: number }> {
  try {
    const result = await processDueReminders();
    return { processed: result.processed };
  } catch (error) {
    console.error("[Scheduler] Error in processAutomaticReminders:", error);
    return { processed: 0 };
  }
}

/**
 * Schedule a reminder for a debt
 */
export async function scheduleReminder(params: {
  debtId: string;
  clientId: string;
  profileId: string;
  scheduledAt: Date;
  type: "email" | "whatsapp";
  message?: string;
  subject?: string;
  priority?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const reminder = await db.scheduledReminder.create({
      data: {
        debtId: params.debtId,
        clientId: params.clientId,
        profileId: params.profileId,
        scheduledAt: params.scheduledAt,
        type: params.type,
        message: params.message,
        subject: params.subject,
        priority: (params.priority as "urgent" | "normal" | "low") || "normal",
        status: "pending",
        retryCount: 0,
        maxAttempts: 3,
      },
    });

    return { success: true, id: reminder.id };
  } catch (error) {
    console.error("[Scheduler] Failed to schedule reminder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Cancel a scheduled reminder
 */
export async function cancelScheduledReminder(reminderId: string): Promise<boolean> {
  try {
    await db.scheduledReminder.update({
      where: { id: reminderId },
      data: { status: "cancelled" },
    });
    return true;
  } catch (error) {
    console.error("[Scheduler] Failed to cancel reminder:", error);
    return false;
  }
}

/**
 * Get upcoming reminders for a profile
 */
export async function getUpcomingReminders(profileId: string, limit: number = 10) {
  try {
    return await db.scheduledReminder.findMany({
      where: {
        profileId,
        status: "pending",
        scheduledAt: { gte: new Date() },
      },
      include: {
        debt: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: limit,
    });
  } catch (error) {
    console.error("[Scheduler] Failed to get upcoming reminders:", error);
    return [];
  }
}

/**
 * Reschedule a failed reminder
 */
export async function rescheduleFailedReminder(
  reminderId: string,
  newDate: Date
): Promise<boolean> {
  try {
    const reminder = await db.scheduledReminder.findUnique({
      where: { id: reminderId },
    });

    if (!reminder || reminder.status !== "failed") {
      return false;
    }

    if (reminder.retryCount >= reminder.maxAttempts) {
      return false;
    }

    await db.scheduledReminder.update({
      where: { id: reminderId },
      data: {
        status: "pending",
        scheduledAt: newDate,
      },
    });

    return true;
  } catch (error) {
    console.error("[Scheduler] Failed to reschedule reminder:", error);
    return false;
  }
}
