/**
 * Standardized Error Types and Error Handling System
 * 
 * This file contains all error-related types, classes, and utilities used throughout
 * the ServesPlatform application. It provides a consistent error handling approach
 * with proper classification, user-friendly messages, and debugging information.
 * 
 * Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3
 * @fileoverview Comprehensive error handling system for ServesPlatform
 * @author ServesPlatform Development Team
 * @version 2.1.0
 */

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

/**
 * Comprehensive error type classification for consistent error handling
 * Each error type has specific handling logic and user messaging
 */
export enum ErrorType {
  // Network and connectivity errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  DNS_ERROR = 'DNS_ERROR',
  
  // Authentication and authorization errors
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Validation and data errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SCHEMA_ERROR = 'SCHEMA_ERROR',
  BUSINESS_RULE_ERROR = 'BUSINESS_RULE_ERROR',
  DATA_CONFLICT = 'DATA_CONFLICT',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  
  // Rate limiting and quotas
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // Server and service errors
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
  
  // Unknown and unexpected errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Error severity levels for logging and alerting
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// =============================================================================
// ERROR INTERFACES
// =============================================================================

/**
 * Comprehensive error details interface
 * Contains all information needed for proper error handling and debugging
 */
export interface ErrorDetails {
  /** Error type classification */
  type: ErrorType;
  /** Error message for developers */
  message: string;
  /** User-friendly error message */
  userMessage: string;
  /** Error severity level */
  severity: ErrorSeverity;
  /** Whether this error can be retried */
  retryable: boolean;
  /** HTTP status code if applicable */
  status?: number;
  /** Error code for specific error identification */
  code?: string;
  /** Original error object if available */
  originalError?: Error;
  /** Additional context data */
  context?: Record<string, any>;
  /** Timestamp when the error occurred */
  timestamp: string;
  /** Unique error identifier for tracking */
  errorId: string;
  /** Suggested retry delay in milliseconds */
  retryAfter?: number;
}

/**
 * Error response format for API endpoints
 * Standardized error response structure for all API errors
 */
export interface ErrorResponse {
  /** Always false for error responses */
  ok: false;
  /** Error details */
  error: {
    /** Error type */
    type: ErrorType;
    /** Error message */
    message: string;
    /** User-friendly message */
    userMessage: string;
    /** Error code */
    code?: string;
    /** Additional error details */
    details?: any;
    /** Error timestamp */
    timestamp: string;
    /** Unique error ID */
    errorId: string;
  };
  /** HTTP status code */
  status: number;
  /** Request timestamp */
  timestamp: string;
}

// =============================================================================
// ERROR CLASSES
// =============================================================================

/**
 * Base application error class with comprehensive error information
 * All custom errors in the application should extend this class
 * 
 * @example
 * ```typescript
 * throw new AppError(
 *   ErrorType.VALIDATION_ERROR,
 *   'Invalid email format',
 *   { field: 'email', value: 'invalid-email' }
 * );
 * ```
 */
export class AppError extends Error {
  public readonly details: ErrorDetails;

