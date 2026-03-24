// API rate limiter

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export function getApiUsageStats(apiKeyId: string): {
  totalRequests: number
  requestsThisMonth: number
  averageResponseTime: number
} {
  return {
    totalRequests: 0,
    requestsThisMonth: 0,
    averageResponseTime: 0,
  }
}
