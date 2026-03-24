"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Mail, 
  Settings, 
  Building2, 
  Crown,
  Plus,
  Loader2,
  Save,
  UserPlus,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { TeamRole, ROLES_INFO, getTeamLimit } from "@/lib/auth/roles";
import { MemberCard } from "./member-card";
import { InviteDialog } from "./invite-dialog";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
  logoUrl?: string | null;
  maxMembers: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

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

interface Invitation {
  id: string;
  email: string;
  role: TeamRole;
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

interface TeamSettingsProps {
  onCreateTeam?: (name: string) => Promise<void>;
}

export function TeamSettings({ onCreateTeam }: TeamSettingsProps) {
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

  // Pas d'équipe
  if (!data?.team) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-500" />
            Créer votre équipe
          </CardTitle>
          <CardDescription>
            Créez une équipe pour collaborer avec d&apos;autres membres
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Votre plan actuel ({data.plan}) permet {getTeamLimit(data.plan) === -1 ? 'un nombre illimité' : getTeamLimit(data.plan)} membre(s).
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
    );
  }

  const isOwner = data.currentUserRole === 'owner';
  const isAdmin = data.currentUserRole === 'admin' || isOwner;
  const canInvite = isOwner || isAdmin;

  return (
    <div className="space-y-6">
      {/* En-tête de l'équipe */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-500" />
                {data.team.name}
              </CardTitle>
              <CardDescription>
                Plan {data.plan} • {data.limits.maxMembers === -1 ? 'Membres illimités' : `${data.limits.maxMembers} membres max`}
              </CardDescription>
            </div>
            {isOwner && (
              <Badge className="bg-purple-500 text-white">
                <Crown className="h-3 w-3 mr-1" />
                Propriétaire
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isOwner && (
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
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onglets */}
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
        </TabsList>

        {/* Onglet Membres */}
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

          <div className="grid gap-4 md:grid-cols-2">
            {data.members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                currentUserRole={data.currentUserRole!}
                onRoleChange={isAdmin ? handleRoleChange : undefined}
                onRemove={isOwner ? handleRemoveMember : undefined}
              />
            ))}
          </div>

          {data.members.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun membre dans l&apos;équipe</p>
            </div>
          )}
        </TabsContent>

        {/* Onglet Invitations */}
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
                          <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Badge variant="outline" className="text-xs">
                              {ROLES_INFO[invitation.role]?.label}
                            </Badge>
                            <span>Expire le {new Date(invitation.expiresAt).toLocaleDateString('fr-FR')}</span>
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
                          <XCircle className="h-4 w-4 mr-1" />
                          Annuler
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune invitation en attente</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
