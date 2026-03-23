/**
 * Audit Logging Module
 * RelancePro Africa - Security Module
 * Enregistre les actions critiques pour la traçabilité et la sécurité
 */

import { db } from './db';
import { headers } from 'next/headers';
import type { Prisma } from '@prisma/client';

// Types d'actions auditables
export const AuditAction = {
  // Authentification
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_CHANGE: 'password_change',
  PASSWORD_RESET: 'password_reset',
  
  // Two-Factor Authentication
  TWO_FACTOR_ENABLE: 'two_factor_enable',
  TWO_FACTOR_DISABLE: 'two_factor_disable',
  TWO_FACTOR_VERIFY: 'two_factor_verify',
  RECOVERY_CODE_USED: 'recovery_code_used',
  
  // Gestion des clients
  CLIENT_CREATE: 'client_create',
  CLIENT_UPDATE: 'client_update',
  CLIENT_DELETE: 'client_delete',
  
  // Gestion des créances
  DEBT_CREATE: 'debt_create',
  DEBT_UPDATE: 'debt_update',
  DEBT_DELETE: 'debt_delete',
  
  // Relances
  REMINDER_SEND: 'reminder_send',
  REMINDER_SCHEDULE: 'reminder_schedule',
  
  // Paramètres
  SETTINGS_UPDATE: 'settings_update',
  API_KEY_UPDATE: 'api_key_update',
  
  // Abonnement
  SUBSCRIPTION_START: 'subscription_start',
  SUBSCRIPTION_CANCEL: 'subscription_cancel',
  SUBSCRIPTION_UPGRADE: 'subscription_upgrade',
  SUBSCRIPTION_DOWNGRADE: 'subscription_downgrade',
  
  // Sessions
  SESSION_REVOKE: 'session_revoke',
  TRUSTED_DEVICE_ADD: 'trusted_device_add',
  TRUSTED_DEVICE_REMOVE: 'trusted_device_remove',
  
  // Admin
  ADMIN_USER_UPDATE: 'admin_user_update',
  ADMIN_DATA_EXPORT: 'admin_data_export',
} as const;

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction];

// Types d'entités
export const EntityType = {
  PROFILE: 'Profile',
  CLIENT: 'Client',
  DEBT: 'Debt',
  REMINDER: 'Reminder',
  SETTINGS: 'Settings',
  PAYMENT: 'Payment',
  WEBHOOK: 'Webhook',
  SESSION: 'Session',
  NOTIFICATION: 'Notification',
} as const;

export type EntityTypeType = typeof EntityType[keyof typeof EntityType];

