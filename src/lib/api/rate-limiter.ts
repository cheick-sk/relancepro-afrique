/**
 * Rate Limiter for RelancePro Africa API
 * Sliding window rate limiting with per-endpoint and per-API-key limits
 */

import { db } from '@/lib/db'
import { rateLimitResponse, ErrorCodes, errorResponse } from './response'

// =====================================================
// Types
// =====================================================

export interface RateLimitConfig {
  // Requests per minute
  requestsPerMinute: number
  // Requests per day
  requestsPerDay: number
  // Window size in seconds
  windowSizeSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number
}

export interface EndpointRateLimit {
  endpoint: string
  method: string
  limit: number
  windowMs: number
}

// =====================================================
// Default Rate Limits
// =====================================================

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 100,
  requestsPerDay: 5000,
  windowSizeSeconds: 60,
}

export const ENTERPRISE_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 1000,
  requestsPerDay: 100000,
  windowSizeSeconds: 60,
}

// Per-endpoint rate limits
export const ENDPOINT_RATE_LIMITS: EndpointRateLimit[] = [
  // Heavy endpoints
  { endpoint: '/api/v1/analytics', method: 'GET', limit: 30, windowMs: 60000 },
  { endpoint: '/api/v1/reminders', method: 'POST', limit: 20, windowMs: 60000 },
  
  // Standard endpoints
  { endpoint: '/api/v1/clients', method: 'GET', limit: 100, windowMs: 60000 },
  { endpoint: '/api/v1/clients', method: 'POST', limit: 50, windowMs: 60000 },
  { endpoint: '/api/v1/debts', method: 'GET', limit: 100, windowMs: 60000 },
  { endpoint: '/api/v1/debts', method: 'POST', limit: 50, windowMs: 60000 },
  
  // Webhooks
  { endpoint: '/api/v1/webhooks', method: 'POST', limit: 10, windowMs: 60000 },
]

// =====================================================
// In-Memory Rate Limit Store
// =====================================================

interface RateLimitEntry {
  count: number
  resetAt: number
  dailyCount: number
  dailyResetAt: number
}

// Store for rate limit entries (key -> entry)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Store for endpoint-specific rate limits
const endpointRateLimitStore = new Map<string, Map<string, RateLimitEntry>>()

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000

// Cleanup old entries
setInterval(() => {
  const now = Date.now()
  
  // Cleanup main store
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now && entry.dailyResetAt < now) {
      rateLimitStore.delete(key)
    }
  }
  
  // Cleanup endpoint store
  for (const [endpoint, store] of endpointRateLimitStore.entries()) {
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key)
      }
    }
    if (store.size === 0) {
      endpointRateLimitStore.delete(endpoint)
    }
  }
}, CLEANUP_INTERVAL)

// =====================================================
// Rate Limiter Functions
// =====================================================

/**
 * Get rate limit key for an API key
 */
function getRateLimitKey(apiKeyId: string): string {
  return `ratelimit:${apiKeyId}`
}

/**
 * Get endpoint-specific rate limit key
 */
function getEndpointRateLimitKey(apiKeyId: string, endpoint: string, method: string): string {
  return `${apiKeyId}:${method}:${endpoint}`
}

/**
 * Check rate limit for an API key
 */
export function checkRateLimit(
  apiKeyId: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS
): RateLimitResult {
  const key = getRateLimitKey(apiKeyId)
  const now = Date.now()
  
  let entry = rateLimitStore.get(key)
  
  // Initialize entry if not exists
  if (!entry) {
    entry = {
      count: 0,
      resetAt: now + (config.windowSizeSeconds * 1000),
      dailyCount: 0,
      dailyResetAt: now + (24 * 60 * 60 * 1000), // 24 hours
    }
    rateLimitStore.set(key, entry)
  }
  
  // Reset counters if windows have expired
  if (entry.resetAt < now) {
    entry.count = 0
    entry.resetAt = now + (config.windowSizeSeconds * 1000)
  }
  
  if (entry.dailyResetAt < now) {
    entry.dailyCount = 0
    entry.dailyResetAt = now + (24 * 60 * 60 * 1000)
  }
  
  // Check limits
  const minuteExceeded = entry.count >= config.requestsPerMinute
  const dailyExceeded = entry.dailyCount >= config.requestsPerDay
  
  if (minuteExceeded || dailyExceeded) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      retryAfter,
    }
  }
  
  // Increment counters
  entry.count++
  entry.dailyCount++
  
  return {
    allowed: true,
    remaining: Math.min(
      config.requestsPerMinute - entry.count,
      config.requestsPerDay - entry.dailyCount
    ),
    resetAt: new Date(entry.resetAt),
  }
}

/**
 * Check endpoint-specific rate limit
 */
