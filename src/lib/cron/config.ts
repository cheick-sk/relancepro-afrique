// =====================================================
// RELANCEPRO AFRICA - Cron Job Configuration
// Central configuration for all scheduled jobs
// =====================================================

import type { 
  CronConfig, 
  AutoReminderConfig, 
  DemoCleanupConfig,
  PaymentPredictionConfig,
  WeeklyReportConfig 
} from "./types";

/**
 * Default configuration for automatic reminders
 */
export const DEFAULT_REMINDER_CONFIG: AutoReminderConfig = {
  enabled: true,
  day1: 3,           // First reminder: 3 days after due date
  day2: 7,           // Second reminder: 7 days after due date
  day3: 14,          // Third reminder: 14 days after due date
  skipWeekends: false,
  startTime: "09:00", // Start sending at 9 AM
  endTime: "18:00",   // Stop sending at 6 PM
  maxReminders: 3,
  maxPerRun: 100,     // Maximum reminders to process per cron run
};

/**
 * Configuration for demo account cleanup
 */
export const DEMO_CLEANUP_CONFIG: DemoCleanupConfig = {
  gracePeriodDays: 7, // Wait 7 days after expiration before cleanup
  archiveBeforeDelete: true, // Archive data before deleting
  maxPerRun: 50,      // Maximum accounts to process per run
};

/**
 * Configuration for payment prediction updates
 */
export const PAYMENT_PREDICTION_CONFIG: PaymentPredictionConfig = {
  minDaysOverdue: 1,  // Predict for debts at least 1 day overdue
  confidenceThreshold: 60, // Minimum confidence to store prediction
  maxPerRun: 200,     // Maximum debts to analyze per run
};

/**
 * Configuration for weekly reports
 */
export const WEEKLY_REPORT_CONFIG: WeeklyReportConfig = {
  dayOfWeek: 1,       // Monday
  hour: 8,            // 8 AM
  timezone: "Africa/Conakry", // Guinea timezone (GMT+0)
  includeInactive: false,
};

/**
 * Default timezone for all cron jobs
 * Africa/Conakry is GMT+0 (same as UTC)
 */
export const DEFAULT_TIMEZONE = "Africa/Conakry";

/**
 * Combined cron configuration
 */
export const CRON_CONFIG: CronConfig = {
  reminders: DEFAULT_REMINDER_CONFIG,
  demoCleanup: DEMO_CLEANUP_CONFIG,
  paymentPrediction: PAYMENT_PREDICTION_CONFIG,
  weeklyReport: WEEKLY_REPORT_CONFIG,
};

/**
 * Cron job schedules (cron expressions)
 * These define when each job type runs
 */
export const CRON_SCHEDULES = {
  /**
   * Automatic reminders - Every hour
   * Checks for due reminders and sends them
   */
  reminders: "0 * * * *", // Every hour at minute 0

  /**
   * Demo cleanup - Daily at 2 AM
   * Cleans up expired demo accounts
   */
  demoCleanup: "0 2 * * *", // Daily at 2:00 AM

  /**
   * Payment predictions - Daily at 3 AM
   * Updates payment probability predictions
   */
  paymentPrediction: "0 3 * * *", // Daily at 3:00 AM

  /**
   * Weekly reports - Mondays at 8 AM
   * Sends weekly summary emails
   */
  weeklyReport: "0 8 * * 1", // Every Monday at 8:00 AM

  /**
   * Health check - Every 5 minutes
   * Monitors system health
   */
  healthCheck: "*/5 * * * *", // Every 5 minutes
} as const;

/**
 * Retry configuration for failed jobs
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,    // Base delay: 1 second
  maxDelayMs: 60000,    // Maximum delay: 1 minute
  backoffMultiplier: 2, // Exponential backoff
};

/**
 * Job timeout configuration (in milliseconds)
 */
export const JOB_TIMEOUTS = {
  reminders: 300000,        // 5 minutes
  demoCleanup: 600000,      // 10 minutes
  paymentPrediction: 300000, // 5 minutes
  weeklyReport: 600000,     // 10 minutes
} as const;

/**
 * Reminder interval options for UI
 * These are the standard intervals users can select
 */
