// Simple cache implementation

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }
  
  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    })
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key)
  }
  
  clear(): void {
    this.cache.clear()
  }
}

const cache = new MemoryCache()

// Cache keys
export const CacheKeys = {
  userClients: (userId: string) => `user:${userId}:clients`,
  userDebts: (userId: string) => `user:${userId}:debts`,
  userStats: (userId: string) => `user:${userId}:stats`,
  clientDetail: (clientId: string) => `client:${clientId}`,
  debtDetail: (debtId: string) => `debt:${debtId}`,
}

// Cache TTL in milliseconds
export const CacheTTL = {
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  HOUR: 60 * 60 * 1000, // 1 hour
}

// Get from cache or fetch and cache
export async function cacheOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM
): Promise<T> {
  const cached = cache.get<T>(key)
  if (cached !== null) {
    return cached
  }
  
  const data = await fetcher()
  cache.set(key, data, ttl)
  return data
}

// Invalidate user cache
export function invalidateUserCache(userId: string): void {
  cache.delete(CacheKeys.userClients(userId))
  cache.delete(CacheKeys.userDebts(userId))
  cache.delete(CacheKeys.userStats(userId))
}

export { cache }
