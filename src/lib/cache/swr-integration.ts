/**
 * SWR Integration for client-side caching with automatic revalidation
 * Integrates with the server-side CacheManager for comprehensive caching strategy
 */

import useSWR, { SWRConfiguration, SWRResponse, mutate } from 'swr';
import { googleSheetsAPIService, CRUDOperation, EnhancedAPIResponse } from '../google-sheets-api-service';
import { cacheManager, DataType, TTL_CONFIG } from './cache-manager';

export interface SWRCacheConfig extends SWRConfiguration {
  dataType?: DataType;
  serverCache?: boolean;
  revalidateOnWrite?: boolean;
}

/**
 * SWR Configuration by data type
 */
const SWR_CONFIG_BY_TYPE: Record<DataType, SWRConfiguration> = {
  list: {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    dedupingInterval: 30 * 1000, // 30 seconds
  },
  record: {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 10 * 60 * 1000, // 10 minutes
    dedupingInterval: 60 * 1000, // 1 minute
  },
  static: {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 60 * 60 * 1000, // 1 hour
    dedupingInterval: 10 * 60 * 1000, // 10 minutes
  },
  user: {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30 * 60 * 1000, // 30 minutes
    dedupingInterval: 2 * 60 * 1000, // 2 minutes
  },
  project: {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 15 * 60 * 1000, // 15 minutes
    dedupingInterval: 60 * 1000, // 1 minute
  },
  material: {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 20 * 60 * 1000, // 20 minutes
    dedupingInterval: 2 * 60 * 1000, // 2 minutes
  },
  activity: {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 10 * 60 * 1000, // 10 minutes
    dedupingInterval: 30 * 1000, // 30 seconds
  },
  report: {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 30 * 60 * 1000, // 30 minutes
    dedupingInterval: 5 * 60 * 1000, // 5 minutes
  }
};

/**
 * Enhanced fetcher function that integrates with server-side cache
 */
async function enhancedFetcher<T>(
  operation: CRUDOperation,
  useServerCache: boolean = true
): Promise<T> {
  const cacheKey = generateCacheKey(operation);
  
  // Try server-side cache first if enabled
  if (useServerCache) {
    const cachedData = await cacheManager.get<T>(cacheKey);
    if (cachedData) {
      console.log(`🎯 Server cache hit for SWR: ${cacheKey}`);
      return cachedData;
    }
  }

  // Fetch from API
  const response = await googleSheetsAPIService.executeOperation<T>(operation);
  
  if (!response.ok) {
    throw new Error(response.message || 'API request failed');
  }

  // Store in server-side cache
  if (useServerCache && response.data) {
    await cacheManager.set(cacheKey, response.data);
  }

  return response.data as T;
}

/**
 * Generate consistent cache key from CRUD operation
 */
function generateCacheKey(operation: CRUDOperation): string {
  const parts = [operation.table, operation.operation];
  
  if (operation.id) {
    parts.push(operation.id);
  }
  
  if (operation.filters) {
    const filterStr = JSON.stringify(operation.filters);
    parts.push(`filters:${btoa(filterStr)}`);
  }
  
  if (operation.pagination) {
    parts.push(`page:${operation.pagination.page}:${operation.pagination.limit}`);
  }
  
  return parts.join(':');
}

/**
 * Infer data type from operation
 */
function inferDataType(operation: CRUDOperation): DataType {
  const table = operation.table.toLowerCase();
  
  if (table.includes('usuario') || table.includes('user')) return 'user';
  if (table.includes('proyecto') || table.includes('project')) return 'project';
  if (table.includes('material')) return 'material';
  if (table.includes('actividad') || table.includes('activity')) return 'activity';
  if (table.includes('reporte') || table.includes('report')) return 'report';
  if (table.includes('cliente') || table.includes('config')) return 'static';
  
  // Single record vs list
  if (operation.operation === 'get' || operation.id) return 'record';
  
  return 'list';
}

/**
 * Custom hook for CRUD operations with intelligent caching
 */