export const REMINDER_INTERVALS = [
  { value: 1, label: "1 jour après échéance" },
  { value: 2, label: "2 jours après échéance" },
  { value: 3, label: "3 jours après échéance" },
  { value: 5, label: "5 jours après échéance" },
  { value: 7, label: "7 jours après échéance" },
  { value: 10, label: "10 jours après échéance" },
  { value: 14, label: "14 jours après échéance" },
  { value: 21, label: "21 jours après échéance" },
  { value: 30, label: "30 jours après échéance" },
] as const;

/**
 * Time slot options for UI
 */
export const TIME_SLOTS = [
  { value: "06:00", label: "06:00" },
  { value: "07:00", label: "07:00" },
  { value: "08:00", label: "08:00" },
  { value: "09:00", label: "09:00" },
  { value: "10:00", label: "10:00" },
  { value: "11:00", label: "11:00" },
  { value: "12:00", label: "12:00" },
  { value: "13:00", label: "13:00" },
  { value: "14:00", label: "14:00" },
  { value: "15:00", label: "15:00" },
  { value: "16:00", label: "16:00" },
  { value: "17:00", label: "17:00" },
  { value: "18:00", label: "18:00" },
  { value: "19:00", label: "19:00" },
  { value: "20:00", label: "20:00" },
] as const;

/**
 * Maximum reminders options for UI
 */
export const MAX_REMINDERS_OPTIONS = [
  { value: 1, label: "1 relance" },
  { value: 2, label: "2 relances" },
  { value: 3, label: "3 relances" },
  { value: 5, label: "5 relances" },
  { value: 10, label: "10 relances" },
] as const;

/**
 * Get reminder interval based on reminder number
 * @param reminderNumber - The reminder sequence number (1, 2, or 3)
 * @param customConfig - Optional custom configuration
 * @returns Number of days after due date
 */
export function getReminderInterval(
  reminderNumber: 1 | 2 | 3,
  customConfig?: Partial<AutoReminderConfig>
): number {
  const config = { ...DEFAULT_REMINDER_CONFIG, ...customConfig };
  
  switch (reminderNumber) {
    case 1:
      return config.day1;
    case 2:
      return config.day2;
    case 3:
      return config.day3;
    default:
      return config.day1;
  }
}

/**
 * Calculate the next reminder date based on due date and settings
 * @param dueDate - The debt's due date
 * @param reminderNumber - Which reminder (1, 2, or 3)
 * @param config - Reminder configuration
 * @returns The calculated reminder date
 */
export function calculateReminderDate(
  dueDate: Date,
  reminderNumber: 1 | 2 | 3,
  config: AutoReminderConfig = DEFAULT_REMINDER_CONFIG
): Date {
  const daysAfterDue = getReminderInterval(reminderNumber, config);
  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() + daysAfterDue);
  
  // Set the time to the configured start time
  const [hours, minutes] = config.startTime.split(":").map(Number);
  reminderDate.setHours(hours, minutes, 0, 0);
  
  // Skip weekends if configured
  if (config.skipWeekends) {
    const dayOfWeek = reminderDate.getDay();
    if (dayOfWeek === 0) {
      // Sunday -> Monday
      reminderDate.setDate(reminderDate.getDate() + 1);
    } else if (dayOfWeek === 6) {
      // Saturday -> Monday
      reminderDate.setDate(reminderDate.getDate() + 2);
    }
  }
  
  return reminderDate;
}

/**
 * Check if cron jobs are enabled
 */
export function isCronEnabled(): boolean {
  return process.env.CRON_REMINDERS_ENABLED !== "false";
}

/**
 * Get the cron secret for authentication
 */
export function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET;
}

/**
 * Verify a cron request secret
 * @param providedSecret - The secret provided in the request
 * @returns Whether the secret is valid
 */
export function verifyCronSecret(providedSecret: string | null): boolean {
  // In development, allow requests without secret
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  
  const secret = getCronSecret();
  if (!secret) {
    console.error("[Cron] CRON_SECRET not configured");
    return false;
  }
  
  return providedSecret === secret;
}

/**
 * Get job priority value for sorting
 * Higher number = higher priority
 */
export function getPriorityValue(priority: string): number {
  const priorityMap: Record<string, number> = {
    low: 0,
    normal: 1,
    high: 2,
    urgent: 3,
  };
  return priorityMap[priority] ?? 1;
}

export type { 
  CronConfig, 
  AutoReminderConfig, 
  DemoCleanupConfig,
  PaymentPredictionConfig,
  WeeklyReportConfig 
};
