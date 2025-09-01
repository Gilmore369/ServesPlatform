/**
 * Enhanced Error Handler
 * Provides comprehensive error handling with retry mechanisms and user-friendly messages
 */

import { logger } from './logger';

export interface ErrorContext {
  operation: string;
  table?: string;
  id?: string;
  data?: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any, attempt: number) => boolean;
}

export interface ErrorHandlingResult {
  success: boolean;
  data?: any;
  error?: EnhancedError;
  attempts: number;
  totalTime: number;
}

export class EnhancedError extends Error {
  public readonly code: string;
  public readonly type: ErrorType;
  public readonly context: ErrorContext;
  public readonly userMessage: string;
  public readonly retryable: boolean;
  public readonly timestamp: Date;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: string,
    type: ErrorType,
    context: ErrorContext,
    options: {
      userMessage?: string;
      retryable?: boolean;
      originalError?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'EnhancedError';
    this.code = code;
    this.type = type;
    this.context = context;
    this.userMessage = options.userMessage || this.getDefaultUserMessage();
    this.retryable = options.retryable ?? this.isRetryableByDefault();
    this.timestamp = new Date();
    this.originalError = options.originalError;
  }

  private getDefaultUserMessage(): string {
    switch (this.type) {
      case ErrorType.NETWORK:
        return 'Problema de conexión. Verifica tu conexión a internet e intenta nuevamente.';
      case ErrorType.VALIDATION:
        return 'Los datos ingresados no son válidos. Revisa la información e intenta nuevamente.';
      case ErrorType.AUTHENTICATION:
        return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      case ErrorType.AUTHORIZATION:
        return 'No tienes permisos para realizar esta acción.';
      case ErrorType.NOT_FOUND:
        return 'El elemento solicitado no fue encontrado.';
      case ErrorType.CONFLICT:
        return 'Conflicto con los datos existentes. Actualiza la página e intenta nuevamente.';
      case ErrorType.RATE_LIMIT:
        return 'Demasiadas solicitudes. Espera un momento e intenta nuevamente.';
      case ErrorType.SERVER:
        return 'Error interno del servidor. Intenta nuevamente en unos momentos.';
      case ErrorType.TIMEOUT:
        return 'La operación tardó demasiado tiempo. Intenta nuevamente.';
      case ErrorType.GOOGLE_SHEETS:
        return 'Error al acceder a Google Sheets. Verifica los permisos e intenta nuevamente.';
      default:
        return 'Ha ocurrido un error inesperado. Intenta nuevamente.';
    }
  }

  private isRetryableByDefault(): boolean {
    return [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.RATE_LIMIT,
      ErrorType.SERVER,
      ErrorType.GOOGLE_SHEETS
    ].includes(this.type);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      type: this.type,
      context: this.context,
      userMessage: this.userMessage,
      retryable: this.retryable,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER = 'SERVER',
  TIMEOUT = 'TIMEOUT',
  GOOGLE_SHEETS = 'GOOGLE_SHEETS',
  UNKNOWN = 'UNKNOWN'
}

export class EnhancedErrorHandler {
  private static instance: EnhancedErrorHandler;
  private errorListeners: Array<(error: EnhancedError) => void> = [];

  private constructor() {}

  public static getInstance(): EnhancedErrorHandler {
    if (!EnhancedErrorHandler.instance) {
      EnhancedErrorHandler.instance = new EnhancedErrorHandler();
    }
    return EnhancedErrorHandler.instance;
  }

  /**
   * Add error listener for global error handling
   */
  public addErrorListener(listener: (error: EnhancedError) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   */
  public removeErrorListener(listener: (error: EnhancedError) => void): void {
    this.errorListeners = this.errorListeners.filter(l => l !== listener);
  }

  /**
   * Classify and enhance an error
   */
  public classifyError(error: any, context: ErrorContext): EnhancedError {
    let errorType = ErrorType.UNKNOWN;
    let code = 'UNKNOWN_ERROR';
    let userMessage: string | undefined;
    let retryable = false;

    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorType = ErrorType.NETWORK;
      code = 'NETWORK_ERROR';
      retryable = true;
    }
    // Timeout errors
    else if (error.name === 'AbortError' || error.message.includes('timeout')) {
      errorType = ErrorType.TIMEOUT;
      code = 'TIMEOUT_ERROR';
      retryable = true;
    }
    // HTTP status errors
    else if (error.status) {
      switch (Math.floor(error.status / 100)) {
        case 4:
          if (error.status === 401) {
            errorType = ErrorType.AUTHENTICATION;
            code = 'AUTH_ERROR';
          } else if (error.status === 403) {
            errorType = ErrorType.AUTHORIZATION;
            code = 'FORBIDDEN_ERROR';
          } else if (error.status === 404) {
            errorType = ErrorType.NOT_FOUND;
            code = 'NOT_FOUND_ERROR';
          } else if (error.status === 409) {
            errorType = ErrorType.CONFLICT;
            code = 'CONFLICT_ERROR';
            retryable = true;
          } else if (error.status === 422) {
            errorType = ErrorType.VALIDATION;
            code = 'VALIDATION_ERROR';
          } else if (error.status === 429) {
            errorType = ErrorType.RATE_LIMIT;
            code = 'RATE_LIMIT_ERROR';
            retryable = true;
          }
          break;
        case 5:
          errorType = ErrorType.SERVER;
          code = 'SERVER_ERROR';
          retryable = true;
          break;
      }
    }
    // Google Sheets specific errors
    else if (error.message?.includes('Google Sheets') || error.message?.includes('spreadsheet')) {
      errorType = ErrorType.GOOGLE_SHEETS;
      code = 'GOOGLE_SHEETS_ERROR';
      retryable = true;
    }
    // Validation errors
    else if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      errorType = ErrorType.VALIDATION;
      code = 'VALIDATION_ERROR';
    }

