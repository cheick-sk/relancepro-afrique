/**
 * Comprehensive Audit Logger for RelancePro Africa
 * Central logging for all system actions with detailed tracking
 */

import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

// =====================================================
// AUDIT ACTION TYPES
// =====================================================

export const AuditAction = {
  // Authentication
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_FAILED_LOGIN: 'auth.failed_login',
  AUTH_PASSWORD_RESET: 'auth.password_reset',
  AUTH_2FA_ENABLED: 'auth.2fa_enabled',
  AUTH_2FA_DISABLED: 'auth.2fa_disabled',
  AUTH_2FA_VERIFIED: 'auth.2fa_verified',
  AUTH_SESSION_REVOKED: 'auth.session_revoked',

  // Clients
  CLIENT_CREATED: 'client.created',
  CLIENT_UPDATED: 'client.updated',
  CLIENT_DELETED: 'client.deleted',
  CLIENT_VIEWED: 'client.viewed',
  CLIENT_EXPORTED: 'client.exported',

  // Debts
  DEBT_CREATED: 'debt.created',
  DEBT_UPDATED: 'debt.updated',
  DEBT_DELETED: 'debt.deleted',
  DEBT_PAID: 'debt.paid',
  DEBT_STATUS_CHANGED: 'debt.status_changed',
  DEBT_EXPORTED: 'debt.exported',

  // Reminders
  REMINDER_SENT: 'reminder.sent',
  REMINDER_DELIVERED: 'reminder.delivered',
  REMINDER_OPENED: 'reminder.opened',
  REMINDER_FAILED: 'reminder.failed',
  REMINDER_SCHEDULED: 'reminder.scheduled',
  REMINDER_CANCELLED: 'reminder.cancelled',

  // Payments
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Settings
  SETTINGS_UPDATED: 'settings.updated',
  API_KEY_CREATED: 'api_key.created',
  API_KEY_REVOKED: 'api_key.revoked',
  WEBHOOK_CREATED: 'webhook.created',
  WEBHOOK_DELETED: 'webhook.deleted',

  // Team
  TEAM_CREATED: 'team.created',
  TEAM_MEMBER_INVITED: 'team.member_invited',
  TEAM_MEMBER_JOINED: 'team.member_joined',
  TEAM_MEMBER_REMOVED: 'team.member_removed',
  TEAM_ROLE_CHANGED: 'team.role_changed',

  // Integration
  INTEGRATION_CONNECTED: 'integration.connected',
  INTEGRATION_DISCONNECTED: 'integration.disconnected',
  INTEGRATION_SYNC: 'integration.sync',

  // Portal
  PORTAL_TOKEN_CREATED: 'portal.token_created',
  PORTAL_TOKEN_REVOKED: 'portal.token_revoked',
  PORTAL_ACCESSED: 'portal.accessed',
  PORTAL_PAYMENT_INITIATED: 'portal.payment_initiated',
  PORTAL_MESSAGE_SENT: 'portal.message_sent',

  // Admin
  ADMIN_USER_UPDATED: 'admin.user_updated',
  ADMIN_DATA_EXPORTED: 'admin.data_exported',
  ADMIN_SETTINGS_CHANGED: 'admin.settings_changed',

  // Security
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
  SECURITY_IP_BLOCKED: 'security.ip_blocked',
  SECURITY_RATE_LIMITED: 'security.rate_limited',
} as const;

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction];

// =====================================================
// ENTITY TYPES
// =====================================================

export const EntityType = {
  PROFILE: 'profile',
  CLIENT: 'client',
  DEBT: 'debt',
  REMINDER: 'reminder',
  PAYMENT: 'payment',
  SETTINGS: 'settings',
  API_KEY: 'api_key',
  WEBHOOK: 'webhook',
  TEAM: 'team',
  TEAM_MEMBER: 'team_member',
  INVITATION: 'invitation',
  INTEGRATION: 'integration',
  PORTAL_TOKEN: 'portal_token',
  PORTAL_MESSAGE: 'portal_message',
  SESSION: 'session',
  SMS: 'sms',
  VOICE_CALL: 'voice_call',
  PUSH_SUBSCRIPTION: 'push_subscription',
  TEMPLATE: 'template',
} as const;

export type EntityTypeType = typeof EntityType[keyof typeof EntityType];

// =====================================================
// AUDIT STATUS
// =====================================================

export const AuditStatus = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
} as const;

export type AuditStatusType = typeof AuditStatus[keyof typeof AuditStatus];

// =====================================================
// INTERFACES
// =====================================================

