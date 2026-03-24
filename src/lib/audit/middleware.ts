/**
 * Audit Middleware for RelancePro Africa
 * Auto-logs API requests with configurable rules
 */

import { NextRequest, NextResponse } from 'next/server';
import { logAudit, AuditAction, EntityType, type AuditStatusType } from './logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

// =====================================================
// CONFIGURATION
// =====================================================

interface AuditRule {
  method: string | string[];
  action: string;
  entityType: string;
  status?: 'success' | 'failed';
  extractEntityId?: (request: NextRequest, response?: NextResponse) => string | null;
  extractDetails?: (request: NextRequest, body?: any) => Record<string, unknown>;
}

// Default audit rules for API routes
const AUDIT_RULES: Record<string, AuditRule[]> = {
  // Clients API
  '/api/clients': [
    { method: 'POST', action: AuditAction.CLIENT_CREATED, entityType: EntityType.CLIENT },
    { method: 'PUT', action: AuditAction.CLIENT_UPDATED, entityType: EntityType.CLIENT },
    { method: 'DELETE', action: AuditAction.CLIENT_DELETED, entityType: EntityType.CLIENT },
  ],
  '/api/clients/[id]': [
    { method: 'PUT', action: AuditAction.CLIENT_UPDATED, entityType: EntityType.CLIENT },
    { method: 'DELETE', action: AuditAction.CLIENT_DELETED, entityType: EntityType.CLIENT },
    { method: 'GET', action: AuditAction.CLIENT_VIEWED, entityType: EntityType.CLIENT },
  ],

  // Debts API
  '/api/debts': [
    { method: 'POST', action: AuditAction.DEBT_CREATED, entityType: EntityType.DEBT },
    { method: 'PUT', action: AuditAction.DEBT_UPDATED, entityType: EntityType.DEBT },
    { method: 'DELETE', action: AuditAction.DEBT_DELETED, entityType: EntityType.DEBT },
  ],
  '/api/debts/[id]': [
    { method: 'PUT', action: AuditAction.DEBT_UPDATED, entityType: EntityType.DEBT },
    { method: 'DELETE', action: AuditAction.DEBT_DELETED, entityType: EntityType.DEBT },
  ],

  // Reminders API
  '/api/reminders': [
    { method: 'POST', action: AuditAction.REMINDER_SENT, entityType: EntityType.REMINDER },
  ],
  '/api/reminders/send': [
    { method: 'POST', action: AuditAction.REMINDER_SENT, entityType: EntityType.REMINDER },
  ],

  // Settings API
  '/api/settings': [
    { method: 'PUT', action: AuditAction.SETTINGS_UPDATED, entityType: EntityType.SETTINGS },
  ],

  // API Keys
  '/api/api-keys': [
    { method: 'POST', action: AuditAction.API_KEY_CREATED, entityType: EntityType.API_KEY },
  ],
  '/api/api-keys/[id]': [
    { method: 'DELETE', action: AuditAction.API_KEY_REVOKED, entityType: EntityType.API_KEY },
  ],

  // Team
  '/api/team': [
    { method: 'PUT', action: AuditAction.TEAM_CREATED, entityType: EntityType.TEAM },
  ],
  '/api/team/invite': [
    { method: 'POST', action: AuditAction.TEAM_MEMBER_INVITED, entityType: EntityType.TEAM_MEMBER },
  ],

  // Auth
  '/api/auth/register': [
    { method: 'POST', action: AuditAction.AUTH_LOGIN, entityType: EntityType.PROFILE },
  ],
};

// Paths to skip audit logging
const SKIP_PATHS = [
  '/api/audit-logs',
  '/api/health',
  '/api/push/subscribe',
  '/api/webhooks',
  '/_next',
  '/favicon.ico',
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if path matches a pattern
 */
function matchPath(pathname: string, pattern: string): boolean {
  const regex = new RegExp(
    '^' + pattern.replace(/\[.*?\]/g, '[^/]+').replace(/\//g, '\\/') + '$'
  );
  return regex.test(pathname);
}

/**
 * Extract entity ID from request URL
 */
function extractEntityIdFromUrl(request: NextRequest): string | null {
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);
  
  // Look for ID in the last segment
  const lastSegment = segments[segments.length - 1];
  if (lastSegment && lastSegment.length > 10 && !lastSegment.includes('[')) {
    return lastSegment;
  }
  
  return null;
}

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    null
  );
}

/**
 * Get user agent from request
 */
function getUserAgent(request: NextRequest): string | null {
  return request.headers.get('user-agent');
}

// =====================================================
// MIDDLEWARE
// =====================================================

