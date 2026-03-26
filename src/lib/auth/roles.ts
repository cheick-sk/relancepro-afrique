export type TeamRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

export interface RoleInfo {
  name: string;
  description: string;
  permissions: string[];
  color: string;
}

export const ROLES_INFO: Record<TeamRole, RoleInfo> = {
  owner: {
    name: 'Propriétaire',
    description: 'Accès complet à toutes les fonctionnalités',
    permissions: ['all'],
    color: 'bg-purple-500',
  },
  admin: {
    name: 'Administrateur',
    description: 'Gestion de l\'équipe et des paramètres',
    permissions: ['manage_team', 'manage_settings', 'manage_clients', 'manage_debts'],
    color: 'bg-blue-500',
  },
  manager: {
    name: 'Gestionnaire',
    description: 'Gestion des clients et créances',
    permissions: ['manage_clients', 'manage_debts', 'send_reminders'],
    color: 'bg-green-500',
  },
  member: {
    name: 'Membre',
    description: 'Accès en lecture et envoi de relances',
    permissions: ['view_clients', 'view_debts', 'send_reminders'],
    color: 'bg-yellow-500',
  },
  viewer: {
    name: 'Observateur',
    description: 'Accès en lecture seule',
    permissions: ['view_clients', 'view_debts'],
    color: 'bg-gray-500',
  },
};

export const PERMISSION_MATRIX: Record<TeamRole, string[]> = {
  owner: ['all'],
  admin: ['view_clients', 'manage_clients', 'view_debts', 'manage_debts', 'send_reminders', 'manage_reminders', 'view_analytics', 'export_analytics', 'view_settings', 'manage_settings', 'view_team', 'manage_team'],
  manager: ['view_clients', 'manage_clients', 'view_debts', 'manage_debts', 'send_reminders', 'view_analytics', 'export_analytics'],
  member: ['view_clients', 'view_debts', 'send_reminders', 'view_analytics'],
  viewer: ['view_clients', 'view_debts', 'view_analytics'],
};

export function hasPermission(role: TeamRole, permission: string): boolean {
  const roleInfo = ROLES_INFO[role];
  return roleInfo.permissions.includes('all') || roleInfo.permissions.includes(permission);
}

export function canManageRole(actorRole: TeamRole, targetRole: TeamRole): boolean {
  const roleHierarchy: TeamRole[] = ['owner', 'admin', 'manager', 'member', 'viewer'];
  const actorIndex = roleHierarchy.indexOf(actorRole);
  const targetIndex = roleHierarchy.indexOf(targetRole);
  
  return actorIndex < targetIndex;
}

export function canAddMember(role: TeamRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function getAssignableRoles(role: TeamRole): TeamRole[] {
  if (role === 'owner') {
    return ['admin', 'manager', 'member', 'viewer'];
  }
  if (role === 'admin') {
    return ['manager', 'member', 'viewer'];
  }
  return [];
}

export function getRolePermissions(role: TeamRole): string[] {
  return ROLES_INFO[role]?.permissions || [];
}

export interface TeamLimit {
  maxMembers: number;
  maxClients: number;
  maxDebts: number;
}

export const TEAM_LIMITS_BY_PLAN: Record<string, TeamLimit> = {
  starter: { maxMembers: 1, maxClients: 10, maxDebts: 50 },
  business: { maxMembers: 5, maxClients: 100, maxDebts: 500 },
  enterprise: { maxMembers: -1, maxClients: -1, maxDebts: -1 },
};

export function getTeamLimit(plan: string): TeamLimit {
  return TEAM_LIMITS_BY_PLAN[plan] || TEAM_LIMITS_BY_PLAN.starter;
}
