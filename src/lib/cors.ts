/**
 * CORS Configuration Module
 * RelancePro Africa - Security Module
 * Configuration dynamique des autorisations CORS
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Configuration CORS par défaut
const DEFAULT_ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'X-CSRF-Token',
  'X-Request-Id',
  'Accept',
  'Accept-Encoding',
  'Accept-Language',
  'Cache-Control',
  'Cookie',
  'Origin',
];
const DEFAULT_EXPOSED_HEADERS = [
  'X-Request-Id',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
];
const DEFAULT_MAX_AGE = 86400; // 24 heures

/**
 * Récupère les origines autorisées depuis les variables d'environnement
 */
export function getAllowedOrigins(): string[] {
  const origins = process.env.CORS_ALLOWED_ORIGINS || '';
  return origins
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
}

/**
 * Vérifie si une origine est autorisée
 * @param origin - Origine de la requête
 * @returns true si l'origine est autorisée
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) {
    return false;
  }
  
  const allowedOrigins = getAllowedOrigins();
  
  // En développement, autoriser toutes les origines localhost
  if (process.env.NODE_ENV === 'development') {
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return true;
    }
  }
  
  // Vérifier la liste blanche
  return allowedOrigins.includes(origin);
}

/**
 * Configuration CORS personnalisée par route
 */
export interface CorsConfig {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
}

/**
 * Applique les headers CORS à une réponse
 * @param request - Requête entrante
 * @param response - Réponse à modifier
 * @param config - Configuration CORS personnalisée
 * @returns Réponse avec headers CORS
 */
export function applyCorsHeaders(
  request: NextRequest,
  response: NextResponse,
  config: CorsConfig = {}
): NextResponse {
  const origin = request.headers.get('origin');
  
  // Vérifier si l'origine est autorisée
  const allowedOrigins = config.allowedOrigins || getAllowedOrigins();
  const isAllowed = isOriginAllowed(origin);
  
  // Définir l'origine dans le header
  if (isAllowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigins.length === 1) {
    // Si une seule origine autorisée, l'utiliser
    response.headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  
  // Autres headers CORS
  response.headers.set(
    'Access-Control-Allow-Methods',
    (config.allowedMethods || DEFAULT_ALLOWED_METHODS).join(', ')
  );
  
  response.headers.set(
    'Access-Control-Allow-Headers',
    (config.allowedHeaders || DEFAULT_ALLOWED_HEADERS).join(', ')
  );
  
  response.headers.set(
    'Access-Control-Expose-Headers',
    (config.exposedHeaders || DEFAULT_EXPOSED_HEADERS).join(', ')
  );
  
  if (config.allowCredentials !== false) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  response.headers.set(
    'Access-Control-Max-Age',
    String(config.maxAge || DEFAULT_MAX_AGE)
  );
  
  return response;
}

/**
 * Gère les requêtes preflight OPTIONS
 * @param request - Requête OPTIONS
 * @param config - Configuration CORS personnalisée
 * @returns Réponse preflight
 */
export function handlePreflightRequest(
  request: NextRequest,
  config: CorsConfig = {}
): NextResponse {
  const origin = request.headers.get('origin');
  
  // Vérifier si l'origine est autorisée
  if (!isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 403 });
  }
  
  const response = new NextResponse(null, { status: 204 });
  return applyCorsHeaders(request, response, config);
}

/**
 * Middleware CORS pour les API routes
 * @param request - Requête entrante
 * @param handler - Handler de la route
 * @param config - Configuration CORS
 */
export async function withCors<T extends NextResponse>(
  request: NextRequest,
  handler: () => Promise<T>,
  config: CorsConfig = {}
): Promise<T | NextResponse> {
  // Gérer les requêtes preflight
  if (request.method === 'OPTIONS') {
    return handlePreflightRequest(request, config);
  }
  
  // Exécuter le handler
  const response = await handler();
  
  // Appliquer les headers CORS
  return applyCorsHeaders(request, response, config);
}

/**
 * Headers de sécurité supplémentaires
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.paystack.co https://api.resend.com wss:",
      "frame-src 'self' https://js.paystack.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join('; ')
  );
  
  // Protection contre le clickjacking
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  
  // Protection XSS
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Empêcher le MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=(self https://js.paystack.co)',
    ].join(', ')
  );
  
  // Strict Transport Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  return response;
}

/**
 * Middleware complet pour les API routes avec CORS et sécurité
 */
export function createCorsMiddleware(config: CorsConfig = {}) {
  return async function corsMiddleware(
    request: NextRequest
  ): Promise<NextResponse | null> {
    // Vérifier les requêtes preflight
    if (request.method === 'OPTIONS') {
      return handlePreflightRequest(request, config);
    }
    
    // Vérifier l'origine pour les autres méthodes
    const origin = request.headers.get('origin');
    if (origin && !isOriginAllowed(origin)) {
      const response = new NextResponse(
        JSON.stringify({ error: 'Origine non autorisée' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
      return response;
    }
    
    // Continuer vers le handler
    return null;
  };
}

/**
 * Crée une réponse JSON avec les headers CORS et sécurité
 */
export function jsonResponse(
  data: unknown,
  request: NextRequest,
  options: ResponseInit = {}
): NextResponse {
  const response = NextResponse.json(data, options);
  applyCorsHeaders(request, response);
  applySecurityHeaders(response);
  return response;
}

/**
 * Crée une réponse d'erreur avec CORS
 */
export function errorResponse(
  message: string,
  request: NextRequest,
  status: number = 400
): NextResponse {
  return jsonResponse(
    { error: message },
    request,
    { status }
  );
}

/**
 * Vérifie si une requête vient du même site (Same-Site)
 * @param request - Requête entrante
 * @returns true si la requête est same-site
 */
export function isSameSiteRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  if (!origin || !host) {
    return false;
  }
  
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

/**
 * Vérifie le header CSRF pour les requêtes cross-site
 */
export function verifyCsrfHeader(request: NextRequest): boolean {
  // Pour les requêtes GET, HEAD, OPTIONS, pas de vérification CSRF nécessaire
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }
  
  // Vérifier si c'est une requête same-site
  if (isSameSiteRequest(request)) {
    return true;
  }
  
  // Pour les requêtes cross-site, vérifier le header CSRF
  const csrfToken = request.headers.get('X-CSRF-Token');
  // La validation du token devrait être faite ailleurs
  return !!csrfToken;
}
