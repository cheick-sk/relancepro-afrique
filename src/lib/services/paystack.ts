// Service Paystack pour les paiements

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    customer: {
      email: string;
      customer_code: string;
    };
    metadata: Record<string, unknown>;
    paid_at: string;
    plan: {
      id: number;
      name: string;
      plan_code: string;
    } | null;
  };
}

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";
const PAYSTACK_BASE_URL = "https://api.paystack.co";

// Vérifier si Paystack est configuré
export function isPaystackConfigured(): boolean {
  return !!PAYSTACK_SECRET_KEY;
}

// Initialiser une transaction
export async function initializeTransaction(params: {
  email: string;
  amount: number;
  reference?: string;
  callback_url: string;
  plan?: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitializeResponse> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amount * 100, // Paystack utilise les centimes
      reference: params.reference,
      callback_url: params.callback_url,
      plan: params.plan,
      metadata: params.metadata,
    }),
  });

  return response.json();
}

// Vérifier une transaction
export async function verifyTransaction(
  reference: string
): Promise<PaystackVerifyResponse> {
  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.json();
}

// Créer un client
export async function createCustomer(params: {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}): Promise<{ status: boolean; data: { customer_code: string } }> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/customer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  return response.json();
}

// Plans d'abonnement (IDs Paystack - à configurer dans le dashboard Paystack)
export const PAYSTACK_PLANS = {
  monthly: {
    name: "Abonnement Mensuel",
    amount: 15000, // 15 000 FCFA
    currency: "XOF",
    interval: "monthly",
    description: "Relances illimitées - Mensuel",
  },
  yearly: {
    name: "Abonnement Annuel",
    amount: 150000, // 150 000 FCFA
    currency: "XOF",
    interval: "annually",
    description: "Relances illimitées - Annuel (2 mois offerts)",
  },
};

// Générer une référence unique
export function generateReference(prefix: string = "RP"): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`.toUpperCase();
}

// Calculer la date de fin d'abonnement
export function calculateSubscriptionEnd(plan: "monthly" | "yearly"): Date {
  const now = new Date();
  if (plan === "monthly") {
    return new Date(now.setMonth(now.getMonth() + 1));
  } else {
    return new Date(now.setFullYear(now.getFullYear() + 1));
  }
}

// Export public key pour le frontend
export function getPaystackPublicKey(): string {
  return PAYSTACK_PUBLIC_KEY;
}
