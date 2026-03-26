// Audit Action enum
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

// Entity Type enum
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

// Status type
export type AuditStatusType = 'pending' | 'in_progress' | 'completed' | 'failed';

export const AuditStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

// Interfaces
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

export interface AuditLogQueryResult {
  logs: AuditLogEntry[];
  total: number;
}

export interface AuditStatistics {
  totalActions: number;
  actionCounts: Record<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
}

// Logging functions
export async function logAudit(
  action: AuditAction,
  entityType: EntityType,
  entityId: string,
  userId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  console.log('Audit log:', { action, entityType, entityId, userId, metadata });
}

export const logAction = logAudit;

export function logClientAction(action: AuditAction, clientId: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
  return logAudit(action, EntityType.CLIENT, clientId, userId, metadata);
}

export function logDebtAction(action: AuditAction, debtId: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
  return logAudit(action, EntityType.DEBT, debtId, userId, metadata);
}

export function logReminderAction(action: AuditAction, reminderId: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
  return logAudit(action, EntityType.REMINDER, reminderId, userId, metadata);
}

// Query functions
export async function queryAuditLogs(params: {
  userId?: string;
  action?: AuditAction;
  entityType?: EntityType;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}): Promise<AuditLogQueryResult> {
  return { logs: [], total: 0 };
}

export async function getAuditStatistics(params: {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<AuditStatistics> {
  return { totalActions: 0, actionCounts: {}, topUsers: [] };
}

// Type exports
export type AuditActionType = AuditAction;
export type EntityTypeType = EntityType;
