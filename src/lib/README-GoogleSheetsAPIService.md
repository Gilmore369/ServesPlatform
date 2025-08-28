# Enhanced Google Sheets API Service

This document describes the enhanced Google Sheets API service implementation that provides optimized CRUD operations, timeout handling, retry logic, and comprehensive error management.

## Overview

The `GoogleSheetsAPIService` is a robust API client designed specifically for interacting with Google Sheets through Google Apps Script. It provides:

- **Enhanced Error Handling**: Comprehensive error classification and handling
- **Retry Logic**: Exponential backoff retry mechanism for resilient operations
- **Timeout Management**: Configurable timeouts to prevent hanging requests
- **Batch Operations**: Execute multiple operations efficiently
- **Connection Validation**: Health check capabilities
- **Backward Compatibility**: Works with existing code through `EnhancedAPIClient`

## Key Features

### 1. Enhanced Error Classification

```typescript
enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR', 
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  DATA_CONFLICT = 'DATA_CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}
```

### 2. Configurable Retry Strategy

```typescript
interface RetryConfig {
  maxAttempts: number;        // Maximum retry attempts
  backoffMultiplier: number;  // Exponential backoff multiplier
  initialDelay: number;       // Initial delay in milliseconds
  maxDelay: number;          // Maximum delay cap
}
```

### 3. Enhanced Response Format

```typescript
interface EnhancedAPIResponse<T = any> {
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
```

## Usage Examples

### Basic Usage

```typescript
import { GoogleSheetsAPIService, CRUDOperation } from './google-sheets-api-service';

const apiService = new GoogleSheetsAPIService();

// Execute a single operation
const operation: CRUDOperation = {
  table: 'Usuarios',
  operation: 'list',
  pagination: { page: 1, limit: 10 }
};

const result = await apiService.executeOperation(operation);
console.log('Users:', result.data);
console.log('Execution time:', result.metadata?.executionTime);
```

### Batch Operations

```typescript
const operations: CRUDOperation[] = [
  { table: 'Usuarios', operation: 'list' },
  { table: 'Proyectos', operation: 'list' },
  { table: 'Materiales', operation: 'list', filters: { activo: true } }
];

const results = await apiService.batchOperations(operations);
```

### Custom Configuration

```typescript
const apiService = new GoogleSheetsAPIService({
  timeout: 60000,        // 60 second timeout
  retryAttempts: 5,      // 5 retry attempts
  retryDelay: 2000,      // 2 second initial delay
  maxRetryDelay: 30000,  // 30 second max delay
  backoffMultiplier: 2   // Double delay each retry
});
```

### Error Handling

```typescript
try {
  const result = await apiService.executeOperation(operation);
} catch (error) {
  if (error instanceof GoogleSheetsAPIError) {
    switch (error.type) {
      case ErrorType.VALIDATION_ERROR:
        console.log('Data validation failed:', error.message);
        break;
      case ErrorType.NETWORK_ERROR:
        console.log('Network issue, will retry:', error.retryable);
        break;
      case ErrorType.RATE_LIMIT:
        console.log('Rate limited, backing off');
        break;
    }
  }
}
```

### Connection Validation

```typescript
const isHealthy = await apiService.validateConnection();
if (!isHealthy) {
  console.log('API connection failed');
  // Handle connection issues
}
```

## Backward Compatibility

The `EnhancedAPIClient` provides full backward compatibility with the existing `APIClient`:

```typescript
import { enhancedAPIClient } from './enhanced-api-client';

// These work exactly like before
const users = await enhancedAPIClient.getUsers();
const projects = await enhancedAPIClient.getProjects();

// But you can access enhanced features
const apiService = enhancedAPIClient.getAPIService();
const config = apiService.getConfig();
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | string | from config | Google Apps Script URL |
| `token` | string | from config | API authentication token |
| `timeout` | number | 30000 | Request timeout in milliseconds |
| `retryAttempts` | number | 3 | Maximum retry attempts |
| `cacheEnabled` | boolean | true | Enable response caching |
| `retryDelay` | number | 1000 | Initial retry delay in milliseconds |
| `maxRetryDelay` | number | 10000 | Maximum retry delay in milliseconds |
| `backoffMultiplier` | number | 2 | Exponential backoff multiplier |

## Error Types and Retry Logic

| HTTP Status | Error Type | Retryable | Description |
|-------------|------------|-----------|-------------|
| 400, 422 | VALIDATION_ERROR | No | Bad request data |
| 401, 403 | PERMISSION_ERROR | No | Authentication/authorization failed |
| 409 | DATA_CONFLICT | No | Data conflict (e.g., duplicate key) |
| 429 | RATE_LIMIT | Yes | Too many requests |
| 408, 502, 503, 504 | SERVER_ERROR | Yes | Server or network issues |
| 500+ | SERVER_ERROR | Yes | Internal server errors |
| Timeout | TIMEOUT_ERROR | Yes | Request timeout |
| Network | NETWORK_ERROR | Yes | Network connectivity issues |

## Performance Considerations

1. **Batch Operations**: Use `batchOperations()` for multiple requests to reduce overhead
2. **Pagination**: Use pagination for large datasets to improve response times
3. **Caching**: Enable caching for frequently accessed data
4. **Timeouts**: Set appropriate timeouts based on operation complexity
5. **Retry Strategy**: Configure retry settings based on your reliability requirements

## Migration Guide

### From APIClient to EnhancedAPIClient

1. **No Code Changes Required**: The `EnhancedAPIClient` is a drop-in replacement
2. **Optional Enhancements**: Access enhanced features through `getAPIService()`
3. **Error Handling**: Optionally upgrade to use `GoogleSheetsAPIError` for better error handling

### Example Migration

```typescript
// Before
import { apiClient } from './apiClient';
const users = await apiClient.getUsers();

// After (no changes required)
import { enhancedAPIClient } from './enhanced-api-client';
const users = await enhancedAPIClient.getUsers();

// Optional: Use enhanced features
const apiService = enhancedAPIClient.getAPIService();
const config = apiService.getConfig();
```

## Testing

The service includes comprehensive unit tests covering:

- Configuration management
- Error classification and handling
- Retry logic
- Request building
- Utility functions

Run tests with:
```bash
npm test google-sheets-api-service-simple.test.ts
```

## Best Practices

1. **Use Batch Operations**: For multiple related requests
2. **Handle Errors Gracefully**: Check error types and respond appropriately
3. **Configure Timeouts**: Set reasonable timeouts for your use case
4. **Monitor Performance**: Use the execution time metadata for optimization
5. **Validate Connections**: Implement health checks in your application
6. **Use Appropriate Retry Settings**: Balance reliability with performance

## Troubleshooting

### Common Issues

1. **Timeout Errors**: Increase timeout or check network connectivity
2. **Rate Limiting**: Implement exponential backoff (already built-in)
3. **Validation Errors**: Check data format and required fields
4. **Permission Errors**: Verify API token and user permissions

### Debug Logging

The service includes console logging for debugging:
- Request details (operation, table, URL preview)
- Response status and metadata
- Retry attempts and delays
- Connection validation results

## Future Enhancements

Planned improvements include:
- Client-side caching with SWR integration
- Real-time sync capabilities
- Performance monitoring dashboard
- Advanced filtering and search
- Offline support with sync queue