    const enhancedError = new EnhancedError(
      error.message || 'Unknown error occurred',
      code,
      errorType,
      context,
      {
        userMessage,
        retryable,
        originalError: error
      }
    );

    // Log the error
    logger.error('Enhanced error classified', {
      error: enhancedError.toJSON(),
      originalError: error
    });

    // Notify listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(enhancedError);
      } catch (listenerError) {
        logger.error('Error in error listener', listenerError);
      }
    });

    return enhancedError;
  }

  /**
   * Execute operation with retry logic
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<ErrorHandlingResult> {
    const config: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryCondition: (error, attempt) => {
        const enhancedError = this.classifyError(error, context);
        return enhancedError.retryable && attempt < config.maxAttempts;
      },
      ...retryConfig
    };

    const startTime = Date.now();
    let lastError: EnhancedError | undefined;
    let attempts = 0;

    while (attempts < config.maxAttempts) {
      attempts++;
      
      try {
        logger.info(`Executing operation attempt ${attempts}/${config.maxAttempts}`, {
          operation: context.operation,
          table: context.table,
          attempt: attempts
        });

        const result = await operation();
        
        const totalTime = Date.now() - startTime;
        
        logger.info(`Operation succeeded on attempt ${attempts}`, {
          operation: context.operation,
          attempts,
          totalTime
        });

        return {
          success: true,
          data: result,
          attempts,
          totalTime
        };

      } catch (error) {
        lastError = this.classifyError(error, {
          ...context,
          timestamp: new Date()
        });

        logger.warn(`Operation failed on attempt ${attempts}`, {
          operation: context.operation,
          attempt: attempts,
          error: lastError.toJSON()
        });

        // Check if we should retry
        if (attempts < config.maxAttempts && config.retryCondition!(error, attempts)) {
          // Calculate delay with exponential backoff
          const delay = Math.min(
            config.baseDelay * Math.pow(config.backoffMultiplier, attempts - 1),
            config.maxDelay
          );

          logger.info(`Retrying operation in ${delay}ms`, {
            operation: context.operation,
            attempt: attempts,
            nextAttempt: attempts + 1,
            delay
          });

          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }

    const totalTime = Date.now() - startTime;

    logger.error(`Operation failed after ${attempts} attempts`, {
      operation: context.operation,
      attempts,
      totalTime,
      error: lastError?.toJSON()
    });

    return {
      success: false,
      error: lastError,
      attempts,
      totalTime
    };
  }

  /**
   * Handle Google Sheets specific errors
   */
  public handleGoogleSheetsError(error: any, context: ErrorContext): EnhancedError {
    let code = 'GOOGLE_SHEETS_ERROR';
    let userMessage = 'Error al acceder a Google Sheets.';

    if (error.message?.includes('permission')) {
      code = 'GOOGLE_SHEETS_PERMISSION_ERROR';
      userMessage = 'No tienes permisos para acceder a esta hoja de cálculo.';
    } else if (error.message?.includes('not found')) {
      code = 'GOOGLE_SHEETS_NOT_FOUND_ERROR';
      userMessage = 'La hoja de cálculo no fue encontrada.';
    } else if (error.message?.includes('quota')) {
      code = 'GOOGLE_SHEETS_QUOTA_ERROR';
      userMessage = 'Se ha excedido la cuota de Google Sheets. Intenta más tarde.';
    } else if (error.message?.includes('rate limit')) {
      code = 'GOOGLE_SHEETS_RATE_LIMIT_ERROR';
      userMessage = 'Demasiadas solicitudes a Google Sheets. Espera un momento.';
    }

    return new EnhancedError(
      error.message || 'Google Sheets error',
      code,
      ErrorType.GOOGLE_SHEETS,
      context,
      {
        userMessage,
        retryable: true,
        originalError: error
      }
    );
  }

  /**
   * Create user-friendly error messages for different contexts
   */
  public getUserFriendlyMessage(error: EnhancedError, context?: string): string {
    let baseMessage = error.userMessage;

    if (context) {
      switch (context) {
        case 'create':
          baseMessage = baseMessage.replace('realizar esta acción', 'crear este elemento');
          break;
        case 'update':
          baseMessage = baseMessage.replace('realizar esta acción', 'actualizar este elemento');
          break;
        case 'delete':
          baseMessage = baseMessage.replace('realizar esta acción', 'eliminar este elemento');
          break;
        case 'load':
          baseMessage = baseMessage.replace('realizar esta acción', 'cargar los datos');
          break;
      }
    }

    // Add retry suggestion for retryable errors
    if (error.retryable) {
      baseMessage += ' Puedes intentar nuevamente.';
    }

    return baseMessage;
  }
}

// Export singleton instance
export const enhancedErrorHandler = EnhancedErrorHandler.getInstance();