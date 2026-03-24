// =====================================================
// RELANCEPRO AFRICA - Cache System
// Cache en mémoire pour le dev, compatible Redis pour la prod
// =====================================================

// Types
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
  hitRate: string;
}

// Configuration par défaut
const DEFAULT_TTL = 300; // 5 minutes en secondes

// Interface du cache (compatible Redis)
interface CacheInterface {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<boolean>;
  delPattern(pattern: string): Promise<number>;
  flush(): Promise<void>;
  stats(): Promise<CacheStats>;
}

// =====================================================
// Memory Cache Implementation (Dev)
// =====================================================

class MemoryCache implements CacheInterface {
  private cache = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Nettoyer les entrées expirées toutes les minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    this.hits++;
    return entry.value;
  }

  async set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl * 1000,
      createdAt: Date.now(),
    };
    
    this.cache.set(key, entry);
  }

  async del(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async delPattern(pattern: string): Promise<number> {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  async flush(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  async stats(): Promise<CacheStats> {
    const total = this.hits + this.misses;
    return {
      keys: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? `${((this.hits / total) * 100).toFixed(2)}%` : "0%",
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// =====================================================
// Redis Cache Implementation (Production)
// =====================================================

class RedisCache implements CacheInterface {
  private redis: unknown;
  private hits = 0;
  private misses = 0;

  constructor(redisClient: unknown) {
    this.redis = redisClient;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = this.redis as {
        get: (key: string) => Promise<string | null>;
      };
      const data = await redis.get(key);
      
      if (!data) {
        this.misses++;
        return null;
      }
      
      this.hits++;
      return JSON.parse(data) as T;
    } catch {
      this.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
      const redis = this.redis as {
        set: (key: string, value: string, mode: string, duration: number) => Promise<unknown>;
      };
      await redis.set(key, JSON.stringify(value), "EX", ttl);
    } catch (error) {
      console.error("Redis set error:", error);
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const redis = this.redis as { del: (key: string) => Promise<number> };
      const result = await redis.del(key);
      return result > 0;
    } catch {
      return false;
    }
  }

  async delPattern(pattern: string): Promise<number> {
    try {
      const redis = this.redis as {
        keys: (pattern: string) => Promise<string[]>;
        del: (...keys: string[]) => Promise<number>;
      };
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        return await redis.del(...keys);
      }
      return 0;
    } catch {
      return 0;
    }
  }

  async flush(): Promise<void> {
    try {
      const redis = this.redis as { flushdb: () => Promise<void> };
      await redis.flushdb();
    } catch (error) {
      console.error("Redis flush error:", error);
    }
  }

  async stats(): Promise<CacheStats> {
    const total = this.hits + this.misses;
    return {
      keys: 0, // Nécessite SCAN pour Redis
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? `${((this.hits / total) * 100).toFixed(2)}%` : "0%",
    };
  }
}

// =====================================================
// Cache Instance Singleton
// =====================================================

let cacheInstance: CacheInterface | null = null;

export function getCache(): CacheInterface {
  if (!cacheInstance) {
    // En production avec Redis configuré
    if (process.env.REDIS_URL && process.env.NODE_ENV === "production") {
      // Import dynamique de Redis si disponible
      import("ioredis").then(({ default: Redis }) => {
        const redis = new Redis(process.env.REDIS_URL!);
        cacheInstance = new RedisCache(redis);
      }).catch(() => {
        // Fallback vers memory cache
        cacheInstance = new MemoryCache();
      });
    } else {
      // Memory cache par défaut
      cacheInstance = new MemoryCache();
    }
  }
  
  return cacheInstance;
}

// =====================================================
// Cache Keys Factory
// =====================================================

export const CacheKeys = {
  // Dashboard stats (5 min TTL)
  dashboardStats: (userId: string) => `dashboard:stats:${userId}`,
  
  // Liste des clients (2 min TTL)
  clientsList: (userId: string) => `clients:list:${userId}`,
  clientDetail: (userId: string, clientId: string) => `clients:detail:${userId}:${clientId}`,
  
  // Liste des créances (2 min TTL)
  debtsList: (userId: string) => `debts:list:${userId}`,
  debtDetail: (userId: string, debtId: string) => `debts:detail:${userId}:${debtId}`,
  
  // Configuration utilisateur (10 min TTL)
  userSettings: (userId: string) => `user:settings:${userId}`,
  userProfile: (userId: string) => `user:profile:${userId}`,
  
  // Historique des relances (1 min TTL)
  remindersList: (userId: string) => `reminders:list:${userId}`,
  
  // Admin stats (5 min TTL)
  adminStats: () => "admin:stats",
  
  // Utilisation démo (1 min TTL)
  demoUsage: (userId: string) => `demo:usage:${userId}`,
};

// =====================================================
// TTL Configuration
// =====================================================

export const CacheTTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 600,        // 10 minutes
  HOUR: 3600,       // 1 heure
  DAY: 86400,       // 1 jour
};

// =====================================================
// Helper Functions
// =====================================================

/**
 * Récupère une valeur du cache ou la génère si absente
 */
export async function cacheOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const cache = getCache();
  
  // Essayer de récupérer du cache
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Générer la valeur
  const value = await fetcher();
  
  // Mettre en cache
  await cache.set(key, value, ttl);
  
  return value;
}

/**
 * Invalider le cache pour un pattern
 */
export async function invalidateCache(pattern: string): Promise<number> {
  const cache = getCache();
  return cache.delPattern(pattern);
}

/**
 * Invalider le cache utilisateur
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  const cache = getCache();
  await Promise.all([
    cache.delPattern(`dashboard:*:${userId}`),
    cache.delPattern(`clients:*:${userId}:*`),
    cache.delPattern(`debts:*:${userId}:*`),
    cache.delPattern(`user:*:${userId}`),
    cache.delPattern(`reminders:*:${userId}`),
  ]);
}

// Export par défaut
export default getCache;
