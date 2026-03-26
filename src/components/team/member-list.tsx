"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  UserCog,
  Shield,
  Briefcase,
  User,
  Eye,
} from "lucide-react";
import { RoleBadge } from "./role-badge";
import { TeamRole, ROLES_INFO, getAssignableRoles, canManageRole } from "@/lib/auth/roles";
import { toast } from "sonner";

export interface Member {
  id: string;
  userId: string;
  role: TeamRole;
  invitedAt: Date | string;
  acceptedAt?: Date | string | null;
  user: {
    id: string;
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  isOnline?: boolean;
}

interface MemberListProps {
  members: Member[];
  currentUserId?: string;
  currentUserRole: TeamRole;
  onRoleChange?: (memberId: string, newRole: TeamRole) => Promise<void>;
  onRemove?: (memberId: string) => Promise<void>;
}

export function MemberList({
  members,
  currentUserId,
  currentUserRole,
  onRoleChange,
  onRemove,
}: MemberListProps) {
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [removingMember, setRemovingMember] = useState<Member | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const assignableRoles = getAssignableRoles(currentUserRole);
  const canManage = (member: Member) => {
    // Can't manage yourself
    if (member.userId === currentUserId) return false;
    return canManageRole(currentUserRole, member.role);
  };

  const handleRoleChange = async (member: Member, newRole: TeamRole) => {
    if (!onRoleChange) return;
    
    setIsUpdating(true);
    try {
      await onRoleChange(member.id, newRole);
      setEditingMember(null);
      toast.success(`Rôle mis à jour pour ${member.user.name || member.user.email}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la mise à jour");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (!removingMember || !onRemove) return;
    
    setIsUpdating(true);
    try {
      await onRemove(removingMember.id);
      toast.success(`${removingMember.user.name || removingMember.user.email} a été retiré de l'équipe`);
      setRemovingMember(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression");
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || "??";
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <div className="rounded-lg border dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800">
              <TableHead className="w-12"></TableHead>
              <TableHead>Membre</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Rejoint le</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Aucun membre dans l&apos;équipe
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  {/* Avatar + Online Status */}
                  <TableCell>
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.user.avatarUrl || undefined} />
                        <AvatarFallback className="bg-orange-100 text-orange-700">
                          {getInitials(member.user.name, member.user.email)}
                        </AvatarFallback>
                      </Avatar>
                      {member.isOnline !== undefined && (
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                            member.isOnline ? "bg-green-500" : "bg-gray-400"
                          }`}
                        />
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Name + Email */}
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {member.user.name || "Sans nom"}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {member.user.email}
                      </p>
                    </div>
                  </TableCell>
                  
                  {/* Role */}
                  <TableCell>
                    <RoleBadge role={member.role} />
                  </TableCell>
                  
                  {/* Status */}
                  <TableCell>
                    {member.acceptedAt ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                        Actif
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                        En attente
                      </Badge>
                    )}
                  </TableCell>
                  
                  {/* Joined Date */}
                  <TableCell className="text-gray-500 dark:text-gray-400">
                    {member.acceptedAt
                      ? formatDate(member.acceptedAt)
                      : formatDate(member.invitedAt)}
                  </TableCell>
                  
                  {/* Actions */}
                  <TableCell>
                    {canManage(member) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {/* Change Role */}
                          {onRoleChange && assignableRoles.length > 0 && (
                            <>
                              <DropdownMenuItem onClick={() => setEditingMember(member)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier le rôle
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          
                          {/* Remove */}
                          {onRemove && (
                            <DropdownMenuItem
                              onClick={() => setRemovingMember(member)}
                              className="text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Retirer de l&apos;équipe
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Role Change Dialog */}
      <AlertDialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifier le rôle</AlertDialogTitle>
            <AlertDialogDescription>
              Changer le rôle de {editingMember?.user.name || editingMember?.user.email}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="grid gap-2 py-4">
            {assignableRoles.map((role) => {
              const info = ROLES_INFO[role];
              const Icon = role === "admin" ? Shield : role === "manager" ? Briefcase : role === "agent" ? User : Eye;
              
              return (
                <Button
                  key={role}
                  variant={editingMember?.role === role ? "default" : "outline"}
                  className={`justify-start h-auto py-3 ${
                    editingMember?.role === role
                      ? "bg-orange-500 hover:bg-orange-600"
                      : ""
                  }`}
                  onClick={() => editingMember && handleRoleChange(editingMember, role)}
                  disabled={isUpdating}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">{info.label}</div>
                    <div className="text-xs opacity-70">{info.description}</div>
                  </div>
                </Button>
              );
            })}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Annuler</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Dialog */}
      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer le membre</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer{" "}
              <strong>{removingMember?.user.name || removingMember?.user.email}</strong> de
              l&apos;équipe ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isUpdating}
              className="bg-red-600 hover:bg-red-700"
            >
              {isUpdating ? "Suppression..." : "Retirer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default MemberList;
