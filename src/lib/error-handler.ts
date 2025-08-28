/**
 * Enhanced Error Handler with comprehensive error classification,
 * exponential backoff retry system, and cache fallback capabilities
 */

import { cacheManager } from './cache/cache-manager';

// Enhanced Error Classification
export enum ErrorType {
  // Network-related errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  DNS_ERROR = 'DNS_ERROR',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SCHEMA_ERROR = 'SCHEMA_ERROR',
  BUSINESS_RULE_ERROR = 'BUSINESS_RULE_ERROR',
  
  // Permission errors
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  
  // Data-related errors
  DATA_CONFLICT = 'DATA_CONFLICT',
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  
  // Rate limiting and quotas
  RATE_LIMIT = 'RATE_LIMIT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // Server errors
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
  
  // Unknown/unexpected errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  originalError?: Error;
  status?: number;
  code?: string;
  retryable: boolean;
  retryAfter?: number; // seconds
  timestamp: string;
  context?: Record<string, any>;
  userMessage?: string; // User-friendly message
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean; // Add randomness to prevent thundering herd
  retryableErrors: ErrorType[];
}

export interface FallbackConfig {
  enableCacheFallback: boolean;
  cacheMaxAge: number; // seconds - max age of cached data to use as fallback
  fallbackMessage?: string;
}

export class EnhancedError extends Error {
  public readonly details: ErrorDetails;

  constructor(details: Partial<ErrorDetails> & { message: string; type: ErrorType }) {
    super(details.message);
    this.name = 'EnhancedError';
    
    this.details = {
      type: details.type,
      message: details.message,
      originalError: details.originalError,
      status: details.status,
      code: details.code,
      retryable: details.retryable ?? this.isRetryableByDefault(details.type),
      retryAfter: details.retryAfter,
      timestamp: new Date().toISOString(),
      context: details.context,
      userMessage: details.userMessage ?? this.generateUserMessage(details.type, details.message)
    };
  }

  private isRetryableByDefault(type: ErrorType): boolean {
    const retryableTypes = [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.CONNECTION_ERROR,
      ErrorType.DNS_ERROR,
      ErrorType.RATE_LIMIT,
      ErrorType.QUOTA_EXCEEDED,
      ErrorType.SERVER_ERROR,
      ErrorType.SERVICE_UNAVAILABLE
    ];
    
    return retryableTypes.includes(type);
  }

  private generateUserMessage(type: ErrorType, message: string): string {
    const userMessages: Record<ErrorType, string> = {
      [ErrorType.NETWORK_ERROR]: 'Problema de conexión. Por favor, verifica tu conexión a internet.',
      [ErrorType.TIMEOUT_ERROR]: 'La operación tardó demasiado tiempo. Inténtalo de nuevo.',
      [ErrorType.CONNECTION_ERROR]: 'No se pudo conectar al servidor. Inténtalo más tarde.',
      [ErrorType.DNS_ERROR]: 'Error de conexión. Verifica tu conexión a internet.',
      [ErrorType.VALIDATION_ERROR]: 'Los datos ingresados no son válidos. Revisa la información.',
      [ErrorType.SCHEMA_ERROR]: 'Error en el formato de datos. Contacta al soporte técnico.',
      [ErrorType.BUSINESS_RULE_ERROR]: 'La operación no cumple con las reglas de negocio.',
      [ErrorType.PERMISSION_ERROR]: 'No tienes permisos para realizar esta operación.',
      [ErrorType.AUTHENTICATION_ERROR]: 'Sesión expirada. Por favor, inicia sesión nuevamente.',
      [ErrorType.AUTHORIZATION_ERROR]: 'No tienes autorización para acceder a este recurso.',
      [ErrorType.DATA_CONFLICT]: 'Los datos han sido modificados por otro usuario. Actualiza la página.',
      [ErrorType.DATA_NOT_FOUND]: 'Los datos solicitados no fueron encontrados.',
      [ErrorType.DATA_CORRUPTION]: 'Error en los datos. Contacta al soporte técnico.',
      [ErrorType.RATE_LIMIT]: 'Demasiadas solicitudes. Espera un momento antes de intentar de nuevo.',
      [ErrorType.QUOTA_EXCEEDED]: 'Se ha excedido el límite de uso. Inténtalo más tarde.',
      [ErrorType.SERVER_ERROR]: 'Error interno del servidor. Inténtalo más tarde.',
      [ErrorType.SERVICE_UNAVAILABLE]: 'El servicio no está disponible temporalmente.',
      [ErrorType.MAINTENANCE_MODE]: 'El sistema está en mantenimiento. Inténtalo más tarde.',
      [ErrorType.UNKNOWN_ERROR]: 'Ha ocurrido un error inesperado. Contacta al soporte técnico.'
    };

    return userMessages[type] || message;
  }
}

