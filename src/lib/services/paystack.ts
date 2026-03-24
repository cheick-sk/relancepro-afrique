// Paystack payment service

export async function initializeTransaction(email: string, amount: number): Promise<{ authorization_url: string; reference: string }> {
  return {
    authorization_url: "https://paystack.com/pay/test",
    reference: `ref_${Date.now()}`,
  }
}

export function generateReference(): string {
  return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function verifyTransaction(reference: string): Promise<{ status: string; amount: number }> {
  return Promise.resolve({ status: "success", amount: 0 })
}

export function calculateSubscriptionEnd(plan: string): Date {
  const now = new Date()
  now.setMonth(now.getMonth() + 1)
  return now
}

export function isPaystackConfigured(): boolean {
  return !!process.env.PAYSTACK_SECRET_KEY
}

export const PAYSTACK_PLANS = {
  PRO_MONTHLY: "PLN_pro_monthly",
  PRO_YEARLY: "PLN_pro_yearly",
  ENTERPRISE_MONTHLY: "PLN_enterprise_monthly",
  ENTERPRISE_YEARLY: "PLN_enterprise_yearly",
}
