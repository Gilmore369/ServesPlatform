/**
 * Hook for optimized data fetching with lazy loading and performance monitoring
 * Integrates compression, query optimization, and lazy loading
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { googleSheetsAPIService, CRUDOperation } from '../lib/google-sheets-api-service';
import { useLazyLoad } from '../components/ui/LazyLoad';
import { queryOptimizer } from '../lib/query-optimizer';
import { logger } from '../lib/logger';

export interface OptimizedDataConfig {
  table: string;
  pageSize?: number;
  filters?: Record<string, any>;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  enableCompression?: boolean;
  enableOptimization?: boolean;
  cacheStrategy?: 'aggressive' | 'moderate' | 'minimal';
}

export interface OptimizedDataResult<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalRecords: number;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
  performanceMetrics: {
    averageLoadTime: number;
    cacheHitRate: number;
    compressionRatio: number;
    totalRequests: number;
  };
}

/**
 * Hook for optimized data fetching with performance monitoring
 */
export function useOptimizedData<T = any>(
  config: OptimizedDataConfig
): OptimizedDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [performanceData, setPerformanceData] = useState({
    loadTimes: [] as number[],
    cacheHits: 0,
    totalRequests: 0,
    compressionRatios: [] as number[]
  });

  const {
    table,
    pageSize = 20,
    filters = {},
    search = '',
    sortBy = 'id',
    sortOrder = 'asc',
    enableCompression = true,
    enableOptimization = true,
    cacheStrategy = 'moderate'
  } = config;

  // Memoized operation configuration
  const baseOperation = useMemo((): CRUDOperation => ({
    table,
    operation: 'list',
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    pagination: {
      page: currentPage,
      limit: pageSize
    }
  }), [table, filters, currentPage, pageSize]);

  // Fetch data function with optimization
  const fetchData = useCallback(async (page: number = 1, append: boolean = false) => {
    const startTime = Date.now();
    setIsLoading(true);
    setError(null);

    try {
      const operation: CRUDOperation = {
        ...baseOperation,
        pagination: {
          page,
          limit: pageSize
        }
      };

      // Add search if provided
      if (search.trim()) {
        operation.filters = {
          ...operation.filters,
          search: search.trim()
        };
      }

      logger.debug('Fetching optimized data', {
        table,
        page,
        pageSize,
        hasFilters: !!operation.filters,
        enableOptimization
      });

      const response = await googleSheetsAPIService.executeOperation<{
        data: T[];
        pagination?: {
          total_records: number;
          has_next: boolean;
          filtered_records: number;
        };
        metadata?: {
          compressed?: boolean;
          compressionRatio?: number;
          cacheHit?: boolean;
        };
      }>(operation, {
        skipCache: cacheStrategy === 'minimal'
      });

      if (response.ok && response.data) {
        const newData = response.data.data || [];
        const pagination = response.data.pagination;
        const metadata = response.data.metadata || response.metadata;

        // Update data
        if (append) {
          setData(prevData => [...prevData, ...newData]);
        } else {
          setData(newData);
        }

        // Update pagination info
        if (pagination) {
          setTotalRecords(pagination.total_records || 0);
          setHasMore(pagination.has_next || false);
        }

        // Update performance metrics
        const loadTime = Date.now() - startTime;
        setPerformanceData(prev => ({
          loadTimes: [...prev.loadTimes.slice(-19), loadTime], // Keep last 20
          cacheHits: prev.cacheHits + (metadata?.cacheHit ? 1 : 0),
          totalRequests: prev.totalRequests + 1,
          compressionRatios: metadata?.compressionRatio 
            ? [...prev.compressionRatios.slice(-19), metadata.compressionRatio]
            : prev.compressionRatios
        }));

        logger.debug('Data fetched successfully', {
          table,
          page,
          recordsReceived: newData.length,
          totalRecords: pagination?.total_records,
          loadTime,
          cacheHit: metadata?.cacheHit,
          compressed: metadata?.compressed
        });

      } else {
        throw new Error(response.message || 'Failed to fetch data');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos';
      setError(errorMessage);
      
      logger.error('Failed to fetch optimized data', err, {
        table,
        page,
        pageSize
      });

    } finally {
      setIsLoading(false);
    }
  }, [baseOperation, pageSize, search, cacheStrategy, table]);

  // Load more data
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await fetchData(nextPage, true);
  }, [hasMore, isLoading, currentPage, fetchData]);

  // Refresh data
  const refresh = useCallback(async () => {
    setCurrentPage(1);
    setData([]);
    setHasMore(true);
    await fetchData(1, false);
  }, [fetchData]);

  // Reset data
  const reset = useCallback(() => {
    setData([]);
    setCurrentPage(1);
    setHasMore(true);
    setError(null);
    setTotalRecords(0);
    setPerformanceData({
      loadTimes: [],
      cacheHits: 0,
      totalRequests: 0,
      compressionRatios: []
    });
  }, []);

  // Initial data load
  useEffect(() => {
    fetchData(1, false);
  }, [table, JSON.stringify(filters), search, sortBy, sortOrder]);

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    const { loadTimes, cacheHits, totalRequests, compressionRatios } = performanceData;
    
    return {
      averageLoadTime: loadTimes.length > 0 
        ? Math.round(loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length)
        : 0,
      cacheHitRate: totalRequests > 0 ? cacheHits / totalRequests : 0,
      compressionRatio: compressionRatios.length > 0
        ? compressionRatios.reduce((sum, ratio) => sum + ratio, 0) / compressionRatios.length
        : 1,
      totalRequests
    };
  }, [performanceData]);

  return {
    data,
    isLoading,
    error,
    hasMore,
    totalRecords,
    loadMore,
    refresh,
    reset,
    performanceMetrics
  };
}

