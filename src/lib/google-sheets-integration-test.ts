/**
 * Google Sheets Integration Test Utility
 * Tests the complete integration between frontend and Google Sheets backend
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { googleSheetsAPIService, CRUDOperation } from './google-sheets-api-service';
import { logger } from './logger';

export interface IntegrationTestResult {
  testName: string;
  status: 'passed' | 'failed' | 'warning';
  duration: number;
  details: any;
  error?: string;
}

export interface IntegrationTestSuite {
  timestamp: string;
  overall: 'passed' | 'failed' | 'warning';
  tests: IntegrationTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    successRate: number;
  };
}

/**
 * Run comprehensive Google Sheets integration tests
 */
export async function runIntegrationTests(): Promise<IntegrationTestSuite> {
  logger.info('Starting Google Sheets integration tests');
  
  const testSuite: IntegrationTestSuite = {
    timestamp: new Date().toISOString(),
    overall: 'unknown' as any,
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      successRate: 0
    }
  };

  // Test 1: Connection validation
  testSuite.tests.push(await testConnection());
  
  // Test 2: Health check
  testSuite.tests.push(await testHealthCheck());
  
  // Test 3: Data retrieval
  testSuite.tests.push(await testDataRetrieval());
  
  // Test 4: CRUD operations
  testSuite.tests.push(await testCRUDOperations());
  
  // Test 5: Error handling
  testSuite.tests.push(await testErrorHandling());
  
  // Test 6: Performance
  testSuite.tests.push(await testPerformance());

  // Calculate summary
  testSuite.summary.total = testSuite.tests.length;
  testSuite.summary.passed = testSuite.tests.filter(t => t.status === 'passed').length;
  testSuite.summary.failed = testSuite.tests.filter(t => t.status === 'failed').length;
  testSuite.summary.warnings = testSuite.tests.filter(t => t.status === 'warning').length;
  testSuite.summary.successRate = Math.round((testSuite.summary.passed / testSuite.summary.total) * 100);

  // Determine overall status
  if (testSuite.summary.failed > 0) {
    testSuite.overall = 'failed';
  } else if (testSuite.summary.warnings > 0) {
    testSuite.overall = 'warning';
  } else {
    testSuite.overall = 'passed';
  }

  logger.info(`Integration tests completed: ${testSuite.overall} (${testSuite.summary.passed}/${testSuite.summary.total} passed)`);
  
  return testSuite;
}

/**
 * Test basic connection to Google Sheets API
 */
async function testConnection(): Promise<IntegrationTestResult> {
  const test: IntegrationTestResult = {
    testName: 'Connection Test',
    status: 'unknown' as any,
    duration: 0,
    details: {}
  };

  const startTime = Date.now();

  try {
    const isConnected = await googleSheetsAPIService.validateConnection();
    
    test.status = isConnected ? 'passed' : 'failed';
    test.details = {
      connected: isConnected,
      apiUrl: googleSheetsAPIService.getConfig().baseUrl
    };

    if (!isConnected) {
      test.error = 'Failed to establish connection to Google Sheets API';
    }

  } catch (error) {
    test.status = 'failed';
    test.error = error instanceof Error ? error.message : 'Unknown connection error';
    test.details = { error: test.error };
  }

  test.duration = Date.now() - startTime;
  return test;
}

/**
 * Test health check endpoint
 */
async function testHealthCheck(): Promise<IntegrationTestResult> {
  const test: IntegrationTestResult = {
    testName: 'Health Check Test',
    status: 'unknown' as any,
    duration: 0,
    details: {}
  };

  const startTime = Date.now();

  try {
    // Create a custom operation for health check
    const healthOperation: CRUDOperation = {
      table: 'health',
      operation: 'list' as any,
      data: { action: 'health' }
    };

    const response = await googleSheetsAPIService.executeOperation(healthOperation);
    
    if (response.ok) {
      test.status = 'passed';
      test.details = {
        status: response.data?.status,
        spreadsheet: response.data?.spreadsheet,
        sheets: response.data?.sheets?.length || 0
      };
    } else {
      test.status = 'failed';
      test.error = response.message || 'Health check failed';
      test.details = { error: test.error };
    }

  } catch (error) {
    test.status = 'failed';
    test.error = error instanceof Error ? error.message : 'Health check error';
    test.details = { error: test.error };
  }

  test.duration = Date.now() - startTime;
  return test;
}

