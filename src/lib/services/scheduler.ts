// =====================================================
// RELANCEPRO AFRICA - Scheduler Service
// Service de planification avec persistance des jobs
// =====================================================

import { db } from "@/lib/db";
import { 
  CRON_SCHEDULES, 
  RETRY_CONFIG, 
  DEFAULT_TIMEZONE,
  DEFAULT_REMINDER_CONFIG,
} from "@/lib/cron/config";
import type { 
  CronJobStatus, 
  CronJobType, 
  JobPriority,
  JobResult,
} from "@/lib/cron/types";

// =====================================================
// TYPES
// =====================================================

interface CreateJobOptions {
  jobType: CronJobType;
  profileId?: string;
  debtId?: string;
  clientId?: string;
  scheduledAt: Date;
  priority?: JobPriority;
  config?: Record<string, unknown>;
  maxAttempts?: number;
}

interface JobStatusResult {
  id: string;
  jobType: CronJobType;
  status: CronJobStatus;
  scheduledAt: Date;
  executedAt: Date | null;
  attempts: number;
  maxAttempts: number;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SchedulerStats {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  nextRun: Date | null;
}

// =====================================================
// SCHEDULER SERVICE CLASS
// =====================================================

class SchedulerService {
  private static instance: SchedulerService;
  
  private constructor() {}
  
  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  // =====================================================
  // JOB CREATION
  // =====================================================

