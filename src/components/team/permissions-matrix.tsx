"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Crown, Shield, Briefcase, User, Eye } from "lucide-react";
import { TeamRole, ROLES_INFO, PERMISSION_MATRIX } from "@/lib/auth/roles";
import { Permission, PERMISSIONS_INFO, CATEGORY_LABELS, PERMISSIONS_BY_CATEGORY, PermissionCategory } from "@/lib/auth/permissions";

interface PermissionsMatrixProps {
  showTitle?: boolean;
  compact?: boolean;
}

const roleIcons: Record<TeamRole, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  manager: Briefcase,
  agent: User,
  viewer: Eye,
};

const roleOrder: TeamRole[] = ["owner", "admin", "manager", "agent", "viewer"];

/**
 * Visual table showing permissions per role
 */
export function PermissionsMatrix({ showTitle = true, compact = false }: PermissionsMatrixProps) {
  const allRoles = roleOrder;

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Matrice des permissions
          </CardTitle>
          <CardDescription>
            Vue détaillée des permissions pour chaque rôle
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={compact ? "p-0" : undefined}>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${compact ? "" : "min-w-[600px]"}`}>
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium sticky left-0 bg-white dark:bg-gray-900 z-10">
                  Permission
                </th>
                {allRoles.map((role) => {
                  const info = ROLES_INFO[role];
                  const Icon = roleIcons[role];
                  return (
                    <th key={role} className="text-center py-3 px-2 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-8 h-8 rounded-full ${info.color} flex items-center justify-center`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-xs font-medium">{info.label}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PERMISSIONS_BY_CATEGORY).map(([category, permissions]) => (
                <>
                  {/* Category Header */}
                  <tr key={category} className="bg-gray-50 dark:bg-gray-800">
                    <td
                      colSpan={allRoles.length + 1}
                      className="py-2 px-4 font-semibold text-gray-700 dark:text-gray-300"
                    >
                      {CATEGORY_LABELS[category as PermissionCategory]}
                    </td>
                  </tr>
                  
                  {/* Permission Rows */}
                  {permissions.map((permission) => {
                    const info = PERMISSIONS_INFO[permission];
                    const rolePermissions = PERMISSION_MATRIX[permission];
                    
                    return (
                      <tr
                        key={permission}
                        className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-2 px-4 sticky left-0 bg-white dark:bg-gray-900">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {info.label}
                            </p>
                            {!compact && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {info.description}
                              </p>
                            )}
                          </div>
                        </td>
                        {allRoles.map((role) => (
                          <td key={role} className="text-center py-2 px-2">
                            {rolePermissions[role] ? (
                              <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Simplified permission matrix for quick reference
 */
export function PermissionsMatrixCompact() {
  return <PermissionsMatrix showTitle={false} compact />;
}

/**
 * Legend for the permission matrix
 */
export function PermissionsLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span>Autorisé</span>
      </div>
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-gray-300 dark:text-gray-600" />
        <span>Non autorisé</span>
      </div>
    </div>
  );
}

export default PermissionsMatrix;
