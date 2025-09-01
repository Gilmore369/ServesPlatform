/**
 * Enhanced API Hook for Google Sheets Integration
 * Provides optimized data fetching with caching, error handling, and real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { APIResponse } from '@/lib/types';
import { logger } from '@/lib/logger';

interface UseEnhancedAPIOptions {
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  dedupingInterval?: number;
  errorRetryCount?: number;
  errorRetryInterval?: number;
}

interface UseEnhancedAPIResult<T> {
  data: T[] | null;
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => Promise<T[] | undefined>;
  refresh: () => Promise<void>;
}

/**
 * Enhanced hook for fetching lists with intelligent caching and error handling
 */
export function useEnhancedList<T>(
  table: string,
  params?: { limit?: number; q?: string },
  options: UseEnhancedAPIOptions = {}
): UseEnhancedAPIResult<T> {
  const cacheKey = `${table}:list:${JSON.stringify(params || {})}`;
  
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: swrMutate
  } = useSWR<T[]>(
    cacheKey,
    async () => {
      logger.debug(`Fetching ${table} list`, { params });
      const response = await apiClient.list<T>(table, params);
      
      if (!response.ok) {
        throw new Error(response.message || `Failed to fetch ${table}`);
      }
      
      return response.data || [];
    },
    {
      refreshInterval: options.refreshInterval || 30000, // 30 seconds default
      revalidateOnFocus: options.revalidateOnFocus ?? true,
      revalidateOnReconnect: options.revalidateOnReconnect ?? true,
      dedupingInterval: options.dedupingInterval || 2000,
      errorRetryCount: options.errorRetryCount || 3,
      errorRetryInterval: options.errorRetryInterval || 5000,
      onError: (error) => {
        logger.error(`Error fetching ${table} list`, error);
      },
      onSuccess: (data) => {
        logger.debug(`Successfully fetched ${table} list`, { count: data?.length });
      }
    }
  );

  const refresh = useCallback(async () => {
    await swrMutate();
  }, [swrMutate]);

  return {
    data: data || null,
    error,
    isLoading,
    isValidating,
    mutate: swrMutate,
    refresh
  };
}

/**
 * Enhanced hook for fetching single records with caching
 */
export function useEnhancedRecord<T>(
  table: string,
  id: string | null,
  options: UseEnhancedAPIOptions = {}
): UseEnhancedAPIResult<T> & { record: T | null } {
  const cacheKey = id ? `${table}:get:${id}` : null;
  
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: swrMutate
  } = useSWR<T>(
    cacheKey,
    async () => {
      if (!id) return null;
      
      logger.debug(`Fetching ${table} record`, { id });
      const response = await apiClient.get<T>(table, id);
      
      if (!response.ok) {
        throw new Error(response.message || `Failed to fetch ${table} record`);
      }
      
      return response.data || null;
    },
    {
      refreshInterval: options.refreshInterval || 60000, // 1 minute default for single records
      revalidateOnFocus: options.revalidateOnFocus ?? true,
      revalidateOnReconnect: options.revalidateOnReconnect ?? true,
      dedupingInterval: options.dedupingInterval || 5000,
      errorRetryCount: options.errorRetryCount || 3,
      errorRetryInterval: options.errorRetryInterval || 5000,
      onError: (error) => {
        logger.error(`Error fetching ${table} record`, error, { id });
      }
    }
  );

  const refresh = useCallback(async () => {
    await swrMutate();
  }, [swrMutate]);

  return {
    data: data ? [data] : null,
    record: data || null,
    error,
    isLoading,
    isValidating,
    mutate: swrMutate,
    refresh
  };
}

/**
 * Enhanced hook for search operations with debouncing
 */
