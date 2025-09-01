/**
 * Enhanced data synchronization hook
 * Provides immediate data refresh after CRUD operations with optimistic updates
 */

import { useState, useCallback, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { apiClient } from '@/lib/apiClient';
import { logger } from '@/lib/logger';
import { enhancedErrorHandler, EnhancedError, ErrorType } from '@/lib/enhanced-error-handler';
import { useOfflineAwareOperation } from '@/hooks/useOfflineDetection';

export interface DataSyncOptions {
  table: string;
  params?: { limit?: number; q?: string };
  optimisticUpdates?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface DataSyncState {
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: EnhancedError | null;
  lastOperation: {
    type: 'create' | 'update' | 'delete' | null;
    success: boolean;
    timestamp: Date | null;
    message?: string;
    attempts?: number;
  };
  isOffline: boolean;
  pendingOperations: number;
}

export interface DataSyncActions<T> {
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  clearLastOperation: () => void;
}

export interface DataSyncReturn<T> {
  data: T[];
  state: DataSyncState;
  actions: DataSyncActions<T>;
}

/**
 * Enhanced data synchronization hook with immediate updates
 */
export function useDataSync<T extends { id: string }>(
  options: DataSyncOptions
): DataSyncReturn<T> {
  const { table, params, optimisticUpdates = true, autoRefresh = true, refreshInterval = 0 } = options;
  
  // Offline-aware operations
  const { 
    offlineState, 
    pendingOperations, 
    queueOperation 
  } = useOfflineAwareOperation();
  
  // State management
  const [state, setState] = useState<DataSyncState>({
    loading: false,
    creating: false,
    updating: false,
    deleting: false,
    error: null,
    lastOperation: {
      type: null,
      success: false,
      timestamp: null
    },
    isOffline: offlineState.isOffline,
    pendingOperations: pendingOperations.length
  });

  // Cache key for SWR
  const cacheKey = params ? `${table}|${JSON.stringify(params)}` : table;
  
  // SWR data fetching
  const { data, error, mutate: swrMutate, isLoading } = useSWR<T[]>(
    cacheKey,
    async () => {
      const response = await apiClient.list<T>(table, params);
      if (!response.ok) {
        throw new Error(response.message || 'Failed to fetch data');
      }
      return response.data || [];
    },
    {
      refreshInterval: autoRefresh ? refreshInterval : 0,
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds
      errorRetryCount: 3,
      errorRetryInterval: 1000
    }
  );

  // Refs for optimistic updates
  const optimisticDataRef = useRef<T[]>([]);
  const rollbackDataRef = useRef<T[]>([]);

  // Update state helper
  const updateState = useCallback((updates: Partial<DataSyncState>) => {
    setState(prev => ({ 
      ...prev, 
      ...updates,
      isOffline: offlineState.isOffline,
      pendingOperations: pendingOperations.length
    }));
  }, [offlineState.isOffline, pendingOperations.length]);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Clear last operation
  const clearLastOperation = useCallback(() => {
    updateState({
      lastOperation: {
        type: null,
        success: false,
        timestamp: null
      }
    });
  }, [updateState]);

  // Refresh data
  const refresh = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });
      await swrMutate();
      
      // Also refresh related cache keys
      await mutate(
        key => typeof key === 'string' && key.startsWith(table),
        undefined,
        { revalidate: true }
      );
      
      logger.info(`Data refreshed for table: ${table}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      updateState({ error: errorMessage });
      logger.error(`Failed to refresh data for table: ${table}`, error);
    } finally {
      updateState({ loading: false });
    }
  }, [table, swrMutate, updateState]);

  // Create operation with enhanced error handling and offline support
  const create = useCallback(async (newData: Partial<T>): Promise<T> => {
    const context = {
      operation: 'create',
      table,
      data: newData,
      timestamp: new Date()
    };

    // If offline, queue the operation
    if (offlineState.isOffline) {
      queueOperation(
        () => apiClient.create<T>(table, newData),
        `Create ${table} item`
      );
      
      throw enhancedErrorHandler.classifyError(
        new Error('No internet connection. Operation queued for when connection is restored.'),
        context
      );
    }

    const result = await enhancedErrorHandler.executeWithRetry(
      async () => {
        updateState({ 
          creating: true, 
          error: null,
          lastOperation: { type: 'create', success: false, timestamp: new Date() }
        });

        // Optimistic update
        if (optimisticUpdates && data) {
          const optimisticItem = {
            ...newData,
            id: `temp_${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as T;

          rollbackDataRef.current = [...data];
          optimisticDataRef.current = [optimisticItem, ...data];
          
          await swrMutate(optimisticDataRef.current, false);
        }

        // Perform actual create operation
        const response = await apiClient.create<T>(table, newData);
        
        if (!response.ok) {
          throw new Error(response.message || 'Failed to create item');
        }

        const createdItem = response.data!;
        
        // Update cache with real data
        if (data) {
          const updatedData = optimisticUpdates 
            ? [createdItem, ...rollbackDataRef.current]
            : [createdItem, ...data];
          
          await swrMutate(updatedData, false);
        }

        // Refresh to ensure consistency
        if (autoRefresh) {
          setTimeout(() => refresh(), 100);
        }

        return createdItem;
      },
      context,
      {
        maxAttempts: 3,
        baseDelay: 1000,
        retryCondition: (error, attempt) => {
          const enhancedError = enhancedErrorHandler.classifyError(error, context);
          return enhancedError.retryable && attempt < 3;
        }
      }
    );

    if (result.success) {
      updateState({
        creating: false,
        lastOperation: {
          type: 'create',
          success: true,
          timestamp: new Date(),
          message: 'Item created successfully',
          attempts: result.attempts
        }
      });

      logger.info(`Item created successfully in table: ${table}`, { 
        id: result.data.id,
        attempts: result.attempts 
      });
      
      return result.data;
    } else {
      // Rollback optimistic update
      if (optimisticUpdates && rollbackDataRef.current.length > 0) {
        await swrMutate(rollbackDataRef.current, false);
      }

      updateState({
        creating: false,
        error: result.error!,
        lastOperation: {
          type: 'create',
          success: false,
          timestamp: new Date(),
          message: result.error!.userMessage,
          attempts: result.attempts
        }
      });

      throw result.error;
    }
  }, [table, data, optimisticUpdates, autoRefresh, swrMutate, updateState, refresh, offlineState.isOffline, queueOperation]);

  // Update operation with enhanced error handling and offline support
  const update = useCallback(async (id: string, updateData: Partial<T>): Promise<T> => {
    const context = {
      operation: 'update',
      table,
      id,
      data: updateData,
      timestamp: new Date()
    };

    // If offline, queue the operation
    if (offlineState.isOffline) {
      queueOperation(
        () => apiClient.update<T>(table, id, updateData),
        `Update ${table} item ${id}`
      );
      
      throw enhancedErrorHandler.classifyError(
        new Error('No internet connection. Operation queued for when connection is restored.'),
        context
      );
    }

    const result = await enhancedErrorHandler.executeWithRetry(
      async () => {
        updateState({ 
          updating: true, 
          error: null,
          lastOperation: { type: 'update', success: false, timestamp: new Date() }
        });

        // Optimistic update
        if (optimisticUpdates && data) {
          rollbackDataRef.current = [...data];
          optimisticDataRef.current = data.map(item => 
            item.id === id 
              ? { ...item, ...updateData, updated_at: new Date().toISOString() }
              : item
          );
          
          await swrMutate(optimisticDataRef.current, false);
        }

        // Perform actual update operation
        const response = await apiClient.update<T>(table, id, updateData);
        
        if (!response.ok) {
          throw new Error(response.message || 'Failed to update item');
        }

        const updatedItem = response.data!;
        
        // Update cache with real data
        if (data) {
          const updatedData = data.map(item => 
            item.id === id ? updatedItem : item
          );
          
          await swrMutate(updatedData, false);
        }

        // Refresh to ensure consistency
        if (autoRefresh) {
          setTimeout(() => refresh(), 100);
        }

        return updatedItem;
      },
      context,
      {
        maxAttempts: 3,
        baseDelay: 1000
      }
    );

    if (result.success) {
      updateState({
        updating: false,
        lastOperation: {
          type: 'update',
          success: true,
          timestamp: new Date(),
          message: 'Item updated successfully',
          attempts: result.attempts
        }
      });

      logger.info(`Item updated successfully in table: ${table}`, { 
        id,
        attempts: result.attempts 
      });
      
      return result.data;
    } else {
      // Rollback optimistic update
      if (optimisticUpdates && rollbackDataRef.current.length > 0) {
        await swrMutate(rollbackDataRef.current, false);
      }

      updateState({
        updating: false,
        error: result.error!,
        lastOperation: {
          type: 'update',
          success: false,
          timestamp: new Date(),
          message: result.error!.userMessage,
          attempts: result.attempts
        }
      });

      throw result.error;
    }
  }, [table, data, optimisticUpdates, autoRefresh, swrMutate, updateState, refresh, offlineState.isOffline, queueOperation]);

  // Delete operation with enhanced error handling and offline support
  const deleteItem = useCallback(async (id: string): Promise<void> => {
    const context = {
      operation: 'delete',
      table,
      id,
      timestamp: new Date()
    };

    // If offline, queue the operation
    if (offlineState.isOffline) {
      queueOperation(
        () => apiClient.delete(table, id),
        `Delete ${table} item ${id}`
      );
      
      throw enhancedErrorHandler.classifyError(
        new Error('No internet connection. Operation queued for when connection is restored.'),
        context
      );
    }

    const result = await enhancedErrorHandler.executeWithRetry(
      async () => {
        updateState({ 
          deleting: true, 
          error: null,
          lastOperation: { type: 'delete', success: false, timestamp: new Date() }
        });

        // Optimistic update
        if (optimisticUpdates && data) {
          rollbackDataRef.current = [...data];
          optimisticDataRef.current = data.filter(item => item.id !== id);
          
          await swrMutate(optimisticDataRef.current, false);
        }

        // Perform actual delete operation
        const response = await apiClient.delete(table, id);
        
        if (!response.ok) {
          throw new Error(response.message || 'Failed to delete item');
        }

        // Update cache
        if (data) {
          const updatedData = data.filter(item => item.id !== id);
          await swrMutate(updatedData, false);
        }

        // Refresh to ensure consistency
        if (autoRefresh) {
          setTimeout(() => refresh(), 100);
        }

        return undefined;
      },
      context,
      {
        maxAttempts: 3,
        baseDelay: 1000
      }
    );

    if (result.success) {
      updateState({
        deleting: false,
        lastOperation: {
          type: 'delete',
          success: true,
          timestamp: new Date(),
          message: 'Item deleted successfully',
          attempts: result.attempts
        }
      });

      logger.info(`Item deleted successfully from table: ${table}`, { 
        id,
        attempts: result.attempts 
      });
    } else {
      // Rollback optimistic update
      if (optimisticUpdates && rollbackDataRef.current.length > 0) {
        await swrMutate(rollbackDataRef.current, false);
      }

      updateState({
        deleting: false,
        error: result.error!,
        lastOperation: {
          type: 'delete',
          success: false,
          timestamp: new Date(),
          message: result.error!.userMessage,
          attempts: result.attempts
        }
      });

      throw result.error;
    }
  }, [table, data, optimisticUpdates, autoRefresh, swrMutate, updateState, refresh, offlineState.isOffline, queueOperation]);

  // Combine loading states
  const combinedState: DataSyncState = {
    ...state,
    loading: isLoading || state.loading
  };

  // Handle SWR errors
  if (error && !state.error) {
    updateState({ error: error.message || 'Failed to load data' });
  }

  return {
    data: data || [],
    state: combinedState,
    actions: {
      create,
      update,
      delete: deleteItem,
      refresh,
      clearError,
      clearLastOperation
    }
  };
}

// Specific entity hooks using the enhanced data sync
export const useProjectsSync = (params?: { limit?: number; q?: string }) =>
  useDataSync<any>({ table: 'Proyectos', params });

export const useMaterialsSync = (params?: { limit?: number; q?: string }) =>
  useDataSync<any>({ table: 'Materiales', params });

export const useUsersSync = (params?: { limit?: number; q?: string }) =>
  useDataSync<any>({ table: 'Usuarios', params });

export const useActivitiesSync = (params?: { limit?: number; q?: string }) =>
  useDataSync<any>({ table: 'Actividades', params });

export const usePersonnelSync = (params?: { limit?: number; q?: string }) =>
  useDataSync<any>({ table: 'Colaboradores', params });

export const useClientsSync = (params?: { limit?: number; q?: string }) =>
  useDataSync<any>({ table: 'Clientes', params });