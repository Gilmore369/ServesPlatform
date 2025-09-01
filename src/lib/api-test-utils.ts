/**
 * API Connection Test Utilities
 * Provides comprehensive testing and validation for API connectivity
 * Requirements: 4.1, 4.3
 */

import { config } from './config';
import { api } from './api';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
  duration: number;
}

export interface HealthCheckResult {
  healthy: boolean;
  services: {
    api: ConnectionTestResult;
    auth: ConnectionTestResult;
    database: ConnectionTestResult;
  };
  overall: ConnectionTestResult;
}

/**
 * Test basic API connectivity
 */
export async function testAPIConnection(): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Testing API connection...');
    
    // Test basic connectivity with health endpoint
    const response = await fetch(`${config.apiBaseUrl}?token=${config.apiToken}&action=health`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        message: `HTTP ${response.status}: ${response.statusText}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          url: config.apiBaseUrl
        },
        timestamp: new Date().toISOString(),
        duration
      };
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      return {
        success: false,
        message: 'Invalid JSON response from API',
        details: { parseError: parseError.message },
        timestamp: new Date().toISOString(),
        duration
      };
    }

    if (!data.ok && !data.success) {
      return {
        success: false,
        message: data.message || 'API returned error response',
        details: data,
        timestamp: new Date().toISOString(),
        duration
      };
    }

    return {
      success: true,
      message: 'API connection successful',
      details: {
        status: response.status,
        responseData: data,
        url: config.apiBaseUrl
      },
      timestamp: new Date().toISOString(),
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
      details: {
        error: error.message,
        type: error.name,
        url: config.apiBaseUrl
      },
      timestamp: new Date().toISOString(),
      duration
    };
  }
}

/**
 * Test CORS configuration
 */
export async function testCORSConfiguration(): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Testing CORS configuration...');
    
    // Test preflight OPTIONS request
    const response = await fetch(config.apiBaseUrl, {
      method: 'OPTIONS',
      mode: 'cors',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    const duration = Date.now() - startTime;

    // Check CORS headers
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('Access-Control-Allow-Origin'),
      'access-control-allow-methods': response.headers.get('Access-Control-Allow-Methods'),
      'access-control-allow-headers': response.headers.get('Access-Control-Allow-Headers'),
      'access-control-max-age': response.headers.get('Access-Control-Max-Age'),
    };

    const hasValidCORS = corsHeaders['access-control-allow-origin'] === '*' || 
                        corsHeaders['access-control-allow-origin'] === window.location.origin;

    return {
      success: hasValidCORS,
      message: hasValidCORS ? 'CORS configuration is valid' : 'CORS configuration issues detected',
      details: {
        status: response.status,
        corsHeaders,
        origin: window.location.origin
      },
      timestamp: new Date().toISOString(),
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      message: `CORS test failed: ${error.message}`,
      details: {
        error: error.message,
        type: error.name
      },
      timestamp: new Date().toISOString(),
      duration
    };
  }
}

/**
 * Test authentication flow
 */
export async function testAuthentication(): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Testing authentication...');
    
    // Test login with test credentials
    const response = await api.login('admin@servesplatform.com', 'admin123');
    
    const duration = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        message: response.message || 'Authentication failed',
        details: response,
        timestamp: new Date().toISOString(),
        duration
      };
    }

    // Verify token was returned
    if (!response.token) {
      return {
        success: false,
        message: 'No authentication token received',
        details: response,
        timestamp: new Date().toISOString(),
        duration
      };
    }

    return {
      success: true,
      message: 'Authentication successful',
      details: {
        user: response.user,
        hasToken: !!response.token,
        tokenLength: response.token?.length
      },
      timestamp: new Date().toISOString(),
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      message: `Authentication test failed: ${error.message}`,
      details: {
        error: error.message,
        type: error.name
      },
      timestamp: new Date().toISOString(),
      duration
    };
  }
}

/**
 * Test database operations
 */
export async function testDatabaseOperations(): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Testing database operations...');
    
    // Test basic list operation
    const response = await api.list('Materiales', { limit: 5 });
    
    const duration = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        message: response.message || 'Database operation failed',
        details: response,
        timestamp: new Date().toISOString(),
        duration
      };
    }

    // Verify data structure
    if (!Array.isArray(response.data)) {
      return {
        success: false,
        message: 'Invalid data format returned from database',
        details: { dataType: typeof response.data, response },
        timestamp: new Date().toISOString(),
        duration
      };
    }

    return {
      success: true,
      message: 'Database operations working correctly',
      details: {
        recordCount: response.data.length,
        sampleRecord: response.data[0],
        hasData: response.data.length > 0
      },
      timestamp: new Date().toISOString(),
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      message: `Database test failed: ${error.message}`,
      details: {
        error: error.message,
        type: error.name
      },
      timestamp: new Date().toISOString(),
      duration
    };
  }
}

/**
 * Comprehensive health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  console.log('🏥 Starting comprehensive health check...');
  
  const [apiTest, authTest, dbTest] = await Promise.all([
    testAPIConnection(),
    testAuthentication(),
    testDatabaseOperations()
  ]);

  const allSuccessful = apiTest.success && authTest.success && dbTest.success;
  const totalDuration = apiTest.duration + authTest.duration + dbTest.duration;

  const overall: ConnectionTestResult = {
    success: allSuccessful,
    message: allSuccessful 
      ? 'All systems operational' 
      : 'Some systems have issues',
    details: {
      testsRun: 3,
      testsSuccessful: [apiTest, authTest, dbTest].filter(t => t.success).length,
      totalDuration
    },
    timestamp: new Date().toISOString(),
    duration: totalDuration
  };

  return {
    healthy: allSuccessful,
    services: {
      api: apiTest,
      auth: authTest,
      database: dbTest
    },
    overall
  };
}

/**
 * Test specific CRUD operation
 */
export async function testCRUDOperation(
  table: string, 
  operation: 'list' | 'get' | 'create' | 'update' | 'delete',
  params?: any
): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🔍 Testing ${operation} operation on ${table}...`);
    
    let response;
    
    switch (operation) {
      case 'list':
        response = await api.list(table, params);
        break;
      case 'get':
        if (!params?.id) throw new Error('ID required for get operation');
        response = await api.get(table, params.id);
        break;
      case 'create':
        if (!params?.data) throw new Error('Data required for create operation');
        response = await api.create(table, params.data);
        break;
      case 'update':
        if (!params?.id || !params?.data) throw new Error('ID and data required for update operation');
        response = await api.update(table, params.id, params.data);
        break;
      case 'delete':
        if (!params?.id) throw new Error('ID required for delete operation');
        response = await api.delete(table, params.id);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    const duration = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        message: `${operation} operation failed: ${response.message}`,
        details: { response, table, operation, params },
        timestamp: new Date().toISOString(),
        duration
      };
    }

    return {
      success: true,
      message: `${operation} operation successful`,
      details: {
        table,
        operation,
        response: response.data,
        params
      },
      timestamp: new Date().toISOString(),
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      message: `${operation} test failed: ${error.message}`,
      details: {
        error: error.message,
        type: error.name,
        table,
        operation,
        params
      },
      timestamp: new Date().toISOString(),
      duration
    };
  }
}