export function useCRUDOperation<T>(
  operation: CRUDOperation | null,
  config: SWRCacheConfig = {}
): SWRResponse<T, Error> & {
  cacheKey: string | null;
  invalidateCache: () => Promise<void>;
  refreshData: () => Promise<T | undefined>;
} {
  const cacheKey = operation ? generateCacheKey(operation) : null;
  const dataType = operation ? inferDataType(operation) : 'list';
  
  // Merge configurations
  const swrConfig: SWRConfiguration = {
    ...SWR_CONFIG_BY_TYPE[dataType],
    ...config,
    fetcher: config.serverCache !== false 
      ? (op: CRUDOperation) => enhancedFetcher<T>(op, true)
      : (op: CRUDOperation) => enhancedFetcher<T>(op, false),
    onError: (error) => {
      console.error(`❌ SWR Error for ${cacheKey}:`, error);
      config.onError?.(error);
    },
    onSuccess: (data) => {
      console.log(`✅ SWR Success for ${cacheKey}`);
      config.onSuccess?.(data);
    }
  };

  const swrResponse = useSWR<T, Error>(
    operation ? [cacheKey, operation] : null,
    operation ? ([, op]) => swrConfig.fetcher!(op) : null,
    swrConfig
  );

  return {
    ...swrResponse,
    cacheKey,
    invalidateCache: async () => {
      if (cacheKey) {
        await mutate(cacheKey, undefined, { revalidate: false });
        await cacheManager.invalidate(cacheKey);
      }
    },
    refreshData: async () => {
      if (cacheKey) {
        return await mutate(cacheKey);
      }
    }
  };
}

/**
 * Hook for list operations (most common use case)
 */
export function useList<T>(
  table: string,
  filters?: Record<string, any>,
  pagination?: { page: number; limit: number },
  config: SWRCacheConfig = {}
) {
  const operation: CRUDOperation = {
    table,
    operation: 'list',
    filters,
    pagination
  };

  return useCRUDOperation<T[]>(operation, {
    dataType: 'list',
    ...config
  });
}

/**
 * Hook for single record operations
 */
export function useRecord<T>(
  table: string,
  id: string | null,
  config: SWRCacheConfig = {}
) {
  const operation: CRUDOperation | null = id ? {
    table,
    operation: 'get',
    id
  } : null;

  return useCRUDOperation<T>(operation, {
    dataType: 'record',
    ...config
  });
}

/**
 * Mutation helper for write operations with cache invalidation
 */
export class CacheMutator {
  /**
   * Perform create operation with cache invalidation
   */
  static async create<T>(
    table: string,
    data: any,
    options: { optimisticUpdate?: boolean; revalidateRelated?: boolean } = {}
  ): Promise<EnhancedAPIResponse<T>> {
    const operation: CRUDOperation = {
      table,
      operation: 'create',
      data
    };

    try {
      // Perform the operation
      const response = await googleSheetsAPIService.executeOperation<T>(operation);

      if (response.ok) {
        // Invalidate related caches
        await cacheManager.invalidateByOperation(table, 'create');
        
        // Invalidate SWR caches
        await this.invalidateSWRCaches(table, 'create');

        if (options.revalidateRelated) {
          await this.revalidateRelatedData(table);
        }

        console.log(`✨ Created ${table} record and invalidated caches`);
      }

      return response;
    } catch (error) {
      console.error(`❌ Failed to create ${table} record:`, error);
      throw error;
    }
  }

