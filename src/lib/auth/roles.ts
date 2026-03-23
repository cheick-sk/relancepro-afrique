// =====================================================
// RELANCEPRO AFRICA - Role Definitions
// Système de rôles et permissions pour le contrôle d'accès
// =====================================================

import { Permission, ALL_PERMISSIONS, PERMISSIONS_INFO } from './permissions';

/**
 * Rôles disponibles dans le système
 */
export type TeamRole = 'owner' | 'admin' | 'manager' | 'agent' | 'viewer';

/**
 * Interface pour les informations d'un rôle
 */
export interface RoleInfo {
  name: TeamRole;
  label: string;
  description: string;
  color: string; // Couleur pour l'affichage des badges (Tailwind class)
  bgColor: string; // Background color for badges
  textColor: string; // Text color for badges
  icon: string; // Lucide icon name
  permissions: Permission[];
}

/**
 * Informations détaillées sur chaque rôle
 * 
 * Couleurs:
 * - OWNER: Gold (jaune doré)
 * - ADMIN: Red (rouge)
 * - MANAGER: Blue (bleu)
 * - AGENT: Green (vert)
 * - VIEWER: Gray (gris)
 */
export const ROLES_INFO: Record<TeamRole, RoleInfo> = {
  owner: {
    name: 'owner',
    label: 'Propriétaire',
    description: 'Accès complet à toutes les fonctionnalités, y compris la gestion de l\'équipe et la facturation',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    icon: 'Crown',
    permissions: ALL_PERMISSIONS, // Toutes les permissions
  },
  admin: {
    name: 'admin',
    label: 'Administrateur',
    description: 'Accès complet aux données et gestion de l\'équipe, sans accès à la facturation',
    color: 'bg-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    icon: 'Shield',
    permissions: [
      // Dashboard
      'dashboard:view',
      // Clients
      'clients:view',
      'clients:create',
      'clients:edit',
      'clients:delete',
      // Dettes
      'debts:view',
      'debts:create',
      'debts:edit',
      'debts:delete',
      // Relances
      'reminders:send',
      // Rapports
      'reports:view',
      // Paramètres
      'settings:manage',
      // Équipe
      'team:manage',
    ],
  },
  manager: {
    name: 'manager',
    label: 'Gestionnaire',
    description: 'Gestion des clients, créances, relances et rapports. Peut créer et modifier mais pas supprimer',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    icon: 'Briefcase',
    permissions: [
      // Dashboard
      'dashboard:view',
      // Clients
      'clients:view',
      'clients:create',
      'clients:edit',
      'clients:delete',
      // Dettes
      'debts:view',
      'debts:create',
      'debts:edit',
      'debts:delete',
      // Relances
      'reminders:send',
      // Rapports
      'reports:view',
    ],
  },
  agent: {
    name: 'agent',
    label: 'Agent',
    description: 'Accès aux clients et créances, peut envoyer des relances mais ne peut pas supprimer',
    color: 'bg-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    icon: 'User',
    permissions: [
      // Dashboard
      'dashboard:view',
      // Clients
      'clients:view',
      'clients:create',
      'clients:edit',
      // Dettes
      'debts:view',
      'debts:create',
      'debts:edit',
      // Relances
      'reminders:send',
    ],
  },
  viewer: {
    name: 'viewer',
    label: 'Observateur',
    description: 'Accès en lecture seule aux données. Ne peut pas modifier ni envoyer de relances',
    color: 'bg-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-400',
    icon: 'Eye',
    permissions: [
      // Dashboard
      'dashboard:view',
      // Clients (lecture seule)
      'clients:view',
      // Dettes (lecture seule)
      'debts:view',
    ],
  },
};