interface AuditMiddlewareOptions {
  skipPaths?: string[];
  customRules?: Record<string, AuditRule[]>;
  onSuccess?: (log: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Audit middleware wrapper for API routes
 */
export function withAuditLogging(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: AuditMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const pathname = request.nextUrl.pathname;

    // Skip if path should be ignored
    const allSkipPaths = [...SKIP_PATHS, ...(options.skipPaths || [])];
    if (allSkipPaths.some(skip => pathname.includes(skip))) {
      return handler(request);
    }

    // Get audit rules for this path
    let matchingRule: AuditRule | null = null;
    const allRules = { ...AUDIT_RULES, ...(options.customRules || {}) };
    
    for (const [pattern, rules] of Object.entries(allRules)) {
      if (matchPath(pathname, pattern)) {
        const method = request.method.toUpperCase();
        matchingRule = rules.find(r => {
          const methods = Array.isArray(r.method) ? r.method : [r.method];
          return methods.map(m => m.toUpperCase()).includes(method);
        }) || null;
        break;
      }
    }

    // If no matching rule, just run the handler
    if (!matchingRule) {
      return handler(request);
    }

    // Run the handler
    let response: NextResponse;
    let requestBody: any = null;
    
    try {
      // Clone request to read body if needed
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const clonedRequest = request.clone();
        try {
          requestBody = await clonedRequest.json();
        } catch {
          // Body is not JSON or empty
        }
      }

      response = await handler(request);
    } catch (error) {
      // Log failed request
      await logAudit({
        action: matchingRule.action,
        entityType: matchingRule.entityType as any,
        entityId: extractEntityIdFromUrl(request) || requestBody?.id,
        status: 'failed',
        ipAddress: getClientIP(request) || undefined,
        userAgent: getUserAgent(request) || undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        details: {
          method: request.method,
          path: pathname,
        },
      });

      throw error;
    }

    // Log successful request
    try {
      let responseBody: any = null;
      try {
        const clonedResponse = response.clone();
        responseBody = await clonedResponse.json();
      } catch {
        // Response is not JSON
      }

      await logAudit({
        action: matchingRule.action,
        entityType: matchingRule.entityType as any,
        entityId: extractEntityIdFromUrl(request) || 
                  requestBody?.id || 
                  responseBody?.id,
        status: response.status >= 400 ? 'failed' : 'success',
        ipAddress: getClientIP(request) || undefined,
        userAgent: getUserAgent(request) || undefined,
        details: {
          method: request.method,
          path: pathname,
          statusCode: response.status,
          ...extractDetailsFromRequest(request, requestBody),
        },
        newValues: requestBody ? sanitizeForAudit(requestBody) : undefined,
      });
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.error('Audit logging error:', auditError);
    }

    return response;
  };
}

/**
 * Extract details from request
 */
function extractDetailsFromRequest(request: NextRequest, body: any): Record<string, unknown> {
  const details: Record<string, unknown> = {};

  // Extract query params
  const searchParams = request.nextUrl.searchParams;
  if (searchParams.size > 0) {
    details.queryParams = Object.fromEntries(searchParams.entries());
  }

  // Extract relevant body fields
  if (body) {
    if (body.name) details.name = body.name;
    if (body.email) details.email = body.email;
    if (body.amount) details.amount = body.amount;
    if (body.status) details.status = body.status;
    if (body.type) details.type = body.type;
  }

  return details;
}

/**
 * Sanitize data for audit logging (remove sensitive fields)
 */
function sanitizeForAudit(data: any): Record<string, unknown> {
  if (!data || typeof data !== 'object') return data;

  const sanitized = { ...data };
  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'authorization',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

// =====================================================
// EXPRESS-STYLE MIDDLEWARE (for custom server)
// =====================================================

/**
 * Express-style middleware for audit logging
 */
export function auditMiddleware(options: AuditMiddlewareOptions = {}) {
  return async (req: any, res: any, next: any) => {
    const pathname = req.path || req.url;

    // Skip if path should be ignored
    const allSkipPaths = [...SKIP_PATHS, ...(options.skipPaths || [])];
    if (allSkipPaths.some(skip => pathname.includes(skip))) {
      return next();
    }

    // Store original end function
    const originalEnd = res.end;
    let responseBody: any = null;

    // Override res.end to capture response
    res.end = function (chunk: any, ...args: any[]) {
      if (chunk) {
        try {
          responseBody = JSON.parse(chunk);
        } catch {
          // Not JSON
        }
      }
      return originalEnd.call(this, chunk, ...args);
    };

    // Continue with request
    next();

    // Log after response is sent
    // Note: This is simplified - in production, you'd want to track the actual response
  };
}

export { AuditAction, EntityType };
