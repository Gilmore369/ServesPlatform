/**
 * Real Data Integration Test Runner
 * Executes comprehensive tests for real data integration validation
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.4, 10.5
 * Task: 9.5 Test and validate real data integration
 */

import { runIntegrationTests } from '../lib/google-sheets-integration-test';
import { performHealthCheck, testCRUDOperation } from '../lib/api-test-utils';
import { apiClient } from '../lib/apiClient';
import { logger } from '../lib/logger';

interface TestSuiteResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  duration: number;
  details: any;
  error?: string;
}

interface ComprehensiveTestResults {
  timestamp: string;
  overall: 'passed' | 'failed' | 'warning';
  suites: TestSuiteResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    successRate: number;
    totalDuration: number;
  };
}

/**
 * Run comprehensive real data integration tests
 */
export async function runRealDataIntegrationTests(): Promise<ComprehensiveTestResults> {
  console.log('🚀 Starting comprehensive real data integration tests...');
  logger.info('Starting comprehensive real data integration tests');

  const results: ComprehensiveTestResults = {
    timestamp: new Date().toISOString(),
    overall: 'unknown' as any,
    suites: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      successRate: 0,
      totalDuration: 0
    }
  };

  // Test Suite 1: System Health Check
  console.log('📊 Running system health check...');
  results.suites.push(await runHealthCheckSuite());

  // Test Suite 2: Google Sheets Integration
  console.log('📋 Running Google Sheets integration tests...');
  results.suites.push(await runGoogleSheetsIntegrationSuite());

  // Test Suite 3: Data Loading Tests
  console.log('📥 Running data loading tests...');
  results.suites.push(await runDataLoadingSuite());

  // Test Suite 4: CRUD Operations Tests
  console.log('🔄 Running CRUD operations tests...');
  results.suites.push(await runCRUDOperationsSuite());

  // Test Suite 5: Error Handling Tests
  console.log('⚠️ Running error handling tests...');
  results.suites.push(await runErrorHandlingSuite());

  // Test Suite 6: Data Consistency Tests
  console.log('🔍 Running data consistency tests...');
  results.suites.push(await runDataConsistencySuite());

  // Calculate summary
  results.summary.total = results.suites.length;
  results.summary.passed = results.suites.filter(s => s.status === 'passed').length;
  results.summary.failed = results.suites.filter(s => s.status === 'failed').length;
  results.summary.warnings = results.suites.filter(s => s.status === 'warning').length;
  results.summary.successRate = Math.round((results.summary.passed / results.summary.total) * 100);
  results.summary.totalDuration = results.suites.reduce((sum, s) => sum + s.duration, 0);

  // Determine overall status
  if (results.summary.failed > 0) {
    results.overall = 'failed';
  } else if (results.summary.warnings > 0) {
    results.overall = 'warning';
  } else {
    results.overall = 'passed';
  }

  // Log final results
  console.log('\n📋 Test Results Summary:');
  console.log(`Overall Status: ${results.overall.toUpperCase()}`);
  console.log(`Success Rate: ${results.summary.successRate}%`);
  console.log(`Passed: ${results.summary.passed}/${results.summary.total}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Warnings: ${results.summary.warnings}`);
  console.log(`Total Duration: ${Math.round(results.summary.totalDuration / 1000)}s`);

  logger.info('Comprehensive real data integration tests completed', {
    overall: results.overall,
    successRate: results.summary.successRate,
    totalDuration: results.summary.totalDuration
  });

  return results;
}

/**
 * Run system health check suite
 */
async function runHealthCheckSuite(): Promise<TestSuiteResult> {
  const startTime = Date.now();
  
  try {
    const healthResult = await performHealthCheck();
    
    return {
      name: 'System Health Check',
      status: healthResult.healthy ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      details: {
        healthy: healthResult.healthy,
        services: {
          api: healthResult.services.api.success,
          auth: healthResult.services.auth.success,
          database: healthResult.services.database.success
        },
        durations: {
          api: healthResult.services.api.duration,
          auth: healthResult.services.auth.duration,
          database: healthResult.services.database.duration
        }
      },
      error: healthResult.healthy ? undefined : 'One or more system components are unhealthy'
    };
  } catch (error) {
    return {
      name: 'System Health Check',
      status: 'failed',
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      error: 'Health check failed with exception'
    };
  }
}

