"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  MoreHorizontal,
  Crown,
  Shield,
  User,
  Mail,
  Clock,
  CheckCircle,
  Trash2,
  Edit,
} from "lucide-react";
import { TeamRole, ROLES_INFO, canManageRole } from "@/lib/auth/roles";
import { RoleBadge, RoleSelector } from "./role-selector";
import { toast } from "sonner";

interface Member {
  id: string;
  userId: string;
  role: TeamRole;
  invitedAt: Date | string;
  acceptedAt?: Date | string | null;
  status: 'active' | 'pending';
  user: {
    id: string;
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
}

interface MemberCardProps {
  member: Member;
  currentUserRole: TeamRole;
  onRoleChange?: (memberId: string, newRole: TeamRole) => Promise<void>;
  onRemove?: (memberId: string) => Promise<void>;
}

export function MemberCard({
  member,
  currentUserRole,
  onRoleChange,
  onRemove,
}: MemberCardProps) {
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<TeamRole>(member.role);
  const [isLoading, setIsLoading] = useState(false);

  const canManage = canManageRole(currentUserRole, member.role);
  const isOwner = member.role === 'owner';
  const roleInfo = ROLES_INFO[member.role];

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.[0]?.toUpperCase() || 'U';
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleRoleChange = async () => {
    if (!onRoleChange) return;
    
    setIsLoading(true);
    try {
      await onRoleChange(member.id, selectedRole);
      setShowRoleDialog(false);
      toast.success("Rôle mis à jour avec succès");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour du rôle");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    
    setIsLoading(true);
    try {
      await onRemove(member.id);
      setShowRemoveDialog(false);
      toast.success("Membre supprimé avec succès");
    } catch (error) {
      toast.error("Erreur lors de la suppression du membre");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <Avatar className="h-12 w-12">
              <AvatarImage src={member.user.avatarUrl || undefined} />
              <AvatarFallback className="bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-200">
                {getInitials(member.user.name, member.user.email)}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900 dark:text-white truncate">
                  {member.user.name || member.user.email}
                </h4>
                {isOwner && <Crown className="h-4 w-4 text-yellow-500" />}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {member.user.email}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <RoleBadge role={member.role} />
                {member.status === 'pending' && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                    <Clock className="h-3 w-3 mr-1" />
                    En attente
                  </Badge>
                )}
                {member.status === 'active' && (
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Actif
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            {canManage && !isOwner && (onRoleChange || onRemove) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {onRoleChange && (
                    <DropdownMenuItem onClick={() => setShowRoleDialog(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier le rôle
                    </DropdownMenuItem>
                  )}
                  {onRemove && (
                    <DropdownMenuItem 
                      onClick={() => setShowRemoveDialog(true)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Date info */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span>Invité le {formatDate(member.invitedAt)}</span>
            </div>
            {member.acceptedAt && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Accepté le {formatDate(member.acceptedAt)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog changement de rôle */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le rôle</DialogTitle>
            <DialogDescription>
              Changer le rôle de {member.user.name || member.user.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RoleSelector
              value={selectedRole}
              onChange={setSelectedRole}
              assignableRoles={['admin', 'manager', 'agent']}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRoleDialog(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleRoleChange}
              disabled={isLoading || selectedRole === member.role}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isLoading ? "Modification..." : "Modifier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le membre</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer {member.user.name || member.user.email} de l&apos;équipe ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRemoveDialog(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRemove}
              disabled={isLoading}
            >
              {isLoading ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