  /**
   * Perform update operation with cache invalidation
   */
  static async update<T>(
    table: string,
    id: string,
    data: any,
    options: { optimisticUpdate?: boolean; revalidateRelated?: boolean } = {}
  ): Promise<EnhancedAPIResponse<T>> {
    const operation: CRUDOperation = {
      table,
      operation: 'update',
      id,
      data
    };

    // Optimistic update
    if (options.optimisticUpdate) {
      const recordKey = `${table}:get:${id}`;
      await mutate(recordKey, data, { revalidate: false });
    }

    try {
      const response = await googleSheetsAPIService.executeOperation<T>(operation);

      if (response.ok) {
        // Invalidate related caches
        await cacheManager.invalidateByOperation(table, 'update');
        
        // Invalidate SWR caches
        await this.invalidateSWRCaches(table, 'update');

        if (options.revalidateRelated) {
          await this.revalidateRelatedData(table);
        }

        console.log(`✨ Updated ${table} record ${id} and invalidated caches`);
      } else if (options.optimisticUpdate) {
        // Revert optimistic update on failure
        const recordKey = `${table}:get:${id}`;
        await mutate(recordKey);
      }

      return response;
    } catch (error) {
      // Revert optimistic update on error
      if (options.optimisticUpdate) {
        const recordKey = `${table}:get:${id}`;
        await mutate(recordKey);
      }
      
      console.error(`❌ Failed to update ${table} record ${id}:`, error);
      throw error;
    }
  }

  /**
   * Perform delete operation with cache invalidation
   */
  static async delete<T>(
    table: string,
    id: string,
    options: { optimisticUpdate?: boolean; revalidateRelated?: boolean } = {}
  ): Promise<EnhancedAPIResponse<T>> {
    const operation: CRUDOperation = {
      table,
      operation: 'delete',
      id
    };

    try {
      const response = await googleSheetsAPIService.executeOperation<T>(operation);

      if (response.ok) {
        // Invalidate related caches
        await cacheManager.invalidateByOperation(table, 'delete');
        
        // Invalidate SWR caches
        await this.invalidateSWRCaches(table, 'delete');

        if (options.revalidateRelated) {
          await this.revalidateRelatedData(table);
        }

        console.log(`✨ Deleted ${table} record ${id} and invalidated caches`);
      }

      return response;
    } catch (error) {
      console.error(`❌ Failed to delete ${table} record ${id}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate SWR caches based on patterns
   */
  private static async invalidateSWRCaches(table: string, operation: string): Promise<void> {
    // Invalidate list caches for the table
    await mutate(
      (key) => typeof key === 'string' && key.startsWith(`${table}:list`),
      undefined,
      { revalidate: true }
    );

    // For updates and deletes, also invalidate the specific record
    if (operation === 'update' || operation === 'delete') {
      await mutate(
        (key) => typeof key === 'string' && key.startsWith(`${table}:get`),
        undefined,
        { revalidate: operation === 'update' }
      );
    }
  }

  /**
   * Revalidate related data that might be affected
   */
  private static async revalidateRelatedData(table: string): Promise<void> {
    const relatedTables = this.getRelatedTables(table);
    
    for (const relatedTable of relatedTables) {
      await mutate(
        (key) => typeof key === 'string' && key.startsWith(`${relatedTable}:`),
        undefined,
        { revalidate: true }
      );
    }
  }

  /**
   * Get tables that might be affected by changes to the given table
   */
  private static getRelatedTables(table: string): string[] {
    const relations: Record<string, string[]> = {
      'proyectos': ['actividades', 'dashboard'],
      'materiales': ['actividades', 'dashboard'],
      'usuarios': ['proyectos', 'actividades', 'dashboard'],
      'actividades': ['proyectos', 'dashboard'],
      'clientes': ['proyectos', 'dashboard']
    };

    return relations[table.toLowerCase()] || [];
  }
}

/**
 * Global cache invalidation utilities
 */
export const CacheUtils = {
  /**
   * Clear all caches (both server and client)
   */
  async clearAll(): Promise<void> {
    await cacheManager.clear();
    await mutate(() => true, undefined, { revalidate: false });
    console.log('🧹 All caches cleared');
  },

  /**
   * Get cache statistics
   */
  getStats() {
    return cacheManager.getStats();
  },

  /**
   * Preload data into cache
   */
  async preload<T>(operation: CRUDOperation): Promise<void> {
    const cacheKey = generateCacheKey(operation);
    await mutate(cacheKey, enhancedFetcher<T>(operation));
  }
};