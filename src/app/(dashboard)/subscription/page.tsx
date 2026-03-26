"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Crown,
  Sparkles,
  CreditCard,
  CheckCircle2,
  Loader2,
  Clock,
  Phone,
} from "lucide-react";
import { config, getFormattedPrice } from "@/lib/config";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";

export default function SubscriptionPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("GNF");

  const handleSubscribe = async (plan: "starter" | "business" | "enterprise") => {
    setLoading(plan);

    try {
      const response = await fetch("/api/paystack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (data.demo) {
        toast.success("Mode démo - Abonnement activé");
        await update();
        router.push("/dashboard");
      } else if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        toast.error(data.error || "Erreur lors de l'initialisation");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Erreur lors de la souscription");
    } finally {
      setLoading(null);
    }
  };

  const isActive = session?.user?.subscriptionStatus === "active";
  const currentPlan = session?.user?.subscriptionStatus === "active" ? "Premium" : "Aucun";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-orange-500" />
          Abonnement
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Choisissez l'offre qui correspond à vos besoins
        </p>
      </div>

      {/* Currency Selector */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <span className="font-medium">Afficher les prix en :</span>
            <div className="flex gap-2">
              {["GNF", "XOF", "EUR", "USD"].map((currency) => (
                <Button
                  key={currency}
                  variant={selectedCurrency === currency ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCurrency(currency)}
                  className={selectedCurrency === currency ? "bg-orange-500 hover:bg-orange-600" : ""}
                >
                  {currency === "GNF" ? "🇬🇳 FG" : currency}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Plan */}
      <Card className="border-2 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                {isActive ? (
                  <Crown className="h-6 w-6 text-orange-600" />
                ) : (
                  <Sparkles className="h-6 w-6 text-orange-600" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Statut actuel : {isActive ? currentPlan : "Aucun abonnement"}
                </h2>
                <p className="text-sm text-gray-500">
                  {isActive
                    ? "Merci pour votre confiance !"
                    : "Souscrivez pour débloquer toutes les fonctionnalités"}
                </p>
              </div>
            </div>
            {isActive && (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Actif
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div className="grid gap-6 md:grid-cols-3">
        {config.subscriptionPlans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative ${plan.popular ? "border-orange-500 border-2" : ""}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-orange-500 text-white">Populaire</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {plan.id === "enterprise" ? (
                  <Crown className="h-5 w-5 text-purple-500" />
                ) : (
                  <Sparkles className="h-5 w-5 text-orange-500" />
                )}
                {plan.name}
              </CardTitle>
              <CardDescription>
                {locale === "fr" ? plan.description : plan.descriptionEn}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="text-3xl font-bold">
                  {plan.id === "starter" && "50 000 FG"}
                  {plan.id === "business" && "150 000 FG"}
                  {plan.id === "enterprise" && "500 000 FG"}
                </span>
                <span className="text-gray-500">/mois</span>
              </div>
              {plan.clientsLimit > 0 && (
                <p className="text-sm text-gray-500 mb-4">
                  Jusqu'à {plan.clientsLimit} clients
                </p>
              )}
              <ul className="space-y-2">
                {(locale === "fr" ? plan.features : plan.featuresEn).map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className={`w-full ${plan.popular ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleSubscribe(plan.id as "starter" | "business" | "enterprise")}
                disabled={loading !== null || isActive}
              >
                {loading === plan.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : isActive ? (
                  "Déjà abonné"
                ) : (
                  "Choisir cette offre"
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Demo Notice */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                🎯 Démo disponible
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Testez la plateforme pendant 7 jours gratuitement avec des fonctionnalités limitées.
                Aucune carte bancaire requise pour commencer.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => {
                  toast.success("Démo activée pour 7 jours !");
                  router.push("/dashboard");
                }}
              >
                Essayer gratuitement
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Questions fréquentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              Comment payer en Guinée ?
            </h4>
            <p className="text-sm text-gray-500 mt-1">
              Payez via Mobile Money (Orange Money, MTN), carte bancaire, ou virement bancaire.
              Toutes les transactions sont sécurisées par Paystack.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              Puis-je changer d'offre ?
            </h4>
            <p className="text-sm text-gray-500 mt-1">
              Oui, vous pouvez upgrader ou downgrader à tout moment. La différence sera calculée
              au prorata.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              Les données sont-elles sécurisées ?
            </h4>
            <p className="text-sm text-gray-500 mt-1">
              Absolument. Vos données sont stockées de manière sécurisée et ne sont jamais partagées.
              Sauvegardes quotidiennes et chiffrement SSL.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Phone className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Besoin d'aide ?</p>
              <p className="text-sm text-gray-500">
                Contactez notre équipe : <strong>+224 620 00 00 00</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
