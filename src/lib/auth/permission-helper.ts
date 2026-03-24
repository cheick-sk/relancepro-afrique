// =====================================================
// RELANCEPRO AFRICA - Permission Helper
// Helper functions for checking permissions in API routes
// =====================================================

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { hasPermission, TeamRole } from "@/lib/auth/roles";
import { Permission, ALL_PERMISSIONS } from "@/lib/auth/permissions";

/**
 * Result of permission check
 */
interface PermissionCheckResult {
  authorized: boolean;
  userId?: string;
  teamId?: string | null;
  teamRole?: TeamRole | null;
  error?: string;
}

/**
 * Basic permissions for users without a team (solo users)
 */
const SOLO_USER_PERMISSIONS: Permission[] = [
  "dashboard:view",
  "clients:view",
  "clients:create",
  "clients:edit",
  "clients:delete",
  "debts:view",
  "debts:create",
  "debts:edit",
  "debts:delete",
  "reminders:send",
  "reports:view",
  "settings:manage",
];

/**
 * Check if the current user has a specific permission
 * @param permission - The permission to check
 * @returns PermissionCheckResult with authorization status
 */
export async function checkPermission(permission: Permission): Promise<PermissionCheckResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return {
        authorized: false,
        error: "Non autorisé - Veuillez vous connecter",
      };
    }

    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        teamId: true,
        teamRole: true,
        role: true,
      },
    });

    if (!user) {
      return {
        authorized: false,
        error: "Utilisateur non trouvé",
      };
    }

    // System admins have all permissions
    if (user.role === "admin") {
      return {
        authorized: true,
        userId: user.id,
        teamId: user.teamId,
        teamRole: "owner" as TeamRole,
      };
    }

    // Check team role permission
    const teamRole = user.teamRole as TeamRole | null;
    
    // If no team role, user is a solo user with basic permissions
    if (!teamRole) {
      if (SOLO_USER_PERMISSIONS.includes(permission)) {
        return {
          authorized: true,
          userId: user.id,
          teamId: user.teamId,
          teamRole: null,
        };
      }
      
      return {
        authorized: false,
        userId: user.id,
        teamId: user.teamId,
        teamRole: null,
        error: "Permission refusée",
      };
    }

    // Check if the team role has the permission
    if (hasPermission(teamRole, permission)) {
      return {
        authorized: true,
        userId: user.id,
        teamId: user.teamId,
        teamRole,
      };
    }

    return {
      authorized: false,
      userId: user.id,
      teamId: user.teamId,
      teamRole,
      error: "Permission refusée",
    };
  } catch (error) {
    console.error("Error checking permission:", error);
    return {
      authorized: false,
      error: "Erreur serveur",
    };
  }
}

/**
 * Check multiple permissions (user must have ALL of them)
 * @param permissions - Array of permissions to check
 * @returns PermissionCheckResult with authorization status
 */
export async function checkAllPermissions(permissions: Permission[]): Promise<PermissionCheckResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return {
        authorized: false,
        error: "Non autorisé",
      };
    }

    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        teamId: true,
        teamRole: true,
        role: true,
      },
    });

    if (!user) {
      return {
        authorized: false,
        error: "Utilisateur non trouvé",
      };
    }

    // System admins have all permissions
    if (user.role === "admin") {
      return {
        authorized: true,
        userId: user.id,
        teamId: user.teamId,
        teamRole: "owner" as TeamRole,
      };
    }

    const teamRole = user.teamRole as TeamRole | null;
    
    // If no team role, check solo user permissions
    if (!teamRole) {
      const hasAll = permissions.every((p) => SOLO_USER_PERMISSIONS.includes(p));
      
      if (hasAll) {
        return {
          authorized: true,
          userId: user.id,
          teamId: user.teamId,
          teamRole: null,
        };
      }
      
      return {
        authorized: false,
        userId: user.id,
        teamId: user.teamId,
        teamRole: null,
        error: "Permission refusée",
      };
    }

    // Check all permissions
    const hasAll = permissions.every((p) => hasPermission(teamRole, p));
    
    if (hasAll) {
      return {
        authorized: true,
        userId: user.id,
        teamId: user.teamId,
        teamRole,
      };
    }

    return {
      authorized: false,
      userId: user.id,
      teamId: user.teamId,
      teamRole,
      error: "Permission refusée",
    };
  } catch (error) {
    console.error("Error checking permissions:", error);
    return {
      authorized: false,
      error: "Erreur serveur",
    };
  }
}

/**
 * Check if user has any of the specified permissions
 * @param permissions - Array of permissions to check
 * @returns PermissionCheckResult with authorization status
 */
