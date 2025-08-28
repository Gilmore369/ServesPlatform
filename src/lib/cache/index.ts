/**
 * Intelligent Cache System for Google Sheets Integration
 * 
 * This module provides:
 * - Server-side caching with TTL strategies differentiated by data type
 * - Client-side SWR integration with automatic revalidation
 * - Cache invalidation system based on write operations
 * - Performance monitoring and statistics
 */

// Core cache manager
export {
  CacheManager,
  cacheManager,
  type CacheConfig,
  type CacheEntry,
  type CacheStats,
  type DataType,
  TTL_CONFIG,
  INVALIDATION_PATTERNS
} from './cache-manager';

// SWR integration
export {
  useCRUDOperation,
  useList,
  useRecord,
  CacheMutator,
  CacheUtils,
  type SWRCacheConfig
} from './swr-integration';

// Re-export SWR types for convenience
export type { SWRResponse, SWRConfiguration } from 'swr';