export interface AuditLogParams {
  action: AuditActionType;
  entityType?: EntityTypeType;
  entityId?: string;
  profileId?: string;
  teamId?: string;
  details?: Record<string, unknown>;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  status?: AuditStatusType;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

export interface AuditLogEntry {
  id: string;
  profileId: string | null;
  teamId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: string;
  createdAt: Date;
  profile?: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
  team?: {
    id: string;
    name: string;
  } | null;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get request information from headers
 */
async function getRequestInfo(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const headersList = await headers();
    
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const cfConnectingIp = headersList.get('cf-connecting-ip');
    
    const ip = forwardedFor?.split(',')[0]?.trim() || realIp || cfConnectingIp || null;
    const userAgent = headersList.get('user-agent');
    
    return { ip, userAgent };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/**
 * Get current user from session
 */
async function getCurrentUser(): Promise<{ profileId: string; teamId: string | null } | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;
    
    const profile = await db.profile.findUnique({
      where: { id: session.user.id },
      select: { id: true, teamId: true },
    });
    
    return profile ? { profileId: profile.id, teamId: profile.teamId } : null;
  } catch {
    return null;
  }
}

/**
 * Serialize values for JSON storage
 */
function serializeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// =====================================================
// MAIN AUDIT LOG FUNCTION
// =====================================================

/**
 * Main audit logging function
 */
export async function logAudit(params: AuditLogParams): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    // Get request info and current user if not provided
    const [requestInfo, currentUser] = await Promise.all([
      getRequestInfo(),
      params.profileId ? null : getCurrentUser(),
    ]);

    const profileId = params.profileId || currentUser?.profileId;
    const teamId = params.teamId || currentUser?.teamId;
    const ipAddress = params.ipAddress || requestInfo.ip;
    const userAgent = params.userAgent || requestInfo.userAgent;

    const log = await db.auditLog.create({
      data: {
        profileId,
        teamId,
        action: params.action,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        details: serializeValue(params.details),
        oldValues: serializeValue(params.oldValues),
        newValues: serializeValue(params.newValues),
        ipAddress,
        userAgent,
        status: params.status || AuditStatus.SUCCESS,
      },
    });

