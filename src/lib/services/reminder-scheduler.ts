// =====================================================
// RELANCEPRO AFRICA - Reminder Scheduler Service
// Planification intelligente des relances automatiques
// =====================================================

import { db } from "@/lib/db";

// Types
interface ReminderSettings {
  autoRemindEnabled: boolean;
  reminderDay1: number;
  reminderDay2: number;
  reminderDay3: number;
  skipWeekends: boolean;
  reminderStartTime: string;
  reminderEndTime: string;
  maxReminders: number;
}

interface DebtWithClient {
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
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
  };
}

// Default settings
const DEFAULT_SETTINGS: ReminderSettings = {
  autoRemindEnabled: true,
  reminderDay1: 3,
  reminderDay2: 7,
  reminderDay3: 14,
  skipWeekends: false,
  reminderStartTime: "09:00",
  reminderEndTime: "18:00",
  maxReminders: 3,
};

/**
 * Calculate the next reminder date based on debt and settings
 * @param debt - The debt object
 * @param settings - User's reminder settings
 * @returns The next reminder date or null if no more reminders
 */
export function calculateNextReminderDate(
  debt: DebtWithClient,
  settings: ReminderSettings = DEFAULT_SETTINGS
): Date | null {
  const now = new Date();
  const dueDate = new Date(debt.dueDate);
  
  // If max reminders reached, no more scheduling
  if (debt.reminderCount >= settings.maxReminders) {
    return null;
  }
  
  // Determine which reminder number this will be
  const nextReminderNumber = debt.reminderCount + 1;
  
  // Get the target day based on reminder number
  let targetDaysAfterDue: number;
  switch (nextReminderNumber) {
    case 1:
      targetDaysAfterDue = settings.reminderDay1;
      break;
    case 2:
      targetDaysAfterDue = settings.reminderDay2;
      break;
    case 3:
      targetDaysAfterDue = settings.reminderDay3;
      break;
    default:
      return null;
  }
  
  // Calculate target date
  const targetDate = new Date(dueDate);
  targetDate.setDate(targetDate.getDate() + targetDaysAfterDue);
  
  // If skip weekends is enabled and target is a weekend, move to Monday
  if (settings.skipWeekends) {
    targetDate.setTime(adjustForWeekends(targetDate).getTime());
  }
  
  // Set the reminder time
  const [hours, minutes] = settings.reminderStartTime.split(':').map(Number);
  targetDate.setHours(hours, minutes, 0, 0);
  
  // If the calculated date is in the past, schedule for today or tomorrow
  if (targetDate <= now) {
    // If we can still send today within the time window
    const todayEnd = new Date(now);
    const [endHours, endMinutes] = settings.reminderEndTime.split(':').map(Number);
    todayEnd.setHours(endHours, endMinutes, 0, 0);
    
    if (now < todayEnd) {
      // Schedule for 1 hour from now
      targetDate.setTime(now.getTime() + 60 * 60 * 1000);
    } else {
      // Schedule for tomorrow at start time
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(hours, minutes, 0, 0);
      
      if (settings.skipWeekends) {
        targetDate.setTime(adjustForWeekends(targetDate).getTime());
      }
    }
  }
  
  return targetDate;
}

/**
 * Adjust a date to skip weekends (move Saturday to Monday, Sunday to Monday)
 */
function adjustForWeekends(date: Date): Date {
  const adjusted = new Date(date);
  const dayOfWeek = adjusted.getDay();
  
  if (dayOfWeek === 0) {
    // Sunday -> Monday (+1 day)
    adjusted.setDate(adjusted.getDate() + 1);
  } else if (dayOfWeek === 6) {
    // Saturday -> Monday (+2 days)
    adjusted.setDate(adjusted.getDate() + 2);
  }
  
  return adjusted;
}

/**
 * Check if a reminder should be sent for a debt
 * @param debt - The debt object
 * @param settings - User's reminder settings
 * @returns Whether a reminder should be sent now
 */
