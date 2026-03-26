/**
 * Audit Module - Main Entry Point
 * Re-exports from modular audit components for backward compatibility
 */

// Main logger functions
export {
  logAudit,
  logClientAction,
  logDebtAction,
  logReminderAction,
  logAuthAction,
  logPaymentAction,
  logSettingsAction,
  logApiKeyAction,
  logTeamAction,
  logIntegrationAction,
  logPortalAction,
  logSecurityAction,
  queryAuditLogs,
  getAuditStatistics,
  getRelatedAuditLogs,
  deleteOldAuditLogs,
  AuditAction,
  EntityType,
  AuditStatus,
  type AuditLogParams,
  type AuditLogEntry,
  type AuditLogQueryOptions,
  type AuditActionType,
  type EntityTypeType,
  type AuditStatusType,
} from './audit/logger';

// Export functions
export {
  exportAuditLogs,
  exportAuditLogsCSV,
  exportAuditLogsJSON,
  exportAuditLogsPDF,
  generateAuditReport,
  type ExportFilters,
  type AuditReport,
} from './audit/export';

// Middleware
export {
  withAuditLogging,
  auditMiddleware,
} from './audit/middleware';

// Legacy compatibility
export { logAction } from './audit/legacy';