/**
 * Matrice des permissions par rôle
 * Format: Record<Permission, Record<TeamRole, boolean>>
 * 
 * Permission Matrix:
 *                      OWNER  ADMIN  MANAGER  AGENT  VIEWER
 * View Dashboard        ✅     ✅      ✅       ✅      ✅
 * View Clients          ✅     ✅      ✅       ✅      ✅
 * Create Client         ✅     ✅      ✅       ✅      ❌
 * Edit Client           ✅     ✅      ✅       ✅      ❌
 * Delete Client         ✅     ✅      ✅       ❌      ❌
 * View Debts            ✅     ✅      ✅       ✅      ✅
 * Create Debt           ✅     ✅      ✅       ✅      ❌
 * Edit Debt             ✅     ✅      ✅       ✅      ❌
 * Delete Debt           ✅     ✅      ✅       ❌      ❌
 * Send Reminders        ✅     ✅      ✅       ✅      ❌
 * View Reports          ✅     ✅      ✅       ❌      ❌
 * Manage Team           ✅     ✅      ❌       ❌      ❌
 * Manage Billing        ✅     ❌      ❌       ❌      ❌
 * Manage Settings       ✅     ✅      ❌       ❌      ❌
 */
export const PERMISSION_MATRIX: Record<Permission, Record<TeamRole, boolean>> = {
  // Dashboard
  'dashboard:view': { owner: true, admin: true, manager: true, agent: true, viewer: true },
  
  // Clients
  'clients:view': { owner: true, admin: true, manager: true, agent: true, viewer: true },
  'clients:create': { owner: true, admin: true, manager: true, agent: true, viewer: false },
  'clients:edit': { owner: true, admin: true, manager: true, agent: true, viewer: false },
  'clients:delete': { owner: true, admin: true, manager: true, agent: false, viewer: false },
  
  // Dettes
  'debts:view': { owner: true, admin: true, manager: true, agent: true, viewer: true },
  'debts:create': { owner: true, admin: true, manager: true, agent: true, viewer: false },
  'debts:edit': { owner: true, admin: true, manager: true, agent: true, viewer: false },
  'debts:delete': { owner: true, admin: true, manager: true, agent: false, viewer: false },
  
  // Relances
  'reminders:send': { owner: true, admin: true, manager: true, agent: true, viewer: false },
  
  // Rapports
  'reports:view': { owner: true, admin: true, manager: true, agent: false, viewer: false },
  
  // Équipe
  'team:manage': { owner: true, admin: true, manager: false, agent: false, viewer: false },
  
  // Facturation
  'billing:manage': { owner: true, admin: false, manager: false, agent: false, viewer: false },
  
  // Paramètres
  'settings:manage': { owner: true, admin: true, manager: false, agent: false, viewer: false },
};

/**
 * Récupère les permissions d'un rôle donné
 * @param role - Le rôle à vérifier
 * @returns La liste des permissions pour ce rôle
 */
export function getPermissionsForRole(role: TeamRole): Permission[] {
  return ROLES_INFO[role]?.permissions || [];
}

/**
 * Vérifie si un rôle possède une permission spécifique
 * @param role - Le rôle à vérifier
 * @param permission - La permission à vérifier
 * @returns true si le rôle possède la permission
 */
export function hasPermission(role: TeamRole, permission: Permission): boolean {
  const matrix = PERMISSION_MATRIX[permission];
  if (!matrix) return false;
  return matrix[role] ?? false;
}

/**
 * Vérifie si un utilisateur avec un rôle donné possède une permission
 * @param user - L'objet utilisateur avec teamRole
 * @param permission - La permission à vérifier
 * @returns true si l'utilisateur possède la permission
 */
export function hasUserPermission(user: { teamRole: TeamRole | null } | null, permission: Permission): boolean {
  if (!user || !user.teamRole) return false;
  return hasPermission(user.teamRole, permission);
}

/**
 * Vérifie si un utilisateur a un rôle spécifique
 * @param user - L'objet utilisateur avec teamRole
 * @param role - Le rôle à vérifier
 * @returns true si l'utilisateur a le rôle
 */
export function hasRole(user: { teamRole: TeamRole | null } | null, role: TeamRole): boolean {
  if (!user || !user.teamRole) return false;
  return user.teamRole === role;
}

/**
 * Vérifie si un rôle possède toutes les permissions spécifiées
 * @param role - Le rôle à vérifier
 * @param permissions - Les permissions à vérifier
 * @returns true si le rôle possède toutes les permissions
 */
