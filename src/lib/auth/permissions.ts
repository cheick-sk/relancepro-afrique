// =====================================================
// RELANCEPRO AFRICA - Permission Types
// Système de permissions pour le contrôle d'accès
// =====================================================

/**
 * Types de permissions disponibles dans le système
 * Chaque permission représente une action spécifique
 */
export type Permission =
  // Dashboard
  | 'dashboard:view'
  
  // Clients
  | 'clients:view'
  | 'clients:create'
  | 'clients:edit'
  | 'clients:delete'
  
  // Dettes/Créances
  | 'debts:view'
  | 'debts:create'
  | 'debts:edit'
  | 'debts:delete'
  
  // Relances
  | 'reminders:send'
  
  // Rapports
  | 'reports:view'
  
  // Équipe
  | 'team:manage'
  
  // Facturation
  | 'billing:manage'
  
  // Paramètres
  | 'settings:manage';

/**
 * Catégories de permissions pour l'organisation
 */
export type PermissionCategory = 
  | 'dashboard'
  | 'clients'
  | 'debts'
  | 'reminders'
  | 'reports'
  | 'team'
  | 'billing'
  | 'settings';

/**
 * Interface pour la description d'une permission
 */
export interface PermissionInfo {
  name: Permission;
  label: string;
  description: string;
  category: PermissionCategory;
}

/**
 * Informations détaillées sur chaque permission
 */
export const PERMISSIONS_INFO: Record<Permission, PermissionInfo> = {
  // Dashboard
  'dashboard:view': {
    name: 'dashboard:view',
    label: 'Voir le tableau de bord',
    description: 'Accéder au tableau de bord principal',
    category: 'dashboard',
  },
  
  // Clients
  'clients:view': {
    name: 'clients:view',
    label: 'Voir les clients',
    description: 'Consulter la liste des clients et leurs informations',
    category: 'clients',
  },
  'clients:create': {
    name: 'clients:create',
    label: 'Créer un client',
    description: 'Ajouter de nouveaux clients',
    category: 'clients',
  },
  'clients:edit': {
    name: 'clients:edit',
    label: 'Modifier les clients',
    description: 'Modifier les informations des clients',
    category: 'clients',
  },
  'clients:delete': {
    name: 'clients:delete',
    label: 'Supprimer les clients',
    description: 'Supprimer des clients de la base de données',
    category: 'clients',
  },
  
  // Dettes
  'debts:view': {
    name: 'debts:view',
    label: 'Voir les créances',
    description: 'Consulter la liste des créances et leurs détails',
    category: 'debts',
  },
  'debts:create': {
    name: 'debts:create',
    label: 'Créer une créance',
    description: 'Ajouter de nouvelles créances',
    category: 'debts',
  },
  'debts:edit': {
    name: 'debts:edit',
    label: 'Modifier les créances',
    description: 'Modifier les créances existantes',
    category: 'debts',
  },
  'debts:delete': {
    name: 'debts:delete',
    label: 'Supprimer les créances',
    description: 'Supprimer des créances de la base de données',
    category: 'debts',
  },
  
  // Relances
  'reminders:send': {
    name: 'reminders:send',
    label: 'Envoyer des relances',
    description: 'Envoyer des relances aux clients par email, WhatsApp ou SMS',
    category: 'reminders',
  },
  
  // Rapports
  'reports:view': {
    name: 'reports:view',
    label: 'Voir les rapports',
    description: 'Consulter les rapports et statistiques',
    category: 'reports',
  },
  
  // Équipe
  'team:manage': {
    name: 'team:manage',
    label: 'Gérer l\'équipe',
    description: 'Gérer les membres de l\'équipe, leurs rôles et les invitations',
    category: 'team',
  },
  
  // Facturation
  'billing:manage': {
    name: 'billing:manage',
    label: 'Gérer la facturation',
    description: 'Gérer l\'abonnement et les méthodes de paiement',
    category: 'billing',
  },
  
  // Paramètres
  'settings:manage': {
    name: 'settings:manage',
    label: 'Gérer les paramètres',
    description: 'Modifier les paramètres du compte et de l\'entreprise',
    category: 'settings',
  },
};

/**
 * Liste de toutes les permissions
 */
export const ALL_PERMISSIONS: Permission[] = Object.keys(PERMISSIONS_INFO) as Permission[];

/**
 * Permissions groupées par catégorie
 */
export const PERMISSIONS_BY_CATEGORY: Record<PermissionCategory, Permission[]> = {
  dashboard: ['dashboard:view'],
  clients: ['clients:view', 'clients:create', 'clients:edit', 'clients:delete'],
  debts: ['debts:view', 'debts:create', 'debts:edit', 'debts:delete'],
  reminders: ['reminders:send'],
  reports: ['reports:view'],
  team: ['team:manage'],
  billing: ['billing:manage'],
  settings: ['settings:manage'],
};

/**
 * Labels des catégories
 */
export const CATEGORY_LABELS: Record<PermissionCategory, string> = {
  dashboard: 'Tableau de bord',
  clients: 'Clients',
  debts: 'Créances',
  reminders: 'Relances',
  reports: 'Rapports',
  team: 'Équipe',
  billing: 'Facturation',
  settings: 'Paramètres',
};

/**
 * Permission matrix row for UI display
 */
export interface PermissionMatrixRow {
  permission: Permission;
  label: string;
  description: string;
}

/**
 * Get permission matrix rows for display
 */
export function getPermissionMatrixRows(): PermissionMatrixRow[] {
  return ALL_PERMISSIONS.map(permission => ({
    permission,
    label: PERMISSIONS_INFO[permission].label,
    description: PERMISSIONS_INFO[permission].description,
  }));
}
