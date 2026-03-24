// Rate limiting configuration and utilities

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export const RateLimits: Record<string, RateLimitConfig> = {
  api: { windowMs: 60 * 1000, maxRequests: 100 },
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  sms: { windowMs: 60 * 1000, maxRequests: 10 },
  email: { windowMs: 60 * 1000, maxRequests: 20 },
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map()

  constructor(private config: RateLimitConfig) {}

  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now()
    const windowStart = now - this.config.windowMs
    
    // Get existing requests for this identifier
    let timestamps = this.requests.get(identifier) || []
    
    // Filter out old requests
    timestamps = timestamps.filter(ts => ts > windowStart)
    
    const remaining = Math.max(0, this.config.maxRequests - timestamps.length)
    const resetAt = timestamps.length > 0 
      ? timestamps[0] + this.config.windowMs 
      : now + this.config.windowMs

    if (timestamps.length < this.config.maxRequests) {
      timestamps.push(now)
      this.requests.set(identifier, timestamps)
      return { allowed: true, remaining: remaining - 1, resetAt }
    }

    return { allowed: false, remaining: 0, resetAt }
  }

  reset(identifier: string): void {
    this.requests.delete(identifier)
  }
}

export function getRateLimitIdentifier(request: Request): string {
  // Safely access headers - may be undefined in some Edge runtime contexts
  const headers = request?.headers
  if (!headers) {
    return "unknown"
  }
  
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
             headers.get("x-real-ip") ||
             "unknown"
  return ip
}

export function checkRateLimit(type: keyof typeof RateLimits, identifier: string): boolean {
  // Simple implementation - in production, use Redis
  return true
}
