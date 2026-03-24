// =====================================================
// RELANCEPRO AFRICA - Cron Job Types
// Type definitions for the cron job scheduling system
// =====================================================

import { ReminderQueue, Debt, Client, Profile, Settings } from "@prisma/client";

/**
 * Status of a cron job
 */
export type CronJobStatus = 
  | "pending"      // Scheduled but not yet executed
  | "running"      // Currently executing
  | "completed"    // Successfully completed
  | "failed"       // Failed with error
  | "cancelled"    // Manually cancelled
  | "retrying";    // Failed and waiting for retry

/**
 * Types of cron jobs available
 */
export type CronJobType = 
  | "auto_reminder"         // Automatic reminder sending
  | "cleanup_demos"         // Cleanup expired demo accounts
  | "payment_prediction"    // Update payment predictions
  | "weekly_report"         // Send weekly summary reports
  | "scheduled_reminder";   // User-scheduled specific reminder

/**
 * Priority levels for jobs
 */
export type JobPriority = "low" | "normal" | "high" | "urgent";

/**
 * Configuration for scheduling a reminder
 */
export interface ScheduleConfig {
  /** ID of the profile scheduling the reminder */
  profileId: string;
  /** ID of the debt to remind about */
  debtId: string;
  /** Type of reminder (first, second, third) */
  reminderType: "first" | "second" | "third";
  /** Channel to use for sending */
  channel: "email" | "whatsapp" | "both";
  /** Scheduled date and time */
  scheduledAt: Date;
  /** Priority of this job */
  priority?: JobPriority;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Custom message (optional) */
  customMessage?: string;
  /** Custom subject for email (optional) */
  customSubject?: string;
}

/**
 * Represents a scheduled cron job
 */
export interface CronJob {
  /** Unique identifier for the job */
  id: string;
  /** Type of job */
  type: CronJobType;
  /** Current status */
  status: CronJobStatus;
  /** Associated profile ID */
  profileId: string;
  /** Associated debt ID (if applicable) */
  debtId?: string;
  /** Associated client ID (if applicable) */
  clientId?: string;
  /** Scheduled execution time */
  scheduledAt: Date;
  /** Actual execution time */
  executedAt?: Date;
  /** Job priority */
  priority: JobPriority;
  /** Number of attempts made */
  attempts: number;
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Last error message (if any) */
  lastError?: string;
  /** Job-specific configuration (JSON) */
  config?: Record<string, unknown>;
  /** Result of the job (JSON) */
  result?: Record<string, unknown>;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Result of executing a cron job
 */
export interface JobResult {
  /** Whether the job succeeded */
  success: boolean;
  /** Job ID */
  jobId: string;
  /** Job type */
  jobType: CronJobType;
  /** Execution status */
  status: CronJobStatus;
  /** Number of items processed */
  processed?: number;
  /** Number of items succeeded */
  succeeded?: number;
  /** Number of items failed */
  failed?: number;
  /** Number of items skipped */
  skipped?: number;
  /** Error message if failed */
  error?: string;
  /** Additional result details */
  details?: Record<string, unknown>;
  /** Execution duration in milliseconds */
  duration: number;
  /** Timestamp of completion */
  timestamp: string;
}

/**
 * Summary of a batch job execution
 */
export interface BatchJobResult {
  /** Total jobs processed */
  totalProcessed: number;
  /** Successful jobs */
  successful: number;
  /** Failed jobs */
  failed: number;
  /** Skipped jobs */
  skipped: number;
  /** Individual job results */
  results: JobResult[];
  /** Total execution duration */
  duration: number;
  /** Timestamp of batch completion */
  timestamp: string;
}

/**
 * Configuration for automatic reminders
 */
export interface AutoReminderConfig {
  /** Whether automatic reminders are enabled */
  enabled: boolean;
  /** Days after due date for first reminder */
  day1: number;
  /** Days after due date for second reminder */
  day2: number;
  /** Days after due date for third reminder */
  day3: number;
  /** Whether to skip weekends */
  skipWeekends: boolean;
  /** Start time for reminders (HH:MM) */
  startTime: string;
  /** End time for reminders (HH:MM) */
  endTime: string;
  /** Maximum reminders per debt */
  maxReminders: number;
  /** Maximum reminders to process per run */
  maxPerRun: number;
}

/**
 * Configuration for demo cleanup job
 */
export interface DemoCleanupConfig {
  /** Days after demo expiration before cleanup */
  gracePeriodDays: number;
  /** Whether to archive data before deletion */
  archiveBeforeDelete: boolean;
  /** Maximum accounts to process per run */
  maxPerRun: number;
}

/**
 * Configuration for payment prediction job
 */
export interface PaymentPredictionConfig {
  /** Minimum days overdue to predict */
  minDaysOverdue: number;
  /** Confidence threshold (0-100) */
  confidenceThreshold: number;
  /** Maximum debts to process per run */
  maxPerRun: number;
}

/**
 * Configuration for weekly report job
 */
export interface WeeklyReportConfig {
  /** Day of week to send (0=Sunday, 1=Monday, etc.) */
  dayOfWeek: number;
  /** Hour to send (0-23) */
  hour: number;
  /** Timezone for scheduling */
  timezone: string;
  /** Include inactive clients */
  includeInactive: boolean;
}

/**
 * Combined configuration for all cron jobs
 */
export interface CronConfig {
  /** Reminder job configuration */
  reminders: AutoReminderConfig;
  /** Demo cleanup configuration */
  demoCleanup: DemoCleanupConfig;
  /** Payment prediction configuration */
  paymentPrediction: PaymentPredictionConfig;
  /** Weekly report configuration */
  weeklyReport: WeeklyReportConfig;
}

/**
 * Scheduled reminder with full context
 */
export interface ScheduledReminderWithDetails {
  id: string;
  debtId: string;
  clientId: string;
  profileId: string;
  scheduledAt: Date;
  reminderType: "first" | "second" | "third";
  channel: "email" | "whatsapp" | "both";
  status: string;
  attempts: number;
  maxAttempts: number;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  debt?: {
    id: string;
    amount: number;
    currency: string;
    dueDate: Date;
    status: string;
    reference: string | null;
    reminderCount: number;
    paidAmount: number;
  };
  client?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
  };
  profile?: {
    id: string;
    email: string;
    name: string | null;
    companyName: string | null;
    subscriptionStatus: string;
    remindersUsed: number;
    remindersLimit: number;
  };
}

/**
 * Job execution log entry
 */
export interface JobLogEntry {
  id: string;
  jobId: string;
  jobType: CronJobType;
  action: "started" | "completed" | "failed" | "retrying" | "cancelled";
  message?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Statistics for cron job monitoring
 */
export interface CronStats {
  /** Jobs pending execution */
  pending: number;
  /** Jobs currently running */
  running: number;
  /** Jobs completed today */
  completedToday: number;
  /** Jobs failed today */
  failedToday: number;
  /** Average execution time (ms) */
  avgExecutionTime: number;
  /** Last successful run timestamp */
  lastSuccess?: Date;
  /** Last failed run timestamp */
  lastFailure?: Date;
}
