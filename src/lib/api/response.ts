/**
 * API Response Helpers for RelancePro Africa
 * Standardized response format with pagination, error handling, and HATEOAS links
 */

import { NextResponse } from 'next/server'

// =====================================================
// Types
// =====================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ResponseMeta
  links?: HATEOASLinks
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ResponseMeta {
  page?: number
  perPage?: number
  total?: number
  totalPages?: number
  hasMore?: boolean
  timestamp?: string
  requestId?: string
}

export interface HATEOASLinks {
  self?: string
  next?: string
  prev?: string
  first?: string
  last?: string
  related?: Record<string, string>
}

export interface PaginationParams {
  page?: number
  perPage?: number
  total?: number
  baseUrl?: string
}

// =====================================================
// Success Response Builders
// =====================================================

/**
 * Create a successful API response
 */
export function successResponse<T>(
  data: T,
  meta?: ResponseMeta,
  links?: HATEOASLinks
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
    links,
  })
}

/**
 * Create a paginated list response with HATEOAS links
 */
export function paginatedResponse<T>(
  items: T[],
  params: PaginationParams & { total: number }
): NextResponse<ApiResponse<T[]>> {
  const {
    page = 1,
    perPage = 20,
    total,
    baseUrl = '',
  } = params

  const totalPages = Math.ceil(total / perPage)
  const hasMore = page < totalPages

  const links: HATEOASLinks = {
    self: `${baseUrl}?page=${page}&perPage=${perPage}`,
    first: `${baseUrl}?page=1&perPage=${perPage}`,
    last: `${baseUrl}?page=${totalPages}&perPage=${perPage}`,
  }

  if (page > 1) {
    links.prev = `${baseUrl}?page=${page - 1}&perPage=${perPage}`
  }

  if (hasMore) {
    links.next = `${baseUrl}?page=${page + 1}&perPage=${perPage}`
  }

  return successResponse(items, {
    page,
    perPage,
    total,
    totalPages,
    hasMore,
  }, links)
}

/**
 * Create a created response (201)
 */
export function createdResponse<T>(
  data: T,
  location?: string
): NextResponse<ApiResponse<T>> {
  const response = NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status: 201 }
  )

  if (location) {
    response.headers.set('Location', location)
  }

  return response
}

/**
 * Create a no content response (204)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

// =====================================================
// Error Response Builders
// =====================================================

/**
 * Error codes mapping
 */
export const ErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  API_KEY_EXPIRED: 'API_KEY_EXPIRED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
  
  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_SCOPE: 'INSUFFICIENT_SCOPE',
  
  // Validation errors
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

/**
 * Create an error response
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  status: number = 400
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  )
}

/**
 * Create an unauthorized response (401)
 */
export function unauthorizedResponse(
  message: string = 'Authentication required'
): NextResponse<ApiResponse<never>> {
  return errorResponse(
    ErrorCodes.UNAUTHORIZED,
    message,
    undefined,
    401
  )
}

/**
 * Create a forbidden response (403)
 */
export function forbiddenResponse(
  message: string = 'Access denied',
  requiredScope?: string
): NextResponse<ApiResponse<never>> {
  return errorResponse(
    ErrorCodes.INSUFFICIENT_SCOPE,
    message,
    requiredScope ? { requiredScope } : undefined,
    403
  )
}

/**
 * Create a not found response (404)
 */
export function notFoundResponse(
  resource: string,
  id?: string
): NextResponse<ApiResponse<never>> {
  return errorResponse(
    ErrorCodes.NOT_FOUND,
    id ? `${resource} with id '${id}' not found` : `${resource} not found`,
    { resource, id },
    404
  )
}

/**
 * Create a validation error response (400)
 */
export function validationErrorResponse(
  message: string,
  details: Record<string, unknown>
): NextResponse<ApiResponse<never>> {
  return errorResponse(
    ErrorCodes.VALIDATION_ERROR,
    message,
    details,
    400
  )
}

/**
 * Create a rate limit exceeded response (429)
 */
export function rateLimitResponse(
  retryAfter: number,
  limit: number
): NextResponse<ApiResponse<never>> {
  const response = errorResponse(
    ErrorCodes.RATE_LIMIT_EXCEEDED,
    `Rate limit exceeded. Limit: ${limit} requests per minute.`,
    { limit, retryAfter },
    429
  )
  response.headers.set('Retry-After', String(retryAfter))
  response.headers.set('X-RateLimit-Limit', String(limit))
  return response
}

/**
 * Create an internal server error response (500)
 */
export function internalErrorResponse(
  message: string = 'Internal server error',
  requestId?: string
): NextResponse<ApiResponse<never>> {
  return errorResponse(
    ErrorCodes.INTERNAL_ERROR,
    message,
    requestId ? { requestId } : undefined,
    500
  )
}

// =====================================================
// HATEOAS Helpers
// =====================================================

/**
 * Build HATEOAS links for a resource
 */
export function buildLinks(
  baseUrl: string,
  resourceId: string,
  related?: Record<string, string>
): HATEOASLinks {
  return {
    self: `${baseUrl}/${resourceId}`,
    related,
  }
}

/**
 * Build HATEOAS links for a collection
 */
export function buildCollectionLinks(
  baseUrl: string,
  page: number,
  perPage: number,
  total: number
): HATEOASLinks {
  const totalPages = Math.ceil(total / perPage)
  const links: HATEOASLinks = {
    self: `${baseUrl}?page=${page}&perPage=${perPage}`,
    first: `${baseUrl}?page=1&perPage=${perPage}`,
    last: `${baseUrl}?page=${totalPages}&perPage=${perPage}`,
  }

  if (page > 1) {
    links.prev = `${baseUrl}?page=${page - 1}&perPage=${perPage}`
  }

  if (page < totalPages) {
    links.next = `${baseUrl}?page=${page + 1}&perPage=${perPage}`
  }

  return links
}

// =====================================================
// Request Helpers
// =====================================================

/**
 * Extract pagination params from URL search params
 */
export function getPaginationParams(
  searchParams: URLSearchParams,
  defaults: { page?: number; perPage?: number } = {}
): { page: number; perPage: number; offset: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') || '') || defaults.page || 1)
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') || '') || defaults.perPage || 20))
  const offset = (page - 1) * perPage

  return { page, perPage, offset }
}

/**
 * Extract filter params from URL search params
 */
export function getFilterParams<T extends string>(
  searchParams: URLSearchParams,
  allowedFilters: T[]
): Record<T, string | undefined> {
  const filters = {} as Record<T, string | undefined>
  
  for (const filter of allowedFilters) {
    const value = searchParams.get(filter)
    if (value) {
      filters[filter] = value
    }
  }
  
  return filters
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}