/**
 * Hook for optimized search with debouncing and performance monitoring
 */
export function useOptimizedSearch<T = any>(
  table: string,
  searchFields: string[] = [],
  debounceMs: number = 300
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  // Use optimized data with search
  const searchConfig: OptimizedDataConfig = useMemo(() => ({
    table,
    search: debouncedQuery,
    pageSize: 50, // Larger page size for search results
    enableOptimization: true,
    cacheStrategy: 'minimal' // Search results change frequently
  }), [table, debouncedQuery]);

  const searchResult = useOptimizedData<T>(searchConfig);

  // Update searching state
  useEffect(() => {
    setIsSearching(searchQuery !== debouncedQuery);
  }, [searchQuery, debouncedQuery]);

  const performSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  return {
    searchQuery,
    performSearch,
    clearSearch,
    isSearching: isSearching || searchResult.isLoading,
    searchResults: searchResult.data,
    hasMoreResults: searchResult.hasMore,
    loadMoreResults: searchResult.loadMore,
    searchError: searchResult.error,
    searchMetrics: searchResult.performanceMetrics
  };
}

/**
 * Hook for batch operations with optimization
 */
export function useOptimizedBatch<T = any>(table: string) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const processBatch = useCallback(async (
    operations: Omit<CRUDOperation, 'table'>[],
    batchSize: number = 10
  ) => {
    setIsProcessing(true);
    setProgress(0);
    setResults([]);
    setErrors([]);

    try {
      const totalOperations = operations.length;
      const batches = [];
      
      // Split operations into batches
      for (let i = 0; i < operations.length; i += batchSize) {
        batches.push(operations.slice(i, i + batchSize));
      }

      let processedCount = 0;
      const allResults: any[] = [];
      const allErrors: string[] = [];

      // Process each batch
      for (const batch of batches) {
        const batchOperations = batch.map(op => ({ ...op, table }));
        
        try {
          const batchResults = await googleSheetsAPIService.batchOperations(batchOperations);
          allResults.push(...batchResults);
          
          // Check for individual operation errors
          batchResults.forEach((result, index) => {
            if (!result.ok) {
              allErrors.push(`Operation ${processedCount + index + 1}: ${result.message}`);
            }
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Batch operation failed';
          allErrors.push(`Batch error: ${errorMessage}`);
        }

        processedCount += batch.length;
        setProgress((processedCount / totalOperations) * 100);
        setResults([...allResults]);
        setErrors([...allErrors]);

        // Small delay between batches to avoid overwhelming the server
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info('Batch processing completed', {
        table,
        totalOperations,
        successfulOperations: allResults.filter(r => r.ok).length,
        failedOperations: allErrors.length
      });

    } catch (error) {
      logger.error('Batch processing failed', error, { table });
      setErrors(prev => [...prev, 'Batch processing failed']);
    } finally {
      setIsProcessing(false);
    }
  }, [table]);

  return {
    processBatch,
    isProcessing,
    progress,
    results,
    errors,
    hasErrors: errors.length > 0
  };
}

export default useOptimizedData;