  /**
   * Create a new scheduled job
   */
  async createJob(options: CreateJobOptions): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
  }> {
    try {
      const priority = this.getPriorityValue(options.priority || "normal");
      
      const job = await db.scheduledJob.create({
        data: {
          jobType: options.jobType,
          profileId: options.profileId,
          debtId: options.debtId,
          clientId: options.clientId,
          scheduledAt: options.scheduledAt,
          status: "pending",
          priority,
          config: options.config ? JSON.stringify(options.config) : null,
          maxAttempts: options.maxAttempts || RETRY_CONFIG.maxRetries,
        },
      });
      
      console.log(`[Scheduler] Created job ${job.id} of type ${options.jobType}`);
      
      return { success: true, jobId: job.id };
    } catch (error) {
      console.error("[Scheduler] Error creating job:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Schedule multiple jobs at once
   */
  async createJobs(jobs: CreateJobOptions[]): Promise<{
    success: boolean;
    created: number;
    errors: string[];
  }> {
    const result = {
      success: true,
      created: 0,
      errors: [] as string[],
    };
    
    for (const job of jobs) {
      const createResult = await this.createJob(job);
      if (createResult.success) {
        result.created++;
      } else {
        result.errors.push(createResult.error || "Unknown error");
        result.success = false;
      }
    }
    
    return result;
  }

  // =====================================================
  // JOB MANAGEMENT
  // =====================================================

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<JobStatusResult | null> {
    try {
      const job = await db.scheduledJob.findUnique({
        where: { id: jobId },
      });
      
      if (!job) return null;
      
      return {
        id: job.id,
        jobType: job.jobType as CronJobType,
        status: job.status as CronJobStatus,
        scheduledAt: job.scheduledAt,
        executedAt: job.executedAt,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      };
    } catch (error) {
      console.error("[Scheduler] Error getting job:", error);
      return null;
    }
  }

  /**
   * Get all jobs for a profile
   */
  async getJobsForProfile(
    profileId: string,
    options?: {
      status?: CronJobStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<JobStatusResult[]> {
    try {
      const jobs = await db.scheduledJob.findMany({
        where: {
          profileId,
          ...(options?.status && { status: options.status }),
        },
        orderBy: [
          { priority: "desc" },
          { scheduledAt: "asc" },
        ],
        take: options?.limit || 50,
        skip: options?.offset || 0,
      });
      
      return jobs.map(job => ({
        id: job.id,
        jobType: job.jobType as CronJobType,
        status: job.status as CronJobStatus,
        scheduledAt: job.scheduledAt,
        executedAt: job.executedAt,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      }));
    } catch (error) {
      console.error("[Scheduler] Error getting jobs for profile:", error);
      return [];
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const job = await db.scheduledJob.findUnique({
        where: { id: jobId },
      });
      
      if (!job) {
        return { success: false, error: "Job not found" };
      }
      
      if (job.status === "completed") {
        return { success: false, error: "Cannot cancel completed job" };
      }
      
      await db.scheduledJob.update({
        where: { id: jobId },
        data: {
          status: "cancelled",
          updatedAt: new Date(),
        },
      });
      
      console.log(`[Scheduler] Cancelled job ${jobId}`);
      
      return { success: true };
    } catch (error) {
      console.error("[Scheduler] Error cancelling job:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const job = await db.scheduledJob.findUnique({
        where: { id: jobId },
      });
      
      if (!job) {
        return { success: false, error: "Job not found" };
      }
      
      if (job.status !== "failed") {
        return { success: false, error: "Only failed jobs can be retried" };
      }
      
      // Reset job for retry
      await db.scheduledJob.update({
        where: { id: jobId },
        data: {
          status: "pending",
          attempts: 0,
          error: null,
          scheduledAt: new Date(), // Schedule for now
          updatedAt: new Date(),
        },
      });
      
      console.log(`[Scheduler] Retrying job ${jobId}`);
      
      return { success: true };
    } catch (error) {
      console.error("[Scheduler] Error retrying job:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // =====================================================
  // JOB PROCESSING
  // =====================================================

  /**
   * Get pending jobs that are due for execution
   */
  async getDueJobs(limit: number = 50): Promise<JobStatusResult[]> {
    try {
      const now = new Date();
      
      const jobs = await db.scheduledJob.findMany({
        where: {
          status: "pending",
          scheduledAt: { lte: now },
        },
        orderBy: [
          { priority: "desc" },
          { scheduledAt: "asc" },
        ],
        take: limit,
      });
      
      return jobs.map(job => ({
        id: job.id,
        jobType: job.jobType as CronJobType,
        status: job.status as CronJobStatus,
        scheduledAt: job.scheduledAt,
        executedAt: job.executedAt,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      }));
    } catch (error) {
      console.error("[Scheduler] Error getting due jobs:", error);
      return [];
    }
  }

  /**
   * Mark job as running
   */
  async markJobRunning(jobId: string): Promise<void> {
    try {
      await db.scheduledJob.update({
        where: { id: jobId },
        data: {
          status: "running",
          attempts: { increment: 1 },
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("[Scheduler] Error marking job as running:", error);
    }
  }

  /**
   * Mark job as completed
   */
  async markJobCompleted(
    jobId: string, 
    result?: Record<string, unknown>
  ): Promise<void> {
    try {
      await db.scheduledJob.update({
        where: { id: jobId },
        data: {
          status: "completed",
          executedAt: new Date(),
          result: result ? JSON.stringify(result) : null,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("[Scheduler] Error marking job as completed:", error);
    }
  }

  /**
   * Mark job as failed
   */
  async markJobFailed(
    jobId: string, 
    error: string,
    shouldRetry: boolean = true
  ): Promise<void> {
    try {
      const job = await db.scheduledJob.findUnique({
        where: { id: jobId },
      });
      
      if (!job) return;
      
      const canRetry = shouldRetry && job.attempts < job.maxAttempts;
      
      await db.scheduledJob.update({
        where: { id: jobId },
        data: {
          status: canRetry ? "retrying" : "failed",
          error,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      console.error("[Scheduler] Error marking job as failed:", err);
    }
  }

  /**
   * Process job with retry logic
   */
  async processJob(
    jobId: string,
    handler: () => Promise<JobResult>
  ): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      // Mark as running
      await this.markJobRunning(jobId);
      
      // Execute handler
      const result = await handler();
      
      // Mark as completed
      await this.markJobCompleted(jobId, result.details);
      
      console.log(`[Scheduler] Job ${jobId} completed in ${Date.now() - startTime}ms`);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Mark as failed
      await this.markJobFailed(jobId, errorMessage);
      
      console.error(`[Scheduler] Job ${jobId} failed:`, errorMessage);
      
      return {
        success: false,
        jobId,
        jobType: "auto_reminder",
        status: "failed",
        error: errorMessage,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // =====================================================
  // STATISTICS
  // =====================================================

  /**
   * Get scheduler statistics
   */
  async getStats(): Promise<SchedulerStats> {
    try {
      const [total, pending, running, completed, failed, nextJob] = await Promise.all([
        db.scheduledJob.count(),
        db.scheduledJob.count({ where: { status: "pending" } }),
        db.scheduledJob.count({ where: { status: "running" } }),
        db.scheduledJob.count({ where: { status: "completed" } }),
        db.scheduledJob.count({ where: { status: "failed" } }),
        db.scheduledJob.findFirst({
          where: { status: "pending" },
          orderBy: { scheduledAt: "asc" },
        }),
      ]);
      
      return {
        totalJobs: total,
        pendingJobs: pending,
        runningJobs: running,
        completedJobs: completed,
        failedJobs: failed,
        nextRun: nextJob?.scheduledAt || null,
      };
    } catch (error) {
      console.error("[Scheduler] Error getting stats:", error);
      return {
        totalJobs: 0,
        pendingJobs: 0,
        runningJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        nextRun: null,
      };
    }
  }

  /**
   * Get scheduler status for a profile
   */
  async getProfileSchedulerStatus(profileId: string): Promise<{
    isEnabled: boolean;
    pendingReminders: number;
    nextReminder: Date | null;
    remindersSentToday: number;
    remindersSentThisWeek: number;
    lastRun: Date | null;
  }> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      // Get settings
      const settings = await db.settings.findUnique({
        where: { profileId },
      });
      
      // Get pending reminders in queue
      const pendingReminders = await db.reminderQueue.count({
        where: {
          profileId,
          status: "pending",
        },
      });
      
      // Get next scheduled reminder
      const nextReminder = await db.reminderQueue.findFirst({
        where: {
          profileId,
          status: "pending",
        },
        orderBy: { scheduledAt: "asc" },
      });
      
      // Get reminders sent today
      const remindersSentToday = await db.reminder.count({
        where: {
          profileId,
          sentAt: { gte: today },
          status: "sent",
        },
      });
      
      // Get reminders sent this week
      const remindersSentThisWeek = await db.reminder.count({
        where: {
          profileId,
          sentAt: { gte: weekAgo },
          status: "sent",
        },
      });
      
      // Get last cron run
      const lastRun = await db.reminderLog.findFirst({
        where: {
          profileId,
          action: "processed",
        },
        orderBy: { createdAt: "desc" },
      });
      
      return {
        isEnabled: settings?.autoRemindEnabled ?? true,
        pendingReminders,
        nextReminder: nextReminder?.scheduledAt || null,
        remindersSentToday,
        remindersSentThisWeek,
        lastRun: lastRun?.createdAt || null,
      };
    } catch (error) {
      console.error("[Scheduler] Error getting profile status:", error);
      return {
        isEnabled: true,
        pendingReminders: 0,
        nextReminder: null,
        remindersSentToday: 0,
        remindersSentThisWeek: 0,
        lastRun: null,
      };
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Convert priority string to numeric value
   */
  private getPriorityValue(priority: JobPriority): number {
    const priorityMap: Record<JobPriority, number> = {
      low: 0,
      normal: 1,
      high: 2,
      urgent: 3,
    };
    return priorityMap[priority] ?? 1;
  }

  /**
   * Calculate delay for retry with exponential backoff
   */
  getRetryDelay(attempt: number): number {
    return Math.min(
      RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
      RETRY_CONFIG.maxDelayMs
    );
  }

  /**
   * Check if a job should be retried
   */
  shouldRetry(attempts: number, maxAttempts: number): boolean {
    return attempts < maxAttempts;
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanupOldJobs(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const result = await db.scheduledJob.deleteMany({
        where: {
          status: { in: ["completed", "failed", "cancelled"] },
          updatedAt: { lt: cutoffDate },
        },
      });
      
      console.log(`[Scheduler] Cleaned up ${result.count} old jobs`);
      
      return result.count;
    } catch (error) {
      console.error("[Scheduler] Error cleaning up old jobs:", error);
      return 0;
    }
  }
}

// Export singleton instance
export const schedulerService = SchedulerService.getInstance();

// Export convenience functions
export const createJob = schedulerService.createJob.bind(schedulerService);
export const getJob = schedulerService.getJob.bind(schedulerService);
export const cancelJob = schedulerService.cancelJob.bind(schedulerService);
export const retryJob = schedulerService.retryJob.bind(schedulerService);
export const getDueJobs = schedulerService.getDueJobs.bind(schedulerService);
export const getStats = schedulerService.getStats.bind(schedulerService);
export const getProfileSchedulerStatus = schedulerService.getProfileSchedulerStatus.bind(schedulerService);

// Export types
export type { CreateJobOptions, JobStatusResult, SchedulerStats };
