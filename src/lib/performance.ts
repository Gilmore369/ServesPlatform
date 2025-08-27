/**
 * Performance optimization utilities
 */

import { useCallback, useRef, useEffect, useMemo, useState } from 'react';

/**
 * Debounce hook for search and filter inputs
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook for scroll and resize events
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttleRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallRef = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        return callback(...args);
      }
      
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
      
      throttleRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callback(...args);
      }, delay - (now - lastCallRef.current));
    }) as T,
    [callback, delay]
  );
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [hasIntersected, options]);

  return {
    targetRef,
    isIntersecting,
    hasIntersected,
  };
}

/**
 * Virtual scrolling hook for large lists
 */
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex: visibleRange.startIndex,
  };
}

/**
 * Memoized search filter
 */
export function useSearchFilter<T>(
  items: T[],
  searchQuery: string,
  searchFields: (keyof T)[],
  debounceMs = 300
) {
  const debouncedQuery = useDebounce(searchQuery, debounceMs);

  return useMemo(() => {
    if (!debouncedQuery.trim()) return items;

    const query = debouncedQuery.toLowerCase();
    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        return String(value).toLowerCase().includes(query);
      })
    );
  }, [items, debouncedQuery, searchFields]);
}

/**
 * Pagination hook with performance optimizations
 */
export function usePagination<T>({
  data,
  pageSize = 20,
  initialPage = 1,
}: {
  data: T[];
  pageSize?: number;
  initialPage?: number;
}) {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedData = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  return {
    currentPage,
    totalPages,
    pageSize,
    paginatedData,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    totalItems: data.length,
    startIndex: startIndex + 1,
    endIndex: Math.min(endIndex, data.length),
  };
}

/**
 * Cache hook for API responses
 */
export function useCache<T>(key: string, ttl: number = 5 * 60 * 1000) {
  const cache = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const get = useCallback((cacheKey: string): T | null => {
    const cached = cache.current.get(cacheKey);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > ttl;
    if (isExpired) {
      cache.current.delete(cacheKey);
      return null;
    }

    return cached.data;
  }, [ttl]);

  const set = useCallback((cacheKey: string, data: T) => {
    cache.current.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }, []);

  const clear = useCallback((cacheKey?: string) => {
    if (cacheKey) {
      cache.current.delete(cacheKey);
    } else {
      cache.current.clear();
    }
  }, []);

  return { get, set, clear };
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(name: string) {
  const startTime = useRef<number>(0);

  const start = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const end = useCallback(() => {
    const duration = performance.now() - startTime.current;
    console.log(`Performance [${name}]: ${duration.toFixed(2)}ms`);
    return duration;
  }, [name]);

  return { start, end };
}