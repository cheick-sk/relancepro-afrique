'use client';

/**
 * Audit Filters Component
 * Provides filtering controls for audit logs
 */

import { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  ChevronDown,
  Filter,
  RefreshCw,
  X,
  User,
  Building,
  Activity,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Types
export interface AuditFilters {
  startDate?: Date;
  endDate?: Date;
  action?: string;
  entityType?: string;
  profileId?: string;
  status?: string;
  search?: string;
  ipAddress?: string;
}

interface AuditFiltersProps {
  filters: AuditFilters;
  onFiltersChange: (filters: AuditFilters) => void;
  onReset: () => void;
  actionOptions?: { value: string; count: number }[];
  entityTypeOptions?: { value: string; count: number }[];
  userOptions?: { id: string; name: string | null; email: string }[];
  isLoading?: boolean;
}

// Action options
const ACTION_GROUPS = [
  {
    label: 'Authentification',
    actions: [
      { value: 'auth.login', label: 'Connexion' },
      { value: 'auth.logout', label: 'Déconnexion' },
      { value: 'auth.failed_login', label: 'Échec de connexion' },
      { value: 'auth.password_reset', label: 'Réinit. mot de passe' },
      { value: 'auth.2fa_enabled', label: '2FA activé' },
      { value: 'auth.2fa_disabled', label: '2FA désactivé' },
    ],
  },
  {
    label: 'Clients',
    actions: [
      { value: 'client.created', label: 'Client créé' },
      { value: 'client.updated', label: 'Client modifié' },
      { value: 'client.deleted', label: 'Client supprimé' },
    ],
  },
  {
    label: 'Créances',
    actions: [
      { value: 'debt.created', label: 'Créance créée' },
      { value: 'debt.updated', label: 'Créance modifiée' },
      { value: 'debt.deleted', label: 'Créance supprimée' },
      { value: 'debt.paid', label: 'Créance payée' },
    ],
  },
  {
    label: 'Relances',
    actions: [
      { value: 'reminder.sent', label: 'Relance envoyée' },
      { value: 'reminder.delivered', label: 'Relance délivrée' },
      { value: 'reminder.failed', label: 'Échec relance' },
    ],
  },
  {
    label: 'Paiements',
    actions: [
      { value: 'payment.initiated', label: 'Paiement initié' },
      { value: 'payment.completed', label: 'Paiement complété' },
      { value: 'payment.failed', label: 'Paiement échoué' },
    ],
  },
  {
    label: 'Paramètres',
    actions: [
      { value: 'settings.updated', label: 'Paramètres modifiés' },
      { value: 'api_key.created', label: 'Clé API créée' },
      { value: 'api_key.revoked', label: 'Clé API révoquée' },
    ],
  },
  {
    label: 'Équipe',
    actions: [
      { value: 'team.member_invited', label: 'Membre invité' },
      { value: 'team.member_joined', label: 'Membre rejoint' },
      { value: 'team.member_removed', label: 'Membre supprimé' },
    ],
  },
];

// Entity type options
const ENTITY_TYPE_OPTIONS = [
  { value: 'profile', label: 'Utilisateur' },
  { value: 'client', label: 'Client' },
  { value: 'debt', label: 'Créance' },
  { value: 'reminder', label: 'Relance' },
  { value: 'payment', label: 'Paiement' },
  { value: 'settings', label: 'Paramètres' },
  { value: 'api_key', label: 'Clé API' },
  { value: 'team', label: 'Équipe' },
  { value: 'integration', label: 'Intégration' },
  { value: 'portal_token', label: 'Token portail' },
];

// Status options
const STATUS_OPTIONS = [
  { value: 'success', label: 'Succès', color: 'bg-emerald-500/10 text-emerald-500' },
  { value: 'failed', label: 'Échec', color: 'bg-red-500/10 text-red-500' },
  { value: 'pending', label: 'En cours', color: 'bg-amber-500/10 text-amber-500' },
];

// Quick filter presets
const QUICK_FILTERS = [
  { label: 'Aujourd\'hui', days: 0 },
  { label: '7 jours', days: 7 },
  { label: '30 jours', days: 30 },
  { label: '90 jours', days: 90 },
];

export function AuditFilters({
  filters,
  onFiltersChange,
  onReset,
  actionOptions,
  entityTypeOptions,
  userOptions,
  isLoading,
}: AuditFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  // Count active filters
  const activeFilterCount = [
    filters.startDate,
    filters.endDate,
    filters.action,
    filters.entityType,
    filters.profileId,
    filters.status,
    filters.search,
    filters.ipAddress,
  ].filter(Boolean).length;

  const handleQuickFilter = (days: number) => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(new Date(), days));
    onFiltersChange({
      ...filters,
      startDate: start,
      endDate: end,
    });
  };

  const handleSearch = (value: string) => {
    setLocalSearch(value);
    // Debounce search
    setTimeout(() => {
      onFiltersChange({ ...filters, search: value || undefined });
    }, 300);
  };

  const handleDateChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (type === 'start') {
      onFiltersChange({ ...filters, startDate: date ? startOfDay(date) : undefined });
    } else {
      onFiltersChange({ ...filters, endDate: date ? endOfDay(date) : undefined });
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Raccourcis:</span>
        {QUICK_FILTERS.map((qf) => (
          <Button
            key={qf.days}
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter(qf.days)}
            className={cn(
              'h-8',
              filters.startDate && 
              format(filters.startDate, 'yyyy-MM-dd') === format(subDays(new Date(), qf.days), 'yyyy-MM-dd') &&
              'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
            )}
          >
            {qf.label}
          </Button>
        ))}
      </div>

      <Separator />

      {/* Main filters row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {/* Date range */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 justify-start text-left font-normal">
                <Calendar className="h-4 w-4 mr-2" />
                {filters.startDate ? format(filters.startDate, 'dd/MM/yy') : 'Début'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.startDate}
                onSelect={(date) => handleDateChange('start', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 justify-start text-left font-normal">
                {filters.endDate ? format(filters.endDate, 'dd/MM/yy') : 'Fin'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.endDate}
                onSelect={(date) => handleDateChange('end', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Action filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 justify-start">
              <Activity className="h-4 w-4 mr-2" />
              {filters.action 
                ? ACTION_GROUPS.flatMap(g => g.actions).find(a => a.value === filters.action)?.label || filters.action
                : 'Action'}
              <ChevronDown className="h-4 w-4 ml-auto" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-2 max-h-[400px] overflow-auto" align="start">
            <div className="space-y-2">
              {ACTION_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
                    {group.label}
                  </div>
                  {group.actions.map((action) => (
                    <Button
                      key={action.value}
                      variant={filters.action === action.value ? 'secondary' : 'ghost'}
                      size="sm"
                      className="w-full justify-start text-sm"
                      onClick={() => onFiltersChange({
                        ...filters,
                        action: filters.action === action.value ? undefined : action.value,
                      })}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Entity type filter */}
        <Select
          value={filters.entityType || '__all'}
          onValueChange={(value) => onFiltersChange({
            ...filters,
            entityType: value === '__all' ? undefined : value,
          })}
        >
          <SelectTrigger className="h-9">
            <Building className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Type d'entité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Tous les types</SelectItem>
            {ENTITY_TYPE_OPTIONS.map((et) => (
              <SelectItem key={et.value} value={et.value}>
                {et.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={filters.status || '__all'}
          onValueChange={(value) => onFiltersChange({
            ...filters,
            status: value === '__all' ? undefined : value,
          })}
        >
          <SelectTrigger className="h-9">
            <Clock className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Tous les statuts</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                <div className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', s.color)} />
                  {s.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* User filter */}
        {userOptions && userOptions.length > 0 && (
          <Select
            value={filters.profileId || '__all'}
            onValueChange={(value) => onFiltersChange({
              ...filters,
              profileId: value === '__all' ? undefined : value,
            })}
          >
            <SelectTrigger className="h-9">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Utilisateur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Tous les utilisateurs</SelectItem>
              {userOptions.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Rechercher..."
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-9 pr-8"
          />
          {localSearch && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-9 w-9"
              onClick={() => {
                setLocalSearch('');
                onFiltersChange({ ...filters, search: undefined });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active filters and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilterCount > 0 && (
            <>
              <Badge variant="secondary" className="gap-1">
                <Filter className="h-3 w-3" />
                {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} actif{activeFilterCount > 1 ? 's' : ''}
              </Badge>
              {filters.startDate && (
                <Badge variant="outline" className="gap-1">
                  Du {format(filters.startDate, 'dd/MM/yyyy')}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, startDate: undefined })}
                  />
                </Badge>
              )}
              {filters.endDate && (
                <Badge variant="outline" className="gap-1">
                  Au {format(filters.endDate, 'dd/MM/yyyy')}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, endDate: undefined })}
                  />
                </Badge>
              )}
              {filters.action && (
                <Badge variant="outline" className="gap-1">
                  {ACTION_GROUPS.flatMap(g => g.actions).find(a => a.value === filters.action)?.label || filters.action}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, action: undefined })}
                  />
                </Badge>
              )}
              {filters.entityType && (
                <Badge variant="outline" className="gap-1">
                  {ENTITY_TYPE_OPTIONS.find(e => e.value === filters.entityType)?.label || filters.entityType}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, entityType: undefined })}
                  />
                </Badge>
              )}
              {filters.status && (
                <Badge variant="outline" className="gap-1">
                  {STATUS_OPTIONS.find(s => s.value === filters.status)?.label || filters.status}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, status: undefined })}
                  />
                </Badge>
              )}
              {filters.search && (
                <Badge variant="outline" className="gap-1">
                  "{filters.search}"
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => {
                      setLocalSearch('');
                      onFiltersChange({ ...filters, search: undefined });
                    }}
                  />
                </Badge>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
