"use client";

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TeamRole, ROLES_INFO, getRolePermissions } from "@/lib/auth/roles";
import { PERMISSIONS_INFO } from "@/lib/auth/permissions";

interface RoleSelectorProps {
  value: TeamRole;
  onChange: (role: TeamRole) => void;
  disabled?: boolean;
  assignableRoles?: TeamRole[];
  showPreview?: boolean;
}

export function RoleSelector({
  value,
  onChange,
  disabled = false,
  assignableRoles,
  showPreview = true,
}: RoleSelectorProps) {
  const roleInfo = ROLES_INFO[value];
  const permissions = getRolePermissions(value);
  const roles = assignableRoles || (['admin', 'manager', 'agent'] as TeamRole[]);

  return (
    <div className="space-y-3">
      <Select
        value={value}
        onValueChange={(v) => onChange(v as TeamRole)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner un rôle" />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => {
            const info = ROLES_INFO[role];
            return (
              <SelectItem key={role} value={role}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${info.color}`} />
                  <span>{info.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {showPreview && roleInfo && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {roleInfo.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {permissions.slice(0, 5).map((permission) => (
              <Badge 
                key={permission} 
                variant="outline" 
                className="text-xs border-gray-200 dark:border-gray-700"
              >
                {PERMISSIONS_INFO[permission]?.label || permission}
              </Badge>
            ))}
            {permissions.length > 5 && (
              <Badge 
                variant="outline" 
                className="text-xs border-gray-200 dark:border-gray-700"
              >
                +{permissions.length - 5} autres
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Badge de rôle pour l'affichage
interface RoleBadgeProps {
  role: TeamRole;
  className?: string;
}

export function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  const roleInfo = ROLES_INFO[role];
  
  if (!roleInfo) {
    return null;
  }

  return (
    <Badge 
      className={`${roleInfo.color} text-white ${className}`}
    >
      {roleInfo.label}
    </Badge>
  );
}