export async function checkAnyPermission(permissions: Permission[]): Promise<PermissionCheckResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return {
        authorized: false,
        error: "Non autorisé",
      };
    }

    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        teamId: true,
        teamRole: true,
        role: true,
      },
    });

    if (!user) {
      return {
        authorized: false,
        error: "Utilisateur non trouvé",
      };
    }

    // System admins have all permissions
    if (user.role === "admin") {
      return {
        authorized: true,
        userId: user.id,
        teamId: user.teamId,
        teamRole: "owner" as TeamRole,
      };
    }

    const teamRole = user.teamRole as TeamRole | null;
    
    // If no team role, check solo user permissions
    if (!teamRole) {
      const hasAny = permissions.some((p) => SOLO_USER_PERMISSIONS.includes(p));
      
      if (hasAny) {
        return {
          authorized: true,
          userId: user.id,
          teamId: user.teamId,
          teamRole: null,
        };
      }
      
      return {
        authorized: false,
        userId: user.id,
        teamId: user.teamId,
        teamRole: null,
        error: "Permission refusée",
      };
    }

    // Check any permission
    const hasAny = permissions.some((p) => hasPermission(teamRole, p));
    
    if (hasAny) {
      return {
        authorized: true,
        userId: user.id,
        teamId: user.teamId,
        teamRole,
      };
    }

    return {
      authorized: false,
      userId: user.id,
      teamId: user.teamId,
      teamRole,
      error: "Permission refusée",
    };
  } catch (error) {
    console.error("Error checking permissions:", error);
    return {
      authorized: false,
      error: "Erreur serveur",
    };
  }
}

/**
 * Get the current user's team information
 * @returns User's team info or null
 */
export async function getUserTeamInfo(): Promise<{
  userId: string;
  teamId: string | null;
  teamRole: TeamRole | null;
  isTeamOwner: boolean;
} | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return null;
    }

    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        teamId: true,
        teamRole: true,
        ownedTeam: { select: { id: true } },
      },
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      teamId: user.teamId,
      teamRole: user.teamRole as TeamRole | null,
      isTeamOwner: !!user.ownedTeam,
    };
  } catch (error) {
    console.error("Error getting user team info:", error);
    return null;
  }
}

/**
 * Get all permissions for the current user
 * @returns Array of permissions the user has
 */
export async function getUserPermissions(): Promise<Permission[]> {
  try {
    const teamInfo = await getUserTeamInfo();
    
    if (!teamInfo) {
      return [];
    }
    
    if (!teamInfo.teamRole) {
      return SOLO_USER_PERMISSIONS;
    }
    
    // Return permissions based on role
    const rolePermissions: Record<TeamRole, Permission[]> = {
      owner: ALL_PERMISSIONS,
      admin: ALL_PERMISSIONS.filter(p => p !== 'billing:manage'),
      manager: [
        "dashboard:view",
        "clients:view",
        "clients:create",
        "clients:edit",
        "clients:delete",
        "debts:view",
        "debts:create",
        "debts:edit",
        "debts:delete",
        "reminders:send",
        "reports:view",
      ],
      agent: [
        "dashboard:view",
        "clients:view",
        "clients:create",
        "clients:edit",
        "debts:view",
        "debts:create",
        "debts:edit",
        "reminders:send",
      ],
      viewer: [
        "dashboard:view",
        "clients:view",
        "debts:view",
      ],
    };
    
    return rolePermissions[teamInfo.teamRole] || [];
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return [];
  }
}

/**
 * Require a specific permission (throws error if not authorized)
 * @param permission - The permission required
 * @returns User info if authorized
 */
export async function requirePermission(permission: Permission): Promise<{
  userId: string;
  teamId: string | null;
  teamRole: TeamRole | null;
}> {
  const result = await checkPermission(permission);
  
  if (!result.authorized) {
    throw new Error(result.error || "Permission refusée");
  }
  
  return {
    userId: result.userId!,
    teamId: result.teamId ?? null,
    teamRole: result.teamRole ?? null,
  };
}

/**
 * Require any of the specified permissions (throws error if not authorized)
 * @param permissions - The permissions to check (user must have at least one)
 * @returns User info if authorized
 */
export async function requireAnyPermission(permissions: Permission[]): Promise<{
  userId: string;
  teamId: string | null;
  teamRole: TeamRole | null;
}> {
  const result = await checkAnyPermission(permissions);
  
  if (!result.authorized) {
    throw new Error(result.error || "Permission refusée");
  }
  
  return {
    userId: result.userId!,
    teamId: result.teamId ?? null,
    teamRole: result.teamRole ?? null,
  };
}

/**
 * Require all of the specified permissions (throws error if not authorized)
 * @param permissions - The permissions to check (user must have all)
 * @returns User info if authorized
 */
export async function requireAllPermissions(permissions: Permission[]): Promise<{
  userId: string;
  teamId: string | null;
  teamRole: TeamRole | null;
}> {
  const result = await checkAllPermissions(permissions);
  
  if (!result.authorized) {
    throw new Error(result.error || "Permission refusée");
  }
  
  return {
    userId: result.userId!,
    teamId: result.teamId ?? null,
    teamRole: result.teamRole ?? null,
  };
}
