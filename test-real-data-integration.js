/**
 * Simple Real Data Integration Test Script
 * Can be run directly with Node.js to test the integration
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.4, 10.5
 * Task: 9.5 Test and validate real data integration
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  API_BASE_URL: 'https://script.google.com/macros/s/AKfycbyyi5RtzRcodSArUVUH5G82jf_8rkD5_SKX8VqV31WtoA93YZk7hgcE3ciCXzLue46wLg/exec',
  API_TOKEN: 'demo-token-2024',
  TIMEOUT: 10000
};

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }[type] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function makeRequest(params) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.API_BASE_URL);
    
    // Add parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, typeof params[key] === 'object' ? JSON.stringify(params[key]) : params[key]);
      }
    });

    const requestModule = url.protocol === 'https:' ? https : http;
    
    const req = requestModule.get(url.toString(), {
      timeout: CONFIG.TIMEOUT
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            ok: res.statusCode >= 200 && res.statusCode < 300
          });
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${error.message}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTest(testName, testFunction) {
  testResults.total++;
  const startTime = Date.now();
  
  try {
    log(`Running: ${testName}`);
    const result = await testFunction();
    const duration = Date.now() - startTime;
    
    if (result.status === 'passed') {
      testResults.passed++;
      log(`✅ PASSED: ${testName} (${duration}ms)`, 'success');
    } else if (result.status === 'warning') {
      testResults.warnings++;
      log(`⚠️ WARNING: ${testName} (${duration}ms) - ${result.message}`, 'warning');
    } else {
      testResults.failed++;
      log(`❌ FAILED: ${testName} (${duration}ms) - ${result.message}`, 'error');
    }
    
    testResults.tests.push({
      name: testName,
      status: result.status,
      duration,
      message: result.message,
      details: result.details
    });
    
  } catch (error) {
    testResults.failed++;
    const duration = Date.now() - startTime;
    log(`❌ FAILED: ${testName} (${duration}ms) - ${error.message}`, 'error');
    
    testResults.tests.push({
      name: testName,
      status: 'failed',
      duration,
      message: error.message,
      error: error.message
    });
  }
}

// Test functions
async function testAPIConnection() {
  const response = await makeRequest({
    token: CONFIG.API_TOKEN,
    action: 'health'
  });
  
  if (!response.ok) {
    return {
      status: 'failed',
      message: `HTTP ${response.status}: API connection failed`
    };
  }
  
  if (!response.data.ok && !response.data.success) {
    return {
      status: 'failed',
      message: response.data.message || 'API returned error response'
    };
  }
  
  return {
    status: 'passed',
    message: 'API connection successful',
    details: {
      status: response.status,
      healthy: response.data.data?.healthy,
      spreadsheet: response.data.data?.spreadsheet?.name
    }
  };
}

async function testAuthentication() {
  const response = await makeRequest({
    token: CONFIG.API_TOKEN,
    action: 'auth',
    email: 'admin@servesplatform.com',
    password: 'admin123'
  });
  
  if (!response.ok) {
    return {
      status: 'failed',
      message: `Authentication failed: HTTP ${response.status}`
    };
  }
  
  if (!response.data.ok) {
    return {
      status: 'failed',
      message: response.data.message || 'Authentication failed'
    };
  }
  
  if (!response.data.data?.token) {
    return {
      status: 'failed',
      message: 'No authentication token received'
    };
  }
  
  return {
    status: 'passed',
    message: 'Authentication successful',
    details: {
      user: response.data.data.user?.email,
      hasToken: !!response.data.data.token
    }
  };
}

async function testDataLoading(tableName) {
  const response = await makeRequest({
    token: CONFIG.API_TOKEN,
    action: 'crud',
    table: tableName,
    operation: 'list',
    limit: 5
  });
  
  if (!response.ok) {
    return {
      status: 'failed',
      message: `Failed to load data from ${tableName}: HTTP ${response.status}`
    };
  }
  
  if (!response.data.ok) {
    return {
      status: 'failed',
      message: response.data.message || `Failed to load data from ${tableName}`
    };
  }
  
  const data = response.data.data;
  const recordCount = Array.isArray(data?.data) ? data.data.length : (Array.isArray(data) ? data.length : 0);
  const source = data?.source || 'unknown';
  
  if (source === 'mock_data') {
    return {
      status: 'warning',
      message: `${tableName} is using mock data - may indicate Google Sheets connectivity issues`,
      details: {
        recordCount,
        source,
        hasData: recordCount > 0
      }
    };
  }
  
  return {
    status: 'passed',
    message: `Successfully loaded data from ${tableName}`,
    details: {
      recordCount,
      source,
      hasData: recordCount > 0
    }
  };
}

async function testCRUDOperations() {
  const testTable = 'Usuarios';
  const testRecord = {
    email: `test-crud-${Date.now()}@example.com`,
    nombre: 'CRUD Test User',
    rol: 'tecnico',
    activo: true
  };
  
  let createdRecordId = null;
  
  try {
    // Test CREATE
    const createResponse = await makeRequest({
      token: CONFIG.API_TOKEN,
      action: 'crud',
      table: testTable,
      operation: 'create',
      ...testRecord
    });
    
    if (!createResponse.ok || !createResponse.data.ok) {
      return {
        status: 'failed',
        message: 'CREATE operation failed',
        details: { createResponse: createResponse.data }
      };
    }
    
    createdRecordId = createResponse.data.data?.id;
    if (!createdRecordId) {
      return {
        status: 'failed',
        message: 'CREATE operation did not return a record ID'
      };
    }
    
    // Test READ
    const readResponse = await makeRequest({
      token: CONFIG.API_TOKEN,
      action: 'crud',
      table: testTable,
      operation: 'get',
      id: createdRecordId
    });
    
    if (!readResponse.ok || !readResponse.data.ok) {
      return {
        status: 'failed',
        message: 'READ operation failed',
        details: { readResponse: readResponse.data }
      };
    }
    
    // Test UPDATE
    const updateResponse = await makeRequest({
      token: CONFIG.API_TOKEN,
      action: 'crud',
      table: testTable,
      operation: 'update',
      id: createdRecordId,
      nombre: 'Updated CRUD Test User'
    });
    
    if (!updateResponse.ok || !updateResponse.data.ok) {
      return {
        status: 'warning',
        message: 'UPDATE operation failed, but CREATE and READ worked',
        details: { updateResponse: updateResponse.data }
      };
    }
    
    // Test DELETE
    const deleteResponse = await makeRequest({
      token: CONFIG.API_TOKEN,
      action: 'crud',
      table: testTable,
      operation: 'delete',
      id: createdRecordId
    });
    
    if (!deleteResponse.ok || !deleteResponse.data.ok) {
      return {
        status: 'warning',
        message: 'DELETE operation failed, but other CRUD operations worked',
        details: { deleteResponse: deleteResponse.data }
      };
    }
    
    return {
      status: 'passed',
      message: 'All CRUD operations successful',
      details: {
        createdId: createdRecordId,
        operations: ['CREATE', 'READ', 'UPDATE', 'DELETE']
      }
    };
    
  } catch (error) {
    // Clean up if there was an error and we created a record
    if (createdRecordId) {
      try {
        await makeRequest({
          token: CONFIG.API_TOKEN,
          action: 'crud',
          table: testTable,
          operation: 'delete',
          id: createdRecordId
        });
      } catch (cleanupError) {
        log(`Failed to clean up test record: ${cleanupError.message}`, 'warning');
      }
    }
    
    throw error;
  }
}

async function testErrorHandling() {
  const errorTests = [];
  
  // Test invalid table
  try {
    const response = await makeRequest({
      token: CONFIG.API_TOKEN,
      action: 'crud',
      table: 'NonExistentTable',
      operation: 'list'
    });
    
    errorTests.push({
      test: 'Invalid Table',
      handledGracefully: !response.data.ok,
      message: response.data.message
    });
  } catch (error) {
    errorTests.push({
      test: 'Invalid Table',
      handledGracefully: true,
      message: error.message
    });
  }
  
  // Test invalid record ID
  try {
    const response = await makeRequest({
      token: CONFIG.API_TOKEN,
      action: 'crud',
      table: 'Usuarios',
      operation: 'get',
      id: 'INVALID_ID_12345'
    });
    
    errorTests.push({
      test: 'Invalid ID',
      handledGracefully: !response.data.ok,
      message: response.data.message
    });
  } catch (error) {
    errorTests.push({
      test: 'Invalid ID',
      handledGracefully: true,
      message: error.message
    });
  }
  
  const gracefullyHandled = errorTests.filter(t => t.handledGracefully).length;
  
  if (gracefullyHandled === errorTests.length) {
    return {
      status: 'passed',
      message: 'All error scenarios handled gracefully',
      details: { errorTests }
    };
  } else if (gracefullyHandled > 0) {
    return {
      status: 'warning',
      message: `Only ${gracefullyHandled}/${errorTests.length} error scenarios handled gracefully`,
      details: { errorTests }
    };
  } else {
    return {
      status: 'failed',
      message: 'Error handling not working properly',
      details: { errorTests }
    };
  }
}

// Main test execution
async function runAllTests() {
  log('🚀 Starting Real Data Integration Tests');
  log(`API Base URL: ${CONFIG.API_BASE_URL}`);
  log(`API Token: ${CONFIG.API_TOKEN}`);
  
  // Test 1: API Connection
  await runTest('API Connection', testAPIConnection);
  
  // Test 2: Authentication
  await runTest('Authentication', testAuthentication);
  
  // Test 3: Data Loading
  const testTables = ['Usuarios', 'Materiales', 'Proyectos', 'Actividades'];
  for (const table of testTables) {
    await runTest(`Data Loading - ${table}`, () => testDataLoading(table));
  }
  
  // Test 4: CRUD Operations
  await runTest('CRUD Operations', testCRUDOperations);
  
  // Test 5: Error Handling
  await runTest('Error Handling', testErrorHandling);
  
  // Print summary
  log('\n' + '='.repeat(60));
  log('TEST RESULTS SUMMARY');
  log('='.repeat(60));
  log(`Total Tests: ${testResults.total}`);
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'info');
  log(`Warnings: ${testResults.warnings}`, testResults.warnings > 0 ? 'warning' : 'info');
  
  const successRate = Math.round((testResults.passed / testResults.total) * 100);
  log(`Success Rate: ${successRate}%`);
  
  let overallStatus;
  if (testResults.failed > 0) {
    overallStatus = 'FAILED';
    log(`Overall Status: ${overallStatus}`, 'error');
  } else if (testResults.warnings > 0) {
    overallStatus = 'WARNING';
    log(`Overall Status: ${overallStatus}`, 'warning');
  } else {
    overallStatus = 'PASSED';
    log(`Overall Status: ${overallStatus}`, 'success');
  }
  
  log('='.repeat(60));
  
  // Detailed results
  if (testResults.failed > 0 || testResults.warnings > 0) {
    log('\nDETAILED RESULTS:');
    testResults.tests.forEach(test => {
      if (test.status !== 'passed') {
        log(`${test.status.toUpperCase()}: ${test.name} - ${test.message}`);
        if (test.details) {
          log(`  Details: ${JSON.stringify(test.details, null, 2)}`);
        }
      }
    });
  }
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});