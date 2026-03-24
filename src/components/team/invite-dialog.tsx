"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  UserPlus,
  Mail,
  Loader2,
  CheckCircle,
  Copy,
  ExternalLink,
  X,
  Plus,
} from "lucide-react";
import { TeamRole, getAssignableRoles, ROLES_INFO } from "@/lib/auth/roles";
import { RoleSelector } from "./role-selector";
import { toast } from "sonner";

interface InviteDialogProps {
  currentUserRole: TeamRole;
  maxMembers?: number;
  currentMembers?: number;
  pendingInvitations?: number;
  onInvite: (email: string, role: TeamRole) => Promise<{ acceptUrl?: string }>;
}

interface InviteResult {
  email: string;
  role: TeamRole;
  success: boolean;
  acceptUrl?: string;
  error?: string;
}

export function InviteDialog({
  currentUserRole,
  maxMembers = 1,
  currentMembers = 0,
  pendingInvitations = 0,
  onInvite,
}: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState<string[]>([""]);
  const [role, setRole] = useState<TeamRole>("agent");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteResults, setInviteResults] = useState<InviteResult[]>([]);

  const assignableRoles = getAssignableRoles(currentUserRole);
  const totalSlots = currentMembers + pendingInvitations;
  const canInvite = maxMembers === -1 || totalSlots < maxMembers;

  const addEmailField = () => {
    setEmails([...emails, ""]);
  };

  const removeEmailField = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const validateEmail = (email: string) => {
    return email && email.includes("@") && email.includes(".");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validEmails = emails
      .map((email) => email.toLowerCase().trim())
      .filter((email) => validateEmail(email));

    if (validEmails.length === 0) {
      toast.error("Veuillez entrer au moins une adresse email valide");
      return;
    }

    // Check if we can invite this many members
    if (maxMembers !== -1 && validEmails.length > maxMembers - totalSlots) {
      toast.error(`Vous ne pouvez inviter que ${maxMembers - totalSlots} membre(s) supplémentaire(s)`);
      return;
    }

    setIsLoading(true);
    const results: InviteResult[] = [];

    for (const email of validEmails) {
      try {
        const result = await onInvite(email, role);
        results.push({
          email,
          role,
          success: true,
          acceptUrl: result.acceptUrl,
        });
      } catch (error: any) {
        results.push({
          email,
          role,
          success: false,
          error: error.message || "Erreur lors de l'envoi",
        });
      }
    }

    setInviteResults(results);
    setIsLoading(false);

    const successCount = results.filter((r) => r.success).length;
    if (successCount > 0) {
      toast.success(`${successCount} invitation(s) envoyée(s) avec succès`);
    }
    if (successCount < results.length) {
      toast.error(`${results.length - successCount} invitation(s) en échec`);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Lien copié dans le presse-papier");
  };

  const handleClose = () => {
    setOpen(false);
    setEmails([""]);
    setRole("agent");
    setInviteResults([]);
  };

  const roleInfo = ROLES_INFO[role];

  const validEmailCount = emails.filter((e) => validateEmail(e)).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600" disabled={!canInvite}>
          <UserPlus className="h-4 w-4 mr-2" />
          Inviter un membre
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {inviteResults.length === 0 ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-orange-500" />
                Inviter des membres
              </DialogTitle>
              <DialogDescription>
                Invitez de nouveaux membres à rejoindre votre équipe par email.
                {maxMembers > 0 && (
                  <span className="block mt-1 text-sm">
                    Places disponibles : {maxMembers === -1 ? "Illimité" : `${maxMembers - totalSlots} / ${maxMembers}`}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Fields */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Adresses email</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addEmailField}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter
                  </Button>
                </div>
                <ScrollArea className="max-h-48">
                  <div className="space-y-2 pr-4">
                    {emails.map((email, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="email"
                            placeholder="exemple@email.com"
                            value={email}
                            onChange={(e) => updateEmail(index, e.target.value)}
                            className="pl-10"
                            disabled={isLoading}
                          />
                        </div>
                        {emails.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEmailField(index)}
                            className="h-10 w-10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Role Selector */}
              <div className="space-y-2">
                <Label>Rôle pour tous les membres</Label>
                <RoleSelector
                  value={role}
                  onChange={setRole}
                  assignableRoles={assignableRoles}
                  disabled={isLoading}
                />
              </div>

              {/* Role Description */}
              {roleInfo && (
                <Card className="bg-gray-50 dark:bg-gray-800 border-0">
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <strong>{roleInfo.label}</strong> : {roleInfo.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || validEmailCount === 0}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    `Envoyer ${validEmailCount} invitation${validEmailCount > 1 ? "s" : ""}`
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Résultats des invitations
              </DialogTitle>
              <DialogDescription>
                {inviteResults.filter((r) => r.success).length} sur {inviteResults.length} invitation(s) envoyée(s) avec succès
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {inviteResults.map((result, index) => (
                  <Card key={index} className={result.success ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm font-medium">{result.email}</span>
                          <Badge variant="outline" className="text-xs">
                            {ROLES_INFO[result.role]?.label}
                          </Badge>
                        </div>
                        {result.success && result.acceptUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyLink(result.acceptUrl!)}
                            className="h-7"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {result.error && (
                        <p className="text-xs text-red-500 mt-1">{result.error}</p>
                      )}
                      {result.success && result.acceptUrl && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={result.acceptUrl}
                            readOnly
                            className="text-xs h-8"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(result.acceptUrl, "_blank")}
                            className="h-8"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Fermer
              </Button>
              <Button
                onClick={() => {
                  setInviteResults([]);
                  setEmails([""]);
                }}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Nouvelles invitations
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