  constructor(
    type: ErrorType,
    message: string,
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    
    this.details = {
      type,
      message,
      userMessage: this.generateUserMessage(type, message),
      severity: this.determineSeverity(type),
      retryable: this.isRetryable(type),
      originalError,
      context,
      timestamp: new Date().toISOString(),
      errorId: this.generateErrorId(),
      status: this.getHttpStatus(type)
    };

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Generate user-friendly error message based on error type
   */
  private generateUserMessage(type: ErrorType, message: string): string {
    const userMessages: Record<ErrorType, string> = {
      [ErrorType.NETWORK_ERROR]: 'Problema de conexión. Verifica tu conexión a internet.',
      [ErrorType.TIMEOUT_ERROR]: 'La operación tardó demasiado tiempo. Inténtalo de nuevo.',
      [ErrorType.CONNECTION_ERROR]: 'No se pudo conectar al servidor. Inténtalo más tarde.',
      [ErrorType.DNS_ERROR]: 'Error de conexión. Verifica tu conexión a internet.',
      [ErrorType.AUTHENTICATION_ERROR]: 'Credenciales inválidas. Verifica tu email y contraseña.',
      [ErrorType.AUTHORIZATION_ERROR]: 'No tienes permisos para realizar esta operación.',
      [ErrorType.SESSION_EXPIRED]: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      [ErrorType.INVALID_TOKEN]: 'Token de acceso inválido. Inicia sesión nuevamente.',
      [ErrorType.VALIDATION_ERROR]: 'Los datos ingresados no son válidos. Revisa la información.',
      [ErrorType.SCHEMA_ERROR]: 'Error en el formato de datos. Contacta al soporte técnico.',
      [ErrorType.BUSINESS_RULE_ERROR]: 'La operación no cumple con las reglas de negocio.',
      [ErrorType.DATA_CONFLICT]: 'Los datos han sido modificados por otro usuario. Actualiza la página.',
      [ErrorType.NOT_FOUND_ERROR]: 'El recurso solicitado no fue encontrado.',
      [ErrorType.CONFLICT_ERROR]: 'Conflicto con los datos existentes. Verifica la información.',
      [ErrorType.RATE_LIMIT_ERROR]: 'Demasiadas solicitudes. Espera un momento antes de intentar de nuevo.',
      [ErrorType.QUOTA_EXCEEDED]: 'Se ha excedido el límite de uso. Inténtalo más tarde.',
      [ErrorType.SERVER_ERROR]: 'Error interno del servidor. Inténtalo más tarde.',
      [ErrorType.SERVICE_UNAVAILABLE]: 'El servicio no está disponible temporalmente.',
      [ErrorType.MAINTENANCE_MODE]: 'El sistema está en mantenimiento. Inténtalo más tarde.',
      [ErrorType.UNKNOWN_ERROR]: 'Ha ocurrido un error inesperado. Contacta al soporte técnico.'
    };

    return userMessages[type] || message;
  }

  /**
   * Determine error severity based on error type
   */
  private determineSeverity(type: ErrorType): ErrorSeverity {
    const severityMap: Record<ErrorType, ErrorSeverity> = {
      [ErrorType.NETWORK_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorType.TIMEOUT_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorType.CONNECTION_ERROR]: ErrorSeverity.HIGH,
      [ErrorType.DNS_ERROR]: ErrorSeverity.HIGH,
      [ErrorType.AUTHENTICATION_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorType.AUTHORIZATION_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorType.SESSION_EXPIRED]: ErrorSeverity.LOW,
      [ErrorType.INVALID_TOKEN]: ErrorSeverity.MEDIUM,
      [ErrorType.VALIDATION_ERROR]: ErrorSeverity.LOW,
      [ErrorType.SCHEMA_ERROR]: ErrorSeverity.HIGH,
      [ErrorType.BUSINESS_RULE_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorType.DATA_CONFLICT]: ErrorSeverity.MEDIUM,
      [ErrorType.NOT_FOUND_ERROR]: ErrorSeverity.LOW,
      [ErrorType.CONFLICT_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorType.RATE_LIMIT_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorType.QUOTA_EXCEEDED]: ErrorSeverity.HIGH,
      [ErrorType.SERVER_ERROR]: ErrorSeverity.HIGH,
      [ErrorType.SERVICE_UNAVAILABLE]: ErrorSeverity.HIGH,
      [ErrorType.MAINTENANCE_MODE]: ErrorSeverity.MEDIUM,
      [ErrorType.UNKNOWN_ERROR]: ErrorSeverity.HIGH
    };

    return severityMap[type] || ErrorSeverity.MEDIUM;
  }

  /**
   * Determine if error is retryable based on error type
   */
  private isRetryable(type: ErrorType): boolean {
    const retryableErrors = [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.CONNECTION_ERROR,
      ErrorType.DNS_ERROR,
      ErrorType.RATE_LIMIT_ERROR,
      ErrorType.SERVER_ERROR,
      ErrorType.SERVICE_UNAVAILABLE
    ];

    return retryableErrors.includes(type);
  }

  /**
   * Get appropriate HTTP status code for error type
   */
  private getHttpStatus(type: ErrorType): number {
    const statusMap: Record<ErrorType, number> = {
      [ErrorType.NETWORK_ERROR]: 0,
      [ErrorType.TIMEOUT_ERROR]: 408,
      [ErrorType.CONNECTION_ERROR]: 503,
      [ErrorType.DNS_ERROR]: 503,
      [ErrorType.AUTHENTICATION_ERROR]: 401,
      [ErrorType.AUTHORIZATION_ERROR]: 403,
      [ErrorType.SESSION_EXPIRED]: 401,
      [ErrorType.INVALID_TOKEN]: 401,
      [ErrorType.VALIDATION_ERROR]: 400,
      [ErrorType.SCHEMA_ERROR]: 400,
      [ErrorType.BUSINESS_RULE_ERROR]: 422,
      [ErrorType.DATA_CONFLICT]: 409,
      [ErrorType.NOT_FOUND_ERROR]: 404,
      [ErrorType.CONFLICT_ERROR]: 409,
      [ErrorType.RATE_LIMIT_ERROR]: 429,
      [ErrorType.QUOTA_EXCEEDED]: 429,
      [ErrorType.SERVER_ERROR]: 500,
      [ErrorType.SERVICE_UNAVAILABLE]: 503,
      [ErrorType.MAINTENANCE_MODE]: 503,
      [ErrorType.UNKNOWN_ERROR]: 500
    };

    return statusMap[type] || 500;
  }

  /**
   * Generate unique error identifier
   */
  private generateErrorId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `err_${timestamp}_${random}`;
  }

