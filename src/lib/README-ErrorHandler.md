# Enhanced Error Handler Implementation

This document describes the implementation of task 4: "Mejorar manejo de errores y reintentos" (Improve error handling and retries).

## Overview

The enhanced error handling system provides comprehensive error classification, exponential backoff retry logic, and intelligent cache fallback capabilities for the Google Sheets API integration.

## Key Features Implemented

### 1. Error Classification by Type

The system classifies errors into specific categories for better handling:

```typescript
enum ErrorType {
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
```

**Benefits:**
- Precise error handling based on error type
- User-friendly error messages in Spanish
- Automatic determination of retry eligibility
- Better debugging and monitoring capabilities

### 2. Exponential Backoff Retry System

The retry system implements sophisticated retry logic with:

```typescript
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean; // Add randomness to prevent thundering herd
  retryableErrors: ErrorType[];
}
```

**Features:**
- **Exponential Backoff**: Delays increase exponentially (1s, 2s, 4s, 8s...)
- **Jitter**: Random variation to prevent thundering herd problems
- **Server-Specified Delays**: Respects `Retry-After` headers from rate limiting
- **Maximum Delay Cap**: Prevents excessively long delays
- **Selective Retries**: Only retries appropriate error types

**Example Usage:**
```typescript
const retryHandler = new RetryHandler({
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true
});

const result = await retryHandler.executeWithRetry(async () => {
  // Your API operation here
  return await apiCall();
});
```

### 3. Cache Fallback for Connectivity Errors

When network connectivity fails, the system automatically falls back to cached data:

```typescript
interface FallbackConfig {
  enableCacheFallback: boolean;
  cacheMaxAge: number; // seconds - max age of cached data to use as fallback
  fallbackMessage?: string;
}
```

**Features:**
- **Automatic Fallback**: Seamlessly switches to cached data on connectivity errors
- **Age Validation**: Only uses cached data within acceptable age limits
- **User Notification**: Informs users when showing cached data
- **Selective Activation**: Only activates for connectivity-related errors

**Eligible Error Types for Cache Fallback:**
- `NETWORK_ERROR`
- `TIMEOUT_ERROR`
- `CONNECTION_ERROR`
- `DNS_ERROR`
- `SERVICE_UNAVAILABLE`

### 4. Integration with Google Sheets API Service

The error handler is fully integrated with the existing Google Sheets API service:

```typescript
// Enhanced API service with error handling
const apiService = new GoogleSheetsAPIService({
  retryAttempts: 3,
  retryDelay: 1000,
  maxRetryDelay: 30000,
  backoffMultiplier: 2,
  cacheEnabled: true
});

// Automatic error handling, retry, and fallback
const result = await apiService.executeOperation({
  table: 'Proyectos',
  operation: 'list'
});
```

## Error Flow

1. **Operation Execution**: API operation is attempted
2. **Error Classification**: Any errors are classified by type
3. **Retry Decision**: System determines if error is retryable
4. **Retry with Backoff**: If retryable, operation is retried with exponential backoff
5. **Cache Fallback**: If all retries fail and it's a connectivity error, try cache fallback
6. **Final Response**: Return success, cached data, or enhanced error

## User-Friendly Error Messages

All errors include user-friendly messages in Spanish:

```typescript
const userMessages: Record<ErrorType, string> = {
  [ErrorType.NETWORK_ERROR]: 'Problema de conexión. Por favor, verifica tu conexión a internet.',
  [ErrorType.TIMEOUT_ERROR]: 'La operación tardó demasiado tiempo. Inténtalo de nuevo.',
  [ErrorType.VALIDATION_ERROR]: 'Los datos ingresados no son válidos. Revisa la información.',
  [ErrorType.AUTHENTICATION_ERROR]: 'Sesión expirada. Por favor, inicia sesión nuevamente.',
  // ... more messages
};
```

## Configuration Examples

### Basic Configuration
```typescript
const errorHandler = new ErrorHandler();
// Uses default settings: 3 retries, 1s initial delay, cache fallback enabled
```

### Custom Configuration
```typescript
const errorHandler = new ErrorHandler(
  {
    maxAttempts: 5,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 1.5,
    jitter: true
  },
  {
    enableCacheFallback: true,
    cacheMaxAge: 7200, // 2 hours
    fallbackMessage: 'Mostrando datos almacenados debido a problemas de conectividad'
  }
);
```

## Monitoring and Debugging

The system provides comprehensive logging and metadata:

```typescript
interface EnhancedAPIResponse<T> {
  ok: boolean;
  data?: T;
  message?: string;
  status: number;
  timestamp: string;
  metadata?: {
    executionTime: number;
    cacheHit: boolean;
    version: string;
    errorType?: ErrorType;
    retryable?: boolean;
  };
}
```

## Testing

Comprehensive tests cover:
- Error classification accuracy
- Retry logic with various scenarios
- Cache fallback behavior
- Integration with API service
- Edge cases and error conditions

Run tests with:
```bash
npm test -- error-handler
```

## Performance Impact

The enhanced error handling system is designed for minimal performance impact:

- **Lazy Initialization**: Error handlers are created only when needed
- **Efficient Caching**: Smart cache invalidation and TTL management
- **Optimized Retries**: Intelligent retry decisions prevent unnecessary attempts
- **Minimal Overhead**: Error classification is fast and lightweight

## Backward Compatibility

The implementation maintains full backward compatibility:
- Existing API client methods work unchanged
- Error responses follow the same format
- Configuration options are additive
- Legacy error handling still functions

## Requirements Satisfied

This implementation satisfies the requirements from task 4:

✅ **Implementar clasificación de errores por tipo** (red, validación, permisos, etc.)
- Comprehensive error type classification
- Automatic error categorization
- Context-aware error handling

✅ **Crear sistema de reintentos con backoff exponencial para errores recuperables**
- Exponential backoff with jitter
- Server-specified retry delays
- Configurable retry policies
- Selective retry based on error type

✅ **Agregar fallback a datos en caché cuando hay errores de conectividad**
- Automatic cache fallback for connectivity errors
- Age-based cache validation
- User notification of cached data usage
- Seamless fallback experience

The implementation addresses requirements 2.3 and 4.4 from the specification, providing robust error handling that improves user experience and system reliability.