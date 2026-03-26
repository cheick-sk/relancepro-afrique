export type PermissionCategory = 'clients' | 'debts' | 'reminders' | 'analytics' | 'settings' | 'team';

export interface PermissionInfo {
  name: string;
  description: string;
  category: PermissionCategory;
}

export const PERMISSIONS_INFO: Record<string, PermissionInfo> = {
  // Clients
  'view_clients': { name: 'Voir les clients', description: 'Consulter la liste des clients', category: 'clients' },
  'manage_clients': { name: 'Gérer les clients', description: 'Créer, modifier et supprimer des clients', category: 'clients' },
  
  // Debts
  'view_debts': { name: 'Voir les créances', description: 'Consulter la liste des créances', category: 'debts' },
  'manage_debts': { name: 'Gérer les créances', description: 'Créer, modifier et supprimer des créances', category: 'debts' },
  
  // Reminders
  'send_reminders': { name: 'Envoyer des relances', description: 'Envoyer des SMS, emails et WhatsApp', category: 'reminders' },
  'manage_reminders': { name: 'Gérer les relances', description: 'Configurer les modèles de relance', category: 'reminders' },
  
  // Analytics
  'view_analytics': { name: 'Voir les analyses', description: 'Consulter les tableaux de bord', category: 'analytics' },
  'export_analytics': { name: 'Exporter les analyses', description: 'Exporter les rapports', category: 'analytics' },
  
  // Settings
  'view_settings': { name: 'Voir les paramètres', description: 'Consulter les paramètres', category: 'settings' },
  'manage_settings': { name: 'Gérer les paramètres', description: 'Modifier les paramètres du compte', category: 'settings' },
  
  // Team
  'view_team': { name: 'Voir l\'équipe', description: 'Consulter la liste des membres', category: 'team' },
  'manage_team': { name: 'Gérer l\'équipe', description: 'Inviter et gérer les membres', category: 'team' },
};

export const CATEGORY_LABELS: Record<PermissionCategory, string> = {
  clients: 'Clients',
  debts: 'Créances',
  reminders: 'Relances',
  analytics: 'Analyses',
  settings: 'Paramètres',
  team: 'Équipe',
};

export const PERMISSION_MATRIX: Record<string, string[]> = {
  owner: ['all'],
  admin: ['view_clients', 'manage_clients', 'view_debts', 'manage_debts', 'send_reminders', 'manage_reminders', 'view_analytics', 'export_analytics', 'view_settings', 'manage_settings', 'view_team', 'manage_team'],
  manager: ['view_clients', 'manage_clients', 'view_debts', 'manage_debts', 'send_reminders', 'view_analytics', 'export_analytics'],
  member: ['view_clients', 'view_debts', 'send_reminders', 'view_analytics'],
  viewer: ['view_clients', 'view_debts', 'view_analytics'],
};

export const PERMISSIONS_BY_CATEGORY: Record<PermissionCategory, string[]> = {
  clients: ['view_clients', 'manage_clients'],
  debts: ['view_debts', 'manage_debts'],
  reminders: ['send_reminders', 'manage_reminders'],
  analytics: ['view_analytics', 'export_analytics'],
  settings: ['view_settings', 'manage_settings'],
  team: ['view_team', 'manage_team'],
};

export function getRolePermissions(role: string): string[] {
  return PERMISSION_MATRIX[role] || [];
}
