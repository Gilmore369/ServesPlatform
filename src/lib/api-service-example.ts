/**
 * Example usage of the enhanced GoogleSheetsAPIService
 * This file demonstrates how to use the new API service with all its features
 */

import { 
  GoogleSheetsAPIService, 
  EnhancedAPIClient,
  CRUDOperation,
  ErrorType,
  GoogleSheetsAPIError 
} from './google-sheets-api-service';
import { enhancedAPIClient } from './enhanced-api-client';

/**
 * Example 1: Basic CRUD operations with enhanced error handling
 */
export async function basicCRUDExample() {
  try {
    // Create a new user
    const newUser = await enhancedAPIClient.createUser({
      email: 'test@example.com',
      nombre: 'Test User',
      rol: 'tecnico',
      activo: true
    });

    console.log('User created:', newUser);

    // Get the user with enhanced response metadata
    if (newUser.data?.id) {
      const userResponse = await enhancedAPIClient.getAPIService().executeOperation({
        table: 'Usuarios',
        operation: 'get',
        id: newUser.data.id
      });

      console.log('User retrieved with metadata:', {
        data: userResponse.data,
        executionTime: userResponse.metadata?.executionTime,
        cacheHit: userResponse.metadata?.cacheHit
      });
    }

  } catch (error) {
    if (error instanceof GoogleSheetsAPIError) {
      console.error('API Error:', {
        type: error.type,
        message: error.message,
        retryable: error.retryable,
        status: error.status
      });
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Example 2: Batch operations for better performance
 */
export async function batchOperationsExample() {
  const apiService = enhancedAPIClient.getAPIService();

  try {
    const operations: CRUDOperation[] = [
      {
        table: 'Usuarios',
        operation: 'list',
        pagination: { page: 1, limit: 10 }
      },
      {
        table: 'Proyectos',
        operation: 'list',
        pagination: { page: 1, limit: 5 }
      },
      {
        table: 'Materiales',
        operation: 'list',
        filters: { activo: true }
      }
    ];

    const results = await apiService.batchOperations(operations);
    
    console.log('Batch results:', results.map(r => ({
      ok: r.ok,
      dataLength: Array.isArray(r.data) ? r.data.length : 1,
      executionTime: r.metadata?.executionTime
    })));

  } catch (error) {
    console.error('Batch operation failed:', error);
  }
}

/**
 * Example 3: Custom retry configuration for critical operations
 */
export async function customRetryExample() {
  const apiService = enhancedAPIClient.getAPIService();

  try {
    const criticalOperation: CRUDOperation = {
      table: 'Proyectos',
      operation: 'update',
      id: 'project-123',
      data: {
        estado: 'Completado',
        avance_pct: 100
      }
    };

    const result = await apiService.executeOperation(criticalOperation, {
      timeout: 60000, // 1 minute timeout for critical operations
      retryConfig: {
        maxAttempts: 5,
        initialDelay: 2000,
        maxDelay: 30000,
        backoffMultiplier: 2
      }
    });

    console.log('Critical operation completed:', result);

  } catch (error) {
    if (error instanceof GoogleSheetsAPIError) {
      console.error('Critical operation failed after retries:', {
        type: error.type,
        message: error.message,
        retryable: error.retryable
      });
    }
  }
}

/**
 * Example 4: Connection validation and health checks
 */
export async function healthCheckExample() {
  const apiService = enhancedAPIClient.getAPIService();

  try {
    console.log('Checking API connection...');
    const isHealthy = await apiService.validateConnection();
    
    if (isHealthy) {
      console.log('✅ API connection is healthy');
      
      // Get current configuration
      const config = apiService.getConfig();
      console.log('Current configuration:', {
        timeout: config.timeout,
        retryAttempts: config.retryAttempts,
        cacheEnabled: config.cacheEnabled
      });
      
    } else {
      console.log('❌ API connection failed');
      
      // Maybe update configuration for better reliability
      apiService.updateConfig({
        timeout: 45000,
        retryAttempts: 5,
        retryDelay: 3000
      });
      
      console.log('Updated configuration for better reliability');
    }

  } catch (error) {
    console.error('Health check error:', error);
  }
}

/**
 * Example 5: Error handling with different error types
 */
export async function errorHandlingExample() {
  const apiService = enhancedAPIClient.getAPIService();

  const operations: CRUDOperation[] = [
    // This might cause a validation error
    {
      table: 'Usuarios',
      operation: 'create',
      data: { email: 'invalid-email' } // Missing required fields
    },
    // This might cause a permission error
    {
      table: 'AdminOnly',
      operation: 'list'
    },
    // This might cause a not found error
    {
      table: 'Usuarios',
      operation: 'get',
      id: 'non-existent-id'
    }
  ];

  for (const operation of operations) {
    try {
      await apiService.executeOperation(operation);
    } catch (error) {
      if (error instanceof GoogleSheetsAPIError) {
        switch (error.type) {
          case ErrorType.VALIDATION_ERROR:
            console.log('Validation error - check your data:', error.message);
            break;
          case ErrorType.PERMISSION_ERROR:
            console.log('Permission denied - check your access rights:', error.message);
            break;
          case ErrorType.NETWORK_ERROR:
            console.log('Network issue - will retry automatically:', error.message);
            break;
          case ErrorType.RATE_LIMIT:
            console.log('Rate limited - backing off:', error.message);
            break;
          default:
            console.log('Other error:', error.message);
        }
      }
    }
  }
}

/**
 * Example 6: Using the enhanced client with backward compatibility
 */
export async function backwardCompatibilityExample() {
  try {
    // These methods work exactly like the old APIClient
    const users = await enhancedAPIClient.getUsers({ limit: 10 });
    const projects = await enhancedAPIClient.getProjects({ q: 'estado:En progreso' });
    
    console.log('Users:', users.data?.length);
    console.log('Active projects:', projects.data?.length);

    // But you can also access enhanced features
    const apiService = enhancedAPIClient.getAPIService();
    const config = apiService.getConfig();
    
    console.log('Enhanced features available with config:', {
      timeout: config.timeout,
      retryAttempts: config.retryAttempts
    });

  } catch (error) {
    console.error('Backward compatibility example error:', error);
  }
}

// Export all examples for easy testing
export const examples = {
  basicCRUDExample,
  batchOperationsExample,
  customRetryExample,
  healthCheckExample,
  errorHandlingExample,
  backwardCompatibilityExample
};