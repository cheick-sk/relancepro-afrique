/**
 * API Authentication for RelancePro Africa
 * API key validation, Bearer token authentication, permission scopes
 */

import { db } from '@/lib/db'
import { 
  unauthorizedResponse, 
  forbiddenResponse, 
  errorResponse, 
  ErrorCodes 
} from './response'
import { checkCombinedRateLimit, recordApiUsage, RateLimitResult } from './rate-limiter'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

// =====================================================
// Types
// =====================================================

export type ApiScope = 
  | 'clients:read'
  | 'clients:write'
  | 'debts:read'
  | 'debts:write'
  | 'reminders:read'
  | 'reminders:write'
  | 'webhooks:manage'
  | 'analytics:read'

export interface AuthenticatedApiKey {
  id: string
  profileId: string
  name: string
  scopes: ApiScope[]
  rateLimit: number
}

export interface AuthResult {
  authenticated: boolean
  apiKey?: AuthenticatedApiKey
  error?: Response
}

// =====================================================
// Scope Definitions
// =====================================================

export const SCOPE_DEFINITIONS: Record<ApiScope, { name: string; description: string }> = {
  'clients:read': {
    name: 'Lire les clients',
    description: 'Consulter la liste des clients et leurs détails',
  },
  'clients:write': {
    name: 'Gérer les clients',
    description: 'Créer, modifier et supprimer des clients',
  },
  'debts:read': {
    name: 'Lire les créances',
    description: 'Consulter la liste des créances et leurs détails',
  },
  'debts:write': {
    name: 'Gérer les créances',
    description: 'Créer, modifier et supprimer des créances',
  },
  'reminders:read': {
    name: 'Lire les relances',
    description: 'Consulter l\'historique des relances',
  },
  'reminders:write': {
    name: 'Envoyer des relances',
    description: 'Créer et envoyer des relances',
  },
  'webhooks:manage': {
    name: 'Gérer les webhooks',
    description: 'Créer, modifier et supprimer des webhooks',
  },
  'analytics:read': {
    name: 'Lire les analytics',
    description: 'Consulter les statistiques et analyses',
  },
}

// Scope hierarchy (write includes read)
export const SCOPE_HIERARCHY: Record<ApiScope, ApiScope[]> = {
  'clients:read': ['clients:read'],
  'clients:write': ['clients:read', 'clients:write'],
  'debts:read': ['debts:read'],
  'debts:write': ['debts:read', 'debts:write'],
  'reminders:read': ['reminders:read'],
  'reminders:write': ['reminders:read', 'reminders:write'],
  'webhooks:manage': ['webhooks:manage'],
  'analytics:read': ['analytics:read'],
}

// =====================================================
// API Key Generation & Hashing
// =====================================================

const API_KEY_PREFIX = 'rpa_live_'
const API_KEY_LENGTH = 32

/**
 * Generate a new API key
 */
export function generateApiKey(): { key: string; keyPrefix: string; hashedKey: string } {
  // Generate random bytes
  const randomBytes = crypto.randomBytes(API_KEY_LENGTH)
  const keyString = randomBytes.toString('base64url').substring(0, API_KEY_LENGTH)
  
  // Full key
  const key = `${API_KEY_PREFIX}${keyString}`
  
  // Prefix for identification (first 12 chars)
  const keyPrefix = key.substring(0, 12)
  
  // Hash for storage
  const hashedKey = hashApiKey(key)
  
  return { key, keyPrefix, hashedKey }
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return crypto
    .createHash('sha256')
    .update(key)
    .digest('hex')
}

/**
 * Verify an API key against a hash
 */
export function verifyApiKey(key: string, hash: string): boolean {
  return hashApiKey(key) === hash
}

/**
 * Extract API key from Authorization header
 */
export function extractApiKey(authHeader: string | null): string | null {
  if (!authHeader) return null
  
  // Bearer token format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim()
  }
  
  // Direct key format
  return authHeader.trim()
}

// =====================================================
// Authentication Functions
// =====================================================

/**
 * Validate an API key and return the associated data
 */
export async function validateApiKey(key: string): Promise<AuthenticatedApiKey | null> {
  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return null
  }
  
  const hashedKey = hashApiKey(key)
  
  const apiKey = await db.apiKey.findUnique({
    where: { key: hashedKey },
    select: {
      id: true,
      profileId: true,
      name: true,
      scopes: true,
      rateLimit: true,
      active: true,
      expiresAt: true,
    },
  })
  
  if (!apiKey) {
    return null
  }
  
  // Check if key is active
  if (!apiKey.active) {
    return null
  }
  
  // Check if key is expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null
  }
  
  // Parse scopes
  let scopes: ApiScope[] = []
  try {
    scopes = JSON.parse(apiKey.scopes) as ApiScope[]
  } catch {
    scopes = []
  }
  
  return {
    id: apiKey.id,
    profileId: apiKey.profileId,
    name: apiKey.name,
    scopes,
    rateLimit: apiKey.rateLimit,
  }
}

/**
 * Check if an API key has a specific scope
 */
export function hasScope(apiKey: AuthenticatedApiKey, requiredScope: ApiScope): boolean {
  // Get all scopes that the required scope implies
  const impliedScopes = SCOPE_HIERARCHY[requiredScope] || [requiredScope]
  
  // Check if any of the key's scopes cover the required scope
  return apiKey.scopes.some(scope => {
    const scopePermissions = SCOPE_HIERARCHY[scope] || [scope]
    return scopePermissions.includes(requiredScope)
  })
}

/**
 * Check multiple scopes (all must be present)
 */
