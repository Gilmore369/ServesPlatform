/**
 * Optimized Google Sheets service for better performance
 */

import { config } from './config';
import { logger } from './logger';
import { queueRequest } from './request-queue';
import { APIResponse, EnhancedAPIResponse } from './types';

export interface OptimizedSheetsConfig {
  baseUrl: string;
  token: string;
  timeout: number;
  batchSize: number;
  cacheTimeout: number;
  compressionEnabled: boolean;
  retryAttempts: number;
}

export interface BatchRequest {
  table: string;
  operation: 'list' | 'get' | 'create' | 'update' | 'delete';
  data?: any;
  id?: string;
  filters?: Record<string, any>;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class OptimizedSheetsService {
  private config: OptimizedSheetsConfig;
  private cache = new Map<string, CacheEntry>();
  private compressionSupported = false;

  constructor(config?: Partial<OptimizedSheetsConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || '',
      token: config?.token || '',
      timeout: config?.timeout || 10000,
      batchSize: config?.batchSize || 10,
      cacheTimeout: config?.cacheTimeout || 300000, // 5 minutes
      compressionEnabled: config?.compressionEnabled || true,
      retryAttempts: config?.retryAttempts || 2,
      ...config
    };

    // Check if compression is supported
    this.checkCompressionSupport();
  }

