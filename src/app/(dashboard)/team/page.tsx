"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Mail,
  Shield,
  Crown,
  Plus,
  Loader2,
  Save,
  Building2,
  AlertCircle,
  Settings,
  UserPlus,
} from "lucide-react";
import { TeamRole, ROLES_INFO, getTeamLimit } from "@/lib/auth/roles";
import { MemberList, Member } from "@/components/team/member-list";
import { RoleBadge } from "@/components/team/role-badge";
import { PermissionsMatrix } from "@/components/team/permissions-matrix";
import { InviteDialog } from "@/components/team/invite-dialog";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
  logoUrl?: string | null;
  subscriptionPlan: string;
  maxMembers: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface Invitation {
  id: string;
  email: string;
  role: TeamRole;
  status: string;
  createdAt: Date | string;
  expiresAt: Date | string;
}

interface TeamData {
  team: Team | null;
  members: Member[];
  invitations: Invitation[];
  currentUserRole: TeamRole | null;
  plan: string;
  limits: {
    maxMembers: number;
    currentMembers: number;
    pendingInvitations: number;
  };
}

export default function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      const response = await fetch("/api/team");
      if (response.ok) {
        const result = await response.json();
        setData(result);
        if (result.team?.name) {
          setTeamName(result.team.name);
        }
      }
    } catch (error) {
      console.error("Error fetching team:", error);
      toast.error("Erreur lors du chargement de l'équipe");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast.error("Veuillez entrer un nom d'équipe");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim() }),
      });

      if (response.ok) {
        toast.success("Équipe créée avec succès");
        fetchTeam();
      } else {
        const error = await response.json();
        toast.error(error.error || "Erreur lors de la création");
      }
    } catch (error) {
      toast.error("Erreur lors de la création de l'équipe");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTeamName = async () => {
    if (!teamName.trim() || teamName === data?.team?.name) return;

    setSaving(true);
    try {
      const response = await fetch("/api/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim() }),
      });

      if (response.ok) {
        toast.success("Nom de l'équipe mis à jour");
        fetchTeam();
      } else {
        const error = await response.json();
        toast.error(error.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async (email: string, role: TeamRole) => {
    const response = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de l'envoi de l'invitation");
    }

    const result = await response.json();
    fetchTeam();
    return result;
  };

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    const response = await fetch(`/api/team/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la mise à jour");
    }

    fetchTeam();
  };

  const handleRemoveMember = async (memberId: string) => {
    const response = await fetch(`/api/team/members/${memberId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la suppression");
    }

    fetchTeam();
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/team/invite?id=${invitationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Invitation annulée");
        fetchTeam();
      } else {
        const error = await response.json();
        toast.error(error.error || "Erreur lors de l'annulation");
      }
    } catch (error) {
      toast.error("Erreur lors de l'annulation de l'invitation");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // No team - show creation form
  if (!data?.team) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-orange-500" />
            Équipe
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Créez une équipe pour collaborer avec d&apos;autres membres
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-500" />
              Créer votre équipe
            </CardTitle>
            <CardDescription>
              Créez une équipe pour inviter des membres et collaborer ensemble
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Votre plan actuel ({data.plan}) permet {getTeamLimit(data.plan) === -1 ? "un nombre illimité" : getTeamLimit(data.plan)} membre(s).
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="teamName">Nom de l&apos;équipe</Label>
              <Input
                id="teamName"
                placeholder="Mon Entreprise"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={creating}
              />
            </div>
            <Button
              onClick={handleCreateTeam}
              disabled={creating || !teamName.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer l&apos;équipe
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = data.currentUserRole === "owner";
  const isAdmin = data.currentUserRole === "admin" || isOwner;
  const canInvite = isOwner || isAdmin;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-orange-500" />
            {data.team.name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Plan {data.team.subscriptionPlan} • {data.limits.maxMembers === -1 ? "Membres illimités" : `${data.limits.maxMembers} membres max`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Badge className="bg-amber-500 text-white">
              <Crown className="h-3 w-3 mr-1" />
              Propriétaire
            </Badge>
          )}
          {data.currentUserRole && (
            <RoleBadge role={data.currentUserRole} />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Membres actifs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.limits.currentMembers}</div>
            <p className="text-xs text-gray-500">
              sur {data.limits.maxMembers === -1 ? "∞" : data.limits.maxMembers}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Invitations en attente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.limits.pendingInvitations}</div>
            <p className="text-xs text-gray-500">en attente de réponse</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Plan actuel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{data.team.subscriptionPlan}</div>
            <p className="text-xs text-gray-500">
              {data.team.subscriptionPlan === "enterprise"
                ? "Membres illimités"
                : `${data.limits.maxMembers} membres max`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Name Editor (Owner only) */}
      {isOwner && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Paramètres de l&apos;équipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Nom de l'équipe"
                className="max-w-sm"
              />
              <Button
                onClick={handleUpdateTeamName}
                disabled={saving || teamName === data.team.name}
                variant="outline"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Membres ({data.members.length})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2">
            <Mail className="h-4 w-4" />
            Invitations ({data.invitations.length})
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Membres de l&apos;équipe</h3>
            {canInvite && (
              <InviteDialog
                currentUserRole={data.currentUserRole!}
                maxMembers={data.limits.maxMembers}
                currentMembers={data.limits.currentMembers}
                pendingInvitations={data.limits.pendingInvitations}
                onInvite={handleInvite}
              />
            )}
          </div>

          <MemberList
            members={data.members}
            currentUserRole={data.currentUserRole!}
            onRoleChange={isAdmin ? handleRoleChange : undefined}
            onRemove={isOwner ? handleRemoveMember : undefined}
          />
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Invitations en attente</h3>
            {canInvite && (
              <InviteDialog
                currentUserRole={data.currentUserRole!}
                maxMembers={data.limits.maxMembers}
                currentMembers={data.limits.currentMembers}
                pendingInvitations={data.limits.pendingInvitations}
                onInvite={handleInvite}
              />
            )}
          </div>

          {data.invitations.length > 0 ? (
            <div className="space-y-3">
              {data.invitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <RoleBadge role={invitation.role} size="sm" />
                            <span>•</span>
                            <span>Expire le {new Date(invitation.expiresAt).toLocaleDateString("fr-FR")}</span>
                          </div>
                        </div>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Annuler
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune invitation en attente</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <PermissionsMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
}
