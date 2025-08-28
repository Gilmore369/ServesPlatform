/**
 * Lazy loading component for lists with many elements
 * Implements requirement 2.2 - implement lazy loading for performance
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useIntersectionObserver, useVirtualScroll } from '../../lib/performance';
import { logger } from '../../lib/logger';

export interface LazyLoadProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  threshold?: number;
  rootMargin?: string;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  isLoading?: boolean;
  className?: string;
  virtualized?: boolean;
  batchSize?: number;
}

/**
 * Default loading component
 */
const DefaultLoadingComponent: React.FC = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-sm text-gray-600">Cargando...</span>
  </div>
);

/**
 * Default empty component
 */
const DefaultEmptyComponent: React.FC = () => (
  <div className="flex items-center justify-center p-8 text-gray-500">
    <span>No hay elementos para mostrar</span>
  </div>
);

/**
 * Default error component
 */
const DefaultErrorComponent: React.FC = () => (
  <div className="flex items-center justify-center p-4 text-red-600">
    <span>Error al cargar los elementos</span>
  </div>
);

/**
 * Lazy loading component with virtual scrolling support
 */
export function LazyLoad<T>({
  items,
  renderItem,
  itemHeight = 60,
  containerHeight = 400,
  threshold = 0.1,
  rootMargin = '50px',
  loadingComponent = <DefaultLoadingComponent />,
  errorComponent = <DefaultErrorComponent />,
  emptyComponent = <DefaultEmptyComponent />,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  className = '',
  virtualized = false,
  batchSize = 20
}: LazyLoadProps<T>) {
  const [visibleItems, setVisibleItems] = useState<T[]>([]);
  const [loadedCount, setLoadedCount] = useState(batchSize);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scrolling
  const { targetRef: loadMoreTargetRef, isIntersecting } = useIntersectionObserver({
    threshold,
    rootMargin
  });

  // Virtual scrolling for large lists
  const virtualScrollData = useVirtualScroll({
    items: virtualized ? items : visibleItems,
    itemHeight,
    containerHeight,
    overscan: 5
  });

  // Initialize visible items
  useEffect(() => {
    if (!virtualized) {
      const initialItems = items.slice(0, Math.min(loadedCount, items.length));
      setVisibleItems(initialItems);
      
      logger.debug('LazyLoad: Initial items loaded', {
        totalItems: items.length,
        loadedItems: initialItems.length,
        batchSize
      });
    }
  }, [items, loadedCount, batchSize, virtualized]);

  // Handle intersection for infinite scrolling
  useEffect(() => {
    if (isIntersecting && !isLoading && !error) {
      if (virtualized) {
        // For virtualized lists, trigger external load more
        if (onLoadMore && hasMore) {
          handleLoadMore();
        }
      } else {
        // For non-virtualized lists, load more from existing items
        if (loadedCount < items.length) {
          const nextBatch = Math.min(loadedCount + batchSize, items.length);
          setLoadedCount(nextBatch);
          
          logger.debug('LazyLoad: Loading more items', {
            previousCount: loadedCount,
            newCount: nextBatch,
            totalItems: items.length
          });
        } else if (onLoadMore && hasMore) {
          handleLoadMore();
        }
      }
    }
  }, [isIntersecting, isLoading, error, loadedCount, items.length, batchSize, onLoadMore, hasMore, virtualized]);

  // Handle external load more
  const handleLoadMore = useCallback(async () => {
    if (!onLoadMore || isLoading) return;

    try {
      setError(null);
      await onLoadMore();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar más elementos';
      setError(errorMessage);
      logger.error('LazyLoad: Failed to load more items', err);
    }
  }, [onLoadMore, isLoading]);

  // Memoized render function for performance
  const renderItems = useMemo(() => {
    if (virtualized) {
      return virtualScrollData.visibleItems.map((item, index) => (
        <div
          key={`item-${virtualScrollData.startIndex + index}`}
          style={{ height: itemHeight }}
          className="flex-shrink-0"
        >
          {renderItem(item, virtualScrollData.startIndex + index)}
        </div>
      ));
    }

    return visibleItems.map((item, index) => (
      <div key={`item-${index}`} className="flex-shrink-0">
        {renderItem(item, index)}
      </div>
    ));
  }, [virtualized, virtualScrollData, visibleItems, renderItem, itemHeight]);

  // Show empty state
  if (items.length === 0 && !isLoading) {
    return <div className={className}>{emptyComponent}</div>;
  }

  // Show error state
  if (error && visibleItems.length === 0) {
    return <div className={className}>{errorComponent}</div>;
  }

  return (
    <div className={`lazy-load-container ${className}`} ref={containerRef}>
      {virtualized ? (
        <div
          className="virtual-scroll-container overflow-auto"
          style={{ height: containerHeight }}
          onScroll={virtualScrollData.handleScroll}
        >
          <div
            className="virtual-scroll-content relative"
            style={{ height: virtualScrollData.totalHeight }}
          >
            <div
              className="virtual-scroll-items"
              style={{
                transform: `translateY(${virtualScrollData.offsetY}px)`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0
              }}
            >
              {renderItems}
            </div>
          </div>
        </div>
      ) : (
        <div className="lazy-load-items space-y-2">
          {renderItems}
        </div>
      )}

      {/* Load more trigger */}
      {((!virtualized && loadedCount < items.length) || (hasMore && onLoadMore)) && (
        <div
          ref={(el) => {
            loadMoreRef.current = el;
            loadMoreTargetRef.current = el;
          }}
          className="load-more-trigger"
        >
          {isLoading ? (
            loadingComponent
          ) : error ? (
            <div className="flex items-center justify-center p-4">
              <button
                onClick={handleLoadMore}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center p-4">
              <span className="text-sm text-gray-500">
                {virtualized 
                  ? 'Desplázate para cargar más...'
                  : `Mostrando ${visibleItems.length} de ${items.length} elementos`
                }
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing lazy loaded data
 */
export function useLazyLoad<T>({
  initialData = [],
  fetchMore,
  pageSize = 20
}: {
  initialData?: T[];
  fetchMore?: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean }>;
  pageSize?: number;
}) {
  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadMore = useCallback(async () => {
    if (!fetchMore || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchMore(page, pageSize);
      
      setData(prevData => [...prevData, ...result.data]);
      setHasMore(result.hasMore);
      setPage(prevPage => prevPage + 1);

      logger.debug('useLazyLoad: Loaded more data', {
        page,
        newItemsCount: result.data.length,
        totalItemsCount: data.length + result.data.length,
        hasMore: result.hasMore
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos';
      setError(errorMessage);
      logger.error('useLazyLoad: Failed to load more data', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchMore, isLoading, page, pageSize, data.length]);

  const reset = useCallback(() => {
    setData(initialData);
    setPage(1);
    setHasMore(true);
    setError(null);
    setIsLoading(false);
  }, [initialData]);

  return {
    data,
    isLoading,
    hasMore,
    error,
    loadMore,
    reset
  };
}

/**
 * Lazy loading table component for large datasets
 */
export interface LazyTableProps<T> {
  columns: Array<{
    key: keyof T;
    label: string;
    render?: (value: any, item: T, index: number) => React.ReactNode;
    width?: string;
  }>;
  data: T[];
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  isLoading?: boolean;
  className?: string;
  rowHeight?: number;
  virtualized?: boolean;
}

export function LazyTable<T>({
  columns,
  data,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  className = '',
  rowHeight = 50,
  virtualized = false
}: LazyTableProps<T>) {
  const renderRow = useCallback((item: T, index: number) => (
    <tr className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
      {columns.map((column) => (
        <td
          key={String(column.key)}
          className="px-4 py-3 text-sm"
          style={{ width: column.width }}
        >
          {column.render 
            ? column.render(item[column.key], item, index)
            : String(item[column.key] || '')
          }
        </td>
      ))}
    </tr>
  ), [columns]);

  return (
    <div className={`lazy-table-container ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          <LazyLoad
            items={data}
            renderItem={renderRow}
            itemHeight={rowHeight}
            onLoadMore={onLoadMore}
            hasMore={hasMore}
            isLoading={isLoading}
            virtualized={virtualized}
            batchSize={20}
          />
        </tbody>
      </table>
    </div>
  );
}

export default LazyLoad;