export function shouldSendReminder(
  debt: DebtWithClient,
  settings: ReminderSettings = DEFAULT_SETTINGS
): { shouldSend: boolean; reason?: string; reminderNumber?: number } {
  // Check if auto reminders are enabled
  if (!settings.autoRemindEnabled) {
    return { shouldSend: false, reason: "Auto reminders disabled" };
  }
  
  // Check if debt is in a valid status
  if (debt.status === "paid" || debt.status === "cancelled") {
    return { shouldSend: false, reason: "Debt is paid or cancelled" };
  }
  
  // Check if max reminders reached
  if (debt.reminderCount >= settings.maxReminders) {
    return { shouldSend: false, reason: "Maximum reminders reached" };
  }
  
  const now = new Date();
  const dueDate = new Date(debt.dueDate);
  
  // Check if debt is overdue
  if (dueDate > now) {
    return { shouldSend: false, reason: "Debt is not yet overdue" };
  }
  
  // Calculate days overdue
  const daysOverdue = Math.floor(
    (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Determine if we should send based on reminder days
  const nextReminderNumber = debt.reminderCount + 1;
  let targetDaysAfterDue: number;
  
  switch (nextReminderNumber) {
    case 1:
      targetDaysAfterDue = settings.reminderDay1;
      break;
    case 2:
      targetDaysAfterDue = settings.reminderDay2;
      break;
    case 3:
      targetDaysAfterDue = settings.reminderDay3;
      break;
    default:
      return { shouldSend: false, reason: "No more reminders scheduled" };
  }
  
  // Check if we've reached the target day
  if (daysOverdue < targetDaysAfterDue) {
    return { shouldSend: false, reason: `Not yet time for reminder ${nextReminderNumber}` };
  }
  
  // Check if we already have a nextReminderAt that's in the future
  if (debt.nextReminderAt && new Date(debt.nextReminderAt) > now) {
    return { shouldSend: false, reason: "Future reminder already scheduled" };
  }
  
  // Check if we recently sent a reminder (within last 23 hours to avoid duplicates)
  if (debt.lastReminderAt) {
    const hoursSinceLastReminder = 
      (now.getTime() - new Date(debt.lastReminderAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastReminder < 23) {
      return { shouldSend: false, reason: "Reminder sent recently" };
    }
  }
  
  // Check if current time is within the allowed window
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  
  const [startHours, startMinutes] = settings.reminderStartTime.split(':').map(Number);
  const [endHours, endMinutes] = settings.reminderEndTime.split(':').map(Number);
  
  const startTimeMinutes = startHours * 60 + startMinutes;
  const endTimeMinutes = endHours * 60 + endMinutes;
  
  if (currentTimeMinutes < startTimeMinutes || currentTimeMinutes > endTimeMinutes) {
    return { shouldSend: false, reason: "Outside reminder time window" };
  }
  
  // Check if weekend and skip weekends is enabled
  if (settings.skipWeekends) {
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { shouldSend: false, reason: "Weekend - reminders skipped" };
    }
  }
  
  return { shouldSend: true, reminderNumber: nextReminderNumber };
}

/**
 * Schedule reminders for all debts of a profile
 * @param profileId - The profile ID
 * @returns Summary of scheduled reminders
 */
export async function scheduleReminders(profileId: string): Promise<{
  scheduled: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    scheduled: 0,
    skipped: 0,
    errors: [] as string[],
  };
  
  try {
    // Get profile settings
    const profile = await db.profile.findUnique({
      where: { id: profileId },
      include: {
        settings: true,
      },
    });
    
    if (!profile) {
      result.errors.push(`Profile ${profileId} not found`);
      return result;
    }
    
    const settings: ReminderSettings = profile.settings ? {
      autoRemindEnabled: profile.settings.autoRemindEnabled,
      reminderDay1: profile.settings.reminderDay1,
      reminderDay2: profile.settings.reminderDay2,
      reminderDay3: profile.settings.reminderDay3,
      skipWeekends: profile.settings.skipWeekends,
      reminderStartTime: profile.settings.reminderStartTime,
      reminderEndTime: profile.settings.reminderEndTime,
      maxReminders: profile.settings.maxReminders,
    } : DEFAULT_SETTINGS;
    
    // Get all pending/partial debts for this profile
    const debts = await db.debt.findMany({
      where: {
        profileId,
        status: { in: ["pending", "partial"] },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          },
        },
      },
    });
    
    for (const debt of debts) {
      try {
        const debtWithClient: DebtWithClient = {
          ...debt,
          client: debt.client as DebtWithClient['client'],
        };
        
        // Calculate next reminder date
        const nextReminderAt = calculateNextReminderDate(debtWithClient, settings);
        
        if (nextReminderAt) {
          // Update debt with next reminder date
          await db.debt.update({
            where: { id: debt.id },
            data: { nextReminderAt },
          });
          result.scheduled++;
        } else {
          result.skipped++;
        }
      } catch (error) {
        result.errors.push(`Failed to schedule debt ${debt.id}: ${error}`);
      }
    }
    
    // Log the scheduling action
    await db.reminderLog.create({
      data: {
        profileId,
        action: "scheduled",
        entityType: "Profile",
        entityId: profileId,
        details: JSON.stringify({
          scheduled: result.scheduled,
          skipped: result.skipped,
          settings,
        }),
        success: true,
      },
    });
    
    return result;
  } catch (error) {
    result.errors.push(`Error scheduling reminders: ${error}`);
    return result;
  }
}

/**
 * Get upcoming reminders for a profile (for dashboard widget)
 * @param profileId - The profile ID
 * @param limit - Maximum number of reminders to return
 * @returns List of upcoming reminders with debt info
 */
