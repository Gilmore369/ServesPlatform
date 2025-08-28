import { config } from './config';
import { JWTManager } from './jwt';
import { cacheManager } from './cache/cache-manager';
import { 
  ErrorHandler, 
  EnhancedError, 
  ErrorType, 
  ErrorClassifier,
  RetryConfig,
  FallbackConfig 
} from './error-handler';
import { trackAPIOperation, trackError } from './monitoring';
import { logger } from './logger';
import { auditLogger, AuditEventType } from './audit-logger';
import { 
  compressionService, 
  compressAPIResponse, 
  decompressAPIResponse 
} from './compression';
import { 
  queryOptimizer, 
  queryPerformanceMonitor, 
  QueryStats 
} from './query-optimizer';

// Enhanced API Service Configuration
export interface APIServiceConfig {
  baseUrl: string;
  token: string;
  timeout: number;
  retryAttempts: number;
  cacheEnabled: boolean;
  retryDelay: number;
  maxRetryDelay: number;
  backoffMultiplier: number;
}

// CRUD Operation Interface
export interface CRUDOperation {
  table: string;
  operation: 'list' | 'get' | 'create' | 'update' | 'delete';
  data?: any;
  filters?: Record<string, any>;
  pagination?: { page: number; limit: number };
  id?: string;
}

// Enhanced API Response Interface
export interface EnhancedAPIResponse<T = any> {
  ok: boolean;
  data?: T;
  message?: string;
  status: number;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
  metadata?: {
    executionTime: number;
    cacheHit: boolean;
    version: string;
  };
}

// Re-export enhanced error types and configurations for backward compatibility
export { 
  ErrorType, 
  EnhancedError as GoogleSheetsAPIError
} from './error-handler';

// Re-export interfaces separately to avoid TypeScript issues
export type { RetryConfig, FallbackConfig } from './error-handler';

export interface APIError {
  type: ErrorType;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: string;
  status?: number;
}

// Request Options
export interface RequestOptions {
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
  requireAuth?: boolean;
  skipCache?: boolean;
}

/**
 * Enhanced Google Sheets API Service with optimized CRUD operations,
 * timeout handling, retry logic, and comprehensive error management
 */
export class GoogleSheetsAPIService {
  private config: APIServiceConfig;
  private errorHandler: ErrorHandler;

  constructor(customConfig?: Partial<APIServiceConfig>) {
    this.config = {
      baseUrl: config.apiBaseUrl,
      token: config.apiToken,
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      cacheEnabled: true,
      retryDelay: 1000, // 1 second
      maxRetryDelay: 10000, // 10 seconds
      backoffMultiplier: 2,
      ...customConfig
    };

    // Initialize enhanced error handler with configuration
    const retryConfig: Partial<RetryConfig> = {
      maxAttempts: this.config.retryAttempts,
      initialDelay: this.config.retryDelay,
      maxDelay: this.config.maxRetryDelay,
      backoffMultiplier: this.config.backoffMultiplier,
      jitter: true
    };

    const fallbackConfig: Partial<FallbackConfig> = {
      enableCacheFallback: this.config.cacheEnabled,
      cacheMaxAge: 3600, // 1 hour max age for fallback data
      fallbackMessage: 'Mostrando datos almacenados debido a problemas de conectividad'
    };

    this.errorHandler = new ErrorHandler(retryConfig, fallbackConfig);
  }

  /**
   * Execute a single CRUD operation with enhanced error handling, retry logic, and cache fallback
   * Implements intelligent caching, query optimization, and comprehensive monitoring
   */
  async executeOperation<T>(
    operation: CRUDOperation,
    options: RequestOptions = {}
  ): Promise<EnhancedAPIResponse<T>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(operation);
    const endpoint = `${operation.table}/${operation.operation}`;
    
    // Apply query optimizations
    const datasetSize = await this.estimateDatasetSize(operation.table);
    const filterComplexity = this.calculateFilterComplexity(operation.filters);
    const optimizedQuery = queryOptimizer.optimizeQuery(operation, datasetSize, filterComplexity);
    
