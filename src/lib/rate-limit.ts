// =====================================================
// RELANCEPRO AFRICA - Rate Limiting
// Protection des API avec limitation par IP et utilisateur
// =====================================================

// Types
interface RateLimitEntry {
  count: number;
  resetAt: number;
  blocked: boolean;
}

interface RateLimitConfig {
  windowMs: number;     // Fenêtre de temps en ms
  max: number;          // Nombre max de requêtes
  message?: string;     // Message d'erreur personnalisé
  keyGenerator?: (identifier: string) => string;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// =====================================================
// Rate Limit Store (Memory)
// =====================================================

class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Nettoyer les entrées expirées toutes les 10 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 600000);
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      entry = {
        count: 1,
        resetAt: now + windowMs,
        blocked: false,
      };
    } else {
      entry.count++;
    }

    this.store.set(key, entry);
    return entry;
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Store global
const store = new RateLimitStore();

// =====================================================
// Rate Limit Configurations
// =====================================================

export const RateLimits = {
  // API générale - 100 req/min
  api: {
    windowMs: 60 * 1000,
    max: 100,
    message: "Trop de requêtes. Veuillez réessayer dans une minute.",
  },

  // Authentification - 10 req/min (protection brute force)
  auth: {
    windowMs: 60 * 1000,
    max: 10,
    message: "Trop de tentatives de connexion. Réessayez dans une minute.",
  },

  // Création de ressources - 20 req/min
  create: {
    windowMs: 60 * 1000,
    max: 20,
    message: "Trop de créations. Veuillez patienter.",
  },

  // Envoi de relances - 30 req/min
  reminders: {
    windowMs: 60 * 1000,
    max: 30,
    message: "Trop de relances envoyées. Veuillez patienter.",
  },

  // Export - 10 req/min
  export: {
    windowMs: 60 * 1000,
    max: 10,
    message: "Trop d'exports. Veuillez patienter.",
  },

  // API IA - 20 req/min
  ai: {
    windowMs: 60 * 1000,
    max: 20,
    message: "Trop de requêtes IA. Veuillez patienter.",
  },

  // Strict - 5 req/min (pour les actions sensibles)
  strict: {
    windowMs: 60 * 1000,
    max: 5,
    message: "Action limitée. Veuillez réessayer plus tard.",
  },
} as const;

// =====================================================
// Rate Limiter Class
// =====================================================

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Vérifier la limite pour un identifiant
   */
  check(identifier: string): RateLimitResult {
    const key = this.config.keyGenerator
      ? this.config.keyGenerator(identifier)
      : `ratelimit:${identifier}`;

    const entry = store.increment(key, this.config.windowMs);
    const remaining = Math.max(0, this.config.max - entry.count);
    const reset = new Date(entry.resetAt);

    if (entry.count > this.config.max) {
      entry.blocked = true;
      store.set(key, entry);

      return {
        success: false,
        limit: this.config.max,
        remaining: 0,
        reset,
        retryAfter: Math.ceil((entry.resetAt - Date.now()) / 1000),
      };
    }

    return {
      success: true,
      limit: this.config.max,
      remaining,
      reset,
    };
  }

  /**
   * Réinitialiser la limite pour un identifiant
   */
  reset(identifier: string): void {
    const key = this.config.keyGenerator
      ? this.config.keyGenerator(identifier)
      : `ratelimit:${identifier}`;
    store.reset(key);
  }

  /**
   * Obtenir les headers de rate limit
   */
  getHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": result.reset.toISOString(),
    };

    if (!result.success && result.retryAfter) {
      headers["Retry-After"] = result.retryAfter.toString();
    }

    return headers;
  }
}

// =====================================================
// Factory Functions
// =====================================================

/**
 * Créer un rate limiter avec une configuration prédéfinie
 */
export function createRateLimiter(
  type: keyof typeof RateLimits
): RateLimiter {
  return new RateLimiter(RateLimits[type]);
}

/**
 * Créer un rate limiter personnalisé
 */
export function createCustomRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

// =====================================================
// Pre-configured Rate Limiters
// =====================================================

export const rateLimiters = {
  api: createRateLimiter("api"),
  auth: createRateLimiter("auth"),
  create: createRateLimiter("create"),
  reminders: createRateLimiter("reminders"),
  export: createRateLimiter("export"),
  ai: createRateLimiter("ai"),
  strict: createRateLimiter("strict"),
};

// =====================================================
// Helper Functions pour API Routes
// =====================================================

/**
 * Vérifier le rate limit et retourner une réponse si limité
 */
export function checkRateLimit(
  identifier: string,
  type: keyof typeof RateLimits = "api"
): { blocked: boolean; headers: Record<string, string>; retryAfter?: number } {
  const limiter = rateLimiters[type];
  const result = limiter.check(identifier);
  const headers = limiter.getHeaders(result);

  if (!result.success) {
    return {
      blocked: true,
      headers,
      retryAfter: result.retryAfter,
    };
  }

  return { blocked: false, headers };
}

/**
 * Obtenir l'identifiant de rate limit depuis une requête
 */
export function getRateLimitIdentifier(
  ip: string | null,
  userId?: string
): string {
  // Prioriser l'ID utilisateur si disponible
  if (userId) {
    return `user:${userId}`;
  }
  
  // Sinon utiliser l'IP
  return `ip:${ip || "unknown"}`;
}

/**
 * Middleware helper pour ajouter les headers de rate limit
 */
export function withRateLimitHeaders(
  response: Response,
  identifier: string,
  type: keyof typeof RateLimits = "api"
): Response {
  const limiter = rateLimiters[type];
  const result = limiter.check(identifier);
  const headers = limiter.getHeaders(result);

  const newHeaders = new Headers(response.headers);
  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// Export par défaut
export default rateLimiters;
