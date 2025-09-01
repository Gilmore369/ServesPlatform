/**
 * Smart Cache Hook
 * Provides intelligent caching capabilities with usage analytics and predictive loading
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { smartCacheManager } from '@/lib/cache/smart-cache-strategies';
import { cacheManager } from '@/lib/cache/cache-manager';
import { logger } from '@/lib/logger';

export interface SmartCacheOptions {
  enablePredictive?: boolean;
  enableAnalytics?: boolean;
  backgroundRefresh?: boolean;
  staleWhileRevalidate?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

export interface SmartCacheResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  isStale: boolean;
  cacheHit: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  prefetch: (keys: string[]) => Promise<void>;
  invalidate: () => Promise<void>;
  getAnalytics: () => any;
}

/**
 * Smart cache hook with predictive loading and analytics
 */
export function useSmartCache<T>(
  key: string | null,
  fetcher: (() => Promise<T>) | null,
  options: SmartCacheOptions = {}
): SmartCacheResult<T> {
  const [cacheHit, setCacheHit] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);
  const retryCountRef = useRef(0);

  const {
    enablePredictive = true,
    enableAnalytics = true,
    backgroundRefresh = true,
    staleWhileRevalidate = true,
    retryOnError = true,
    maxRetries = 3
  } = options;

  // Enhanced fetcher with smart caching
  const enhancedFetcher = useCallback(async (): Promise<T> => {
    if (!key || !fetcher) {
      throw new Error('Key and fetcher are required');
    }

    // Try smart cache first
    const cachedData = await smartCacheManager.smartGet<T>(key);
    if (cachedData) {
      setCacheHit(true);
      setLastUpdated(new Date());
      logger.debug('Smart cache hit', { key });
      return cachedData;
    }

    setCacheHit(false);
    
    try {
      // Fetch fresh data
      const freshData = await fetcher();
      
      // Store in smart cache
      await smartCacheManager.smartSet(key, freshData);
      
      setLastUpdated(new Date());
      retryCountRef.current = 0; // Reset retry count on success
      
      logger.debug('Data fetched and cached', { key });
      return freshData;
    } catch (error) {
      // Retry logic
      if (retryOnError && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        logger.warn(`Fetch failed, retrying (${retryCountRef.current}/${maxRetries})`, { key, error });
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCountRef.current) * 1000));
        return enhancedFetcher();
      }
      
      // Try fallback to regular cache
      const fallbackData = await cacheManager.get<T>(key);
      if (fallbackData) {
        setCacheHit(true);
        setIsStale(true);
        logger.info('Using stale cache data as fallback', { key });
        return fallbackData;
      }
      
      throw error;
    }
  }, [key, fetcher, retryOnError, maxRetries]);

  // SWR configuration with smart caching
  const swrConfig = {
    fetcher: enhancedFetcher,
    revalidateOnFocus: !staleWhileRevalidate,
    revalidateOnReconnect: true,
    refreshInterval: backgroundRefresh ? 300000 : 0, // 5 minutes if background refresh enabled
    dedupingInterval: 30000, // 30 seconds
    errorRetryCount: 0, // We handle retries in enhancedFetcher
    onSuccess: (data: T) => {
      setIsStale(false);
      if (enableAnalytics && key) {
        // Record successful access for analytics
        logger.debug('SWR success recorded for analytics', { key });
      }
    },
    onError: (error: Error) => {
      logger.error('SWR error', { key, error: error.message });
    }
  };

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: swrMutate
  } = useSWR<T, Error>(key, key ? enhancedFetcher : null, swrConfig);

  // Refresh function
  const refresh = useCallback(async () => {
    if (key) {
      await swrMutate();
      setIsStale(false);
    }
  }, [key, swrMutate]);

  // Prefetch function for predictive loading
  const prefetch = useCallback(async (keys: string[]) => {
    if (!enablePredictive) return;

    for (const prefetchKey of keys) {
      try {
        // Check if already cached
        const cached = await smartCacheManager.smartGet(prefetchKey);
        if (!cached) {
          // Trigger background prefetch
          logger.debug('Prefetching data', { key: prefetchKey });
          // In a real implementation, this would trigger the appropriate fetcher
        }
      } catch (error) {
        logger.warn('Prefetch failed', { key: prefetchKey, error });
      }
    }
  }, [enablePredictive]);

  // Invalidate function
  const invalidate = useCallback(async () => {
    if (key) {
      await cacheManager.invalidate(key);
      await mutate(key, undefined, { revalidate: false });
      logger.debug('Cache invalidated', { key });
    }
  }, [key]);

  // Get analytics function
  const getAnalytics = useCallback(() => {
    if (!enableAnalytics) return null;
    return smartCacheManager.getAnalytics();
  }, [enableAnalytics]);

  // Check for stale data
  useEffect(() => {
    if (data && lastUpdated) {
      const age = Date.now() - lastUpdated.getTime();
      const staleThreshold = 600000; // 10 minutes
      setIsStale(age > staleThreshold);
    }
  }, [data, lastUpdated]);

  return {
    data: data || null,
    error,
    isLoading,
    isValidating,
    isStale,
    cacheHit,
    lastUpdated,
    refresh,
    prefetch,
    invalidate,
    getAnalytics
  };
}

