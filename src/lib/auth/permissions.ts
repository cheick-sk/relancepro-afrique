// Permissions system

export type PermissionCategory = "team" | "clients" | "debts" | "reminders" | "settings" | "api" | "reports"

export type Permission = string

export const PERMISSIONS_INFO: Record<string, { name: string; description: string; category: PermissionCategory }> = {
  // Team
  "team.invite": { name: "Inviter des membres", description: "Peut inviter de nouveaux membres", category: "team" },
  "team.remove": { name: "Supprimer des membres", description: "Peut supprimer des membres", category: "team" },
  "team.manage": { name: "Gérer l'équipe", description: "Peut modifier les rôles et permissions", category: "team" },
  
  // Clients
  "clients.create": { name: "Créer des clients", description: "Peut ajouter de nouveaux clients", category: "clients" },
  "clients.edit": { name: "Modifier des clients", description: "Peut modifier les informations clients", category: "clients" },
  "clients.delete": { name: "Supprimer des clients", description: "Peut supprimer des clients", category: "clients" },
  "clients.view": { name: "Voir les clients", description: "Peut voir les informations clients", category: "clients" },
  
  // Debts
  "debts.create": { name: "Créer des créances", description: "Peut ajouter de nouvelles créances", category: "debts" },
  "debts.edit": { name: "Modifier des créances", description: "Peut modifier les créances", category: "debts" },
  "debts.delete": { name: "Supprimer des créances", description: "Peut supprimer des créances", category: "debts" },
  "debts.view": { name: "Voir les créances", description: "Peut voir les créances", category: "debts" },
  
  // Reminders
  "reminders.send": { name: "Envoyer des relances", description: "Peut envoyer des relances", category: "reminders" },
  "reminders.configure": { name: "Configurer les relances", description: "Peut configurer les paramètres de relance", category: "reminders" },
  
  // Settings
  "settings.view": { name: "Voir les paramètres", description: "Peut voir les paramètres", category: "settings" },
  "settings.edit": { name: "Modifier les paramètres", description: "Peut modifier les paramètres", category: "settings" },
  
  // API
  "api.keys": { name: "Gérer les clés API", description: "Peut créer et gérer les clés API", category: "api" },
  "api.webhooks": { name: "Gérer les webhooks", description: "Peut configurer les webhooks", category: "api" },
  
  // Reports
  "reports.view": { name: "Voir les rapports", description: "Peut voir les rapports", category: "reports" },
  "reports.export": { name: "Exporter les rapports", description: "Peut exporter les données", category: "reports" },
}

export const CATEGORY_LABELS: Record<PermissionCategory, string> = {
  team: "Équipe",
  clients: "Clients",
  debts: "Créances",
  reminders: "Relances",
  settings: "Paramètres",
  api: "API",
  reports: "Rapports",
}

export const PERMISSIONS_BY_CATEGORY: Record<PermissionCategory, string[]> = {
  team: ["team.invite", "team.remove", "team.manage"],
  clients: ["clients.create", "clients.edit", "clients.delete", "clients.view"],
  debts: ["debts.create", "debts.edit", "debts.delete", "debts.view"],
  reminders: ["reminders.send", "reminders.configure"],
  settings: ["settings.view", "settings.edit"],
  api: ["api.keys", "api.webhooks"],
  reports: ["reports.view", "reports.export"],
}