    logger.info(`Starting optimized API operation: ${operation.operation} ${operation.table}`, {
      operation: operation.operation,
      table: operation.table,
      hasFilters: !!operation.filters,
      hasPagination: !!operation.pagination,
      cacheEnabled: this.config.cacheEnabled && !options.skipCache,
      optimizations: optimizedQuery.optimization,
      estimatedCost: optimizedQuery.estimatedCost
    });
    
    // Try cache first for read operations (unless explicitly skipped)
    if (this.config.cacheEnabled && !options.skipCache && this.isReadOperation(operation)) {
      const cachedData = await cacheManager.get<T>(cacheKey);
      if (cachedData) {
        const duration = Date.now() - startTime;
        
        // Track cache hit
        trackAPIOperation(endpoint, operation.operation.toUpperCase(), 200, duration, {
          cacheHit: true,
          context: { table: operation.table }
        });
        
        logger.debug(`Cache hit for ${operation.operation} ${operation.table}`, {
          cacheKey,
          duration
        });
        
        return {
          ok: true,
          data: cachedData,
          status: 200,
          timestamp: new Date().toISOString(),
          metadata: {
            executionTime: duration,
            cacheHit: true,
            version: config.appVersion
          }
        };
      }
    }
    
    try {
      // Use enhanced error handler with retry and fallback
      const result = await this.errorHandler.executeWithErrorHandling(
        () => this.performOptimizedRequest<T>(optimizedQuery, options),
        this.isReadOperation(operation) ? cacheKey : undefined,
        {
          operation: operation.operation,
          table: operation.table,
          id: operation.id,
          hasFilters: !!operation.filters,
          hasPagination: !!operation.pagination
        }
      );

      let response: EnhancedAPIResponse<T>;

      const duration = Date.now() - startTime;

      if (result.fromCache) {
        // Return cached data with appropriate metadata
        response = {
          ok: true,
          data: result.data,
          status: 200,
          message: result.message,
          timestamp: new Date().toISOString(),
          metadata: {
            executionTime: duration,
            cacheHit: true,
            version: config.appVersion
          }
        };
        
        // Track fallback cache usage
        trackAPIOperation(endpoint, operation.operation.toUpperCase(), 200, duration, {
          cacheHit: true,
          context: { table: operation.table, fallback: true }
        });
        
        logger.info(`Fallback cache used for ${operation.operation} ${operation.table}`, {
          duration,
          message: result.message
        });
      } else {
        // Normal response from API
        response = result.data as EnhancedAPIResponse<T>;
        
        // Cache successful read operations
        if (this.config.cacheEnabled && response.ok && this.isReadOperation(operation) && response.data) {
          await cacheManager.set(cacheKey, response.data);
          logger.debug(`Data cached for ${operation.operation} ${operation.table}`, { cacheKey });
        }

        // Invalidate cache for write operations
        if (response.ok && this.isWriteOperation(operation)) {
          await cacheManager.invalidateByOperation(operation.table, operation.operation as any);
          logger.debug(`Cache invalidated for ${operation.table} after ${operation.operation}`);
        }

        // Add execution metadata
        response.metadata = {
          ...response.metadata,
          executionTime: duration,
          cacheHit: false,
          version: config.appVersion
        };
        
        // Track successful API operation
        trackAPIOperation(endpoint, operation.operation.toUpperCase(), response.status, duration, {
          cacheHit: false,
          context: { table: operation.table }
        });
        
        logger.info(`API operation completed: ${operation.operation} ${operation.table}`, {
          status: response.status,
          duration,
          success: response.ok
        });

        // Record query performance statistics
        const queryStats: QueryStats = {
          totalRecords: response.data?.pagination?.total_records || 0,
          filteredRecords: response.data?.pagination?.filtered_records || 0,
          executionTime: duration,
          cacheHit: false,
          optimizationsApplied: optimizedQuery.reasoning
        };
        queryPerformanceMonitor.recordQueryStats(operation, queryStats);
        
        // Log audit event for data operations
        if (this.isWriteOperation(operation)) {
          const auditEventType = this.getAuditEventType(operation.operation);
          auditLogger.logDataOperation(
            operation.operation as any,
            operation.table,
            operation.id,
            undefined, // userId would be extracted from request context
            operation.operation === 'update' ? {
              before: operation.data?.originalData,
              after: operation.data,
              fields: operation.data ? Object.keys(operation.data) : []
            } : undefined,
            response.ok ? 'success' : 'failure',
            {
              duration,
              status: response.status,
              hasFilters: !!operation.filters,
              hasPagination: !!operation.pagination
            }
          );
        }
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Convert enhanced errors back to the expected format for backward compatibility
      if (error instanceof EnhancedError) {
        const apiError: EnhancedAPIResponse<T> = {
          ok: false,
          message: error.details.userMessage || error.details.message,
          status: error.details.status || 0,
          timestamp: error.details.timestamp,
          metadata: {
            executionTime: duration,
            cacheHit: false,
            version: config.appVersion,
            errorType: error.details.type,
            retryable: error.details.retryable
          }
        };
        
        // Track API error
        trackAPIOperation(endpoint, operation.operation.toUpperCase(), error.details.status || 500, duration, {
          cacheHit: false,
          error: error.details.message,
          context: { table: operation.table, errorType: error.details.type }
        });
        
        // Log API error
        logger.error(`API operation failed: ${operation.operation} ${operation.table}`, error, {
          duration,
          status: error.details.status,
          retryable: error.details.retryable
        });
        
        // Track error for monitoring
        trackError(error, {
          operation: operation.operation,
          table: operation.table,
          endpoint,
          duration
        });
        
        // For API errors, we return the error response instead of throwing
        return apiError;
      }
      
      // Wrap unexpected errors
      const wrappedError = new EnhancedError({
        message: `Unexpected error during operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: ErrorType.UNKNOWN_ERROR,
        originalError: error instanceof Error ? error : undefined
      });
      
      // Track unexpected error
      trackAPIOperation(endpoint, operation.operation.toUpperCase(), 500, duration, {
        cacheHit: false,
        error: wrappedError.details.message,
        context: { table: operation.table, errorType: 'UNKNOWN_ERROR' }
      });
      
      logger.error(`Unexpected error in API operation: ${operation.operation} ${operation.table}`, 
        error instanceof Error ? error : new Error(String(error)), {
        duration,
        operation: operation.operation,
        table: operation.table
      });
      
      trackError(wrappedError, {
        operation: operation.operation,
        table: operation.table,
        endpoint,
        duration
      });
      
      throw wrappedError;
    }
  }

  /**
   * Execute multiple operations in batch with enhanced error handling
   */
  async batchOperations<T>(
    operations: CRUDOperation[],
    options: RequestOptions = {}
  ): Promise<EnhancedAPIResponse<T>[]> {
    const batchPromises = operations.map((operation, index) => 
      this.executeOperation<T>(operation, options).catch(error => {
        // For batch operations, capture individual failures
        console.warn(`Batch operation ${index} failed:`, {
          operation: operation.operation,
          table: operation.table,
          error: error instanceof EnhancedError ? error.details : error
        });
        
        // Return error response instead of throwing
        return {
          ok: false,
          message: error instanceof EnhancedError ? error.details.userMessage : 'Operation failed',
          status: error instanceof EnhancedError ? error.details.status || 0 : 0,
          timestamp: new Date().toISOString(),
          metadata: {
            executionTime: 0,
            cacheHit: false,
            version: config.appVersion,
            batchIndex: index,
            errorType: error instanceof EnhancedError ? error.details.type : ErrorType.UNKNOWN_ERROR
          }
        } as EnhancedAPIResponse<T>;
      })
    );

    return await Promise.all(batchPromises);
  }

  /**
   * Validate connection to Google Sheets API
   */
  async validateConnection(): Promise<boolean> {
    try {
      const testOperation: CRUDOperation = {
        table: 'Usuarios',
        operation: 'list',
        pagination: { page: 1, limit: 1 }
      };

      const response = await this.executeOperation(testOperation, {
        timeout: 10000, // Shorter timeout for connection test
        retryConfig: { maxAttempts: 1 }
      });

      return response.ok;
    } catch (error) {
      console.error('Connection validation failed:', error);
      return false;
    }
  }

  /**
   * Perform optimized HTTP request with compression and query optimization
   */
  private async performOptimizedRequest<T>(
    optimizedQuery: any,
    options: RequestOptions
  ): Promise<EnhancedAPIResponse<T>> {
    const operation = optimizedQuery.operation;
    const optimization = optimizedQuery.optimization;
    
    // Build optimized parameters
    const optimizedParams = queryOptimizer.buildOptimizedParams(operation, optimization);
    
    // Perform the request with optimizations
    const response = await this.performRequest<T>(operation, options, optimizedParams);
    
    // Apply compression for large responses
    if (response.ok && response.data) {
      const compressionResult = await compressAPIResponse(response.data);
      
      if (compressionResult.compressed) {
        logger.debug('Response compressed', {
          originalSize: compressionResult.metadata.originalSize,
          compressedSize: compressionResult.metadata.compressedSize,
          compressionRatio: compressionResult.metadata.compressionRatio
        });
        
        // Store compression metadata
        response.metadata = {
          ...response.metadata,
          compressed: true,
          compressionRatio: compressionResult.metadata.compressionRatio,
          originalSize: compressionResult.metadata.originalSize
        };
      }
    }
    
    return response;
  }

  /**
   * Perform the actual HTTP request with enhanced error classification
   */
  private async performRequest<T>(
    operation: CRUDOperation,
    options: RequestOptions,
    optimizedParams?: Record<string, any>
  ): Promise<EnhancedAPIResponse<T>> {
    const timeout = options.timeout || this.config.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Build request data with optimizations
      const requestData: any = {
        token: this.config.token,
        action: 'crud',
        table: operation.table,
        operation: operation.operation,
        ...operation.data,
        ...optimizedParams
      };

      // Add operation-specific parameters
      if (operation.id) requestData.id = operation.id;
      if (operation.filters) requestData.filters = JSON.stringify(operation.filters);
      if (operation.pagination) {
        requestData.page = operation.pagination.page;
        requestData.limit = operation.pagination.limit;
      }

      // Add JWT token if authentication is required
      if (options.requireAuth !== false) {
        const token = JWTManager.getToken();
        if (token) {
          requestData.jwt = token;
        }
      }

      // Build URL with query parameters (Google Apps Script requirement)
      const params = new URLSearchParams();
      Object.keys(requestData).forEach(key => {
        if (requestData[key] !== undefined && requestData[key] !== null) {
          params.append(
            key, 
            typeof requestData[key] === 'object' 
              ? JSON.stringify(requestData[key]) 
              : requestData[key]
          );
        }
      });

      const url = `${this.config.baseUrl}?${params.toString()}`;
      
      console.log(`🔗 GoogleSheetsAPIService: ${operation.operation.toUpperCase()} ${operation.table}`, {
        url: url.substring(0, 100) + '...', // Log truncated URL for security
        operation: operation.operation,
        table: operation.table
      });

      // Perform request with timeout
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      // Parse and validate response
      const result = await this.parseResponse<T>(response, operation);
      
      console.log(`📡 GoogleSheetsAPIService: Response received`, {
        status: response.status,
        ok: result.ok,
        operation: operation.operation,
        table: operation.table
      });

      return result;

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Use enhanced error classification
      const context = {
        operation: operation.operation,
        table: operation.table,
        timeout,
        url: this.config.baseUrl
      };

      const errorDetails = ErrorClassifier.classify(error, context);
      throw new EnhancedError(errorDetails);
    }
  }

  /**
   * Parse and validate API response with enhanced error handling
   */
  private async parseResponse<T>(
    response: Response,
    operation: CRUDOperation
  ): Promise<EnhancedAPIResponse<T>> {
    let data: any;
    
    try {
      data = await response.json();
    } catch (parseError) {
      throw new EnhancedError({
        message: 'Invalid JSON response from server',
        type: ErrorType.SERVER_ERROR,
        status: response.status,
        originalError: parseError instanceof Error ? parseError : undefined,
        context: {
          operation: operation.operation,
          table: operation.table,
          responseStatus: response.status
        }
      });
    }

    // Handle HTTP error status codes
    if (!response.ok) {
      const context = {
        operation: operation.operation,
        table: operation.table,
        responseData: data
      };

      const errorDetails = ErrorClassifier.classify({
        status: response.status,
        message: data.message || `HTTP ${response.status}: ${response.statusText}`,
        headers: Object.fromEntries(response.headers.entries())
      }, context);

      throw new EnhancedError(errorDetails);
    }

    // Handle API-level errors
    if (!data.ok) {
      throw new EnhancedError({
        message: data.message || 'API request failed',
        type: ErrorType.SERVER_ERROR,
        status: response.status,
        context: {
          operation: operation.operation,
          table: operation.table,
          apiResponse: data
        }
      });
    }

    // Return enhanced response format
    return {
      ok: true,
      data: data.data || data,
      message: data.message,
      status: response.status,
      timestamp: new Date().toISOString(),
      pagination: data.pagination,
      metadata: {
        executionTime: 0, // Will be set by caller
        cacheHit: false,
        version: config.appVersion
      }
    };
  }



  /**
   * Get current configuration
   */
  getConfig(): APIServiceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration and reinitialize error handler if needed
   */
  updateConfig(updates: Partial<APIServiceConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Reinitialize error handler if retry-related settings changed
    if (updates.retryAttempts !== undefined || 
        updates.retryDelay !== undefined || 
        updates.maxRetryDelay !== undefined || 
        updates.backoffMultiplier !== undefined ||
        updates.cacheEnabled !== undefined) {
      
      const retryConfig: Partial<RetryConfig> = {
        maxAttempts: this.config.retryAttempts,
        initialDelay: this.config.retryDelay,
        maxDelay: this.config.maxRetryDelay,
        backoffMultiplier: this.config.backoffMultiplier,
        jitter: true
      };

      const fallbackConfig: Partial<FallbackConfig> = {
        enableCacheFallback: this.config.cacheEnabled,
        cacheMaxAge: 3600,
        fallbackMessage: 'Mostrando datos almacenados debido a problemas de conectividad'
      };

      this.errorHandler = new ErrorHandler(retryConfig, fallbackConfig);
    }
  }

  /**
   * Generate cache key for operation
   */
  private generateCacheKey(operation: CRUDOperation): string {
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
   * Check if operation is a read operation
   */
  private isReadOperation(operation: CRUDOperation): boolean {
    return operation.operation === 'list' || operation.operation === 'get';
  }

  /**
   * Check if operation is a write operation
   */
  private isWriteOperation(operation: CRUDOperation): boolean {
    return operation.operation === 'create' || 
           operation.operation === 'update' || 
           operation.operation === 'delete';
  }

  /**
   * Get audit event type for operation
   */
  private getAuditEventType(operation: string): AuditEventType {
    switch (operation) {
      case 'create':
        return AuditEventType.CREATE;
      case 'update':
        return AuditEventType.UPDATE;
      case 'delete':
        return AuditEventType.DELETE;
      case 'list':
      case 'get':
        return AuditEventType.READ;
      default:
        return AuditEventType.READ;
    }
  }

  /**
   * Estimate dataset size for optimization decisions
   */
  private async estimateDatasetSize(table: string): Promise<number> {
    try {
      // Try to get cached size estimate
      const cacheKey = `dataset_size:${table}`;
      const cachedSize = await cacheManager.get<number>(cacheKey);
      
      if (cachedSize !== null) {
        return cachedSize;
      }

      // Perform a count operation to estimate size
      const countOperation: CRUDOperation = {
        table,
        operation: 'count' as any
      };

      const response = await this.performRequest(countOperation, { timeout: 5000 });
      const size = response.data?.count || 0;

      // Cache the size estimate for 10 minutes
      await cacheManager.set(cacheKey, size, 600);
      
      return size;
    } catch (error) {
      logger.warn(`Failed to estimate dataset size for ${table}`, error);
      return 0; // Conservative estimate
    }
  }

  /**
   * Calculate filter complexity for optimization decisions
   */
  private calculateFilterComplexity(filters?: Record<string, any>): number {
    if (!filters) return 0;

    let complexity = 0;
    
    Object.values(filters).forEach(filterValue => {
      if (typeof filterValue === 'object' && filterValue !== null) {
        // Complex filter objects (ranges, arrays, etc.)
        complexity += 2;
      } else {
        // Simple equality filters
        complexity += 1;
      }
    });

    return complexity;
  }
}

// Export singleton instance
export const googleSheetsAPIService = new GoogleSheetsAPIService();