export function checkEndpointRateLimit(
  apiKeyId: string,
  endpoint: string,
  method: string,
  customLimit?: number
): RateLimitResult {
  // Find endpoint config
  const endpointConfig = ENDPOINT_RATE_LIMITS.find(
    e => endpoint.startsWith(e.endpoint) && e.method === method
  )
  
  const limit = customLimit || endpointConfig?.limit || 100
  const windowMs = endpointConfig?.windowMs || 60000
  
  const endpointKey = `${endpoint}:${method}`
  
  // Get or create endpoint store
  let store = endpointRateLimitStore.get(endpointKey)
  if (!store) {
    store = new Map()
    endpointRateLimitStore.set(endpointKey, store)
  }
  
  const key = getEndpointRateLimitKey(apiKeyId, endpoint, method)
  const now = Date.now()
  
  let entry = store.get(key)
  
  if (!entry) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
      dailyCount: 0,
      dailyResetAt: now + (24 * 60 * 60 * 1000),
    }
    store.set(key, entry)
  }
  
  if (entry.resetAt < now) {
    entry.count = 0
    entry.resetAt = now + windowMs
  }
  
  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      retryAfter,
    }
  }
  
  entry.count++
  
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: new Date(entry.resetAt),
  }
}

/**
 * Combined rate limit check (global + endpoint-specific)
 */
export function checkCombinedRateLimit(
  apiKeyId: string,
  endpoint: string,
  method: string,
  customConfig?: Partial<RateLimitConfig>
): RateLimitResult {
  // Check global rate limit first
  const globalResult = checkRateLimit(apiKeyId, {
    ...DEFAULT_RATE_LIMITS,
    ...customConfig,
  })
  
  if (!globalResult.allowed) {
    return globalResult
  }
  
  // Check endpoint-specific rate limit
  const endpointResult = checkEndpointRateLimit(apiKeyId, endpoint, method)
  
  if (!endpointResult.allowed) {
    return endpointResult
  }
  
  // Return the more restrictive result
  return globalResult.remaining < endpointResult.remaining ? globalResult : endpointResult
}

/**
 * Rate limit middleware for API routes
 */
export async function withRateLimit(
  apiKeyId: string,
  endpoint: string,
  method: string,
  handler: () => Promise<Response>,
  customLimit?: number
): Promise<Response> {
  const result = checkCombinedRateLimit(apiKeyId, endpoint, method, 
    customLimit ? { requestsPerMinute: customLimit } : undefined
  )
  
  if (!result.allowed) {
    return rateLimitResponse(result.retryAfter || 60, customLimit || DEFAULT_RATE_LIMITS.requestsPerMinute)
  }
  
  const response = await handler()
  
  // Add rate limit headers
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set('X-RateLimit-Reset', result.resetAt.toISOString())
  
  return response
}

/**
 * Get rate limit headers for a response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  }
}

/**
 * Record API usage in database for analytics
 */
export async function recordApiUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  ip?: string,
  userAgent?: string,
  error?: string
): Promise<void> {
  try {
    await db.apiUsage.create({
      data: {
        apiKeyId,
        endpoint,
        method,
        statusCode,
        responseTime,
        ip,
        userAgent,
        error,
      },
    })
    
    // Update API key last used
    await db.apiKey.update({
      where: { id: apiKeyId },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    })
  } catch (err) {
    console.error('Failed to record API usage:', err)
  }
}

/**
 * Get API usage statistics
 */
export async function getApiUsageStats(
  apiKeyId: string,
  days: number = 7
): Promise<{
  totalRequests: number
  successRate: number
  avgResponseTime: number
  endpointStats: Array<{
    endpoint: string
    count: number
    avgResponseTime: number
  }>
  dailyStats: Array<{
    date: string
    count: number
  }>
}> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const usage = await db.apiUsage.findMany({
    where: {
      apiKeyId,
      createdAt: { gte: startDate },
    },
  })
  
  const totalRequests = usage.length
  const successfulRequests = usage.filter(u => u.statusCode >= 200 && u.statusCode < 300).length
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0
  
  const totalResponseTime = usage.reduce((sum, u) => sum + u.responseTime, 0)
  const avgResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0
  
  // Group by endpoint
  const endpointMap = new Map<string, { count: number; totalResponseTime: number }>()
  for (const u of usage) {
    const key = `${u.method} ${u.endpoint}`
    const existing = endpointMap.get(key) || { count: 0, totalResponseTime: 0 }
    existing.count++
    existing.totalResponseTime += u.responseTime
    endpointMap.set(key, existing)
  }
  
  const endpointStats = Array.from(endpointMap.entries()).map(([endpoint, data]) => ({
    endpoint,
    count: data.count,
    avgResponseTime: data.count > 0 ? data.totalResponseTime / data.count : 0,
  }))
  
  // Group by day
  const dayMap = new Map<string, number>()
  for (const u of usage) {
    const date = u.createdAt.toISOString().split('T')[0]
    dayMap.set(date, (dayMap.get(date) || 0) + 1)
  }
  
  const dailyStats = Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
  
  return {
    totalRequests,
    successRate,
    avgResponseTime,
    endpointStats,
    dailyStats,
  }
}
