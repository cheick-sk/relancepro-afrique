// Application configuration

export const APP_NAME = "RelancePro Africa"
export const APP_DESCRIPTION = "Plateforme SaaS B2B pour automatiser les relances clients en Afrique"
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

// Supported currencies in Africa
export const SUPPORTED_CURRENCIES = {
  XOF: { name: "Franc CFA (BCEAO)", symbol: "FCFA", locale: "fr-SN" },
  XAF: { name: "Franc CFA (BEAC)", symbol: "FCFA", locale: "fr-CM" },
  EUR: { name: "Euro", symbol: "€", locale: "fr-FR" },
  USD: { name: "Dollar US", symbol: "$", locale: "en-US" },
  GHS: { name: "Cedi ghanéen", symbol: "GH₵", locale: "en-GH" },
  NGN: { name: "Naira nigérian", symbol: "₦", locale: "en-NG" },
  KES: { name: "Shilling kenyan", symbol: "KSh", locale: "en-KE" },
  ZAR: { name: "Rand sud-africain", symbol: "R", locale: "en-ZA" },
  MAD: { name: "Dirham marocain", symbol: "DH", locale: "ar-MA" },
  TND: { name: "Dinar tunisien", symbol: "DT", locale: "ar-TN" },
} as const

export type Currency = keyof typeof SUPPORTED_CURRENCIES

// Default currency based on region
export function getDefaultCurrency(): Currency {
  return "XOF"
}

// Format currency amount
export function formatCurrencyAmount(
  amount: number,
  currency: Currency = "XOF"
): string {
  const { symbol, locale } = SUPPORTED_CURRENCIES[currency]
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  STARTER: {
    name: "Starter",
    price: 0,
    currency: "XOF",
    features: {
      clients: 50,
      debts: 100,
      reminders: 50,
      teamMembers: 1,
      sms: 0,
      email: 100,
    },
  },
  PRO: {
    name: "Pro",
    price: 15000,
    currency: "XOF",
    features: {
      clients: 500,
      debts: 1000,
      reminders: 500,
      teamMembers: 5,
      sms: 100,
      email: 1000,
    },
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: 50000,
    currency: "XOF",
    features: {
      clients: -1, // unlimited
      debts: -1,
      reminders: -1,
      teamMembers: -1,
      sms: 500,
      email: 5000,
    },
  },
} as const

export type PlanType = keyof typeof SUBSCRIPTION_PLANS

// Paystack configuration
export const PAYSTACK_PLANS = {
  PRO_MONTHLY: "PLN_pro_monthly_xof",
  PRO_YEARLY: "PLN_pro_yearly_xof",
  ENTERPRISE_MONTHLY: "PLN_enterprise_monthly_xof",
  ENTERPRISE_YEARLY: "PLN_enterprise_yearly_xof",
}

// Reminder settings
export const REMINDER_INTERVALS = {
  FIRST_REMINDER_DAYS: 3,
  SECOND_REMINDER_DAYS: 7,
  THIRD_REMINDER_DAYS: 14,
  FINAL_REMINDER_DAYS: 30,
}

// SMS pricing (in XOF)
export const SMS_PRICING = {
  LOCAL: 25, // Per SMS in same country
  INTERNATIONAL: 50, // Per SMS to other African countries
  BULK_DISCOUNT: 0.1, // 10% discount for bulk > 1000
}

// File upload limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ["image/jpeg", "image/png", "application/pdf", "text/csv"],
}

export const config = {
  appName: APP_NAME,
  appDescription: APP_DESCRIPTION,
  appUrl: APP_URL,
  supportedCurrencies: SUPPORTED_CURRENCIES,
  subscriptionPlans: SUBSCRIPTION_PLANS,
  reminderIntervals: REMINDER_INTERVALS,
  smsPricing: SMS_PRICING,
  uploadLimits: UPLOAD_LIMITS,
}

export default config