    return { success: true, logId: log.id };
  } catch (error) {
    console.error('Audit log error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// =====================================================
// SPECIALIZED LOGGING FUNCTIONS
// =====================================================

/**
 * Log client-related actions
 */
export async function logClientAction(
  action: AuditActionType,
  clientId: string,
  details: {
    profileId?: string;
    teamId?: string;
    clientName?: string;
    clientEmail?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    status?: AuditStatusType;
    errorMessage?: string;
  } = {}
): Promise<void> {
  await logAudit({
    action,
    entityType: EntityType.CLIENT,
    entityId: clientId,
    profileId: details.profileId,
    teamId: details.teamId,
    details: {
      clientName: details.clientName,
      clientEmail: details.clientEmail,
    },
    oldValues: details.oldValues,
    newValues: details.newValues,
    status: details.status,
    errorMessage: details.errorMessage,
  });
}

/**
 * Log debt-related actions
 */
export async function logDebtAction(
  action: AuditActionType,
  debtId: string,
  details: {
    profileId?: string;
    teamId?: string;
    clientId?: string;
    amount?: number;
    currency?: string;
    reference?: string;
    oldStatus?: string;
    newStatus?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    status?: AuditStatusType;
    errorMessage?: string;
  } = {}
): Promise<void> {
  await logAudit({
    action,
    entityType: EntityType.DEBT,
    entityId: debtId,
    profileId: details.profileId,
    teamId: details.teamId,
    details: {
      clientId: details.clientId,
      amount: details.amount,
      currency: details.currency,
      reference: details.reference,
      oldStatus: details.oldStatus,
      newStatus: details.newStatus,
    },
    oldValues: details.oldValues,
    newValues: details.newValues,
    status: details.status,
    errorMessage: details.errorMessage,
  });
}

/**
 * Log reminder-related actions
 */
export async function logReminderAction(
  action: AuditActionType,
  reminderId: string,
  details: {
    profileId?: string;
    teamId?: string;
    debtId?: string;
    clientId?: string;
    type?: 'email' | 'whatsapp' | 'sms';
    status?: AuditStatusType;
    errorMessage?: string;
    deliveredAt?: Date;
    openedAt?: Date;
  } = {}
): Promise<void> {
  await logAudit({
    action,
    entityType: EntityType.REMINDER,
    entityId: reminderId,
    profileId: details.profileId,
    teamId: details.teamId,
    details: {
      debtId: details.debtId,
      clientId: details.clientId,
      type: details.type,
      deliveredAt: details.deliveredAt,
      openedAt: details.openedAt,
    },
    status: details.status,
    errorMessage: details.errorMessage,
  });
}

/**
 * Log authentication-related actions
 */
export async function logAuthAction(
  action: AuditActionType,
  details: {
    profileId?: string;
    email?: string;
    loginMethod?: string;
    failedReason?: string;
    ipAddress?: string;
    userAgent?: string;
    status?: AuditStatusType;
    twoFactorUsed?: boolean;
  } = {}
): Promise<void> {
  await logAudit({
    action,
    entityType: EntityType.PROFILE,
    entityId: details.profileId,
    profileId: details.profileId,
    details: {
      email: details.email,
      loginMethod: details.loginMethod,
      failedReason: details.failedReason,
      twoFactorUsed: details.twoFactorUsed,
    },
    status: details.status || (action === AuditAction.AUTH_FAILED_LOGIN ? AuditStatus.FAILED : AuditStatus.SUCCESS),
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    errorMessage: details.failedReason,
  });
}

/**
 * Log payment-related actions
 */
export async function logPaymentAction(
  action: AuditActionType,
  paymentId: string,
  details: {
    profileId?: string;
    teamId?: string;
    clientId?: string;
    debtId?: string;
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    paystackRef?: string;
    oldStatus?: string;
    newStatus?: string;
    status?: AuditStatusType;
    errorMessage?: string;
  } = {}
): Promise<void> {
  await logAudit({
    action,
    entityType: EntityType.PAYMENT,
    entityId: paymentId,
    profileId: details.profileId,
    teamId: details.teamId,
    details: {
      clientId: details.clientId,
      debtId: details.debtId,
      amount: details.amount,
      currency: details.currency,
      paymentMethod: details.paymentMethod,
      paystackRef: details.paystackRef,
      oldStatus: details.oldStatus,
      newStatus: details.newStatus,
    },
    oldValues: details.oldStatus ? { status: details.oldStatus } : undefined,
    newValues: details.newStatus ? { status: details.newStatus } : undefined,
    status: details.status,
    errorMessage: details.errorMessage,
  });
}

/**
 * Log settings-related actions
 */
export async function logSettingsAction(
  action: AuditActionType,
  details: {
    profileId?: string;
    teamId?: string;
    settingType?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    status?: AuditStatusType;
    errorMessage?: string;
  } = {}
): Promise<void> {
  await logAudit({
    action,
    entityType: EntityType.SETTINGS,
    profileId: details.profileId,
    teamId: details.teamId,
    details: {
      settingType: details.settingType,
    },
    oldValues: details.oldValues,
    newValues: details.newValues,
    status: details.status,
    errorMessage: details.errorMessage,
  });
}

/**
 * Log API key-related actions
 */
export async function logApiKeyAction(
  action: AuditActionType,
  apiKeyId: string,
  details: {
    profileId?: string;
    teamId?: string;
    keyName?: string;
    keyPrefix?: string;
    scopes?: string[];
    status?: AuditStatusType;
    errorMessage?: string;
  } = {}
): Promise<void> {
  await logAudit({
    action,
    entityType: EntityType.API_KEY,
    entityId: apiKeyId,
    profileId: details.profileId,
    teamId: details.teamId,
    details: {
      keyName: details.keyName,
      keyPrefix: details.keyPrefix,
      scopes: details.scopes,
    },
    status: details.status,
    errorMessage: details.errorMessage,
  });
}

/**
 * Log team-related actions
 */
export async function logTeamAction(
  action: AuditActionType,
  teamId: string,
  details: {
    profileId?: string;
    memberId?: string;
    memberEmail?: string;
    role?: string;
    oldRole?: string;
    newRole?: string;
    status?: AuditStatusType;
    errorMessage?: string;
  } = {}
): Promise<void> {
  await logAudit({
    action,
    entityType: EntityType.TEAM,
    entityId: action.includes('member') ? details.memberId : teamId,
    profileId: details.profileId,
    teamId,
    details: {
      memberId: details.memberId,
      memberEmail: details.memberEmail,
      role: details.role,
      oldRole: details.oldRole,
      newRole: details.newRole,
    },
    status: details.status,
    errorMessage: details.errorMessage,
  });
}

/**
 * Log integration-related actions
 */
export async function logIntegrationAction(
  action: AuditActionType,
  integrationId: string,
  details: {
    profileId?: string;
    teamId?: string;
    integrationType?: string;
    status?: AuditStatusType;
    errorMessage?: string;
    syncResult?: {
      invoicesImported?: number;
      clientsImported?: number;
      errors?: string[];
    };
  } = {}
): Promise<void> {
  await logAudit({
    action,
    entityType: EntityType.INTEGRATION,
    entityId: integrationId,
    profileId: details.profileId,
    teamId: details.teamId,
    details: {
      integrationType: details.integrationType,
      syncResult: details.syncResult,
    },
    status: details.status,
    errorMessage: details.errorMessage,
  });
}

/**
 * Log portal-related actions
 */
export async function logPortalAction(
  action: AuditActionType,
  details: {
    profileId?: string;
    teamId?: string;
    tokenId?: string;
    clientId?: string;
    debtId?: string;
    paymentId?: string;
    messageId?: string;
    status?: AuditStatusType;
    errorMessage?: string;
  } = {}
): Promise<void> {
  const entityType = action.includes('token') ? EntityType.PORTAL_TOKEN : 
                     action.includes('message') ? EntityType.PORTAL_MESSAGE :
                     action.includes('payment') ? EntityType.PAYMENT : EntityType.PORTAL_TOKEN;
  
  await logAudit({
    action,
    entityType,
    entityId: details.tokenId || details.paymentId || details.messageId,
    profileId: details.profileId,
    teamId: details.teamId,
    details: {
      clientId: details.clientId,
      debtId: details.debtId,
    },
    status: details.status,
    errorMessage: details.errorMessage,
  });
}

/**
 * Log security-related events
 */
export async function logSecurityAction(
  action: AuditActionType,
  details: {
    profileId?: string;
    teamId?: string;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    status?: AuditStatusType;
    errorMessage?: string;
  } = {}
): Promise<void> {
  await logAudit({
    action,
    entityType: EntityType.SESSION,
    profileId: details.profileId,
    teamId: details.teamId,
    details: {
      reason: details.reason,
      severity: details.severity,
    },
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    status: details.status,
    errorMessage: details.errorMessage,
  });
}

// =====================================================
// QUERY FUNCTIONS
// =====================================================

export interface AuditLogQueryOptions {
  profileId?: string;
  teamId?: string;
  action?: AuditActionType | AuditActionType[];
  entityType?: EntityTypeType;
  entityId?: string;
  status?: AuditStatusType;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  ipAddress?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'action' | 'entityType';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(options: AuditLogQueryOptions) {
  const {
    profileId,
    teamId,
    action,
    entityType,
    entityId,
    status,
    startDate,
    endDate,
    search,
    ipAddress,
    page = 1,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const where: any = {};

  if (profileId) where.profileId = profileId;
  if (teamId) where.teamId = teamId;
  if (action) where.action = Array.isArray(action) ? { in: action } : action;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (status) where.status = status;
  if (ipAddress) where.ipAddress = { contains: ipAddress };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  if (search) {
    where.OR = [
      { details: { contains: search } },
      { oldValues: { contains: search } },
      { newValues: { contains: search } },
      { ipAddress: { contains: search } },
      { profile: { email: { contains: search } } },
      { profile: { name: { contains: search } } },
    ];
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get audit statistics
 */
export async function getAuditStatistics(options: {
  teamId?: string;
  profileId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const where: any = {};
  if (options.teamId) where.teamId = options.teamId;
  if (options.profileId) where.profileId = options.profileId;
  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }

  const [totalLogs, byAction, byEntityType, byUser, byStatus] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.groupBy({
      by: ['action'],
      where,
      _count: true,
    }),
    db.auditLog.groupBy({
      by: ['entityType'],
      where,
      _count: true,
    }),
    db.auditLog.groupBy({
      by: ['profileId'],
      where,
      _count: true,
      orderBy: { _count: { profileId: 'desc' } },
      take: 10,
    }),
    db.auditLog.groupBy({
      by: ['status'],
      where,
      _count: true,
    }),
  ]);

  // Get user details for top users
  const userIds = byUser.filter(u => u.profileId).map(u => u.profileId);
  const users = await db.profile.findMany({
    where: { id: { in: userIds as string[] } },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });

  const userMap = new Map(users.map(u => [u.id, u]));

  return {
    totalLogs,
    byAction: Object.fromEntries(byAction.map(a => [a.action, a._count])),
    byEntityType: Object.fromEntries(byEntityType.filter(e => e.entityType).map(e => [e.entityType, e._count])),
    byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
    topUsers: byUser
      .filter(u => u.profileId)
      .map(u => ({
        ...userMap.get(u.profileId!),
        count: u._count,
      })),
  };
}

/**
 * Get related audit logs for an entity
 */
export async function getRelatedAuditLogs(entityType: EntityTypeType, entityId: string, limit: number = 10) {
  return db.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      profile: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Delete old audit logs (for cleanup)
 */
export async function deleteOldAuditLogs(daysToKeep: number = 90): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);

  const result = await db.auditLog.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });

  return result.count;
}

// Re-export for backward compatibility
export { logAction } from './legacy';
