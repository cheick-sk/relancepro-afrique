'use client';

/**
 * Audit Log Table Component
 * Displays audit logs in a sortable, filterable table with expandable rows
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  MoreHorizontal,
  User,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Types
export interface AuditLog {
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
  errorMessage: string | null;
  createdAt: Date | string;
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

interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading?: boolean;
  onViewDetails?: (log: AuditLog) => void;
  onSort?: (field: string) => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

// Action labels
const ACTION_LABELS: Record<string, string> = {
  // Auth
  'auth.login': 'Connexion',
  'auth.logout': 'Déconnexion',
  'auth.failed_login': 'Échec de connexion',
  'auth.password_reset': 'Réinitialisation mot de passe',
  'auth.2fa_enabled': '2FA activé',
  'auth.2fa_disabled': '2FA désactivé',
  
  // Clients
  'client.created': 'Client créé',
  'client.updated': 'Client modifié',
  'client.deleted': 'Client supprimé',
  'client.viewed': 'Client consulté',
  
  // Debts
  'debt.created': 'Créance créée',
  'debt.updated': 'Créance modifiée',
  'debt.deleted': 'Créance supprimée',
  'debt.paid': 'Créance payée',
  'debt.status_changed': 'Statut modifié',
  
  // Reminders
  'reminder.sent': 'Relance envoyée',
  'reminder.delivered': 'Relance délivrée',
  'reminder.opened': 'Relance ouverte',
  'reminder.failed': 'Échec relance',
  
  // Payments
  'payment.initiated': 'Paiement initié',
  'payment.completed': 'Paiement complété',
  'payment.failed': 'Paiement échoué',
  
  // Settings
  'settings.updated': 'Paramètres modifiés',
  'api_key.created': 'Clé API créée',
  'api_key.revoked': 'Clé API révoquée',
  
  // Team
  'team.created': 'Équipe créée',
  'team.member_invited': 'Membre invité',
  'team.member_joined': 'Membre rejoint',
  'team.member_removed': 'Membre supprimé',
  
  // Portal
  'portal.token_created': 'Token portail créé',
  'portal.accessed': 'Portail consulté',
  'portal.payment_initiated': 'Paiement portail',
};

// Entity type labels
const ENTITY_LABELS: Record<string, string> = {
  profile: 'Utilisateur',
  client: 'Client',
  debt: 'Créance',
  reminder: 'Relance',
  payment: 'Paiement',
  settings: 'Paramètres',
  api_key: 'Clé API',
  webhook: 'Webhook',
  team: 'Équipe',
  team_member: 'Membre',
  integration: 'Intégration',
  portal_token: 'Token portail',
  session: 'Session',
  template: 'Modèle',
};

// Status configurations
const STATUS_CONFIG = {
  success: {
    label: 'Succès',
    icon: CheckCircle,
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
  failed: {
    label: 'Échec',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-500 border-red-500/20',
  },
  pending: {
    label: 'En cours',
    icon: Loader2,
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
};

// Action category colors
const ACTION_COLORS: Record<string, string> = {
  auth: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  client: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  debt: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  reminder: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  payment: 'bg-green-500/10 text-green-500 border-green-500/20',
  settings: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  team: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  portal: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  security: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  admin: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

function getActionCategory(action: string): string {
  return action.split('.')[0] || 'other';
}

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

function getEntityLabel(entityType: string | null): string {
  if (!entityType) return '-';
  return ENTITY_LABELS[entityType] || entityType;
}

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
}

// SortHeader component - must be defined outside of the main component
const SortHeader = ({ 
  field, 
  children, 
  sortField, 
  sortOrder, 
  onSort 
}: { 
  field: string; 
  children: React.ReactNode;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}) => (
  <TableHead
    className={cn('cursor-pointer select-none hover:bg-muted/50', !onSort && 'pointer-events-none')}
    onClick={() => onSort?.(field)}
  >
    <div className="flex items-center gap-2">
      {children}
      {sortField === field && (
        sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
      )}
    </div>
  </TableHead>
);

export function AuditLogTable({
  logs,
  isLoading,
  onViewDetails,
  onSort,
  sortField,
  sortOrder,
}: AuditLogTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'dd MMM yyyy, HH:mm:ss', { locale: fr });
  };

  const formatRelativeTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return format(d, 'dd MMM', { locale: fr });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Activity className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Aucun log trouvé</p>
        <p className="text-sm">Modifiez vos filtres pour voir plus de résultats</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <ScrollArea className="max-h-[600px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <SortHeader field="createdAt" sortField={sortField} sortOrder={sortOrder} onSort={onSort}>
                <Clock className="h-4 w-4 mr-1" />
                Date
              </SortHeader>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entité</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const isExpanded = expandedRows.has(log.id);
              const statusConfig = getStatusConfig(log.status);
              const StatusIcon = statusConfig.icon;
              const actionCategory = getActionCategory(log.action);

              return (
                <>
                  <TableRow
                    key={log.id}
                    className={cn(
                      'cursor-pointer hover:bg-muted/50',
                      isExpanded && 'bg-muted/30'
                    )}
                    onClick={() => toggleRow(log.id)}
                  >
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {formatRelativeTime(log.createdAt)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={log.profile?.avatarUrl || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs">
                            {log.profile?.name?.charAt(0)?.toUpperCase() || 
                             log.profile?.email?.charAt(0)?.toUpperCase() || 
                             <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[150px]">
                            {log.profile?.name || 'Système'}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {log.profile?.email || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('font-normal', ACTION_COLORS[actionCategory] || '')}
                      >
                        {getActionLabel(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{getEntityLabel(log.entityType)}</span>
                        {log.entityId && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.entityId.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('font-normal', statusConfig.className)}
                      >
                        <StatusIcon className={cn(
                          'h-3 w-3 mr-1',
                          log.status === 'pending' && 'animate-spin'
                        )} />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewDetails?.(log)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Voir détails
                          </DropdownMenuItem>
                          {log.ipAddress && (
                            <DropdownMenuItem
                              onClick={() => navigator.clipboard.writeText(log.ipAddress!)}
                            >
                              Copier IP
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${log.id}-expanded`} className="bg-muted/20">
                      <TableCell colSpan={7} className="p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Adresse IP:</span>
                            <span className="ml-2 font-mono">{log.ipAddress || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Équipe:</span>
                            <span className="ml-2">{log.team?.name || 'N/A'}</span>
                          </div>
                          {log.details && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Détails:</span>
                              <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-[200px]">
                                {JSON.stringify(JSON.parse(log.details || '{}'), null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.errorMessage && (
                            <div className="col-span-2">
                              <div className="flex items-center gap-2 text-red-500">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="font-medium">Erreur:</span>
                              </div>
                              <pre className="mt-1 p-2 bg-red-500/10 rounded text-xs overflow-auto max-h-[100px] text-red-600">
                                {log.errorMessage}
                              </pre>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