export function useEnhancedSearch<T>(
  table: string,
  searchTerm: string,
  filters?: Record<string, any>,
  options: UseEnhancedAPIOptions & { debounceMs?: number } = {}
): UseEnhancedAPIResult<T> {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, options.debounceMs || 300);

    return () => clearTimeout(timer);
  }, [searchTerm, options.debounceMs]);

  const cacheKey = debouncedSearchTerm || Object.keys(filters || {}).length > 0
    ? `${table}:search:${debouncedSearchTerm}:${JSON.stringify(filters || {})}`
    : null;
  
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: swrMutate
  } = useSWR<T[]>(
    cacheKey,
    async () => {
      if (!debouncedSearchTerm && (!filters || Object.keys(filters).length === 0)) {
        return [];
      }
      
      const searchFilters = {
        ...filters,
        ...(debouncedSearchTerm && { search: debouncedSearchTerm })
      };
      
      logger.debug(`Searching ${table}`, { searchTerm: debouncedSearchTerm, filters });
      const response = await apiClient.searchRecords<T>(table, searchFilters);
      
      if (!response.ok) {
        throw new Error(response.message || `Failed to search ${table}`);
      }
      
      return response.data || [];
    },
    {
      refreshInterval: options.refreshInterval || 0, // No auto-refresh for search results
      revalidateOnFocus: options.revalidateOnFocus ?? false,
      revalidateOnReconnect: options.revalidateOnReconnect ?? true,
      dedupingInterval: options.dedupingInterval || 1000,
      errorRetryCount: options.errorRetryCount || 2,
      errorRetryInterval: options.errorRetryInterval || 3000,
      onError: (error) => {
        logger.error(`Error searching ${table}`, error);
      }
    }
  );

  const refresh = useCallback(async () => {
    await swrMutate();
  }, [swrMutate]);

  return {
    data: data || null,
    error,
    isLoading,
    isValidating,
    mutate: swrMutate,
    refresh
  };
}

/**
 * Enhanced hook for mutations with optimistic updates and cache invalidation
 */
export function useEnhancedMutations<T>(table: string) {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const create = useCallback(async (data: Partial<T>): Promise<T | null> => {
    setIsCreating(true);
    try {
      logger.debug(`Creating ${table} record`, { data });
      const response = await apiClient.create<T>(table, data);
      
      if (!response.ok) {
        throw new Error(response.message || `Failed to create ${table} record`);
      }

      // Invalidate list caches
      mutate((key) => typeof key === 'string' && key.startsWith(`${table}:list`));
      
      logger.info(`Successfully created ${table} record`, { id: response.data?.id });
      return response.data || null;
    } catch (error) {
      logger.error(`Error creating ${table} record`, error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [table]);

  const update = useCallback(async (id: string, data: Partial<T>): Promise<T | null> => {
    setIsUpdating(true);
    try {
      logger.debug(`Updating ${table} record`, { id, data });
      const response = await apiClient.update<T>(table, id, data);
      
      if (!response.ok) {
        throw new Error(response.message || `Failed to update ${table} record`);
      }

      // Invalidate specific record and list caches
      mutate(`${table}:get:${id}`);
      mutate((key) => typeof key === 'string' && key.startsWith(`${table}:list`));
      
      logger.info(`Successfully updated ${table} record`, { id });
      return response.data || null;
    } catch (error) {
      logger.error(`Error updating ${table} record`, error, { id });
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [table]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    try {
      logger.debug(`Deleting ${table} record`, { id });
      const response = await apiClient.delete(table, id);
      
      if (!response.ok) {
        throw new Error(response.message || `Failed to delete ${table} record`);
      }

      // Invalidate specific record and list caches
      mutate(`${table}:get:${id}`, undefined, false);
      mutate((key) => typeof key === 'string' && key.startsWith(`${table}:list`));
      
      logger.info(`Successfully deleted ${table} record`, { id });
      return true;
    } catch (error) {
      logger.error(`Error deleting ${table} record`, error, { id });
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, [table]);

  const batchCreate = useCallback(async (records: Partial<T>[]): Promise<T[]> => {
    setIsCreating(true);
    try {
      logger.debug(`Batch creating ${table} records`, { count: records.length });
      const response = await apiClient.batchCreate<T>(table, records);
      
      if (!response.ok) {
        throw new Error(response.message || `Failed to batch create ${table} records`);
      }

      // Invalidate list caches
      mutate((key) => typeof key === 'string' && key.startsWith(`${table}:list`));
      
      logger.info(`Successfully batch created ${table} records`, { count: response.data?.length });
      return response.data || [];
    } catch (error) {
      logger.error(`Error batch creating ${table} records`, error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [table]);

  return {
    create,
    update,
    remove,
    batchCreate,
    isCreating,
    isUpdating,
    isDeleting,
    isMutating: isCreating || isUpdating || isDeleting
  };
}

/**
 * Hook for service health monitoring
 */
export function useServiceHealth() {
  const { data, error, isLoading, mutate } = useSWR(
    'service:health',
    async () => {
      const response = await apiClient.getServiceHealth();
      return response.data;
    },
    {
      refreshInterval: 60000, // Check every minute
      revalidateOnFocus: false,
      revalidateOnReconnect: true
    }
  );

  const updateConfig = useCallback((config: {
    timeout?: number;
    retryAttempts?: number;
    cacheEnabled?: boolean;
  }) => {
    apiClient.updateServiceConfig(config);
    mutate(); // Refresh health status
  }, [mutate]);

  return {
    health: data,
    error,
    isLoading,
    updateConfig,
    refresh: mutate
  };
}