// Statuts des actions
export const AuditStatus = {
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

export type AuditStatusType = typeof AuditStatus[keyof typeof AuditStatus];

/**
 * Options pour l'enregistrement d'une action d'audit
 */
export interface AuditLogOptions {
  userId?: string;
  action: AuditActionType;
  entityType?: EntityTypeType;
  entityId?: string;
  oldValue?: Record<string, unknown> | string | null;
  newValue?: Record<string, unknown> | string | null;
  status?: AuditStatusType;
  details?: Record<string, unknown> | string | null;
  ip?: string;
  userAgent?: string;
}

/**
 * Récupère les informations de la requête courante
 */
async function getRequestInfo(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const headersList = await headers();
    
    // Essayer plusieurs en-têtes pour l'IP
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const cfConnectingIp = headersList.get('cf-connecting-ip'); // Cloudflare
    
    const ip = forwardedFor?.split(',')[0]?.trim() || realIp || cfConnectingIp || null;
    const userAgent = headersList.get('user-agent');
    
    return { ip, userAgent };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/**
 * Enregistre une action dans le journal d'audit
 * @param options - Options de l'action à enregistrer
 */
export async function logAction(options: AuditLogOptions): Promise<void> {
  try {
    // Récupérer les infos de la requête si non fournies
    const requestInfo = await getRequestInfo();
    const ip = options.ip || requestInfo.ip;
    const userAgent = options.userAgent || requestInfo.userAgent;
    
    // Sérialiser les valeurs
    const oldValueStr = options.oldValue 
      ? (typeof options.oldValue === 'string' ? options.oldValue : JSON.stringify(options.oldValue))
      : null;
    
    const newValueStr = options.newValue
      ? (typeof options.newValue === 'string' ? options.newValue : JSON.stringify(options.newValue))
      : null;
    
    const detailsStr = options.details
      ? (typeof options.details === 'string' ? options.details : JSON.stringify(options.details))
      : null;
    
    // Créer l'entrée d'audit
    await db.auditLog.create({
      data: {
        userId: options.userId,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId,
        oldValue: oldValueStr,
        newValue: newValueStr,
        ip,
        userAgent,
        status: options.status || AuditStatus.SUCCESS,
        details: detailsStr,
      },
    });
  } catch (error) {
    // Ne pas bloquer l'application si l'audit échoue
    console.error('Erreur lors de l\'enregistrement de l\'audit:', error);
  }
}

/**
 * Options pour la recherche dans les logs d'audit
 */
export interface AuditLogQueryOptions {
  userId?: string;
  action?: AuditActionType | AuditActionType[];
  entityType?: EntityTypeType;
  entityId?: string;
  status?: AuditStatusType;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Récupère les logs d'audit avec filtres
 */
export async function getAuditLogs(options: AuditLogQueryOptions) {
  const {
    userId,
    action,
    entityType,
    entityId,
    status,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 50,
  } = options;
  
  const where: Prisma.AuditLogWhereInput = {};
  
  if (userId) {
    where.userId = userId;
  }
  
  if (action) {
    where.action = Array.isArray(action) ? { in: action } : action;
  }
  
  if (entityType) {
    where.entityType = entityType;
  }
  
  if (entityId) {
    where.entityId = entityId;
  }
  
  if (status) {
    where.status = status;
  }
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }
  
  // Recherche textuelle (dans les détails, oldValue, newValue)
  if (search) {
    where.OR = [
      { details: { contains: search } },
      { oldValue: { contains: search } },
      { newValue: { contains: search } },
      { ip: { contains: search } },
      { user: { email: { contains: search } } },
      { user: { name: { contains: search } } },
    ];
  }
  
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
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
 * Récupère les logs d'audit pour un utilisateur spécifique
 */
export async function getUserAuditLogs(userId: string, limit: number = 20) {
  return db.auditLog.findMany({
    where: { userId },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Récupère les actions suspectes (multiples échecs de connexion, etc.)
 */
export async function getSuspiciousActivity(hours: number = 24) {
  const since = new Date();
  since.setHours(since.getHours() - hours);
  
  // Échecs de connexion multiples
  const failedLogins = await db.auditLog.groupBy({
    by: ['ip'],
    where: {
      action: AuditAction.LOGIN_FAILED,
      status: AuditStatus.FAILED,
      createdAt: { gte: since },
    },
    _count: true,
    having: {
      ip: { _count: { gte: 5 } },
    },
  });
  
  // Actions sensibles récentes
  const sensitiveActions = await db.auditLog.findMany({
    where: {
      action: {
        in: [
          AuditAction.PASSWORD_CHANGE,
          AuditAction.TWO_FACTOR_DISABLE,
          AuditAction.API_KEY_UPDATE,
        ],
      },
      createdAt: { gte: since },
    },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  return {
    failedLogins,
    sensitiveActions,
  };
}

/**
 * Statistiques d'audit
 */
export async function getAuditStats(days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const [totalLogs, uniqueUsers, actionsByType, recentActivity] = await Promise.all([
    // Total des logs
    db.auditLog.count({
      where: { createdAt: { gte: since } },
    }),
    
    // Utilisateurs uniques
    db.auditLog.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    
    // Actions par type
    db.auditLog.groupBy({
      by: ['action'],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    
    // Activité récente par jour
    db.$queryRaw<Array<{ date: Date; count: number }>>`
      SELECT DATE(createdAt) as date, COUNT(*) as count
      FROM AuditLog
      WHERE createdAt >= ${since}
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `,
  ]);
  
  return {
    totalLogs,
    uniqueUsers: uniqueUsers.filter(u => u.userId).length,
    actionsByType: Object.fromEntries(actionsByType.map(a => [a.action, a._count])),
    recentActivity,
  };
}

/**
 * Export des logs d'audit en CSV
 */
export async function exportAuditLogs(options: AuditLogQueryOptions): Promise<string> {
  const { logs } = await getAuditLogs({ ...options, limit: 10000 });
  
  const headers = ['Date', 'Utilisateur', 'Email', 'Action', 'Entité', 'ID Entité', 'Statut', 'IP', 'Détails'];
  const rows = [headers.join(',')];
  
  for (const log of logs) {
    const row = [
      log.createdAt.toISOString(),
      log.user?.name || 'N/A',
      log.user?.email || 'N/A',
      log.action,
      log.entityType || '',
      log.entityId || '',
      log.status,
      log.ip || '',
      `"${(log.details || '').replace(/"/g, '""')}"`,
    ];
    rows.push(row.join(','));
  }
  
  return rows.join('\n');
}

/**
 * Nettoie les anciens logs d'audit (à exécuter périodiquement)
 */
export async function cleanOldAuditLogs(daysToKeep: number = 90): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);
  
  const result = await db.auditLog.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });
  
  return result.count;
}