export function hasAllPermissions(role: TeamRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Vérifie si un rôle possède au moins une des permissions spécifiées
 * @param role - Le rôle à vérifier
 * @param permissions - Les permissions à vérifier
 * @returns true si le rôle possède au moins une des permissions
 */
export function hasAnyPermission(role: TeamRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Récupère les informations d'une permission
 * @param permission - La permission
 * @returns Les informations de la permission
 */
export function getPermissionInfo(permission: Permission) {
  return PERMISSIONS_INFO[permission];
}

/**
 * Récupère les informations d'un rôle
 * @param role - Le rôle
 * @returns Les informations du rôle
 */
export function getRoleInfo(role: TeamRole): RoleInfo | undefined {
  return ROLES_INFO[role];
}

/**
 * Récupère la liste de tous les rôles disponibles
 * @returns La liste des rôles
 */
export function getAllRoles(): TeamRole[] {
  return Object.keys(ROLES_INFO) as TeamRole[];
}

/**
 * Récupère les rôles qui peuvent être assignés par un utilisateur donné
 * Les owners peuvent assigner admin, manager, agent, viewer
 * Les admins peuvent assigner manager, agent, viewer
 * @param userRole - Le rôle de l'utilisateur qui fait l'assignation
 * @returns Les rôles qui peuvent être assignés
 */
export function getAssignableRoles(userRole: TeamRole): TeamRole[] {
  switch (userRole) {
    case 'owner':
      return ['admin', 'manager', 'agent', 'viewer'];
    case 'admin':
      return ['manager', 'agent', 'viewer'];
    default:
      return [];
  }
}

/**
 * Vérifie si un rôle peut gérer un autre rôle
 * @param managerRole - Le rôle du gestionnaire
 * @param targetRole - Le rôle cible à gérer
 * @returns true si le gestionnaire peut gérer le rôle cible
 */
export function canManageRole(managerRole: TeamRole, targetRole: TeamRole): boolean {
  // Personne ne peut gérer le propriétaire
  if (targetRole === 'owner') return false;
  
  // L'admin ne peut pas gérer un autre admin ou owner
  if (managerRole === 'admin' && targetRole === 'admin') return false;
  
  // Le manager ne peut gérer personne
  if (managerRole === 'manager') return false;
  
  // L'agent ne peut gérer personne
  if (managerRole === 'agent') return false;
  
  // Le viewer ne peut gérer personne
  if (managerRole === 'viewer') return false;
  
  // Owner peut gérer tout le monde sauf lui-même (déjà filtré)
  if (managerRole === 'owner') return true;
  
  // Admin peut gérer manager, agent et viewer
  if (managerRole === 'admin' && ['manager', 'agent', 'viewer'].includes(targetRole)) return true;
  
  return false;
}

/**
 * Limite du nombre de membres par plan d'abonnement
 */
export const TEAM_LIMITS_BY_PLAN: Record<string, number> = {
  starter: 1,
  business: 5,
  enterprise: -1, // Illimité
};

/**
 * Vérifie si une équipe peut ajouter un nouveau membre
 * @param currentMembers - Nombre actuel de membres
 * @param plan - Plan d'abonnement
 * @returns true si un nouveau membre peut être ajouté
 */
export function canAddMember(currentMembers: number, plan: string): boolean {
  const limit = TEAM_LIMITS_BY_PLAN[plan] ?? 1;
  // -1 signifie illimité
  if (limit === -1) return true;
  return currentMembers < limit;
}

/**
 * Récupère la limite de membres pour un plan
 * @param plan - Plan d'abonnement
 * @returns Le nombre maximum de membres, ou -1 pour illimité
 */
export function getTeamLimit(plan: string): number {
  return TEAM_LIMITS_BY_PLAN[plan] ?? 1;
}

/**
 * Role hierarchy for comparison
 * Higher number = more permissions
 */
export const ROLE_HIERARCHY: Record<TeamRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  agent: 2,
  viewer: 1,
};

/**
 * Check if a role is higher or equal in hierarchy
 * @param role - The role to check
 * @param comparedTo - The role to compare against
 * @returns true if role is higher or equal in hierarchy
 */
export function isRoleHigherOrEqual(role: TeamRole, comparedTo: TeamRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[comparedTo];
}