/**
 * Run Google Sheets integration suite
 */
async function runGoogleSheetsIntegrationSuite(): Promise<TestSuiteResult> {
  const startTime = Date.now();
  
  try {
    const integrationResult = await runIntegrationTests();
    
    return {
      name: 'Google Sheets Integration',
      status: integrationResult.overall,
      duration: Date.now() - startTime,
      details: {
        successRate: integrationResult.summary.successRate,
        tests: integrationResult.tests.map(t => ({
          name: t.testName,
          status: t.status,
          duration: t.duration
        })),
        summary: integrationResult.summary
      },
      error: integrationResult.overall === 'failed' ? 'Google Sheets integration tests failed' : undefined
    };
  } catch (error) {
    return {
      name: 'Google Sheets Integration',
      status: 'failed',
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      error: 'Google Sheets integration tests failed with exception'
    };
  }
}

/**
 * Run data loading suite
 */
async function runDataLoadingSuite(): Promise<TestSuiteResult> {
  const startTime = Date.now();
  const testTables = ['Usuarios', 'Materiales', 'Proyectos', 'Actividades'];
  
  try {
    const tableResults = await Promise.all(
      testTables.map(async (table) => {
        try {
          const response = await apiClient.list(table, { limit: 5 });
          return {
            table,
            success: response.ok,
            recordCount: response.data?.length || 0,
            hasData: (response.data?.length || 0) > 0,
            error: response.ok ? null : response.message
          };
        } catch (error) {
          return {
            table,
            success: false,
            recordCount: 0,
            hasData: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const successfulTables = tableResults.filter(r => r.success).length;
    const tablesWithData = tableResults.filter(r => r.hasData).length;

    let status: 'passed' | 'failed' | 'warning';
    let error: string | undefined;

    if (successfulTables === testTables.length) {
      status = tablesWithData > 0 ? 'passed' : 'warning';
      if (tablesWithData === 0) {
        error = 'All tables accessible but no data found - may be using mock data';
      }
    } else if (successfulTables > 0) {
      status = 'warning';
      error = `Only ${successfulTables}/${testTables.length} tables accessible`;
    } else {
      status = 'failed';
      error = 'No tables accessible';
    }

    return {
      name: 'Data Loading',
      status,
      duration: Date.now() - startTime,
      details: {
        tables: tableResults,
        successfulTables,
        tablesWithData,
        totalTables: testTables.length
      },
      error
    };
  } catch (error) {
    return {
      name: 'Data Loading',
      status: 'failed',
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      error: 'Data loading tests failed with exception'
    };
  }
}

/**
 * Run CRUD operations suite
 */
async function runCRUDOperationsSuite(): Promise<TestSuiteResult> {
  const startTime = Date.now();
  const testTable = 'Usuarios';
  let createdRecordId: string | null = null;
  
  try {
    const crudResults: any = {};

    // Test CREATE
    const testRecord = {
      email: `test-crud-${Date.now()}@example.com`,
      nombre: 'CRUD Test User',
      rol: 'tecnico',
      activo: true
    };

    const createResult = await testCRUDOperation(testTable, 'create', { data: testRecord });
    crudResults.create = createResult;
    
    if (createResult.success && createResult.details?.response?.id) {
      createdRecordId = createResult.details.response.id;
    }

    // Test READ (if create was successful)
    if (createdRecordId) {
      const readResult = await testCRUDOperation(testTable, 'get', { id: createdRecordId });
      crudResults.read = readResult;

      // Test UPDATE
      const updateResult = await testCRUDOperation(testTable, 'update', {
        id: createdRecordId,
        data: { nombre: 'Updated CRUD Test User' }
      });
      crudResults.update = updateResult;

      // Test DELETE
      const deleteResult = await testCRUDOperation(testTable, 'delete', { id: createdRecordId });
      crudResults.delete = deleteResult;
    }

    // Test LIST
    const listResult = await testCRUDOperation(testTable, 'list', { limit: 5 });
    crudResults.list = listResult;

    const operations = Object.keys(crudResults);
    const successfulOps = operations.filter(op => crudResults[op].success).length;

    let status: 'passed' | 'failed' | 'warning';
    let error: string | undefined;

    if (successfulOps === operations.length) {
      status = 'passed';
    } else if (successfulOps > 0) {
      status = 'warning';
      error = `Only ${successfulOps}/${operations.length} CRUD operations successful`;
    } else {
      status = 'failed';
      error = 'No CRUD operations successful';
    }

    return {
      name: 'CRUD Operations',
      status,
      duration: Date.now() - startTime,
      details: {
        operations: crudResults,
        successfulOperations: successfulOps,
        totalOperations: operations.length,
        testRecordId: createdRecordId
      },
      error
    };
  } catch (error) {
    // Clean up if there was an error and we created a record
    if (createdRecordId) {
      try {
        await apiClient.delete(testTable, createdRecordId);
      } catch (cleanupError) {
        logger.warn('Failed to clean up test record', cleanupError);
      }
    }

    return {
      name: 'CRUD Operations',
      status: 'failed',
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      error: 'CRUD operations tests failed with exception'
    };
  }
}

/**
 * Run error handling suite
 */
async function runErrorHandlingSuite(): Promise<TestSuiteResult> {
  const startTime = Date.now();
  
  try {
    const errorTests: any = {};

    // Test invalid table
    try {
      const response = await apiClient.list('NonExistentTable' as any);
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

    // Test invalid record ID
    try {
      const response = await apiClient.getUser('INVALID_ID_12345');
      errorTests.invalidId = {
        handledGracefully: !response.ok,
        errorMessage: response.message
      };
    } catch (error) {
      errorTests.invalidId = {
        handledGracefully: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test malformed data
    try {
      const response = await apiClient.createUser({
        email: 'invalid-email',
        rol: 'invalid-role'
      } as any);
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

    const errorTestResults = Object.values(errorTests);
    const gracefullyHandled = errorTestResults.filter((t: any) => t.handledGracefully).length;

    let status: 'passed' | 'failed' | 'warning';
    let error: string | undefined;

    if (gracefullyHandled === errorTestResults.length) {
      status = 'passed';
    } else if (gracefullyHandled > 0) {
      status = 'warning';
      error = `Only ${gracefullyHandled}/${errorTestResults.length} error scenarios handled gracefully`;
    } else {
      status = 'failed';
      error = 'Error handling not working properly';
    }

    return {
      name: 'Error Handling',
      status,
      duration: Date.now() - startTime,
      details: {
        tests: errorTests,
        gracefullyHandled,
        totalTests: errorTestResults.length
      },
      error
    };
  } catch (error) {
    return {
      name: 'Error Handling',
      status: 'failed',
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      error: 'Error handling tests failed with exception'
    };
  }
}

/**
 * Run data consistency suite
 */
async function runDataConsistencySuite(): Promise<TestSuiteResult> {
  const startTime = Date.now();
  let testRecordId: string | null = null;
  
  try {
    const consistencyTests: any = {};

    // Test create-read consistency
    const testData = {
      email: `consistency-test-${Date.now()}@example.com`,
      nombre: 'Consistency Test User',
      rol: 'tecnico',
      activo: true
    };

    const createResponse = await apiClient.createUser(testData);
    if (createResponse.ok && createResponse.data?.id) {
      testRecordId = createResponse.data.id;
      
      // Immediately read it back
      const readResponse = await apiClient.getUser(testRecordId);
      
      consistencyTests.createRead = {
        success: readResponse.ok,
        dataMatches: readResponse.ok && 
                    readResponse.data?.email === testData.email &&
                    readResponse.data?.nombre === testData.nombre &&
                    readResponse.data?.rol === testData.rol,
        details: {
          created: createResponse.data,
          read: readResponse.data
        }
      };

      // Test update consistency
      const updateData = { nombre: 'Updated Consistency Test User' };
      const updateResponse = await apiClient.updateUser(testRecordId, updateData);
      
      if (updateResponse.ok) {
        const readAfterUpdateResponse = await apiClient.getUser(testRecordId);
        
        consistencyTests.updateRead = {
          success: readAfterUpdateResponse.ok,
          dataMatches: readAfterUpdateResponse.ok &&
                      readAfterUpdateResponse.data?.nombre === updateData.nombre,
          details: {
            updated: updateResponse.data,
            readAfterUpdate: readAfterUpdateResponse.data
          }
        };
      }
    }

    // Test concurrent operations
    const concurrentPromises = [
      apiClient.getMaterials({ limit: 3 }),
      apiClient.getProjects({ limit: 3 }),
      apiClient.getUsers({ limit: 3 })
    ];

    const concurrentResults = await Promise.all(concurrentPromises);
    consistencyTests.concurrent = {
      success: concurrentResults.every(r => r.ok),
      results: concurrentResults.map(r => ({
        success: r.ok,
        recordCount: r.data?.length || 0
      }))
    };

    const testResults = Object.values(consistencyTests);
    const successfulTests = testResults.filter((t: any) => t.success).length;

    let status: 'passed' | 'failed' | 'warning';
    let error: string | undefined;

    if (successfulTests === testResults.length) {
      status = 'passed';
    } else if (successfulTests > 0) {
      status = 'warning';
      error = `Only ${successfulTests}/${testResults.length} consistency tests passed`;
    } else {
      status = 'failed';
      error = 'Data consistency tests failed';
    }

    // Clean up test record
    if (testRecordId) {
      try {
        await apiClient.delete('Usuarios', testRecordId);
      } catch (cleanupError) {
        logger.warn('Failed to clean up consistency test record', cleanupError);
      }
    }

    return {
      name: 'Data Consistency',
      status,
      duration: Date.now() - startTime,
      details: {
        tests: consistencyTests,
        successfulTests,
        totalTests: testResults.length
      },
      error
    };
  } catch (error) {
    // Clean up test record if there was an error
    if (testRecordId) {
      try {
        await apiClient.delete('Usuarios', testRecordId);
      } catch (cleanupError) {
        logger.warn('Failed to clean up consistency test record', cleanupError);
      }
    }

    return {
      name: 'Data Consistency',
      status: 'failed',
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      error: 'Data consistency tests failed with exception'
    };
  }
}

/**
 * Format test results for console output
 */
export function formatTestResults(results: ComprehensiveTestResults): string {
  const lines = [
    '=' .repeat(60),
    'REAL DATA INTEGRATION TEST RESULTS',
    '=' .repeat(60),
    `Timestamp: ${results.timestamp}`,
    `Overall Status: ${results.overall.toUpperCase()}`,
    `Success Rate: ${results.summary.successRate}%`,
    `Duration: ${Math.round(results.summary.totalDuration / 1000)}s`,
    '',
    'Test Suites:',
    '-' .repeat(40)
  ];

  results.suites.forEach(suite => {
    const statusIcon = suite.status === 'passed' ? '✅' : 
                      suite.status === 'warning' ? '⚠️' : '❌';
    
    lines.push(`${statusIcon} ${suite.name} (${Math.round(suite.duration / 1000)}s)`);
    
    if (suite.error) {
      lines.push(`   Error: ${suite.error}`);
    }
  });

  lines.push('');
  lines.push('Summary:');
  lines.push(`  Total Suites: ${results.summary.total}`);
  lines.push(`  Passed: ${results.summary.passed}`);
  lines.push(`  Failed: ${results.summary.failed}`);
  lines.push(`  Warnings: ${results.summary.warnings}`);
  lines.push('=' .repeat(60));

  return lines.join('\n');
}

// Export for use in other modules
export default runRealDataIntegrationTests;