/**
 * Hook for batch smart caching
 */
export function useSmartCacheBatch<T>(
  keys: string[],
  fetchers: Record<string, () => Promise<T>>,
  options: SmartCacheOptions = {}
): Record<string, SmartCacheResult<T>> {
  const results: Record<string, SmartCacheResult<T>> = {};

  for (const key of keys) {
    const fetcher = fetchers[key];
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[key] = useSmartCache(key, fetcher, options);
  }

  return results;
}

/**
 * Hook for cache analytics and monitoring
 */
export function useCacheAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = smartCacheManager.getAnalytics();
      setAnalytics(data);
    } catch (error) {
      logger.error('Failed to get cache analytics', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAnalytics();
    
    // Refresh analytics every 5 minutes
    const interval = setInterval(refreshAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshAnalytics]);

  const optimizeCache = useCallback(async () => {
    try {
      await smartCacheManager.optimizeCache();
      await refreshAnalytics();
      logger.info('Cache optimization completed');
    } catch (error) {
      logger.error('Cache optimization failed', error);
    }
  }, [refreshAnalytics]);

  const clearCache = useCallback(async () => {
    try {
      await cacheManager.clear();
      await mutate(() => true, undefined, { revalidate: false });
      await refreshAnalytics();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear failed', error);
    }
  }, [refreshAnalytics]);

  return {
    analytics,
    isLoading,
    refreshAnalytics,
    optimizeCache,
    clearCache
  };
}

/**
 * Hook for cache warming on component mount
 */
export function useCacheWarming(
  warmupKeys: string[],
  warmupFetchers: Record<string, () => Promise<any>>,
  options: { immediate?: boolean; background?: boolean } = {}
) {
  const [isWarming, setIsWarming] = useState(false);
  const [warmedKeys, setWarmedKeys] = useState<string[]>([]);

  const { immediate = true, background = true } = options;

  const warmupCache = useCallback(async () => {
    if (warmupKeys.length === 0) return;

    setIsWarming(true);
    const warmed: string[] = [];

    for (const key of warmupKeys) {
      try {
        const fetcher = warmupFetchers[key];
        if (!fetcher) continue;

        // Check if already cached
        const cached = await smartCacheManager.smartGet(key);
        if (cached) {
          warmed.push(key);
          continue;
        }

        // Fetch and cache
        const data = await fetcher();
        await smartCacheManager.smartSet(key, data);
        warmed.push(key);

        logger.debug('Cache warmed', { key });
      } catch (error) {
        logger.warn('Cache warming failed', { key, error });
      }
    }

    setWarmedKeys(warmed);
    setIsWarming(false);
    
    logger.info('Cache warming completed', {
      total: warmupKeys.length,
      warmed: warmed.length
    });
  }, [warmupKeys, warmupFetchers]);

  useEffect(() => {
    if (immediate) {
      if (background) {
        // Warm up in background
        setTimeout(warmupCache, 100);
      } else {
        warmupCache();
      }
    }
  }, [immediate, background, warmupCache]);

  return {
    isWarming,
    warmedKeys,
    warmupCache,
    warmupProgress: warmupKeys.length > 0 ? warmedKeys.length / warmupKeys.length : 0
  };
}

/**
 * Hook for real-time cache synchronization
 */
export function useCacheSync(
  syncKeys: string[],
  onCacheUpdate?: (key: string, data: any) => void
) {
  const [syncStatus, setSyncStatus] = useState<Record<string, 'synced' | 'syncing' | 'error'>>({});

  const syncCache = useCallback(async (key: string) => {
    setSyncStatus(prev => ({ ...prev, [key]: 'syncing' }));
    
    try {
      // Invalidate and revalidate
      await mutate(key);
      setSyncStatus(prev => ({ ...prev, [key]: 'synced' }));
      
      if (onCacheUpdate) {
        const data = await smartCacheManager.smartGet(key);
        onCacheUpdate(key, data);
      }
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, [key]: 'error' }));
      logger.error('Cache sync failed', { key, error });
    }
  }, [onCacheUpdate]);

  const syncAllKeys = useCallback(async () => {
    for (const key of syncKeys) {
      await syncCache(key);
    }
  }, [syncKeys, syncCache]);

  // Initialize sync status
  useEffect(() => {
    const initialStatus: Record<string, 'synced' | 'syncing' | 'error'> = {};
    syncKeys.forEach(key => {
      initialStatus[key] = 'synced';
    });
    setSyncStatus(initialStatus);
  }, [syncKeys]);

  return {
    syncStatus,
    syncCache,
    syncAllKeys,
    isSyncing: Object.values(syncStatus).some(status => status === 'syncing'),
    hasErrors: Object.values(syncStatus).some(status => status === 'error')
  };
}

export default useSmartCache;