export async function getUpcomingReminders(
  profileId: string,
  limit: number = 5
): Promise<{
  id: string;
  clientName: string;
  amount: number;
  currency: string;
  reference: string | null;
  dueDate: Date;
  nextReminderAt: Date | null;
  reminderCount: number;
  daysOverdue: number;
}[]> {
  const now = new Date();
  
  const debts = await db.debt.findMany({
    where: {
      profileId,
      status: { in: ["pending", "partial"] },
      nextReminderAt: { gte: now },
    },
    include: {
      client: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      nextReminderAt: "asc",
    },
    take: limit,
  });
  
  return debts.map((debt) => {
    const dueDate = new Date(debt.dueDate);
    const daysOverdue = Math.floor(
      (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return {
      id: debt.id,
      clientName: debt.client.name,
      amount: debt.amount - debt.paidAmount,
      currency: debt.currency,
      reference: debt.reference,
      dueDate: debt.dueDate,
      nextReminderAt: debt.nextReminderAt,
      reminderCount: debt.reminderCount,
      daysOverdue: Math.max(0, daysOverdue),
    };
  });
}

/**
 * Get overdue debts that need reminders now
 * @param limit - Maximum number of debts to return
 * @returns List of debts needing immediate attention
 */
export async function getDebtsNeedingReminders(limit: number = 50): Promise<{
  debtId: string;
  clientId: string;
  profileId: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  amount: number;
  currency: string;
  reference: string | null;
  daysOverdue: number;
  reminderCount: number;
}[]> {
  const now = new Date();
  
  // Get debts with nextReminderAt <= now or no nextReminderAt
  const debts = await db.debt.findMany({
    where: {
      status: { in: ["pending", "partial"] },
      nextReminderAt: { lte: now },
      reminderCount: { lt: 3 },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      profile: {
        include: {
          settings: true,
        },
      },
    },
    orderBy: {
      nextReminderAt: "asc",
    },
    take: limit,
  });
  
  return debts
    .filter((debt) => {
      // Filter based on settings
      const settings = debt.profile.settings;
      if (!settings?.autoRemindEnabled) return false;
      return true;
    })
    .map((debt) => {
      const dueDate = new Date(debt.dueDate);
      const daysOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return {
        debtId: debt.id,
        clientId: debt.client.id,
        profileId: debt.profileId,
        clientName: debt.client.name,
        clientEmail: debt.client.email,
        clientPhone: debt.client.phone,
        amount: debt.amount - debt.paidAmount,
        currency: debt.currency,
        reference: debt.reference,
        daysOverdue: Math.max(0, daysOverdue),
        reminderCount: debt.reminderCount,
      };
    });
}

/**
 * Reschedule a specific reminder for a debt
 * @param debtId - The debt ID
 * @param newDate - The new reminder date
 * @returns Success status
 */
export async function rescheduleReminder(
  debtId: string,
  newDate: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.debt.update({
      where: { id: debtId },
      data: { nextReminderAt: newDate },
    });
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Skip the next reminder for a debt
 * @param debtId - The debt ID
 * @param profileId - The profile ID (for logging)
 * @returns Success status with next reminder info
 */
export async function skipNextReminder(
  debtId: string,
  profileId: string
): Promise<{ success: boolean; nextReminderAt?: Date | null; error?: string }> {
  try {
    const debt = await db.debt.findUnique({
      where: { id: debtId },
      include: {
        profile: {
          include: { settings: true },
        },
      },
    });
    
    if (!debt) {
      return { success: false, error: "Debt not found" };
    }
    
    const settings: ReminderSettings = debt.profile.settings ? {
      autoRemindEnabled: debt.profile.settings.autoRemindEnabled,
      reminderDay1: debt.profile.settings.reminderDay1,
      reminderDay2: debt.profile.settings.reminderDay2,
      reminderDay3: debt.profile.settings.reminderDay3,
      skipWeekends: debt.profile.settings.skipWeekends,
      reminderStartTime: debt.profile.settings.reminderStartTime,
      reminderEndTime: debt.profile.settings.reminderEndTime,
      maxReminders: debt.profile.settings.maxReminders,
    } : DEFAULT_SETTINGS;
    
    // Increment reminder count and calculate next
    const updatedDebt = {
      ...debt,
      reminderCount: debt.reminderCount + 1,
    };
    
    const nextReminderAt = calculateNextReminderDate(
      updatedDebt as DebtWithClient,
      settings
    );
    
    await db.debt.update({
      where: { id: debtId },
      data: {
        reminderCount: { increment: 1 },
        lastReminderAt: new Date(),
        nextReminderAt,
      },
    });
    
    // Log the skip action
    await db.reminderLog.create({
      data: {
        profileId,
        action: "skipped",
        entityType: "Debt",
        entityId: debtId,
        details: JSON.stringify({
          previousReminderCount: debt.reminderCount,
          newReminderCount: updatedDebt.reminderCount,
          nextReminderAt,
        }),
        success: true,
      },
    });
    
    return { success: true, nextReminderAt };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export { DEFAULT_SETTINGS };
export type { ReminderSettings, DebtWithClient };
