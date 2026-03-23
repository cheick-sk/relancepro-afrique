/**
 * Legacy Audit Functions for Backward Compatibility
 * Maps old function names to new audit logger
 */

import { logAudit, AuditAction, AuditStatus, type AuditStatusType } from './logger';

// Map old action names to new format
const ActionMap: Record<string, string> = {
  'login': AuditAction.AUTH_LOGIN,
  'logout': AuditAction.AUTH_LOGOUT,
  'login_failed': AuditAction.AUTH_FAILED_LOGIN,
  'password_change': AuditAction.AUTH_PASSWORD_RESET,
  'password_reset': AuditAction.AUTH_PASSWORD_RESET,
  'two_factor_enable': AuditAction.AUTH_2FA_ENABLED,
  'two_factor_disable': AuditAction.AUTH_2FA_DISABLED,
  'two_factor_verify': AuditAction.AUTH_2FA_VERIFIED,
  'recovery_code_used': AuditAction.AUTH_2FA_VERIFIED,
  'client_create': AuditAction.CLIENT_CREATED,
  'client_update': AuditAction.CLIENT_UPDATED,
  'client_delete': AuditAction.CLIENT_DELETED,
  'debt_create': AuditAction.DEBT_CREATED,
  'debt_update': AuditAction.DEBT_UPDATED,
  'debt_delete': AuditAction.DEBT_DELETED,
  'reminder_send': AuditAction.REMINDER_SENT,
  'reminder_schedule': AuditAction.REMINDER_SCHEDULED,
  'settings_update': AuditAction.SETTINGS_UPDATED,
  'api_key_update': AuditAction.API_KEY_CREATED,
  'subscription_start': 'subscription.start',
  'subscription_cancel': 'subscription.cancel',
  'subscription_upgrade': 'subscription.upgrade',
  'subscription_downgrade': 'subscription.downgrade',
  'session_revoke': AuditAction.AUTH_SESSION_REVOKED,
  'trusted_device_add': 'auth.trusted_device_add',
  'trusted_device_remove': 'auth.trusted_device_remove',
  'admin_user_update': AuditAction.ADMIN_USER_UPDATED,
  'admin_data_export': AuditAction.ADMIN_DATA_EXPORTED,
};

/**
 * Legacy logAction function for backward compatibility
 */
export async function logAction(options: {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValue?: Record<string, unknown> | string | null;
  newValue?: Record<string, unknown> | string | null;
  status?: AuditStatusType;
  details?: Record<string, unknown> | string | null;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  // Map old action to new format
  const newAction = ActionMap[options.action] || options.action;
  
  await logAudit({
    action: newAction as any,
    entityType: options.entityType as any,
    entityId: options.entityId,
    profileId: options.userId,
    oldValues: typeof options.oldValue === 'string' ? JSON.parse(options.oldValue) : options.oldValue,
    newValues: typeof options.newValue === 'string' ? JSON.parse(options.newValue) : options.newValue,
    status: options.status,
    details: typeof options.details === 'string' ? JSON.parse(options.details) : options.details,
    ipAddress: options.ip,
    userAgent: options.userAgent,
  });
}

// Re-export legacy constants
export { AuditAction, AuditStatus };
export type { AuditStatusType };
