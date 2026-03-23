/**
 * Audit Log Export Module for RelancePro Africa
 * Supports CSV, JSON, and PDF export formats
 */

import { db } from '@/lib/db';
import type { AuditLogQueryOptions } from './logger';

// =====================================================
// INTERFACES
// =====================================================

export interface ExportFilters extends AuditLogQueryOptions {
  format?: 'csv' | 'json' | 'pdf';
  includeProfile?: boolean;
  includeTeam?: boolean;
  timezone?: string;
}

export interface AuditReport {
  title: string;
  generatedAt: Date;
  dateRange: {
    start: Date;
    end: Date;
  };
  teamId?: string;
  profileId?: string;
  summary: {
    totalLogs: number;
    successfulActions: number;
    failedActions: number;
    uniqueUsers: number;
    topActions: Array<{ action: string; count: number }>;
    topEntityTypes: Array<{ entityType: string; count: number }>;
  };
  timeline: Array<{
    date: string;
    total: number;
    success: number;
    failed: number;
  }>;
  logs: Array<any>;
}

// =====================================================
// EXPORT FUNCTIONS
// =====================================================

/**
 * Export audit logs to CSV format
 */
export async function exportAuditLogsCSV(options: ExportFilters): Promise<string> {
  const { logs } = await queryAuditLogsForExport(options);

  const headers = [
    'ID',
    'Date',
    'Heure',
    'Utilisateur',
    'Email',
    'Equipe',
    'Action',
    'Type Entité',
    'ID Entité',
    'Statut',
    'Adresse IP',
    'User Agent',
    'Détails',
    'Anciennes Valeurs',
    'Nouvelles Valeurs',
  ];

  const rows = [headers.join(',')];

  for (const log of logs) {
    const date = new Date(log.createdAt);
    const row = [
      log.id,
      date.toLocaleDateString('fr-FR'),
      date.toLocaleTimeString('fr-FR'),
      escapeCsvField(log.profile?.name || 'Système'),
      escapeCsvField(log.profile?.email || 'N/A'),
      escapeCsvField(log.team?.name || 'N/A'),
      escapeCsvField(log.action),
      escapeCsvField(log.entityType || ''),
      escapeCsvField(log.entityId || ''),
      log.status,
      escapeCsvField(log.ipAddress || ''),
      escapeCsvField(truncate(log.userAgent || '', 100)),
      escapeCsvField(truncate(log.details || '', 500)),
      escapeCsvField(truncate(log.oldValues || '', 500)),
      escapeCsvField(truncate(log.newValues || '', 500)),
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Export audit logs to JSON format
 */
export async function exportAuditLogsJSON(options: ExportFilters): Promise<string> {
  const { logs, total } = await queryAuditLogsForExport(options);

  const exportData = {
    exportedAt: new Date().toISOString(),
    filters: {
      startDate: options.startDate?.toISOString(),
      endDate: options.endDate?.toISOString(),
      teamId: options.teamId,
      profileId: options.profileId,
      entityType: options.entityType,
      action: options.action,
    },
    total,
    logs: logs.map(log => ({
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      profile: log.profile ? {
        id: log.profile.id,
        name: log.profile.name,
        email: log.profile.email,
        avatarUrl: log.profile.avatarUrl,
      } : null,
      team: log.team ? {
        id: log.team.id,
        name: log.team.name,
      } : null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      status: log.status,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      details: safeJsonParse(log.details),
      oldValues: safeJsonParse(log.oldValues),
      newValues: safeJsonParse(log.newValues),
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export audit logs to PDF format (as HTML for PDF generation)
 */
export async function exportAuditLogsPDF(options: ExportFilters): Promise<string> {
  const report = await generateAuditReport(
    options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    options.endDate || new Date(),
    options
  );

  return generatePDFHTML(report);
}

/**
 * Main export function that handles format selection
 */
export async function exportAuditLogs(options: ExportFilters): Promise<{
  content: string;
  filename: string;
  mimeType: string;
}> {
  const format = options.format || 'csv';
  const dateStr = new Date().toISOString().split('T')[0];

  let content: string;
  let filename: string;
  let mimeType: string;

  switch (format) {
    case 'json':
      content = await exportAuditLogsJSON(options);
      filename = `audit-logs-${dateStr}.json`;
      mimeType = 'application/json';
      break;
    case 'pdf':
      content = await exportAuditLogsPDF(options);
      filename = `audit-logs-${dateStr}.html`;
      mimeType = 'text/html';
      break;
    case 'csv':
    default:
      content = await exportAuditLogsCSV(options);
      filename = `audit-logs-${dateStr}.csv`;
      mimeType = 'text/csv';
      break;
  }

  return { content, filename, mimeType };
}

// =====================================================
// REPORT GENERATION
// =====================================================

/**
 * Generate comprehensive audit report
 */
export async function generateAuditReport(
  startDate: Date,
  endDate: Date,
  options: { teamId?: string; profileId?: string } = {}
): Promise<AuditReport> {
  // Get all logs for the period
  const { logs, total } = await queryAuditLogsForExport({
    ...options,
    startDate,
    endDate,
    limit: 10000,
  });

  // Calculate summary statistics
  const successfulActions = logs.filter(l => l.status === 'success').length;
  const failedActions = logs.filter(l => l.status === 'failed').length;
  const uniqueUsers = new Set(logs.filter(l => l.profileId).map(l => l.profileId)).size;

  // Count by action
  const actionCounts = new Map<string, number>();
  logs.forEach(log => {
    actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
  });
  const topActions = Array.from(actionCounts.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Count by entity type
  const entityCounts = new Map<string, number>();
  logs.forEach(log => {
    if (log.entityType) {
      entityCounts.set(log.entityType, (entityCounts.get(log.entityType) || 0) + 1);
    }
  });
  const topEntityTypes = Array.from(entityCounts.entries())
    .map(([entityType, count]) => ({ entityType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Group by date for timeline
  const timelineMap = new Map<string, { total: number; success: number; failed: number }>();
  logs.forEach(log => {
    const date = new Date(log.createdAt).toISOString().split('T')[0];
    const existing = timelineMap.get(date) || { total: 0, success: 0, failed: 0 };
    existing.total++;
    if (log.status === 'success') existing.success++;
    if (log.status === 'failed') existing.failed++;
    timelineMap.set(date, existing);
  });

  const timeline = Array.from(timelineMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    title: 'Rapport d\'Audit - RelancePro Africa',
    generatedAt: new Date(),
    dateRange: { start: startDate, end: endDate },
    teamId: options.teamId,
    profileId: options.profileId,
    summary: {
      totalLogs: total,
      successfulActions,
      failedActions,
      uniqueUsers,
      topActions,
      topEntityTypes,
    },
    timeline,
    logs: logs.slice(0, 1000), // Limit logs in report
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Query audit logs for export (no pagination limit)
 */
async function queryAuditLogsForExport(options: ExportFilters) {
  const where: any = {};

  if (options.profileId) where.profileId = options.profileId;
  if (options.teamId) where.teamId = options.teamId;
  if (options.action) {
    where.action = Array.isArray(options.action) ? { in: options.action } : options.action;
  }
  if (options.entityType) where.entityType = options.entityType;
  if (options.entityId) where.entityId = options.entityId;
  if (options.status) where.status = options.status;

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }

  if (options.search) {
    where.OR = [
      { details: { contains: options.search } },
      { ipAddress: { contains: options.search } },
      { profile: { email: { contains: options.search } } },
      { profile: { name: { contains: options.search } } },
    ];
  }

  const limit = options.limit || 5000;

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
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    db.auditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Escape field for CSV
 */
function escapeCsvField(field: string): string {
  if (!field) return '';
  const escaped = field.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Truncate string
 */
function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str || '';
  return str.substring(0, maxLength) + '...';
}

/**
 * Safe JSON parse
 */
function safeJsonParse(str: string | null): unknown {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

/**
 * Generate HTML for PDF export
 */
function generatePDFHTML(report: AuditReport): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      font-size: 12px; 
      line-height: 1.5;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #10b981;
    }
    .header h1 {
      font-size: 24px;
      color: #1a1a1a;
      margin-bottom: 10px;
    }
    .header .subtitle {
      color: #666;
      font-size: 14px;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .meta-item {
      text-align: center;
    }
    .meta-item .label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-item .value {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
      text-align: center;
    }
    .stat-card .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #10b981;
    }
    .stat-card .stat-label {
      font-size: 11px;
      color: #666;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
    }
    tr:hover {
      background: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 500;
    }
    .badge-success { background: #d1fae5; color: #059669; }
    .badge-failed { background: #fee2e2; color: #dc2626; }
    .badge-pending { background: #fef3c7; color: #d97706; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 10px;
    }
    @media print {
      body { padding: 20px; }
      .stat-card { break-inside: avoid; }
      table { break-inside: auto; }
      tr { break-inside: avoid; break-after: auto; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${report.title}</h1>
    <div class="subtitle">Période: ${formatDate(report.dateRange.start)} - ${formatDate(report.dateRange.end)}</div>
  </div>

  <div class="meta">
    <div class="meta-item">
      <div class="label">Généré le</div>
      <div class="value">${formatDate(report.generatedAt)}</div>
    </div>
    <div class="meta-item">
      <div class="label">Total actions</div>
      <div class="value">${report.summary.totalLogs.toLocaleString()}</div>
    </div>
    <div class="meta-item">
      <div class="label">Utilisateurs actifs</div>
      <div class="value">${report.summary.uniqueUsers}</div>
    </div>
    <div class="meta-item">
      <div class="label">Taux de succès</div>
      <div class="value">${report.summary.totalLogs > 0 ? Math.round(report.summary.successfulActions / report.summary.totalLogs * 100) : 0}%</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Résumé des Actions</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${report.summary.totalLogs.toLocaleString()}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #059669;">${report.summary.successfulActions.toLocaleString()}</div>
        <div class="stat-label">Succès</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #dc2626;">${report.summary.failedActions.toLocaleString()}</div>
        <div class="stat-label">Échecs</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #3b82f6;">${report.summary.uniqueUsers}</div>
        <div class="stat-label">Utilisateurs</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Top Actions</div>
    <table>
      <thead>
        <tr>
          <th>Action</th>
          <th>Nombre</th>
          <th>Pourcentage</th>
        </tr>
      </thead>
      <tbody>
        ${report.summary.topActions.map(a => `
          <tr>
            <td>${a.action}</td>
            <td>${a.count.toLocaleString()}</td>
            <td>${Math.round(a.count / report.summary.totalLogs * 100)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Timeline</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Total</th>
          <th>Succès</th>
          <th>Échecs</th>
        </tr>
      </thead>
      <tbody>
        ${report.timeline.slice(-14).map(t => `
          <tr>
            <td>${t.date}</td>
            <td>${t.total}</td>
            <td>${t.success}</td>
            <td>${t.failed}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Ce rapport a été généré automatiquement par RelancePro Africa.</p>
    <p>Document confidentiel - Usage interne uniquement</p>
  </div>
</body>
</html>
  `;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
