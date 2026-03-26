// =====================================================
// RELANCEPRO AFRICA - Middleware
// Rate Limiting + Auth Protection + CORS + Security Headers
// =====================================================

import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { RateLimits, RateLimiter, getRateLimitIdentifier } from "@/lib/rate-limit";
import { 
  isOriginAllowed, 
  handlePreflightRequest, 
  applyCorsHeaders, 
  applySecurityHeaders 
} from "@/lib/cors";

// Store global pour le rate limiting (en mémoire pour le dev)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Rate limiter instance
const apiRateLimiter = new RateLimiter(RateLimits.api);
const authRateLimiter = new RateLimiter(RateLimits.auth);
const reminderRateLimiter = new RateLimiter(RateLimits.reminders);

// Routes avec rate limiting spécial
const rateLimitRoutes: Record<string, RateLimiter> = {
  "/api/auth": authRateLimiter,
  "/api/reminders/send": reminderRateLimiter,
  "/api/reminders": reminderRateLimiter,
};

// Routes publiques (pas de rate limiting strict)
const publicPaths = ["/", "/login", "/register", "/api/auth", "/api/health"];

// Routes API qui ne nécessitent pas d'authentification
const publicApiRoutes = [
  "/api/auth/register",
  "/api/auth/2fa/verify",
  "/api/health",
  "/api/paystack/webhook",
  "/api/team/accept",
];

// Helper pour vérifier le rate limit
function checkRateLimit(
  identifier: string,
  limiter: RateLimiter
): { allowed: boolean; remaining: number; reset: Date; retryAfter?: number } {
  const result = limiter.check(identifier);
  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: result.reset,
    retryAfter: result.retryAfter,
  };
}

// Helper pour nettoyer le store périodiquement
function cleanupStore() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Nettoyer toutes les 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupStore, 600000);
}

// Middleware pour CORS et sécurité sur les API routes
function handleApiCors(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  
  // Gérer les requêtes preflight OPTIONS
  if (request.method === "OPTIONS") {
    return handlePreflightRequest(request);
  }
  
  // Vérifier l'origine pour les requêtes avec origin header
  if (origin && !isOriginAllowed(origin)) {
    return NextResponse.json(
      { error: "Origine non autorisée" },
      { status: 403 }
    );
  }
  
  return null;
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    
    // =====================================================
    // CORS pour les API routes
    // =====================================================
    
    if (pathname.startsWith("/api/")) {
      // Gérer CORS
      const corsResponse = handleApiCors(req);
      if (corsResponse) {
        return corsResponse;
      }
    }
    
    // Récupérer l'IP et l'ID utilisateur
    const ip = req.headers.get("x-forwarded-for") ||
               req.headers.get("x-real-ip") ||
               "unknown";
    const userId = req.nextauth.token?.sub;
    
    // Identifier pour le rate limiting
    const identifier = getRateLimitIdentifier(ip, userId);
    
    // =====================================================
    // Rate Limiting
    // =====================================================
    
    if (pathname.startsWith("/api/")) {
      // Ignorer les webhooks entrants
      if (pathname.includes("/webhooks/")) {
        const response = NextResponse.next();
        applySecurityHeaders(response);
        return response;
      }
      
      // Ignorer le cron endpoint (vérifié par CRON_SECRET)
      if (pathname.startsWith("/api/cron/")) {
        const response = NextResponse.next();
        applySecurityHeaders(response);
        return response;
      }
      
      // Ignorer le health check
      if (pathname === "/api/health") {
        const response = NextResponse.next();
        applySecurityHeaders(response);
        return response;
      }
      
      // Choisir le rate limiter approprié
      let limiter = apiRateLimiter;
      for (const [route, routeLimiter] of Object.entries(rateLimitRoutes)) {
        if (pathname.startsWith(route)) {
          limiter = routeLimiter;
          break;
        }
      }
      
      // Vérifier le rate limit
      const rateResult = checkRateLimit(identifier, limiter);
      
      // Ajouter les headers de rate limit à toutes les réponses
      const headers: Record<string, string> = {
        "X-RateLimit-Limit": limiter["config"].max.toString(),
        "X-RateLimit-Remaining": rateResult.remaining.toString(),
        "X-RateLimit-Reset": rateResult.reset.toISOString(),
      };
      
      // Si limité, retourner 429
      if (!rateResult.allowed) {
        headers["Retry-After"] = String(rateResult.retryAfter || 60);
        
        const response = NextResponse.json(
          {
            error: "Too Many Requests",
            message: limiter["config"].message || "Trop de requêtes. Veuillez réessayer plus tard.",
            retryAfter: rateResult.retryAfter,
          },
          {
            status: 429,
            headers,
          }
        );
        applyCorsHeaders(req, response);
        applySecurityHeaders(response);
        return response;
      }
      
      // Continuer avec les headers
      const response = NextResponse.next();
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      applyCorsHeaders(req, response);
      applySecurityHeaders(response);
      
      return response;
    }
    
    // =====================================================
    // Security Headers pour toutes les pages
    // =====================================================
    
    const response = NextResponse.next();
    applySecurityHeaders(response);
    
    // =====================================================
    // Auth Routes Protection
    // =====================================================
    
    // Si l'utilisateur est authentifié et essaie d'accéder aux pages auth
    if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
      if (req.nextauth.token) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    
    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Routes API publiques
        if (publicApiRoutes.some((route) => pathname === route || pathname.startsWith(route))) {
          return true;
        }
        
        // Routes publiques
        if (publicPaths.some((path) => pathname.startsWith(path))) {
          return true;
        }
        
        // Pages légales
        if (pathname.startsWith("/mentions-legales") || 
            pathname.startsWith("/cgv") || 
            pathname.startsWith("/confidentialite")) {
          return true;
        }
        
        // 2FA routes - nécessitent un token partiel (pour la vérification)
        if (pathname.startsWith("/2fa/")) {
          return true; // La vérification se fait dans la page
        }
        
        // Invite acceptance page - public
        if (pathname.startsWith("/invite/")) {
          return true;
        }
        
        // Routes protégées - nécessitent un token
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - sw.js (service worker)
     * - manifest.json
     */
    "/((?!_next/static|_next/image|favicon.ico|public/|sw.js|manifest.json|icons/).*)",
  ],
};