/**
 * Monitor connection health continuously
 */
export class ConnectionMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private callbacks: Array<(result: HealthCheckResult) => void> = [];
  
  constructor(private intervalMs: number = 30000) {} // Default 30 seconds
  
  start(): void {
    if (this.intervalId) {
      console.warn('Connection monitor is already running');
      return;
    }
    
    console.log('🔄 Starting connection health monitoring...');
    
    // Initial check
    this.performCheck();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.performCheck();
    }, this.intervalMs);
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Connection monitoring stopped');
    }
  }
  
  onHealthChange(callback: (result: HealthCheckResult) => void): void {
    this.callbacks.push(callback);
  }
  
  private async performCheck(): Promise<void> {
    try {
      const result = await performHealthCheck();
      
      // Notify all callbacks
      this.callbacks.forEach(callback => {
        try {
          callback(result);
        } catch (error) {
          console.error('Error in health check callback:', error);
        }
      });
      
    } catch (error) {
      console.error('Error performing health check:', error);
    }
  }
}

/**
 * Utility to format test results for display
 */
export function formatTestResult(result: ConnectionTestResult): string {
  const status = result.success ? '✅' : '❌';
  const duration = `${result.duration}ms`;
  
  return `${status} ${result.message} (${duration})`;
}

/**
 * Utility to format health check results
 */
export function formatHealthCheck(health: HealthCheckResult): string {
  const overall = health.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY';
  const api = formatTestResult(health.services.api);
  const auth = formatTestResult(health.services.auth);
  const db = formatTestResult(health.services.database);
  
  return `
${overall}

API Connection: ${api}
Authentication: ${auth}
Database: ${db}

Overall: ${formatTestResult(health.overall)}
  `.trim();
}