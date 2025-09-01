/**
 * Enhanced pagination hook with loading states and error handling
 */

import { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/apiClient';
import { optimizedSheetsService } from '@/lib/optimized-sheets-service';
import { useDebounce } from '@/hooks/useDebounce';
import { APIResponse } from '@/lib/types';

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  actions: {
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
    setSearch: (search: string) => void;
    setFilters: (filters: Record<string, any>) => void;
    setSort: (sortBy: string, sortOrder?: 'asc' | 'desc') => void;
    refresh: () => void;
    reset: () => void;
  };
}

// Enhanced fetcher that handles pagination with optimization
const createPaginatedFetcher = <T>(table: string) => async (params: PaginationParams): Promise<{
  data: T[];
  total: number;
}> => {
  try {
    // Use optimized service for better performance
    const response = await optimizedSheetsService.optimizedList<T>(table, {
      limit: params.limit,
      offset: (params.page - 1) * params.limit,
      filters: params.search ? { search: params.search } : params.filters,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder
    });

    if (!response.ok) {
      throw new Error(response.message || 'Failed to fetch data');
    }

    const data = response.data || [];
    
    // For now, simulate total count since the API doesn't return it
    // In a real implementation, the backend would return pagination metadata
    const total = data.length < params.limit ? 
      (params.page - 1) * params.limit + data.length : 
      params.page * params.limit + 1; // Assume there's at least one more page

    return {
      data,
      total
    };
  } catch (error) {
    // Fallback to regular API client if optimized service fails
    try {
      const fallbackResponse = await apiClient.list<T>(table, {
        limit: params.limit * params.page,
        q: params.search
      });

      if (!fallbackResponse.ok) {
        throw new Error(fallbackResponse.message || 'Failed to fetch data');
      }

      const allData = fallbackResponse.data || [];
      const startIndex = (params.page - 1) * params.limit;
      const endIndex = startIndex + params.limit;
      const paginatedData = allData.slice(startIndex, endIndex);

      return {
        data: paginatedData,
        total: allData.length
      };
    } catch (fallbackError) {
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }
};

export function usePagination<T>(
  table: string,
  initialParams: Partial<PaginationParams> = {}
): PaginationResult<T> {
  const [params, setParams] = useState<PaginationParams>({
    page: 1,
    limit: 25,
    search: '',
    filters: {},
    sortBy: '',
    sortOrder: 'asc',
    ...initialParams
  });

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useDebounce(params.search, 300);

  // Create a stable key for SWR with debounced search
  const swrKey = useMemo(() => {
    const keyParams = { ...params, search: debouncedSearch };
    return `${table}:${JSON.stringify(keyParams)}`;
  }, [table, params, debouncedSearch]);

  // Create fetcher function
  const fetcher = useMemo(() => createPaginatedFetcher<T>(table), [table]);

  // Use SWR for data fetching with caching and optimized parameters
  const { data, error, mutate, isLoading } = useSWR(
    swrKey,
    () => fetcher({ ...params, search: debouncedSearch }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute - longer deduping for better performance
      errorRetryCount: 2,
      errorRetryInterval: 1000,
      keepPreviousData: true, // Keep previous data while loading new data
      revalidateOnReconnect: true,
      refreshInterval: 0, // Disable automatic refresh
      focusThrottleInterval: 5000 // Throttle focus revalidation
    }
  );

  // Calculate pagination info
  const pagination = useMemo(() => {
    const totalItems = data?.total || 0;
    const totalPages = Math.ceil(totalItems / params.limit);
    
    return {
      currentPage: params.page,
      totalPages,
      totalItems,
      itemsPerPage: params.limit,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1
    };
  }, [data?.total, params.page, params.limit]);

  // Action handlers
  const setPage = useCallback((page: number) => {
    setParams(prev => ({ ...prev, page: Math.max(1, page) }));
  }, []);

  const setPageSize = useCallback((limit: number) => {
    setParams(prev => ({ 
      ...prev, 
      limit: Math.max(1, limit),
      page: 1 // Reset to first page when changing page size
    }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setParams(prev => ({ 
      ...prev, 
      search,
      page: 1 // Reset to first page when searching
    }));
  }, []);

  const setFilters = useCallback((filters: Record<string, any>) => {
    setParams(prev => ({ 
      ...prev, 
      filters,
      page: 1 // Reset to first page when filtering
    }));
  }, []);

  const setSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc' = 'asc') => {
    setParams(prev => ({ 
      ...prev, 
      sortBy,
      sortOrder,
      page: 1 // Reset to first page when sorting
    }));
  }, []);

  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  const reset = useCallback(() => {
    setParams({
      page: 1,
      limit: 25,
      search: '',
      filters: {},
      sortBy: '',
      sortOrder: 'asc'
    });
  }, []);

  return {
    data: data?.data || [],
    loading: isLoading,
    error: error || null,
    pagination,
    actions: {
      setPage,
      setPageSize,
      setSearch,
      setFilters,
      setSort,
      refresh,
      reset
    }
  };
}

// Specialized hooks for different entities
export const usePaginatedProjects = (initialParams?: Partial<PaginationParams>) =>
  usePagination<any>('Proyectos', initialParams);

export const usePaginatedUsers = (initialParams?: Partial<PaginationParams>) =>
  usePagination<any>('Usuarios', initialParams);

export const usePaginatedActivities = (initialParams?: Partial<PaginationParams>) =>
  usePagination<any>('Actividades', initialParams);

export const usePaginatedMaterials = (initialParams?: Partial<PaginationParams>) =>
  usePagination<any>('Materiales', initialParams);

export const usePaginatedPersonnel = (initialParams?: Partial<PaginationParams>) =>
  usePagination<any>('Colaboradores', initialParams);

export const usePaginatedClients = (initialParams?: Partial<PaginationParams>) =>
  usePagination<any>('Clientes', initialParams);

export default usePagination;