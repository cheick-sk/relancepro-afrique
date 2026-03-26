"use client";

import { Badge } from "@/components/ui/badge";
import { Crown, Shield, Briefcase, User, Eye } from "lucide-react";
import { TeamRole, ROLES_INFO } from "@/lib/auth/roles";

interface RoleBadgeProps {
  role: TeamRole;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const roleIcons: Record<TeamRole, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  manager: Briefcase,
  agent: User,
  viewer: Eye,
};

/**
 * Colored badge component for each role
 * 
 * Colors:
 * - OWNER: Gold (amber)
 * - ADMIN: Red
 * - MANAGER: Blue
 * - AGENT: Green
 * - VIEWER: Gray
 */
export function RoleBadge({ role, showIcon = true, size = "md", className = "" }: RoleBadgeProps) {
  const roleInfo = ROLES_INFO[role];
  const Icon = roleIcons[role];
  
  if (!roleInfo) {
    return null;
  }
  
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1",
  };
  
  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };
  
  return (
    <Badge
      variant="outline"
      className={`
        ${roleInfo.bgColor}
        ${roleInfo.textColor}
        border-transparent
        font-medium
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {showIcon && <Icon className={`${iconSizes[size]} mr-1`} />}
      {roleInfo.label}
    </Badge>
  );
}

/**
 * Compact role indicator without background
 */
export function RoleIndicator({ role, className = "" }: { role: TeamRole; className?: string }) {
  const roleInfo = ROLES_INFO[role];
  const Icon = roleIcons[role];
  
  if (!roleInfo) {
    return null;
  }
  
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${roleInfo.color}`} />
      <span className="text-sm text-gray-700 dark:text-gray-300">{roleInfo.label}</span>
    </div>
  );
}

/**
 * Role badge with description tooltip
 */
export function RoleBadgeWithInfo({ role, showIcon = true, size = "md" }: RoleBadgeProps) {
  const roleInfo = ROLES_INFO[role];
  
  return (
    <div className="flex flex-col gap-1">
      <RoleBadge role={role} showIcon={showIcon} size={size} />
      {roleInfo && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {roleInfo.description}
        </span>
      )}
    </div>
  );
}

export default RoleBadge;
