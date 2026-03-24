// =====================================================
// RELANCEPRO AFRICA - Cron Configuration
// Configuration for scheduled tasks and background jobs
// =====================================================

import type { AutoReminderConfig, DemoCleanupConfig, PaymentPredictionConfig } from "./types";

// =====================================================
// CLEANUP CONFIGURATION
// =====================================================

export const CLEANUP_CONFIG = {
  maxAge: 30, // days
  batchSize: 100,
};

// =====================================================
// TIMEZONE CONFIGURATION
// =====================================================

export const SUPPORTED_TIMEZONES = [
  "Africa/Conakry",
  "Africa/Dakar",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Africa/Casablanca",
  "Africa/Tunis",
  "Africa/Algiers",
  "Africa/Abidjan",
  "Africa/Accra",
  "Europe/Paris",
  "Europe/London",
  "UTC",
];

export const DEFAULT_TIMEZONE = "Africa/Conakry";

export const DEFAULT_QUIET_HOURS = {
  start: 22, // 10 PM
  end: 7, // 7 AM
};

// =====================================================
// AUTO REMINDER CONFIGURATION
// =====================================================

export const DEFAULT_REMINDER_CONFIG: AutoReminderConfig = {
  enabled: true,
  day1: 3,        // First reminder 3 days after due date
  day2: 7,        // Second reminder 7 days after due date
  day3: 14,       // Third reminder 14 days after due date
  skipWeekends: true,
  startTime: "09:00",
  endTime: "18:00",
  maxReminders: 3,
  maxPerRun: 50,
};

// =====================================================
// DEMO CLEANUP CONFIGURATION
// =====================================================

export const DEMO_CLEANUP_CONFIG: DemoCleanupConfig = {
  gracePeriodDays: 7,      // Keep demo data 7 days after expiration
  archiveBeforeDelete: true,
  maxPerRun: 100,
};

// =====================================================
// PAYMENT PREDICTION CONFIGURATION
// =====================================================

export const PAYMENT_PREDICTION_CONFIG: PaymentPredictionConfig = {
  minDaysOverdue: 1,
  confidenceThreshold: 30,  // Minimum confidence to store prediction
  maxPerRun: 100,
};

// =====================================================
// RETRY CONFIGURATION
// =====================================================

export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,        // Start with 1 second
  backoffMultiplier: 2,     // Double each retry
  maxDelayMs: 30000,        // Max 30 seconds between retries
};

// =====================================================
// CRON SECURITY
// =====================================================

/**
 * Verify cron secret for API routes
 */
export function verifyCronSecret(authHeader: string | null): boolean {
  if (!authHeader) return false;
  
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn("[Cron] CRON_SECRET not configured");
    return true; // Allow in development
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Check if cron jobs are enabled
 */
export function isCronEnabled(): boolean {
  return process.env.CRON_ENABLED !== "false";
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate the next reminder date based on due date and reminder number
 */
export function calculateReminderDate(
  dueDate: Date,
  reminderNumber: 1 | 2 | 3,
  config: AutoReminderConfig = DEFAULT_REMINDER_CONFIG
): Date | null {
  const result = new Date(dueDate);
  
  let daysToAdd: number;
  switch (reminderNumber) {
    case 1:
      daysToAdd = config.day1;
      break;
    case 2:
      daysToAdd = config.day2;
      break;
    case 3:
      daysToAdd = config.day3;
      break;
    default:
      return null;
  }
  
  result.setDate(result.getDate() + daysToAdd);
  
  // Skip weekends if configured
  if (config.skipWeekends) {
    while (result.getDay() === 0 || result.getDay() === 6) {
      result.setDate(result.getDate() + 1);
    }
  }
  
  return result;
}

/**
 * Check if current time is within quiet hours
 */
export function isQuietHours(timezone: string = DEFAULT_TIMEZONE): boolean {
  try {
    const now = new Date();
    const hour = now.getHours();
    return hour >= DEFAULT_QUIET_HOURS.start || hour < DEFAULT_QUIET_HOURS.end;
  } catch {
    return false;
  }
}

/**
 * Get next valid send time (outside quiet hours)
 */
export function getNextValidSendTime(fromDate: Date = new Date()): Date {
  const result = new Date(fromDate);
  const hour = result.getHours();
  
  // If we're in quiet hours, move to the next valid time
  if (hour >= DEFAULT_QUIET_HOURS.start) {
    result.setDate(result.getDate() + 1);
    result.setHours(DEFAULT_QUIET_HOURS.end, 0, 0, 0);
  } else if (hour < DEFAULT_QUIET_HOURS.end) {
    result.setHours(DEFAULT_QUIET_HOURS.end, 0, 0, 0);
  }
  
  // Skip weekends if needed
  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() + 1);
  }
  
  return result;
}

/**
 * Format cron schedule for display
 */
export function formatCronSchedule(cronExpression: string): string {
  const schedules: Record<string, string> = {
    "0 * * * *": "Every hour",
    "0 0 * * *": "Daily at midnight",
    "0 9 * * *": "Daily at 9 AM",
    "0 9 * * 1": "Every Monday at 9 AM",
    "0 9 * * 1-5": "Weekdays at 9 AM",
    "0 */6 * * *": "Every 6 hours",
    "0 0 * * 0": "Every Sunday at midnight",
  };
  
  return schedules[cronExpression] || cronExpression;
}