/**
 * Test data retrieval from Google Sheets
 */
async function testDataRetrieval(): Promise<IntegrationTestResult> {
  const test: IntegrationTestResult = {
    testName: 'Data Retrieval Test',
    status: 'unknown' as any,
    duration: 0,
    details: {}
  };

  const startTime = Date.now();

  try {
    const tables = ['Usuarios', 'Materiales', 'Proyectos'];
    const results: any = {};

    for (const table of tables) {
      try {
        const operation: CRUDOperation = {
          table,
          operation: 'list',
          pagination: { page: 1, limit: 5 }
        };

        const response = await googleSheetsAPIService.executeOperation(operation);
        
        results[table] = {
          success: response.ok,
          recordCount: response.data?.length || 0,
          source: response.data?.source || 'unknown',
          hasData: (response.data?.length || 0) > 0
        };

        if (!response.ok) {
          results[table].error = response.message;
        }

      } catch (tableError) {
        results[table] = {
          success: false,
          error: tableError instanceof Error ? tableError.message : 'Unknown error'
        };
      }
    }

    const successfulTables = Object.values(results).filter((r: any) => r.success).length;
    const tablesWithData = Object.values(results).filter((r: any) => r.hasData).length;

    test.details = {
      tables: results,
      successfulTables,
      tablesWithData,
      totalTables: tables.length
    };

    if (successfulTables === tables.length) {
      test.status = tablesWithData > 0 ? 'passed' : 'warning';
      if (tablesWithData === 0) {
        test.error = 'All tables are empty - may be using mock data';
      }
    } else if (successfulTables > 0) {
      test.status = 'warning';
      test.error = `Only ${successfulTables}/${tables.length} tables accessible`;
    } else {
      test.status = 'failed';
      test.error = 'No tables accessible';
    }

  } catch (error) {
    test.status = 'failed';
    test.error = error instanceof Error ? error.message : 'Data retrieval error';
    test.details = { error: test.error };
  }

  test.duration = Date.now() - startTime;
  return test;
}

/**
 * Test CRUD operations
 */