  /**
   * Convert error to JSON for logging or API responses
   */
  toJSON(): ErrorDetails {
    return this.details;
  }

  /**
   * Convert error to API response format
   */
  toErrorResponse(): ErrorResponse {
    return {
      ok: false,
      error: {
        type: this.details.type,
        message: this.details.message,
        userMessage: this.details.userMessage,
        code: this.details.code,
        details: this.details.context,
        timestamp: this.details.timestamp,
        errorId: this.details.errorId
      },
      status: this.details.status || 500,
      timestamp: this.details.timestamp
    };
  }
}

// =============================================================================
// ERROR FACTORY
// =============================================================================

/**
 * Factory class for creating standardized errors
 * Provides convenient methods for creating common error types
 * 
 * @example
 * ```typescript
 * throw ErrorFactory.validation('Email is required', { field: 'email' });
 * throw ErrorFactory.notFound('User not found', { userId: '123' });
 * throw ErrorFactory.network('Connection failed');
 * ```
 */
export class ErrorFactory {
  /**
   * Create a validation error
   */
  static validation(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorType.VALIDATION_ERROR, message, context);
  }

  /**
   * Create an authentication error
   */
  static authentication(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorType.AUTHENTICATION_ERROR, message, context);
  }

  /**
   * Create an authorization error
   */
  static authorization(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorType.AUTHORIZATION_ERROR, message, context);
  }

  /**
   * Create a not found error
   */
  static notFound(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorType.NOT_FOUND_ERROR, message, context);
  }

  /**
   * Create a conflict error
   */
  static conflict(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorType.CONFLICT_ERROR, message, context);
  }

  /**
   * Create a network error
   */
  static network(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorType.NETWORK_ERROR, message, context);
  }

  /**
   * Create a timeout error
   */
  static timeout(message: string, timeoutMs?: number): AppError {
    return new AppError(ErrorType.TIMEOUT_ERROR, message, { timeoutMs });
  }

  /**
   * Create a server error
   */
  static server(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorType.SERVER_ERROR, message, context);
  }

  /**
   * Create a business rule error
   */
  static businessRule(message: string, context?: Record<string, any>): AppError {
    return new AppError(ErrorType.BUSINESS_RULE_ERROR, message, context);
  }

  /**
   * Create an error from an unknown error object
   */
  static fromUnknown(error: unknown, context?: Record<string, any>): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(ErrorType.UNKNOWN_ERROR, error.message, context, error);
    }

    const message = typeof error === 'string' ? error : 'Unknown error occurred';
    return new AppError(ErrorType.UNKNOWN_ERROR, message, context);
  }
}

// =============================================================================
// ERROR UTILITIES
// =============================================================================

/**
 * Utility functions for error handling
 */
export class ErrorUtils {
  /**
   * Check if an error is retryable
   */
  static isRetryable(error: unknown): boolean {
    if (error instanceof AppError) {
      return error.details.retryable;
    }
    return false;
  }

  /**
   * Get user-friendly message from any error
   */
  static getUserMessage(error: unknown): string {
    if (error instanceof AppError) {
      return error.details.userMessage;
    }
    
    if (error instanceof Error) {
      return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
    }

    return 'Error desconocido. Contacta al soporte técnico.';
  }

  /**
   * Get error severity
   */
  static getSeverity(error: unknown): ErrorSeverity {
    if (error instanceof AppError) {
      return error.details.severity;
    }
    return ErrorSeverity.MEDIUM;
  }

  /**
   * Convert any error to AppError
   */
  static normalize(error: unknown, context?: Record<string, any>): AppError {
    return ErrorFactory.fromUnknown(error, context);
  }

  /**
   * Check if error should be logged
   */
  static shouldLog(error: unknown): boolean {
    const severity = this.getSeverity(error);
    return severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL;
  }
}