  /**
   * Execute a single optimized request
   */
  async executeRequest<T>(
    table: string,
    operation: string,
    data?: any,
    options?: { skipCache?: boolean; priority?: number }
  ): Promise<EnhancedAPIResponse<T>> {
    const cacheKey = this.generateCacheKey(table, operation, data);
    const startTime = Date.now();

    // Check cache first (for read operations)
    if (!options?.skipCache && (operation === 'list' || operation === 'get')) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for ${cacheKey}`);
        return {
          ok: true,
          data: cached,
          status: 200,
          timestamp: new Date().toISOString(),
          metadata: {
            executionTime: Date.now() - startTime,
            cacheHit: true,
            version: '1.0'
          }
        };
      }
    }

    // Queue the request for execution
    const requestKey = `${table}-${operation}-${JSON.stringify(data)}`;
    
    try {
      const result = await queueRequest(
        requestKey,
        () => this.performRequest(table, operation, data),
        options?.priority || 0
      );

      const response: EnhancedAPIResponse<T> = {
        ok: result.ok,
        data: result.data,
        status: result.ok ? 200 : 400,
        timestamp: new Date().toISOString(),
        metadata: {
          executionTime: Date.now() - startTime,
          cacheHit: false,
          version: '1.0'
        }
      };

      // Cache successful read operations
      if (result.ok && (operation === 'list' || operation === 'get')) {
        this.setCache(cacheKey, result.data, this.config.cacheTimeout);
      }

      return response;
    } catch (error) {
      logger.error(`Request failed: ${requestKey}`, error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
        timestamp: new Date().toISOString(),
        metadata: {
          executionTime: Date.now() - startTime,
          cacheHit: false,
          version: '1.0'
        }
      };
    }
  }

  /**
   * Execute batch requests for better performance
   */
  async executeBatchRequests<T>(
    requests: BatchRequest[]
  ): Promise<EnhancedAPIResponse<T[]>> {
    const startTime = Date.now();
    const results: T[] = [];
    const errors: string[] = [];

    // Process requests in batches
    for (let i = 0; i < requests.length; i += this.config.batchSize) {
      const batch = requests.slice(i, i + this.config.batchSize);
      
      try {
        const batchPromises = batch.map(async (request) => {
          try {
            const result = await this.executeRequest<T>(
              request.table,
              request.operation,
              request.data,
              { skipCache: false, priority: 1 }
            );
            
            if (result.ok && result.data) {
              return result.data;
            } else {
              errors.push(result.message || 'Unknown error');
              return null;
            }
          } catch (error) {
            errors.push(error instanceof Error ? error.message : 'Unknown error');
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(result => result !== null));

        // Add delay between batches to avoid overwhelming the API
        if (i + this.config.batchSize < requests.length) {
          await this.delay(100);
        }
      } catch (error) {
        logger.error(`Batch processing failed for batch ${i}`, error);
        errors.push(`Batch ${i} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      ok: errors.length === 0,
      data: results,
      message: errors.length > 0 ? `${errors.length} operations failed` : undefined,
      status: errors.length === 0 ? 200 : 207, // 207 Multi-Status
      timestamp: new Date().toISOString(),
      metadata: {
        executionTime: Date.now() - startTime,
        cacheHit: false,
        version: '1.0'
      }
    };
  }

  /**
   * Optimized list operation with pagination and filtering
   */
  async optimizedList<T>(
    table: string,
    options?: {
      limit?: number;
      offset?: number;
      filters?: Record<string, any>;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      fields?: string[];
    }
  ): Promise<EnhancedAPIResponse<T[]>> {
    const requestData = {
      action: 'crud',
      table,
      operation: 'list',
      ...options
    };

    return this.executeRequest<T[]>(table, 'optimized-list', requestData, {
      priority: 1
    });
  }

  /**
   * Bulk create operation
   */
  async bulkCreate<T>(
    table: string,
    items: Partial<T>[]
  ): Promise<EnhancedAPIResponse<T[]>> {
    const requests: BatchRequest[] = items.map((item, index) => ({
      table,
      operation: 'create',
      data: item
    }));

    return this.executeBatchRequests<T>(requests);
  }

  /**
   * Bulk update operation
   */
  async bulkUpdate<T>(
    table: string,
    updates: Array<{ id: string; data: Partial<T> }>
  ): Promise<EnhancedAPIResponse<T[]>> {
    const requests: BatchRequest[] = updates.map((update) => ({
      table,
      operation: 'update',
      id: update.id,
      data: update.data
    }));

    return this.executeBatchRequests<T>(requests);
  }

  /**
   * Perform the actual HTTP request
   */
  private async performRequest(
    table: string,
    operation: string,
    data?: any
  ): Promise<APIResponse> {
    const requestData = {
      token: this.config.token,
      action: 'crud',
      table,
      operation,
      ...data
    };

    // Build URL with query parameters for GET request
    const params = new URLSearchParams();
    Object.keys(requestData).forEach(key => {
      if (requestData[key] !== undefined && requestData[key] !== null) {
        const value = typeof requestData[key] === 'object' 
          ? JSON.stringify(requestData[key]) 
          : requestData[key];
        params.append(key, value);
      }
    });

    const url = `${this.config.baseUrl}?${params.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      // Add compression headers if supported
      if (this.compressionSupported && this.config.compressionEnabled) {
        headers['Accept-Encoding'] = 'gzip, deflate';
      }

      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.message || 'API request failed');
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Cache management methods
   */
  private generateCacheKey(table: string, operation: string, data?: any): string {
    const dataHash = data ? JSON.stringify(data) : '';
    return `${table}-${operation}-${dataHash}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Clean up old cache entries periodically
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    this.cache.forEach(entry => {
      if (now - entry.timestamp <= entry.ttl) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      hitRate: validEntries / (validEntries + expiredEntries) || 0
    };
  }

  /**
   * Check if compression is supported
   */
  private checkCompressionSupport(): void {
    try {
      // Simple check for compression support
      this.compressionSupported = typeof CompressionStream !== 'undefined';
    } catch {
      this.compressionSupported = false;
    }
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<OptimizedSheetsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('OptimizedSheetsService configuration updated', newConfig);
  }

  /**
   * Get service configuration
   */
  getConfig(): OptimizedSheetsConfig {
    return { ...this.config };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create and export singleton instance
export const optimizedSheetsService = new OptimizedSheetsService({
  baseUrl: config.apiBaseUrl,
  token: config.apiToken,
  timeout: 15000,
  batchSize: 5, // Conservative for Google Apps Script
  cacheTimeout: 300000, // 5 minutes
  compressionEnabled: true,
  retryAttempts: 2
});

export default OptimizedSheetsService;