async function testCRUDOperations(): Promise<IntegrationTestResult> {
  const test: IntegrationTestResult = {
    testName: 'CRUD Operations Test',
    status: 'unknown' as any,
    duration: 0,
    details: {}
  };

  const startTime = Date.now();

  try {
    const testTable = 'Usuarios';
    const testRecord = {
      email: 'test@integration.com',
      nombre: 'Integration Test User',
      rol: 'tecnico',
      activo: true
    };

    const crudResults: any = {};

    // Test CREATE
    try {
      const createOperation: CRUDOperation = {
        table: testTable,
        operation: 'create',
        data: testRecord
      };

      const createResponse = await googleSheetsAPIService.executeOperation(createOperation);
      crudResults.create = {
        success: createResponse.ok,
        recordId: createResponse.data?.id,
        error: createResponse.ok ? null : createResponse.message
      };

      // Test READ (if create was successful)
      if (createResponse.ok && createResponse.data?.id) {
        const readOperation: CRUDOperation = {
          table: testTable,
          operation: 'get',
          id: createResponse.data.id
        };

        const readResponse = await googleSheetsAPIService.executeOperation(readOperation);
        crudResults.read = {
          success: readResponse.ok,
          recordFound: readResponse.ok && readResponse.data?.id === createResponse.data.id,
          error: readResponse.ok ? null : readResponse.message
        };

        // Test UPDATE
        const updateOperation: CRUDOperation = {
          table: testTable,
          operation: 'update',
          id: createResponse.data.id,
          data: {
            ...testRecord,
            nombre: 'Updated Integration Test User'
          }
        };

        const updateResponse = await googleSheetsAPIService.executeOperation(updateOperation);
        crudResults.update = {
          success: updateResponse.ok,
          error: updateResponse.ok ? null : updateResponse.message
        };

        // Test DELETE
        const deleteOperation: CRUDOperation = {
          table: testTable,
          operation: 'delete',
          id: createResponse.data.id
        };

        const deleteResponse = await googleSheetsAPIService.executeOperation(deleteOperation);
        crudResults.delete = {
          success: deleteResponse.ok,
          error: deleteResponse.ok ? null : deleteResponse.message
        };
      }

    } catch (crudError) {
      crudResults.error = crudError instanceof Error ? crudError.message : 'CRUD operation error';
    }

    test.details = crudResults;

    // Determine test status
    const operations = ['create', 'read', 'update', 'delete'];
    const successfulOps = operations.filter(op => crudResults[op]?.success).length;

    if (successfulOps === operations.length) {
      test.status = 'passed';
    } else if (successfulOps > 0) {
      test.status = 'warning';
      test.error = `Only ${successfulOps}/${operations.length} CRUD operations successful`;
    } else {
      test.status = 'failed';
      test.error = 'No CRUD operations successful';
    }

  } catch (error) {
    test.status = 'failed';
    test.error = error instanceof Error ? error.message : 'CRUD test error';
    test.details = { error: test.error };
  }

  test.duration = Date.now() - startTime;
  return test;
}

/**
 * Test error handling
 */
