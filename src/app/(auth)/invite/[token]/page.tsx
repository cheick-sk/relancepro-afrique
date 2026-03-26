"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mail,
  Loader2,
  CheckCircle,
  XCircle,
  Shield,
  Briefcase,
  User,
  Eye,
  Crown,
} from "lucide-react";
import { TeamRole, ROLES_INFO } from "@/lib/auth/roles";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface InvitationData {
  valid: boolean;
  teamName?: string;
  teamId?: string;
  email?: string;
  role?: TeamRole;
  expiresAt?: string;
  error?: string;
}

const roleIcons: Record<TeamRole, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  manager: Briefcase,
  agent: User,
  viewer: Eye,
};

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  
  // Login/Register form state
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/team/accept?token=${token}`);
        const data = await response.json();
        
        setInvitation(data);
        
        if (data.needsAuth) {
          setNeedsAuth(true);
        }
      } catch (error) {
        setInvitation({
          valid: false,
          error: "Erreur lors de la vérification de l'invitation",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (isRegister) {
      if (!name.trim()) {
        toast.error("Veuillez entrer votre nom");
        return;
      }
      if (password.length < 6) {
        toast.error("Le mot de passe doit contenir au moins 6 caractères");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Les mots de passe ne correspondent pas");
        return;
      }
    }

    if (!isRegister && !password) {
      toast.error("Veuillez entrer votre mot de passe");
      return;
    }

    setAccepting(true);
    try {
      const response = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: isRegister ? "register" : "login",
          name: isRegister ? name : undefined,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Invitation acceptée ! Redirection...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        toast.error(data.error || "Erreur lors de l'acceptation");
      }
    } catch (error) {
      toast.error("Erreur lors de l'acceptation de l'invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-gray-500 dark:text-gray-400">Vérification de l&apos;invitation...</p>
        </div>
      </div>
    );
  }

  if (!invitation?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Invitation invalide</CardTitle>
            <CardDescription>
              {invitation?.error || "Cette invitation n'est pas valide ou a expiré."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/login")}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleInfo = invitation.role ? ROLES_INFO[invitation.role] : null;
  const RoleIcon = invitation.role ? roleIcons[invitation.role] : User;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle>Vous êtes invité !</CardTitle>
          <CardDescription>
            Vous avez été invité à rejoindre l&apos;équipe <strong>{invitation.teamName}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Role Display */}
          {roleInfo && (
            <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
              <div className={`w-10 h-10 rounded-full ${roleInfo.color} flex items-center justify-center`}>
                <RoleIcon className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium">{roleInfo.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {roleInfo.description}
                </p>
              </div>
            </div>
          )}

          {/* Email Display */}
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Cette invitation a été envoyée à <strong>{invitation.email}</strong>
            </AlertDescription>
          </Alert>

          {/* Auth Form */}
          <div className="space-y-4">
            {/* Toggle between login and register */}
            <div className="flex rounded-lg border dark:border-gray-700 p-1">
              <Button
                variant={!isRegister ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsRegister(false)}
                className={`flex-1 ${!isRegister ? "bg-orange-500 hover:bg-orange-600" : ""}`}
              >
                Se connecter
              </Button>
              <Button
                variant={isRegister ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsRegister(true)}
                className={`flex-1 ${isRegister ? "bg-orange-500 hover:bg-orange-600" : ""}`}
              >
                Créer un compte
              </Button>
            </div>

            {/* Name field (register only) */}
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Votre nom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={accepting}
                />
              </div>
            )}

            {/* Email field (disabled, shows invitation email) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation.email || ""}
                disabled
                className="bg-gray-100 dark:bg-gray-800"
              />
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder={isRegister ? "Créer un mot de passe" : "Votre mot de passe"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={accepting}
              />
            </div>

            {/* Confirm password (register only) */}
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={accepting}
                />
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isRegister ? "Créer un compte et rejoindre" : "Se connecter et rejoindre"}
                </>
              )}
            </Button>
          </div>

          {/* Expiration notice */}
          {invitation.expiresAt && (
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Cette invitation expire le {new Date(invitation.expiresAt).toLocaleDateString("fr-FR")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
