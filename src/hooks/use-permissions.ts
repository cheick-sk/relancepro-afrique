"use client";

import { useState, useEffect, useCallback } from "react";
import { TeamRole, hasPermission as checkPermission, ROLES_INFO } from "@/lib/auth/roles";
import { Permission } from "@/lib/auth/permissions";

interface UserPermissions {
  teamRole: TeamRole | null;
  permissions: Permission[];
  isLoading: boolean;
  error: string | null;
}

interface UsePermissionsResult extends UserPermissions {
  can: (permission: Permission) => boolean;
  isRole: (role: TeamRole) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isAgent: boolean;
  isViewer: boolean;
  canManage: (targetRole: TeamRole) => boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook for checking permissions on the client side
 */
export function usePermissions(): UsePermissionsResult {
  const [state, setState] = useState<UserPermissions>({
    teamRole: null,
    permissions: [],
    isLoading: true,
    error: null,
  });

  const fetchPermissions = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch("/api/auth/session");
      
      if (!response.ok) {
        throw new Error("Failed to fetch session");
      }
      
      const session = await response.json();
      
      if (session?.user) {
        const teamRole = session.user.teamRole as TeamRole | null;
        const permissions = teamRole ? ROLES_INFO[teamRole]?.permissions || [] : [];
        
        setState({
          teamRole,
          permissions,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          teamRole: null,
          permissions: [],
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      setState({
        teamRole: null,
        permissions: [],
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load permissions",
      });
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  /**
   * Check if user has a specific permission
   */
  const can = useCallback(
    (permission: Permission): boolean => {
      if (!state.teamRole) return false;
      return checkPermission(state.teamRole, permission);
    },
    [state.teamRole]
  );

  /**
   * Check if user has a specific role
   */
  const isRole = useCallback(
    (role: TeamRole): boolean => {
      return state.teamRole === role;
    },
    [state.teamRole]
  );

  /**
   * Check if user can manage a target role
   */
  const canManage = useCallback(
    (targetRole: TeamRole): boolean => {
      if (!state.teamRole) return false;
      
      // No one can manage owner
      if (targetRole === "owner") return false;
      
      // Owner can manage everyone else
      if (state.teamRole === "owner") return true;
      
      // Admin can manage manager, agent, viewer
      if (state.teamRole === "admin" && ["manager", "agent", "viewer"].includes(targetRole)) {
        return true;
      }
      
      return false;
    },
    [state.teamRole]
  );

  return {
    ...state,
    can,
    isRole,
    isOwner: state.teamRole === "owner",
    isAdmin: state.teamRole === "admin",
    isManager: state.teamRole === "manager",
    isAgent: state.teamRole === "agent",
    isViewer: state.teamRole === "viewer",
    canManage,
    refresh: fetchPermissions,
  };
}

/**
 * Hook result type for external use
 */
export type { UsePermissionsResult };

export default usePermissions;