async function testErrorHandling(): Promise<IntegrationTestResult> {
  const test: IntegrationTestResult = {
    testName: 'Error Handling Test',
    status: 'unknown' as any,
    duration: 0,
    details: {}
  };

  const startTime = Date.now();

  try {
    const errorTests: any = {};

    // Test 1: Invalid table
    try {
      const invalidTableOp: CRUDOperation = {
        table: 'NonExistentTable',
        operation: 'list'
      };

      const response = await googleSheetsAPIService.executeOperation(invalidTableOp);
      errorTests.invalidTable = {
        handledGracefully: !response.ok,
        errorMessage: response.message
      };
    } catch (error) {
      errorTests.invalidTable = {
        handledGracefully: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Invalid record ID
    try {
      const invalidIdOp: CRUDOperation = {
        table: 'Usuarios',
        operation: 'get',
        id: 'INVALID_ID_12345'
      };

      const response = await googleSheetsAPIService.executeOperation(invalidIdOp);
      errorTests.invalidId = {
        handledGracefully: !response.ok || response.data?.source === 'mock',
        errorMessage: response.message
      };
    } catch (error) {
      errorTests.invalidId = {
        handledGracefully: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 3: Malformed data
    try {
      const malformedDataOp: CRUDOperation = {
        table: 'Usuarios',
        operation: 'create',
        data: {
          email: 'invalid-email',
          rol: 'invalid-role'
        }
      };

      const response = await googleSheetsAPIService.executeOperation(malformedDataOp);
      errorTests.malformedData = {
        handledGracefully: !response.ok,
        errorMessage: response.message
      };
    } catch (error) {
      errorTests.malformedData = {
        handledGracefully: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    test.details = errorTests;

    // Determine test status
    const errorTestResults = Object.values(errorTests);
    const gracefullyHandled = errorTestResults.filter((t: any) => t.handledGracefully).length;

    if (gracefullyHandled === errorTestResults.length) {
      test.status = 'passed';
    } else if (gracefullyHandled > 0) {
      test.status = 'warning';
      test.error = `Only ${gracefullyHandled}/${errorTestResults.length} error scenarios handled gracefully`;
    } else {
      test.status = 'failed';
      test.error = 'Error handling not working properly';
    }

  } catch (error) {
    test.status = 'failed';
    test.error = error instanceof Error ? error.message : 'Error handling test failed';
    test.details = { error: test.error };
  }

  test.duration = Date.now() - startTime;
  return test;
}

/**
 * Test performance
 */
async function testPerformance(): Promise<IntegrationTestResult> {
  const test: IntegrationTestResult = {
    testName: 'Performance Test',
    status: 'unknown' as any,
    duration: 0,
    details: {}
  };

  const startTime = Date.now();

  try {
    const performanceTests: any = {};

    // Test 1: List operation performance
    const listStartTime = Date.now();
    const listOperation: CRUDOperation = {
      table: 'Materiales',
      operation: 'list',
      pagination: { page: 1, limit: 20 }
    };

    const listResponse = await googleSheetsAPIService.executeOperation(listOperation);
    const listDuration = Date.now() - listStartTime;

    performanceTests.listOperation = {
      duration: listDuration,
      success: listResponse.ok,
      recordCount: listResponse.data?.length || 0,
      rating: listDuration < 2000 ? 'excellent' : 
              listDuration < 5000 ? 'good' : 
              listDuration < 10000 ? 'acceptable' : 'poor'
    };

    // Test 2: Multiple concurrent operations
    const concurrentStartTime = Date.now();
    const concurrentOps = [
      { table: 'Usuarios', operation: 'list' as const, pagination: { page: 1, limit: 5 } },
      { table: 'Materiales', operation: 'list' as const, pagination: { page: 1, limit: 5 } },
      { table: 'Proyectos', operation: 'list' as const, pagination: { page: 1, limit: 5 } }
    ];

    const concurrentPromises = concurrentOps.map(op => 
      googleSheetsAPIService.executeOperation(op)
    );

    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentDuration = Date.now() - concurrentStartTime;

    performanceTests.concurrentOperations = {
      duration: concurrentDuration,
      operationCount: concurrentOps.length,
      successfulOps: concurrentResults.filter(r => r.ok).length,
      rating: concurrentDuration < 5000 ? 'excellent' : 
              concurrentDuration < 10000 ? 'good' : 
              concurrentDuration < 15000 ? 'acceptable' : 'poor'
    };

    test.details = performanceTests;

    // Determine test status based on performance
    const listRating = performanceTests.listOperation.rating;
    const concurrentRating = performanceTests.concurrentOperations.rating;

    if (listRating === 'excellent' && concurrentRating === 'excellent') {
      test.status = 'passed';
    } else if (listRating !== 'poor' && concurrentRating !== 'poor') {
      test.status = 'warning';
      test.error = 'Performance is acceptable but could be improved';
    } else {
      test.status = 'failed';
      test.error = 'Performance is poor and may impact user experience';
    }

  } catch (error) {
    test.status = 'failed';
    test.error = error instanceof Error ? error.message : 'Performance test failed';
    test.details = { error: test.error };
  }

  test.duration = Date.now() - startTime;
  return test;
}

/**
 * Quick connection test for development
 */
export async function quickConnectionTest(): Promise<boolean> {
  try {
    const result = await testConnection();
    return result.status === 'passed';
  } catch (error) {
    logger.error('Quick connection test failed', error);
    return false;
  }
}

/**
 * Test specific table data retrieval
 */
export async function testTableData(tableName: string): Promise<{
  success: boolean;
  recordCount: number;
  source: string;
  error?: string;
}> {
  try {
    const operation: CRUDOperation = {
      table: tableName,
      operation: 'list',
      pagination: { page: 1, limit: 10 }
    };

    const response = await googleSheetsAPIService.executeOperation(operation);
    
    return {
      success: response.ok,
      recordCount: response.data?.length || 0,
      source: response.data?.source || 'unknown',
      error: response.ok ? undefined : response.message
    };

  } catch (error) {
    return {
      success: false,
      recordCount: 0,
      source: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}