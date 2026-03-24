// Team roles and permissions

export type TeamRole = "owner" | "admin" | "manager" | "member" | "viewer"

export interface RoleInfo {
  name: string
  description: string
  color: string
  canInvite: boolean
  canManageTeam: boolean
  canManageSettings: boolean
  canViewAllData: boolean
  canManageClients: boolean
  canManageDebts: boolean
  canSendReminders: boolean
  canAccessApiKeys: boolean
  canViewReports: boolean
}

export const ROLES_INFO: Record<TeamRole, RoleInfo> = {
  owner: {
    name: "Propriétaire",
    description: "Accès complet à toutes les fonctionnalités",
    color: "bg-purple-100 text-purple-800",
    canInvite: true,
    canManageTeam: true,
    canManageSettings: true,
    canViewAllData: true,
    canManageClients: true,
    canManageDebts: true,
    canSendReminders: true,
    canAccessApiKeys: true,
    canViewReports: true,
  },
  admin: {
    name: "Administrateur",
    description: "Peut gérer l'équipe et les paramètres",
    color: "bg-blue-100 text-blue-800",
    canInvite: true,
    canManageTeam: true,
    canManageSettings: true,
    canViewAllData: true,
    canManageClients: true,
    canManageDebts: true,
    canSendReminders: true,
    canAccessApiKeys: true,
    canViewReports: true,
  },
  manager: {
    name: "Gestionnaire",
    description: "Peut gérer les clients et les créances",
    color: "bg-green-100 text-green-800",
    canInvite: true,
    canManageTeam: false,
    canManageSettings: false,
    canViewAllData: true,
    canManageClients: true,
    canManageDebts: true,
    canSendReminders: true,
    canAccessApiKeys: false,
    canViewReports: true,
  },
  member: {
    name: "Membre",
    description: "Peut voir et modifier les données",
    color: "bg-yellow-100 text-yellow-800",
    canInvite: false,
    canManageTeam: false,
    canManageSettings: false,
    canViewAllData: true,
    canManageClients: true,
    canManageDebts: true,
    canSendReminders: true,
    canAccessApiKeys: false,
    canViewReports: true,
  },
  viewer: {
    name: "Observateur",
    description: "Accès en lecture seule",
    color: "bg-gray-100 text-gray-800",
    canInvite: false,
    canManageTeam: false,
    canManageSettings: false,
    canViewAllData: true,
    canManageClients: false,
    canManageDebts: false,
    canSendReminders: false,
    canAccessApiKeys: false,
    canViewReports: true,
  },
}

export const PERMISSION_MATRIX: Record<string, TeamRole[]> = {
  invite_team: ["owner", "admin", "manager"],
  remove_team: ["owner", "admin"],
  manage_settings: ["owner", "admin"],
  view_all_data: ["owner", "admin", "manager", "member", "viewer"],
  manage_clients: ["owner", "admin", "manager", "member"],
  manage_debts: ["owner", "admin", "manager", "member"],
  send_reminders: ["owner", "admin", "manager", "member"],
  access_api_keys: ["owner", "admin"],
  view_reports: ["owner", "admin", "manager", "member", "viewer"],
  delete_data: ["owner", "admin"],
  export_data: ["owner", "admin", "manager"],
}

export function hasPermission(role: TeamRole, permission: string): boolean {
  const allowedRoles = PERMISSION_MATRIX[permission]
  return allowedRoles ? allowedRoles.includes(role) : false
}

export function canManageRole(actorRole: TeamRole, targetRole: TeamRole): boolean {
  const roleHierarchy: TeamRole[] = ["owner", "admin", "manager", "member", "viewer"]
  const actorIndex = roleHierarchy.indexOf(actorRole)
  const targetIndex = roleHierarchy.indexOf(targetRole)
  
  // Only owner and admin can manage roles, and they can't manage roles equal or higher
  return (actorRole === "owner" || actorRole === "admin") && actorIndex < targetIndex
}

export function canAddMember(currentCount: number, plan: string): boolean {
  const limits: Record<string, number> = {
    STARTER: 1,
    PRO: 5,
    ENTERPRISE: 100,
  }
  return currentCount < (limits[plan] || 1)
}

export function getTeamLimit(plan: string): number {
  const limits: Record<string, number> = {
    STARTER: 1,
    PRO: 5,
    ENTERPRISE: 100,
  }
  return limits[plan] || 1
}

export const TEAM_LIMITS_BY_PLAN: Record<string, number> = {
  STARTER: 1,
  PRO: 5,
  ENTERPRISE: 100,
}

export function getAssignableRoles(actorRole: TeamRole): TeamRole[] {
  if (actorRole === "owner") {
    return ["admin", "manager", "member", "viewer"]
  }
  if (actorRole === "admin") {
    return ["manager", "member", "viewer"]
  }
  return []
}

export function getRolePermissions(role: TeamRole): string[] {
  const permissions: string[] = []
  for (const [permission, roles] of Object.entries(PERMISSION_MATRIX)) {
    if (roles.includes(role)) {
      permissions.push(permission)
    }
  }
  return permissions
}