export class ErrorClassifier {
  /**
   * Classify error based on various indicators
   */
  static classify(error: any, context?: Record<string, any>): ErrorDetails {
    // Handle already classified errors
    if (error instanceof EnhancedError) {
      return error.details;
    }

    let type: ErrorType;
    let status: number | undefined;
    let code: string | undefined;
    let retryAfter: number | undefined;
    let message = error?.message || 'Unknown error occurred';

    // Classify based on error type and properties
    if (error instanceof TypeError && error.message.includes('fetch')) {
      type = ErrorType.NETWORK_ERROR;
    } else if (error?.name === 'AbortError' || message.includes('timeout')) {
      type = ErrorType.TIMEOUT_ERROR;
    } else if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      type = ErrorType.CONNECTION_ERROR;
    } else if (error?.code === 'EAI_NODATA' || error?.code === 'ENOTFOUND') {
      type = ErrorType.DNS_ERROR;
    } else if (error?.status) {
      // HTTP status code classification
      status = error.status;
      type = this.classifyHttpStatus(status);
      
      // Extract retry-after header if present
      if (status === 429 && error?.headers?.['retry-after']) {
        retryAfter = parseInt(error.headers['retry-after'], 10);
      }
    } else if (message.includes('validation') || message.includes('invalid')) {
      type = ErrorType.VALIDATION_ERROR;
    } else if (message.includes('permission') || message.includes('forbidden')) {
      type = ErrorType.PERMISSION_ERROR;
    } else if (message.includes('not found')) {
      type = ErrorType.DATA_NOT_FOUND;
    } else if (message.includes('conflict')) {
      type = ErrorType.DATA_CONFLICT;
    } else {
      type = ErrorType.UNKNOWN_ERROR;
    }

    const enhancedError = new EnhancedError({ message, type });
    
    return {
      type,
      message,
      originalError: error,
      status,
      code: code || error?.code,
      retryable: enhancedError.details.retryable,
      retryAfter,
      timestamp: new Date().toISOString(),
      context,
      userMessage: enhancedError.details.userMessage
    };
  }

  private static classifyHttpStatus(status: number): ErrorType {
    if (status >= 200 && status < 300) {
      return ErrorType.UNKNOWN_ERROR; // Shouldn't happen for errors
    }
    
    // 4xx Client Errors
    if (status >= 400 && status < 500) {
      switch (status) {
        case 400:
          return ErrorType.VALIDATION_ERROR;
        case 401:
          return ErrorType.AUTHENTICATION_ERROR;
        case 403:
          return ErrorType.AUTHORIZATION_ERROR;
        case 404:
          return ErrorType.DATA_NOT_FOUND;
        case 408:
          return ErrorType.TIMEOUT_ERROR;
        case 409:
          return ErrorType.DATA_CONFLICT;
        case 422:
          return ErrorType.VALIDATION_ERROR;
        case 429:
          return ErrorType.RATE_LIMIT;
        default:
          return ErrorType.VALIDATION_ERROR;
      }
    }
    
    // 5xx Server Errors
    if (status >= 500) {
      switch (status) {
        case 502:
        case 503:
          return ErrorType.SERVICE_UNAVAILABLE;
        case 504:
          return ErrorType.TIMEOUT_ERROR;
        default:
          return ErrorType.SERVER_ERROR;
      }
    }

    return ErrorType.UNKNOWN_ERROR;
  }
}

