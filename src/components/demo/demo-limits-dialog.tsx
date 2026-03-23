"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Crown,
  Users,
  Mail,
  MessageSquare,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export type DemoLimitType = "clients" | "email" | "whatsapp" | "expired" | "feature";

interface DemoLimitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: DemoLimitType;
  currentUsage?: number;
  limit?: number;
}

const limitInfo: Record<DemoLimitType, {
  title: string;
  description: string;
  icon: React.ReactNode;
  currentLimit: string;
}> = {
  clients: {
    title: "Limite de clients atteinte",
    description: "Vous avez atteint la limite de clients en mode démo. Passez à un plan payant pour ajouter plus de clients.",
    icon: <Users className="h-12 w-12 text-amber-500" />,
    currentLimit: "5 clients maximum",
  },
  email: {
    title: "Limite de relances email atteinte",
    description: "Vous avez atteint la limite de relances email en mode démo. Passez à un plan payant pour envoyer plus de relances.",
    icon: <Mail className="h-12 w-12 text-amber-500" />,
    currentLimit: "10 emails maximum",
  },
  whatsapp: {
    title: "Limite de relances WhatsApp atteinte",
    description: "Vous avez atteint la limite de relances WhatsApp en mode démo. Passez à un plan payant pour envoyer plus de relances.",
    icon: <MessageSquare className="h-12 w-12 text-amber-500" />,
    currentLimit: "5 messages maximum",
  },
  expired: {
    title: "Période d'essai expirée",
    description: "Votre période d'essai de 7 jours est terminée. Souscrivez à un plan payant pour continuer à utiliser RelancePro Africa.",
    icon: <AlertTriangle className="h-12 w-12 text-red-500" />,
    currentLimit: "Essai de 7 jours",
  },
  feature: {
    title: "Fonctionnalité non disponible",
    description: "Cette fonctionnalité n'est pas disponible en mode démo. Passez à un plan payant pour y accéder.",
    icon: <Sparkles className="h-12 w-12 text-amber-500" />,
    currentLimit: "Fonctionnalités avancées",
  },
};

const plans = [
  {
    name: "Starter",
    price: "15 000",
    currency: "GNF",
    period: "/mois",
    features: [
      "100 clients",
      "500 relances/mois",
      "Email + WhatsApp",
      "IA basique",
      "Support email",
    ],
  },
  {
    name: "Business",
    price: "35 000",
    currency: "GNF",
    period: "/mois",
    popular: true,
    features: [
      "Clients illimités",
      "Relances illimitées",
      "Email + WhatsApp + SMS",
      "IA avancée",
      "Support prioritaire",
      "API access",
    ],
  },
  {
    name: "Enterprise",
    price: "75 000",
    currency: "GNF",
    period: "/mois",
    features: [
      "Tout de Business",
      "Multi-utilisateurs",
      "White-label",
      "Support dédié",
      "SLA garanti",
    ],
  },
];

export function DemoLimitsDialog({
  open,
  onOpenChange,
  limitType,
  currentUsage,
  limit,
}: DemoLimitsDialogProps) {
  const info = limitInfo[limitType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            {info.icon}
          </div>
          <DialogTitle className="text-center text-xl">
            {info.title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {info.description}
          </DialogDescription>
        </DialogHeader>

        {/* Current usage */}
        {currentUsage !== undefined && limit !== undefined && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <p className="text-amber-800">
              <span className="font-semibold">{currentUsage}</span> / {limit} utilisés
            </p>
            <Badge variant="outline" className="mt-2 border-amber-300 text-amber-700">
              Mode Démonstration
            </Badge>
          </div>
        )}

        {/* Plans comparison */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-center mb-4">
            Choisissez votre plan
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border-2 p-4 ${
                  plan.popular
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">
                      Populaire
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h4 className="font-semibold text-lg">{plan.name}</h4>
                  <div className="mt-2">
                    <span className="text-2xl font-bold">{plan.price}</span>
                    <span className="text-gray-500 text-sm">{plan.currency}</span>
                    <span className="text-gray-400 text-sm">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/subscription" className="block mt-4">
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-800 hover:bg-gray-900"
                    }`}
                    onClick={() => onOpenChange(false)}
                  >
                    Choisir
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Continuer en mode démo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Simplified alert variant for inline usage
export function DemoLimitAlert({
  limitType,
  currentUsage,
  limit,
}: Omit<DemoLimitsDialogProps, "open" | "onOpenChange">) {
  const info = limitInfo[limitType];

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-amber-800">{info.title}</h4>
          <p className="text-sm text-amber-700 mt-1">{info.description}</p>
          {currentUsage !== undefined && limit !== undefined && (
            <p className="text-sm text-amber-600 mt-2">
              Utilisation: {currentUsage}/{limit}
            </p>
          )}
        </div>
        <Link href="/subscription">
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 shrink-0">
            <Crown className="h-4 w-4 mr-1" />
            Upgrader
          </Button>
        </Link>
      </div>
    </div>
  );
}
