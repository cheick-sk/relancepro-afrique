"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, User, Mail, Lock, Building, ArrowRight, Check, Sparkles, Play } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    companyName: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          companyName: formData.companyName,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue");
      } else {
        setUserId(data.userId);
        setSuccess(true);
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleStartDemo = async () => {
    setDemoLoading(true);
    
    try {
      // First sign in
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        // If sign in fails, redirect to login
        router.push("/login");
        return;
      }

      // Then start demo
      const demoResponse = await fetch("/api/demo/start", {
        method: "POST",
      });

      if (demoResponse.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        // Demo start failed, still redirect to dashboard
        router.push("/dashboard");
      }
    } catch {
      router.push("/login");
    } finally {
      setDemoLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push("/login");
  };

  if (success) {
    return (
      <Card className="border-0 shadow-xl">
        <CardContent className="pt-8 pb-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Compte créé avec succès !</h2>
            <p className="text-gray-600">
              Votre compte RelancePro Africa est prêt.
            </p>
          </div>

          <div className="space-y-3">
            {/* Primary CTA - Start Demo */}
            <Button
              onClick={handleStartDemo}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
              disabled={demoLoading}
            >
              {demoLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activation...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Essayer la démo gratuite
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            {/* Secondary option - Go to login */}
            <Button
              variant="outline"
              onClick={handleGoToLogin}
              className="w-full"
              disabled={demoLoading}
            >
              Aller à la connexion
            </Button>
          </div>

          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Essai gratuit de 7 jours</p>
                <ul className="text-amber-700 space-y-1">
                  <li>• 5 clients maximum</li>
                  <li>• 10 relances email</li>
                  <li>• 5 relances WhatsApp</li>
                  <li>• IA basique incluse</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center pb-2">
        <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-lg">RelancePro</h1>
            <p className="text-xs text-gray-500">Africa</p>
          </div>
        </div>
        <CardTitle className="text-2xl">Créer un compte</CardTitle>
        <CardDescription>
          Créez votre compte pour commencer
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  name="name"
                  placeholder="Jean Dupont"
                  value={formData.name}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Entreprise</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="Mon Entreprise"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email professionnel *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="vous@entreprise.com"
                value={formData.email}
                onChange={handleChange}
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>
          
          {/* Demo info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Essai gratuit après inscription</p>
                <p className="text-blue-600 mt-1">
                  Après création du compte, vous pourrez activer votre essai gratuit de 7 jours.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            En créant un compte, vous acceptez nos{" "}
            <Link href="/terms" className="text-orange-600 hover:underline">
              conditions d&apos;utilisation
            </Link>{" "}
            et notre{" "}
            <Link href="/privacy" className="text-orange-600 hover:underline">
              politique de confidentialité
            </Link>
            .
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              <>
                Créer mon compte
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          <p className="text-sm text-gray-600 text-center">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-orange-600 hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
