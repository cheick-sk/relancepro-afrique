'use client';

/**
 * useAuditLog Hook for RelancePro Africa
 * Client-side hook for sending audit events
 */

import { useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Types
export type AuditAction = 
  // Auth
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed_login'
  | 'auth.password_reset'
  | 'auth.2fa_enabled'
  | 'auth.2fa_disabled'
  // Clients
  | 'client.created'
  | 'client.updated'
  | 'client.deleted'
  | 'client.viewed'
  | 'client.exported'
  // Debts
  | 'debt.created'
  | 'debt.updated'
  | 'debt.deleted'
  | 'debt.paid'
  | 'debt.status_changed'
  | 'debt.exported'
  // Reminders
  | 'reminder.sent'
  | 'reminder.delivered'
  | 'reminder.opened'
  | 'reminder.failed'
  | 'reminder.scheduled'
  | 'reminder.cancelled'
  // Payments
  | 'payment.initiated'
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.refunded'
  // Settings
  | 'settings.updated'
  | 'api_key.created'
  | 'api_key.revoked'
  // Team
  | 'team.created'
  | 'team.member_invited'
  | 'team.member_joined'
  | 'team.member_removed'
  | 'team.role_changed'
  // Portal
  | 'portal.token_created'
  | 'portal.token_revoked'
  | 'portal.accessed'
  | 'portal.payment_initiated'
  | 'portal.message_sent'
  // Admin
  | 'admin.user_updated'
  | 'admin.data_exported';

export type EntityType = 
  | 'profile'
  | 'client'
  | 'debt'
  | 'reminder'
  | 'payment'
  | 'settings'
  | 'api_key'
  | 'webhook'
  | 'team'
  | 'team_member'
  | 'integration'
  | 'portal_token'
  | 'session';

export type AuditStatus = 'success' | 'failed' | 'pending';

interface AuditLogOptions {
  action: AuditAction;
  entityType?: EntityType;
  entityId?: string;
  details?: Record<string, unknown>;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  status?: AuditStatus;
  errorMessage?: string;
}

interface UseAuditLogOptions {
  /** Auto-batch events (default: true) */
  batchEnabled?: boolean;
  /** Batch size before sending (default: 10) */
  batchSize?: number;
  /** Batch timeout in ms (default: 5000) */
  batchTimeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

interface AuditLogReturn {
  log: (options: AuditLogOptions) => Promise<boolean>;
  logClientAction: (action: AuditAction, clientId: string, details?: Record<string, unknown>) => Promise<boolean>;
  logDebtAction: (action: AuditAction, debtId: string, details?: Record<string, unknown>) => Promise<boolean>;
  logReminderAction: (action: AuditAction, reminderId: string, details?: Record<string, unknown>) => Promise<boolean>;
  logPaymentAction: (action: AuditAction, paymentId: string, details?: Record<string, unknown>) => Promise<boolean>;
  flush: () => Promise<void>;
  isReady: boolean;
}

// Queue for batching
let auditQueue: AuditLogOptions[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

/**
 * Send audit logs to the server
 */
async function sendAuditLogs(logs: AuditLogOptions[]): Promise<boolean> {
  try {
    const response = await fetch('/api/audit-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send audit logs:', error);
    return false;
  }
}

/**
 * Main hook for audit logging
 */
export function useAuditLog(options: UseAuditLogOptions = {}): AuditLogReturn {
  const {
    batchEnabled = true,
    batchSize = 10,
    batchTimeout = 5000,
    debug = false,
  } = options;

  const { data: session, status } = useSession();
  const isReady = status === 'authenticated' && !!session?.user?.id;

  // Flush the queue
  const flush = useCallback(async () => {
    if (auditQueue.length === 0) return;

    const logsToSend = [...auditQueue];
    auditQueue = [];

    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }

    if (debug) {
      console.log(`[AuditLog] Flushing ${logsToSend.length} logs`);
    }

    await sendAuditLogs(logsToSend);
  }, [debug]);

  // Set up auto-flush on unmount
  useEffect(() => {
    return () => {
      if (auditQueue.length > 0) {
        sendAuditLogs(auditQueue);
        auditQueue = [];
      }
    };
  }, []);

  // Main log function
  const log = useCallback(async (logOptions: AuditLogOptions): Promise<boolean> => {
    if (!isReady) {
      if (debug) {
        console.log('[AuditLog] Skipped - not ready');
      }
      return false;
    }

    const enrichedOptions: AuditLogOptions = {
      ...logOptions,
      status: logOptions.status || 'success',
    };

    if (batchEnabled) {
      // Add to queue
      auditQueue.push(enrichedOptions);

      if (debug) {
        console.log('[AuditLog] Queued:', enrichedOptions.action);
      }

      // Check if we should flush
      if (auditQueue.length >= batchSize) {
        await flush();
      } else if (!flushTimeout) {
        // Set timeout for batch
        flushTimeout = setTimeout(flush, batchTimeout);
      }

      return true;
    } else {
      // Send immediately
      return sendAuditLogs([enrichedOptions]);
    }
  }, [isReady, batchEnabled, batchSize, batchTimeout, flush, debug]);

  // Convenience functions
  const logClientAction = useCallback(
    (action: AuditAction, clientId: string, details?: Record<string, unknown>) =>
      log({ action, entityType: 'client', entityId: clientId, details }),
    [log]
  );

  const logDebtAction = useCallback(
    (action: AuditAction, debtId: string, details?: Record<string, unknown>) =>
      log({ action, entityType: 'debt', entityId: debtId, details }),
    [log]
  );

  const logReminderAction = useCallback(
    (action: AuditAction, reminderId: string, details?: Record<string, unknown>) =>
      log({ action, entityType: 'reminder', entityId: reminderId, details }),
    [log]
  );

  const logPaymentAction = useCallback(
    (action: AuditAction, paymentId: string, details?: Record<string, unknown>) =>
      log({ action, entityType: 'payment', entityId: paymentId, details }),
    [log]
  );

  return {
    log,
    logClientAction,
    logDebtAction,
    logReminderAction,
    logPaymentAction,
    flush,
    isReady,
  };
}

// =====================================================
// STANDALONE FUNCTIONS (for use outside components)
// =====================================================

/**
 * Log an audit event without the hook
 */
export async function logAuditEvent(options: AuditLogOptions): Promise<boolean> {
  return sendAuditLogs([options]);
}

/**
 * Log client action without the hook
 */
export async function logClientAuditAction(
  action: AuditAction,
  clientId: string,
  details?: Record<string, unknown>
): Promise<boolean> {
  return logAuditEvent({
    action,
    entityType: 'client',
    entityId: clientId,
    details,
  });
}

/**
 * Log debt action without the hook
 */
export async function logDebtAuditAction(
  action: AuditAction,
  debtId: string,
  details?: Record<string, unknown>
): Promise<boolean> {
  return logAuditEvent({
    action,
    entityType: 'debt',
    entityId: debtId,
    details,
  });
}

/**
 * Log reminder action without the hook
 */
export async function logReminderAuditAction(
  action: AuditAction,
  reminderId: string,
  details?: Record<string, unknown>
): Promise<boolean> {
  return logAuditEvent({
    action,
    entityType: 'reminder',
    entityId: reminderId,
    details,
  });
}

/**
 * Log page view
 */
export function useLogPageView(pageName: string, entityId?: string) {
  const { log, isReady } = useAuditLog({ batchEnabled: false });

  useEffect(() => {
    if (isReady) {
      const action = `${pageName.toLowerCase()}.viewed` as AuditAction;
      log({
        action,
        entityType: pageName.toLowerCase() as EntityType,
        entityId,
        details: { page: pageName },
      });
    }
  }, [isReady, pageName, entityId, log]);
}

/**
 * Track user interactions
 */
export function useTrackInteraction() {
  const { log, isReady } = useAuditLog();

  const trackClick = useCallback(
    (element: string, details?: Record<string, unknown>) => {
      if (isReady) {
        log({
          action: 'admin.data_exported',
          details: { element, action: 'click', ...details },
        });
      }
    },
    [log, isReady]
  );

  const trackExport = useCallback(
    (type: string, count: number, format: string) => {
      if (isReady) {
        log({
          action: 'admin.data_exported',
          details: { type, count, format },
        });
      }
    },
    [log, isReady]
  );

  return { trackClick, trackExport };
}

export default useAuditLog;
