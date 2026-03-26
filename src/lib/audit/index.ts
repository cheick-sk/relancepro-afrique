export enum AuditAction {
  // Auth
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TWO_FA_ENABLED = 'TWO_FA_ENABLED',
  TWO_FA_DISABLED = 'TWO_FA_DISABLED',
  
  // Clients
  CLIENT_CREATED = 'CLIENT_CREATED',
  CLIENT_UPDATED = 'CLIENT_UPDATED',
  CLIENT_DELETED = 'CLIENT_DELETED',
  
  // Debts
  DEBT_CREATED = 'DEBT_CREATED',
  DEBT_UPDATED = 'DEBT_UPDATED',
  DEBT_DELETED = 'DEBT_DELETED',
  PAYMENT_RECORDED = 'PAYMENT_RECORDED',
  
  // Reminders
  REMINDER_SENT = 'REMINDER_SENT',
  REMINDER_SCHEDULED = 'REMINDER_SCHEDULED',
  
  // Settings
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  
  // Team
  TEAM_MEMBER_INVITED = 'TEAM_MEMBER_INVITED',
  TEAM_MEMBER_REMOVED = 'TEAM_MEMBER_REMOVED',
  
  // Billing
  SUBSCRIPTION_STARTED = 'SUBSCRIPTION_STARTED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
}

export enum EntityType {
  USER = 'USER',
  CLIENT = 'CLIENT',
  DEBT = 'DEBT',
  REMINDER = 'REMINDER',
  TEMPLATE = 'TEMPLATE',
  API_KEY = 'API_KEY',
  TEAM_MEMBER = 'TEAM_MEMBER',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

export type AuditActionType = AuditAction;
export type EntityTypeType = EntityType;
export type AuditStatusType = 'pending' | 'in_progress' | 'completed' | 'failed';

export const AuditStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  userId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface AuditLogParams {
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  userId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQueryOptions {
  userId?: string;
  action?: AuditAction;
  entityType?: EntityType;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export async function logAction(
  action: AuditAction,
  entityType: EntityType,
  entityId: string,
  userId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  console.log('Audit log:', { action, entityType, entityId, userId, metadata });
}

export const logAudit = logAction;

// Convenience functions
export function logClientAction(action: AuditAction, clientId: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
  return logAction(action, EntityType.CLIENT, clientId, userId, metadata);
}

export function logDebtAction(action: AuditAction, debtId: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
  return logAction(action, EntityType.DEBT, debtId, userId, metadata);
}

export function logReminderAction(action: AuditAction, reminderId: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
  return logAction(action, EntityType.REMINDER, reminderId, userId, metadata);
}

export function logAuthAction(action: AuditAction, userId: string, metadata?: Record<string, unknown>): Promise<void> {
  return logAction(action, EntityType.USER, userId, userId, metadata);
}

export function logPaymentAction(action: AuditAction, debtId: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
  return logAction(action, EntityType.DEBT, debtId, userId, metadata);
}

export function logSettingsAction(action: AuditAction, userId: string, metadata?: Record<string, unknown>): Promise<void> {
  return logAction(action, EntityType.USER, userId, userId, metadata);
}

export function logApiKeyAction(action: AuditAction, keyId: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
  return logAction(action, EntityType.API_KEY, keyId, userId, metadata);
}

export function logTeamAction(action: AuditAction, memberId: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
  return logAction(action, EntityType.TEAM_MEMBER, memberId, userId, metadata);
}

export function logIntegrationAction(action: AuditAction, integrationId: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
  return logAction(action, EntityType.USER, integrationId, userId, metadata);
}

export function logPortalAction(action: AuditAction, tokenId: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
  return logAction(action, EntityType.USER, tokenId, userId, metadata);
}

export function logSecurityAction(action: AuditAction, userId: string, metadata?: Record<string, unknown>): Promise<void> {
  return logAction(action, EntityType.USER, userId, userId, metadata);
}

export async function queryAuditLogs(options: AuditLogQueryOptions): Promise<{ logs: AuditLogEntry[]; total: number }> {
  return { logs: [], total: 0 };
}

export async function getAuditStatistics(options: { userId?: string; startDate?: Date; endDate?: Date }): Promise<{
  totalActions: number;
  actionCounts: Record<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
}> {
  return { totalActions: 0, actionCounts: {}, topUsers: [] };
}

export async function getRelatedAuditLogs(entityId: string): Promise<AuditLogEntry[]> {
  return [];
}

export async function deleteOldAuditLogs(daysToKeep: number): Promise<{ deleted: number }> {
  return { deleted: 0 };
}
