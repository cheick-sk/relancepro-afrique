// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  interval: number;
  limit: number;
  max: number;
  message?: string;
}

export const RateLimits = {
  api: { interval: 60 * 1000, limit: 100, max: 100, message: "Trop de requêtes API. Veuillez réessayer plus tard." },
  auth: { interval: 60 * 1000, limit: 10, max: 10, message: "Trop de tentatives de connexion. Veuillez réessayer plus tard." },
  sms: { interval: 60 * 1000, limit: 20, max: 20, message: "Trop de SMS envoyés. Veuillez réessayer plus tard." },
  reminders: { interval: 60 * 1000, limit: 50, max: 50, message: "Trop de rappels. Veuillez réessayer plus tard." },
};

export class RateLimiter {
  config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  check(identifier: string): { success: boolean; remaining: number; reset: Date; retryAfter?: number } {
    const now = Date.now();
    const key = identifier;
    const record = rateLimitStore.get(key);
    const reset = new Date(now + this.config.interval);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + this.config.interval });
      return { success: true, remaining: this.config.limit - 1, reset };
    }

    if (record.count >= this.config.limit) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      return { success: false, remaining: 0, reset: new Date(record.resetAt), retryAfter };
    }

    record.count++;
    return { success: true, remaining: this.config.limit - record.count, reset };
  }
}

export function getRateLimitIdentifier(ip: string, userId?: string): string {
  // Use userId if available, otherwise use IP
  return userId ? `user:${userId}` : `ip:${ip}`;
}

export async function checkRateLimit(identifier: string, config: RateLimitConfig): Promise<boolean> {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.interval });
    return true;
  }

  if (record.count >= config.limit) {
    return false;
  }

  record.count++;
  return true;
}
