'use client';

/**
 * Audit Detail Drawer Component
 * Slide-out drawer for viewing detailed audit log information
 */

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  X,
  User,
  Clock,
  Globe,
  Monitor,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
  ChevronRight,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { AuditLog } from './audit-log-table';

interface AuditDetailDrawerProps {
  log: AuditLog | null;
  relatedLogs?: AuditLog[];
  isOpen: boolean;
  onClose: () => void;
  onViewRelated?: (entityType: string, entityId: string) => void;
}

// Action labels (same as table)
const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Connexion',
  'auth.logout': 'Déconnexion',
  'auth.failed_login': 'Échec de connexion',
  'auth.password_reset': 'Réinitialisation mot de passe',
  'auth.2fa_enabled': '2FA activé',
  'auth.2fa_disabled': '2FA désactivé',
  'client.created': 'Client créé',
  'client.updated': 'Client modifié',
  'client.deleted': 'Client supprimé',
  'debt.created': 'Créance créée',
  'debt.updated': 'Créance modifiée',
  'debt.deleted': 'Créance supprimée',
  'debt.paid': 'Créance payée',
  'reminder.sent': 'Relance envoyée',
  'reminder.delivered': 'Relance délivrée',
  'reminder.failed': 'Échec relance',
  'payment.initiated': 'Paiement initié',
  'payment.completed': 'Paiement complété',
  'payment.failed': 'Paiement échoué',
  'settings.updated': 'Paramètres modifiés',
  'api_key.created': 'Clé API créée',
  'api_key.revoked': 'Clé API révoquée',
  'team.member_invited': 'Membre invité',
  'team.member_joined': 'Membre rejoint',
};

const ENTITY_LABELS: Record<string, string> = {
  profile: 'Utilisateur',
  client: 'Client',
  debt: 'Créance',
  reminder: 'Relance',
  payment: 'Paiement',
  settings: 'Paramètres',
  api_key: 'Clé API',
  team: 'Équipe',
  integration: 'Intégration',
  portal_token: 'Token portail',
};

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

function getEntityLabel(entityType: string | null): string {
  if (!entityType) return '-';
  return ENTITY_LABELS[entityType] || entityType;
}

function safeJsonParse(str: string | null): unknown {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

// JSON Viewer Component
function JsonViewer({ data, label }: { data: unknown; label: string }) {
  if (!data) return null;

  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2"
          onClick={() => navigator.clipboard.writeText(jsonStr)}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <pre className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-[200px] font-mono">
        {jsonStr}
      </pre>
    </div>
  );
}