export function hasAllScopes(apiKey: AuthenticatedApiKey, requiredScopes: ApiScope[]): boolean {
  return requiredScopes.every(scope => hasScope(apiKey, scope))
}

/**
 * Check multiple scopes (at least one must be present)
 */
export function hasAnyScope(apiKey: AuthenticatedApiKey, requiredScopes: ApiScope[]): boolean {
  return requiredScopes.some(scope => hasScope(apiKey, scope))
}

// =====================================================
// Authentication Middleware
// =====================================================

/**
 * Authenticate an API request
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  const headersList = await headers()
  const authHeader = headersList.get('Authorization')
  
  // Extract API key
  const key = extractApiKey(authHeader)
  
  if (!key) {
    return {
      authenticated: false,
      error: unauthorizedResponse('Missing or invalid Authorization header. Use: Bearer YOUR_API_KEY'),
    }
  }
  
  // Validate API key
  const apiKey = await validateApiKey(key)
  
  if (!apiKey) {
    return {
      authenticated: false,
      error: errorResponse(
        ErrorCodes.INVALID_API_KEY,
        'Invalid API key',
        undefined,
        401
      ),
    }
  }
  
  // Check rate limit
  const endpoint = new URL(request.url).pathname
  const method = request.method
  
  const rateLimitResult = checkCombinedRateLimit(
    apiKey.id,
    endpoint,
    method,
    { requestsPerMinute: apiKey.rateLimit }
  )
  
  if (!rateLimitResult.allowed) {
    return {
      authenticated: false,
      error: errorResponse(
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded',
        { retryAfter: rateLimitResult.retryAfter },
        429
      ),
    }
  }
  
  return {
    authenticated: true,
    apiKey,
  }
}

/**
 * Require specific scope(s) for an API endpoint
 */
export async function requireScope(
  request: NextRequest,
  requiredScope: ApiScope
): Promise<{ apiKey: AuthenticatedApiKey } | { error: Response }> {
  const authResult = await authenticateRequest(request)
  
  if (!authResult.authenticated || !authResult.apiKey) {
    return { error: authResult.error! }
  }
  
  if (!hasScope(authResult.apiKey, requiredScope)) {
    return {
      error: forbiddenResponse(
        'Insufficient permissions',
        requiredScope
      ),
    }
  }
  
  return { apiKey: authResult.apiKey }
}

/**
 * Require multiple scopes (all must be present)
 */
export async function requireAllScopes(
  request: NextRequest,
  requiredScopes: ApiScope[]
): Promise<{ apiKey: AuthenticatedApiKey } | { error: Response }> {
  const authResult = await authenticateRequest(request)
  
  if (!authResult.authenticated || !authResult.apiKey) {
    return { error: authResult.error! }
  }
  
  if (!hasAllScopes(authResult.apiKey, requiredScopes)) {
    return {
      error: forbiddenResponse(
        'Insufficient permissions',
        requiredScopes.join(', ')
      ),
    }
  }
  
  return { apiKey: authResult.apiKey }
}

// =====================================================
// API Key Management
// =====================================================

/**
 * Create a new API key
 */
export async function createApiKey(
  profileId: string,
  name: string,
  scopes: ApiScope[],
  rateLimit: number = 100,
  expiresAt?: Date
): Promise<{ id: string; key: string; keyPrefix: string }> {
  const { key, keyPrefix, hashedKey } = generateApiKey()
  
  const apiKey = await db.apiKey.create({
    data: {
      profileId,
      name,
      key: hashedKey,
      keyPrefix,
      scopes: JSON.stringify(scopes),
      rateLimit,
      expiresAt,
    },
  })
  
  return {
    id: apiKey.id,
    key,
    keyPrefix,
  }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  apiKeyId: string,
  profileId: string
): Promise<boolean> {
  const result = await db.apiKey.updateMany({
    where: {
      id: apiKeyId,
      profileId,
    },
    data: {
      active: false,
    },
  })
  
  return result.count > 0
}

/**
 * Delete an API key
 */
export async function deleteApiKey(
  apiKeyId: string,
  profileId: string
): Promise<boolean> {
  const result = await db.apiKey.deleteMany({
    where: {
      id: apiKeyId,
      profileId,
    },
  })
  
  return result.count > 0
}

/**
 * List API keys for a profile
 */
export async function listApiKeys(profileId: string) {
  return db.apiKey.findMany({
    where: { profileId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      rateLimit: true,
      lastUsedAt: true,
      usageCount: true,
      active: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Update API key scopes
 */
export async function updateApiKeyScopes(
  apiKeyId: string,
  profileId: string,
  scopes: ApiScope[]
): Promise<boolean> {
  const result = await db.apiKey.updateMany({
    where: {
      id: apiKeyId,
      profileId,
    },
    data: {
      scopes: JSON.stringify(scopes),
    },
  })
  
  return result.count > 0
}

// =====================================================
// Request Helpers
// =====================================================

/**
 * Get client IP from request
 */
export async function getClientIp(request: NextRequest): Promise<string | null> {
  const headersList = await headers()
  return (
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
    headersList.get('x-real-ip') ||
    null
  )
}

/**
 * Get user agent from request
 */
export async function getUserAgent(request: NextRequest): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('user-agent')
}

/**
 * Log API usage for a request
 */
export async function logApiUsage(
  apiKeyId: string,
  request: NextRequest,
  statusCode: number,
  responseTime: number,
  error?: string
): Promise<void> {
  const ip = await getClientIp(request)
  const userAgent = await getUserAgent(request)
  const url = new URL(request.url)
  
  await recordApiUsage(
    apiKeyId,
    url.pathname,
    request.method,
    statusCode,
    responseTime,
    ip || undefined,
    userAgent || undefined,
    error
  )
}
