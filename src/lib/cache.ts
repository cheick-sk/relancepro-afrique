// Simple in-memory cache
const cache = new Map<string, { value: unknown; expiresAt: number }>();

export const CacheKeys = {
  CLIENTS: (userId: string) => `clients:${userId}`,
  DEBTS: (userId: string) => `debts:${userId}`,
  SETTINGS: (userId: string) => `settings:${userId}`,
};

export const CacheTTL = {
  SHORT: 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
};

export async function cacheOrFetch<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value as T;
  }
  
  const value = await fetcher();
  cache.set(key, { value, expiresAt: Date.now() + ttl });
  
  return value;
}

export function invalidateUserCache(userId: string): void {
  // Remove all cache entries for this user
  for (const key of cache.keys()) {
    if (key.includes(userId)) {
      cache.delete(key);
    }
  }
}