// Diff Viewer Component
function DiffViewer({ oldValues, newValues }: { oldValues: string | null; newValues: string | null }) {
  const oldData = safeJsonParse(oldValues) as Record<string, unknown> | null;
  const newData = safeJsonParse(newValues) as Record<string, unknown> | null;

  if (!oldData && !newData) return null;

  // Get all keys
  const allKeys = new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ]);

  const changes = Array.from(allKeys).map((key) => {
    const oldValue = oldData?.[key];
    const newValue = newData?.[key];
    const changed = JSON.stringify(oldValue) !== JSON.stringify(newValue);

    return {
      key,
      oldValue,
      newValue,
      changed,
      added: oldValue === undefined && newValue !== undefined,
      removed: oldValue !== undefined && newValue === undefined,
    };
  });

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-muted-foreground">Changements</span>
      <div className="border rounded-md divide-y">
        {changes.map(({ key, oldValue, newValue, changed, added, removed }) => (
          <div key={key} className={cn(
            'grid grid-cols-3 gap-2 p-2 text-sm',
            added && 'bg-green-500/5',
            removed && 'bg-red-500/5',
          )}>
            <div className="font-mono text-xs">{key}</div>
            <div className={cn(
              'font-mono text-xs truncate',
              changed && !added && 'bg-red-500/10 text-red-600 rounded px-1',
            )}>
              {oldValue !== undefined ? JSON.stringify(oldValue) : '-'}
            </div>
            <div className={cn(
              'font-mono text-xs truncate',
              changed && !removed && 'bg-green-500/10 text-green-600 rounded px-1',
            )}>
              {newValue !== undefined ? JSON.stringify(newValue) : '-'}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500/10 border" />
          Ancien
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500/10 border" />
          Nouveau
        </div>
      </div>
    </div>
  );
}

export function AuditDetailDrawer({
  log,
  relatedLogs = [],
  isOpen,
  onClose,
  onViewRelated,
}: AuditDetailDrawerProps) {
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAnimationClass('translate-x-0');
    } else {
      setAnimationClass('translate-x-full');
    }
  }, [isOpen]);

  if (!log) return null;

  const statusConfig = {
    success: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    pending: { icon: Loader2, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  }[log.status] || statusConfig.pending;

  const StatusIcon = statusConfig.icon;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full sm:w-[500px] bg-background border-l shadow-xl z-50 transition-transform duration-300',
          animationClass
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', statusConfig.bg)}>
                <StatusIcon className={cn('h-5 w-5', statusConfig.color, log.status === 'pending' && 'animate-spin')} />
              </div>
              <div>
                <h2 className="font-semibold">{getActionLabel(log.action)}</h2>
                <p className="text-sm text-muted-foreground">
                  {getEntityLabel(log.entityType)}
                  {log.entityId && ` • ${log.entityId.substring(0, 8)}...`}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* User info */}
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={log.profile?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    {log.profile?.name?.charAt(0)?.toUpperCase() || 
                     log.profile?.email?.charAt(0)?.toUpperCase() || 'S'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{log.profile?.name || 'Système'}</div>
                  <div className="text-sm text-muted-foreground">{log.profile?.email || 'N/A'}</div>
                  {log.team && (
                    <Badge variant="outline" className="mt-1">
                      {log.team.name}
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Timestamps */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Date: </span>
                    <span className="font-medium">
                      {format(new Date(log.createdAt), 'EEEE dd MMMM yyyy', { locale: fr })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Heure: </span>
                    <span className="font-medium">
                      {format(new Date(log.createdAt), 'HH:mm:ss')}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Request metadata */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Métadonnées</h3>
                
                {log.ipAddress && (
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">IP: </span>
                      <code className="bg-muted px-1 rounded font-mono">{log.ipAddress}</code>
                    </div>
                  </div>
                )}

                {log.userAgent && (
                  <div className="flex items-start gap-3 text-sm">
                    <Monitor className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">User Agent:</span>
                      <div className="mt-1 text-xs bg-muted p-2 rounded break-all">
                        {log.userAgent}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Error message */}
              {log.errorMessage && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Erreur</span>
                    </div>
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-sm text-red-600">
                      {log.errorMessage}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Details */}
              {log.details && (
                <>
                  <JsonViewer data={safeJsonParse(log.details)} label="Détails" />
                  <Separator />
                </>
              )}

              {/* Diff view */}
              {(log.oldValues || log.newValues) && (
                <>
                  <DiffViewer oldValues={log.oldValues} newValues={log.newValues} />
                  <Separator />
                </>
              )}

              {/* Related logs */}
              {relatedLogs.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Logs liés ({relatedLogs.length})</span>
                  </div>
                  <div className="space-y-2">
                    {relatedLogs.slice(0, 5).map((related) => (
                      <button
                        key={related.id}
                        className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded-md text-sm transition-colors"
                        onClick={() => onViewRelated?.(related.entityType!, related.entityId!)}
                      >
                        <div className="flex items-center justify-between">
                          <span>{getActionLabel(related.action)}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(related.createdAt), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </button>
                    ))}
                    {relatedLogs.length > 5 && (
                      <Button variant="ghost" size="sm" className="w-full">
                        Voir les {relatedLogs.length - 5} autres
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              {log.entityType && log.entityId && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onViewRelated?.(log.entityType!, log.entityId!)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir l'entité
                </Button>
              )}
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
