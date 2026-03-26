export interface PaystackTransaction {
  reference: string;
  amount: number;
  currency: string;
  email: string;
  status: 'pending' | 'success' | 'failed';
  metadata?: Record<string, unknown>;
}

export interface PaystackPlan {
  id: number;
  name: string;
  amount: number;
  currency: string;
  interval: 'monthly' | 'yearly';
}

export const PAYSTACK_PLANS: Record<string, PaystackPlan> = {
  starter_monthly: {
    id: 1,
    name: 'Starter',
    amount: 50000 * 100, // in kobo (smallest currency unit)
    currency: 'GNF',
    interval: 'monthly',
  },
  business_monthly: {
    id: 2,
    name: 'Business',
    amount: 150000 * 100,
    currency: 'GNF',
    interval: 'monthly',
  },
  enterprise_monthly: {
    id: 3,
    name: 'Enterprise',
    amount: 500000 * 100,
    currency: 'GNF',
    interval: 'monthly',
  },
};

export function generateReference(): string {
  return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function initializeTransaction(params: {
  email: string;
  amount: number;
  reference: string;
  callback_url: string;
  metadata?: Record<string, unknown>;
}): Promise<{ authorization_url: string; reference: string }> {
  const baseUrl = 'https://checkout.paystack.com';
  
  return {
    authorization_url: `${baseUrl}/${params.reference}`,
    reference: params.reference,
  };
}

export async function verifyTransaction(reference: string): Promise<{
  status: boolean;
  data?: PaystackTransaction;
  message?: string;
}> {
  return {
    status: true,
    data: {
      reference,
      amount: 0,
      currency: 'GNF',
      email: '',
      status: 'success',
    },
  };
}

export function calculateSubscriptionEnd(startDate: Date, interval: 'monthly' | 'yearly'): Date {
  const end = new Date(startDate);
  
  if (interval === 'monthly') {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }
  
  return end;
}

export function isPaystackConfigured(): boolean {
  return !!(process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_PUBLIC_KEY);
}
