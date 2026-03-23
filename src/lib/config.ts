// =====================================================
// RELANCEPRO AFRICA - Configuration (Franc Guinéen par défaut)
// =====================================================

import { Locale } from "@/lib/i18n/config";

export const config = {
  app: {
    name: "RelancePro Africa",
    description: "Automatisez vos relances clients en Afrique",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    currency: "GNF", // Franc Guinéen par défaut
    locale: "fr" as Locale,
  },

  // Devises africaines - GNF en premier (par défaut)
  currencies: [
    // Devise par défaut
    { code: "GNF", name: "Franc Guinéen", symbol: "FG", flag: "🇬🇳", region: "Afrique de l'Ouest", default: true },
    // Zone BCEAO (Afrique de l'Ouest)
    { code: "XOF", name: "Franc CFA (BCEAO)", symbol: "FCFA", flag: "🇸🇳", region: "Afrique de l'Ouest" },
    // Zone BEAC (Afrique Centrale)
    { code: "XAF", name: "Franc CFA (BEAC)", symbol: "FCFA", flag: "🇨🇲", region: "Afrique Centrale" },
    // Afrique de l'Ouest
    { code: "NGN", name: "Naira nigérian", symbol: "₦", flag: "🇳🇬", region: "Afrique de l'Ouest" },
    { code: "GHS", name: "Cedi ghanéen", symbol: "GH₵", flag: "🇬🇭", region: "Afrique de l'Ouest" },
    { code: "SLL", name: "Leone sierra-léonais", symbol: "Le", flag: "🇸🇱", region: "Afrique de l'Ouest" },
    { code: "LRD", name: "Dollar libérien", symbol: "L$", flag: "🇱🇷", region: "Afrique de l'Ouest" },
    { code: "CVE", name: "Escudo capverdien", symbol: "Esc", flag: "🇨🇻", region: "Afrique de l'Ouest" },
    // Afrique Centrale
    { code: "CDF", name: "Franc congolais", symbol: "FC", flag: "🇨🇩", region: "Afrique Centrale" },
    // Afrique de l'Est
    { code: "KES", name: "Shilling kenyan", symbol: "KSh", flag: "🇰🇪", region: "Afrique de l'Est" },
    { code: "UGX", name: "Shilling ougandais", symbol: "USh", flag: "🇺🇬", region: "Afrique de l'Est" },
    { code: "TZS", name: "Shilling tanzanien", symbol: "TSh", flag: "🇹🇿", region: "Afrique de l'Est" },
    { code: "RWF", name: "Franc rwandais", symbol: "FRw", flag: "🇷🇼", region: "Afrique de l'Est" },
    { code: "ETB", name: "Birr éthiopien", symbol: "Br", flag: "🇪🇹", region: "Afrique de l'Est" },
    // Afrique Australe
    { code: "ZAR", name: "Rand sud-africain", symbol: "R", flag: "🇿🇦", region: "Afrique Australe" },
    { code: "BWP", name: "Pula botswanais", symbol: "P", flag: "🇧🇼", region: "Afrique Australe" },
    { code: "ZMW", name: "Kwacha zambien", symbol: "ZK", flag: "🇿🇲", region: "Afrique Australe" },
    // Afrique du Nord
    { code: "MAD", name: "Dirham marocain", symbol: "DH", flag: "🇲🇦", region: "Afrique du Nord" },
    { code: "DZD", name: "Dinar algérien", symbol: "DA", flag: "🇩🇿", region: "Afrique du Nord" },
    { code: "TND", name: "Dinar tunisien", symbol: "DT", flag: "🇹🇳", region: "Afrique du Nord" },
    { code: "EGP", name: "Livre égyptienne", symbol: "E£", flag: "🇪🇬", region: "Afrique du Nord" },
    // Îles
    { code: "MUR", name: "Roupie mauricienne", symbol: "Rs", flag: "🇲🇺", region: "Îles" },
    // International
    { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", region: "International" },
    { code: "USD", name: "Dollar américain", symbol: "$", flag: "🇺🇸", region: "International" },
  ],

  // Plans d'abonnement - Prix en GNF (Franc Guinéen)
  subscriptionPlans: [
    {
      id: "starter",
      name: "Starter",
      nameEn: "Starter",
      price: 50000, // 50,000 GNF/mois
      priceFormatted: "50 000 FG/mois",
      clientsLimit: 10,
      description: "Idéal pour petites entreprises",
      descriptionEn: "Ideal for small businesses",
      features: [
        "10 clients maximum",
        "Relances Email illimitées",
        "Relances WhatsApp (50/mois)",
        "Support par email",
        "Export PDF",
        "Assistant IA basique",
      ],
      featuresEn: [
        "10 clients maximum",
        "Unlimited email reminders",
        "WhatsApp reminders (50/month)",
        "Email support",
        "PDF export",
        "Basic AI assistant",
      ],
      popular: false,
    },
    {
      id: "business",
      name: "Business",
      nameEn: "Business",
      price: 150000, // 150,000 GNF/mois
      priceFormatted: "150 000 FG/mois",
      clientsLimit: 100,
      description: "Pour les entreprises en croissance",
      descriptionEn: "For growing businesses",
      features: [
        "100 clients maximum",
        "Relances Email illimitées",
        "Relances WhatsApp illimitées",
        "Support prioritaire",
        "Export PDF/Excel",
        "Assistant IA avancé",
        "Rapports détaillés",
        "Multi-utilisateurs (3)",
      ],
      featuresEn: [
        "100 clients maximum",
        "Unlimited email reminders",
        "Unlimited WhatsApp reminders",
        "Priority support",
        "PDF/Excel export",
        "Advanced AI assistant",
        "Detailed reports",
        "Multi-users (3)",
      ],
      popular: true,
    },
    {
      id: "enterprise",
      name: "Entreprise",
      nameEn: "Enterprise",
      price: 500000, // 500,000 GNF/mois
      priceFormatted: "500 000 FG/mois",
      clientsLimit: -1, // Illimité
      description: "Solutions sur mesure",
      descriptionEn: "Custom solutions",
      features: [
        "Clients illimités",
        "Toutes les fonctionnalités Business",
        "Support dédié 24/7",
        "API Webhooks",
        "Intégrations personnalisées",
        "Assistant IA premium",
        "Formation incluse",
        "SLA garanti",
      ],
      featuresEn: [
        "Unlimited clients",
        "All Business features",
        "Dedicated 24/7 support",
        "API Webhooks",
        "Custom integrations",
        "Premium AI assistant",
        "Training included",
        "SLA guaranteed",
      ],
      popular: false,
    },
  ],

  // Configuration IA
  ai: {
    enabled: true,
    features: {
      autoReminders: true,       // Relances automatiques intelligentes
      smartScheduling: true,     // Planification intelligente
      toneAdaptation: true,      // Adaptation du ton selon le client
      followUpSuggestions: true, // Suggestions de suivi
      paymentPrediction: true,   // Prédiction de paiement
    },
    maxTokens: 2000,
    model: "gpt-4",
  },

  // Configuration de la démo
  demo: {
    enabled: true,
    duration: 7, // 7 jours
    features: [
      "5 clients maximum",
      "10 relances Email",
      "5 relances WhatsApp",
      "Assistant IA basique",
    ],
  },

  // Statuts des créances
  debtStatuses: [
    { value: "pending", label: "En attente", labelEn: "Pending", color: "yellow" },
    { value: "paid", label: "Payée", labelEn: "Paid", color: "green" },
    { value: "partial", label: "Partielle", labelEn: "Partial", color: "blue" },
    { value: "disputed", label: "Contestée", labelEn: "Disputed", color: "orange" },
    { value: "cancelled", label: "Annulée", labelEn: "Cancelled", color: "gray" },
  ],

  // Statuts des clients
  clientStatuses: [
    { value: "active", label: "Actif", labelEn: "Active", color: "green" },
    { value: "inactive", label: "Inactif", labelEn: "Inactive", color: "gray" },
    { value: "blacklisted", label: "Liste noire", labelEn: "Blacklisted", color: "red" },
  ],

  // Configuration Paystack
  paystack: {
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
    baseUrl: "https://api.paystack.co",
  },

  // Configuration Resend
  resend: {
    apiKey: process.env.RESEND_API_KEY || "",
    fromEmail: process.env.RESEND_FROM_EMAIL || "noreply@relancepro.africa",
  },

  // Configuration WhatsApp (Whapi.cloud)
  whatsapp: {
    apiUrl: "https://gate.whapi.cloud/messages",
  },

  // Intervalle de relance par défaut (jours)
  reminderIntervals: {
    first: 3,
    second: 7,
    third: 14,
  },

  // Langues supportées
  languages: [
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "en", name: "English", flag: "🇬🇧" },
  ],

  // Webhooks
  webhooks: {
    events: [
      "payment.success",
      "payment.failed",
      "reminder.sent",
      "reminder.delivered",
      "reminder.opened",
      "client.created",
      "debt.created",
      "debt.paid",
    ],
  },
} as const;

export type AppConfig = typeof config;

// Fonction utilitaire pour obtenir le prix formaté
export function getFormattedPrice(
  planId: "starter" | "business" | "enterprise",
  currency: string = "GNF"
): string {
  const plan = config.subscriptionPlans.find((p) => p.id === planId);
  if (!plan) return "";
  return plan.priceFormatted;
}

// Fonction pour obtenir le symbole de devise
export function getCurrencySymbol(currency: string): string {
  const currencyInfo = config.currencies.find((c) => c.code === currency);
  return currencyInfo?.symbol || currency;
}

// Fonction pour formater un montant
export function formatCurrencyAmount(
  amount: number,
  currency: string = "GNF",
  locale: Locale = "fr"
): string {
  const formatter = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const symbol = getCurrencySymbol(currency);
  return formatter.format(amount) + " " + symbol;
}

// Fonction pour obtenir la devise par défaut
export function getDefaultCurrency(): string {
  return config.app.currency;
}
