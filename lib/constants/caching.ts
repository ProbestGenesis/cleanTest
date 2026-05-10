/**
 * Stratégie de caching optimisée pour le projet
 * 
 * Hiérarchie:
 * 1. Server Component avec caching Next.js (5min stale + 1h revalidation)
 * 2. API Route avec Cache-Control headers
 * 3. TanStack Query avec staleTime et gcTime
 */

export const CACHE_CONFIG = {
  // Workers
  WORKERS: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (cache time)
  },
  
  // Stats
  STATS: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },

  // Messages (SSE maintient les données fraîches)
  MESSAGES: {
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000, // 10 minutes
  },

  // Stock
  STOCK: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },

  // API Response headers
  API: {
    workers: 'public, s-maxage=300, stale-while-revalidate=3600', // 5 min + 1 hour stale
    stats: 'public, s-maxage=600, stale-while-revalidate=3600', // 10 min + 1 hour stale
    stock: 'public, s-maxage=300, stale-while-revalidate=3600', // 5 min + 1 hour stale
  },
} as const