export class RetryHandler {
  private defaultConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.CONNECTION_ERROR,
      ErrorType.DNS_ERROR,
      ErrorType.RATE_LIMIT,
      ErrorType.QUOTA_EXCEEDED,
      ErrorType.SERVER_ERROR,
      ErrorType.SERVICE_UNAVAILABLE
    ]
  };

  constructor(private config: Partial<RetryConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Execute operation with exponential backoff retry
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    let lastError: EnhancedError;
    const config = { ...this.defaultConfig, ...this.config };

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const errorDetails = ErrorClassifier.classify(error, {
          ...context,
          attempt,
          maxAttempts: config.maxAttempts
        });

        lastError = new EnhancedError(errorDetails);

        // Don't retry if error is not retryable or this is the last attempt
        if (!this.shouldRetry(lastError, attempt, config)) {
          throw lastError;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, config, lastError.details.retryAfter);

        console.warn(`🔄 Retry attempt ${attempt}/${config.maxAttempts} after ${delay}ms`, {
          error: lastError.details.message,
          type: lastError.details.type,
          retryable: lastError.details.retryable,
          context
        });

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private shouldRetry(error: EnhancedError, attempt: number, config: RetryConfig): boolean {
    // Don't retry if this is the last attempt
    if (attempt >= config.maxAttempts) {
      return false;
    }

    // Don't retry if error is not retryable
    if (!error.details.retryable) {
      return false;
    }

    // Check if error type is in retryable list
    return config.retryableErrors.includes(error.details.type);
  }

  private calculateDelay(attempt: number, config: RetryConfig, retryAfter?: number): number {
    // Use server-specified retry-after if available
    if (retryAfter && retryAfter > 0) {
      return Math.min(retryAfter * 1000, config.maxDelay);
    }

    // Calculate exponential backoff
    let delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }

    return Math.max(delay, 0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class FallbackHandler {
  private defaultConfig: FallbackConfig = {
    enableCacheFallback: true,
    cacheMaxAge: 3600, // 1 hour
    fallbackMessage: 'Mostrando datos almacenados localmente debido a problemas de conectividad'
  };

  constructor(private config: Partial<FallbackConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Attempt to get fallback data from cache when operation fails
   */
  async getFallbackData<T>(
    cacheKey: string,
    error: EnhancedError,
    context?: Record<string, any>
  ): Promise<{ data: T; fromCache: boolean; message?: string } | null> {
    const config = { ...this.defaultConfig, ...this.config };

    // Only use cache fallback for connectivity-related errors
    if (!this.shouldUseCacheFallback(error, config)) {
      return null;
    }

    try {
      // Try to get data from cache
      const cachedData = await cacheManager.get<T>(cacheKey);
      
      if (cachedData) {
        const cacheInfo = cacheManager.getEntryInfo(cacheKey);
        
        // Check if cached data is not too old
        if (cacheInfo.exists && cacheInfo.age !== undefined && cacheInfo.age <= config.cacheMaxAge) {
          console.log(`📦 Using cache fallback for ${cacheKey}`, {
            age: cacheInfo.age,
            maxAge: config.cacheMaxAge,
            error: error.details.type,
            context
          });

          return {
            data: cachedData,
            fromCache: true,
            message: config.fallbackMessage
          };
        } else {
          console.log(`⏰ Cache data too old for fallback: ${cacheKey}`, {
            age: cacheInfo.age,
            maxAge: config.cacheMaxAge
          });
        }
      }
    } catch (cacheError) {
      console.error('Error accessing cache for fallback:', cacheError);
    }

    return null;
  }

  private shouldUseCacheFallback(error: EnhancedError, config: FallbackConfig): boolean {
    if (!config.enableCacheFallback) {
      return false;
    }

    // Use cache fallback for connectivity-related errors
    const fallbackEligibleErrors = [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.CONNECTION_ERROR,
      ErrorType.DNS_ERROR,
      ErrorType.SERVICE_UNAVAILABLE
    ];

    return fallbackEligibleErrors.includes(error.details.type);
  }
}

/**
 * Main Error Handler that combines classification, retry, and fallback
 */
export class ErrorHandler {
  private retryHandler: RetryHandler;
  private fallbackHandler: FallbackHandler;

  constructor(
    retryConfig?: Partial<RetryConfig>,
    fallbackConfig?: Partial<FallbackConfig>
  ) {
    this.retryHandler = new RetryHandler(retryConfig);
    this.fallbackHandler = new FallbackHandler(fallbackConfig);
  }

  /**
   * Execute operation with full error handling: retry and fallback
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    cacheKey?: string,
    context?: Record<string, any>
  ): Promise<{ data: T; fromCache?: boolean; message?: string }> {
    try {
      // Try operation with retry
      const data = await this.retryHandler.executeWithRetry(operation, context);
      return { data };
    } catch (error) {
      const enhancedError = error instanceof EnhancedError 
        ? error 
        : new EnhancedError(ErrorClassifier.classify(error, context));

      // Try fallback if cache key is provided
      if (cacheKey) {
        const fallbackResult = await this.fallbackHandler.getFallbackData<T>(
          cacheKey,
          enhancedError,
          context
        );

        if (fallbackResult) {
          return fallbackResult;
        }
      }

      // No fallback available, throw the enhanced error
      throw enhancedError;
    }
  }

  /**
   * Get retry handler for advanced usage
   */
  getRetryHandler(): RetryHandler {
    return this.retryHandler;
  }

  /**
   * Get fallback handler for advanced usage
   */
  getFallbackHandler(): FallbackHandler {
    return this.fallbackHandler;
  }
}

// Export singleton instance with default configuration
export const errorHandler = new ErrorHandler();

// Export individual handlers for advanced usage
export const retryHandler = new RetryHandler();
export const fallbackHandler = new FallbackHandler();