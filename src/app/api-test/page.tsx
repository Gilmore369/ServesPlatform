/**
 * API Testing Page
 * Comprehensive testing interface for API connectivity and operations
 * Requirements: 4.1, 4.3
 */

'use client';

import React, { useState } from 'react';
import ConnectionHealthMonitor from '@/components/ConnectionHealthMonitor';
import CRUDTester from '@/components/CRUDTester';
import { 
  testAPIConnection,
  testCORSConfiguration,
  testAuthentication,
  testDatabaseOperations,
  testCRUDOperation,
  ConnectionTestResult
} from '@/lib/api-test-utils';

interface TestResult {
  name: string;
  result: ConnectionTestResult | null;
  isRunning: boolean;
}

export default function APITestPage() {
  const [tests, setTests] = useState<Record<string, TestResult>>({
    connection: { name: 'API Connection', result: null, isRunning: false },
    cors: { name: 'CORS Configuration', result: null, isRunning: false },
    auth: { name: 'Authentication', result: null, isRunning: false },
    database: { name: 'Database Operations', result: null, isRunning: false },
  });

  const [crudTests, setCrudTests] = useState<Record<string, TestResult>>({});
  const [selectedTable, setSelectedTable] = useState('Materiales');
  const [selectedOperation, setSelectedOperation] = useState<'list' | 'get' | 'create' | 'update' | 'delete'>('list');
  const [testParams, setTestParams] = useState('{}');

  const tables = [
    'Materiales', 'Proyectos', 'Actividades', 'Usuarios', 
    'Colaboradores', 'Clientes', 'BOM', 'Asignaciones', 'Horas'
  ];

  const updateTestResult = (testKey: string, result: ConnectionTestResult | null, isRunning: boolean) => {
    setTests(prev => ({
      ...prev,
      [testKey]: {
        ...prev[testKey],
        result,
        isRunning
      }
    }));
  };

  const runTest = async (testKey: string, testFunction: () => Promise<ConnectionTestResult>) => {
    updateTestResult(testKey, null, true);
    
    try {
      const result = await testFunction();
      updateTestResult(testKey, result, false);
    } catch (error) {
      const errorResult: ConnectionTestResult = {
        success: false,
        message: `Test failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        duration: 0
      };
      updateTestResult(testKey, errorResult, false);
    }
  };

  const runAllTests = async () => {
    const testFunctions = [
      { key: 'connection', fn: testAPIConnection },
      { key: 'cors', fn: testCORSConfiguration },
      { key: 'auth', fn: testAuthentication },
      { key: 'database', fn: testDatabaseOperations },
    ];

    for (const { key, fn } of testFunctions) {
      await runTest(key, fn);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const runCRUDTest = async () => {
    const testKey = `${selectedTable}-${selectedOperation}`;
    
    setCrudTests(prev => ({
      ...prev,
      [testKey]: {
        name: `${selectedTable} ${selectedOperation}`,
        result: null,
        isRunning: true
      }
    }));

    try {
      let params: any = {};
      
      try {
        params = JSON.parse(testParams);
      } catch (e) {
        params = {};
      }

      // Add default params for different operations
      if (selectedOperation === 'get' && !params.id) {
        params.id = '1';
      }
      if (selectedOperation === 'create' && !params.data) {
        params.data = { name: 'Test Item', description: 'Test Description' };
      }
      if (selectedOperation === 'update' && !params.id) {
        params.id = '1';
        if (!params.data) {
          params.data = { name: 'Updated Test Item' };
        }
      }
      if (selectedOperation === 'delete' && !params.id) {
        params.id = '1';
      }

      const result = await testCRUDOperation(selectedTable, selectedOperation, params);
      
      setCrudTests(prev => ({
        ...prev,
        [testKey]: {
          name: `${selectedTable} ${selectedOperation}`,
          result,
          isRunning: false
        }
      }));
    } catch (error) {
      const errorResult: ConnectionTestResult = {
        success: false,
        message: `CRUD test failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        duration: 0
      };
      
      setCrudTests(prev => ({
        ...prev,
        [testKey]: {
          name: `${selectedTable} ${selectedOperation}`,
          result: errorResult,
          isRunning: false
        }
      }));
    }
  };

  const renderTestResult = (test: TestResult) => {
    if (test.isRunning) {
      return (
        <div className="flex items-center text-yellow-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
          Running...
        </div>
      );
    }

    if (!test.result) {
      return <span className="text-gray-500">Not run</span>;
    }

    const { success, message, duration } = test.result;
    const statusColor = success ? 'text-green-600' : 'text-red-600';
    const statusIcon = success ? '✅' : '❌';

    return (
      <div className={statusColor}>
        <div className="flex items-center">
          <span className="mr-2">{statusIcon}</span>
          <span className="font-medium">{success ? 'Success' : 'Failed'}</span>
          <span className="ml-2 text-sm text-gray-500">({duration}ms)</span>
        </div>
        <p className="text-sm mt-1">{message}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">API Testing Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Comprehensive testing suite for API connectivity, authentication, and CRUD operations
          </p>
        </div>

        {/* Connection Health Monitor */}
        <div className="mb-8">
          <ConnectionHealthMonitor 
            autoStart={true}
            showDetails={true}
            className="w-full"
          />
        </div>

        {/* CRUD Operations Tester */}
        <div className="mb-8">
          <CRUDTester className="w-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Basic Tests */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Basic API Tests</h2>
                <button
                  onClick={runAllTests}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Run All Tests
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {Object.entries(tests).map(([key, test]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{test.name}</h3>
                    <div className="mt-1">
                      {renderTestResult(test)}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      switch (key) {
                        case 'connection':
                          runTest(key, testAPIConnection);
                          break;
                        case 'cors':
                          runTest(key, testCORSConfiguration);
                          break;
                        case 'auth':
                          runTest(key, testAuthentication);
                          break;
                        case 'database':
                          runTest(key, testDatabaseOperations);
                          break;
                      }
                    }}
                    disabled={test.isRunning}
                    className="ml-4 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {test.isRunning ? 'Running...' : 'Test'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* CRUD Tests */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">CRUD Operation Tests</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Table
                  </label>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {tables.map(table => (
                      <option key={table} value={table}>{table}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operation
                  </label>
                  <select
                    value={selectedOperation}
                    onChange={(e) => setSelectedOperation(e.target.value as any)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="list">List</option>
                    <option value="get">Get</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parameters (JSON)
                  </label>
                  <textarea
                    value={testParams}
                    onChange={(e) => setTestParams(e.target.value)}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder='{"id": "1", "data": {"name": "Test"}}'
                  />
                </div>

                <button
                  onClick={runCRUDTest}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Run CRUD Test
                </button>
              </div>

              {/* CRUD Test Results */}
              {Object.keys(crudTests).length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">CRUD Test Results</h3>
                  <div className="space-y-3">
                    {Object.entries(crudTests).map(([key, test]) => (
                      <div key={key} className="bg-gray-50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-gray-700">{test.name}</h4>
                        <div className="mt-1">
                          {renderTestResult(test)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test Results Details */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Detailed Test Results</h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-6">
              {Object.entries(tests).map(([key, test]) => (
                test.result && (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">{test.name}</h3>
                    <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                      {JSON.stringify(test.result, null, 2)}
                    </pre>
                  </div>
                )
              ))}
              
              {Object.entries(crudTests).map(([key, test]) => (
                test.result && (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">{test.name}</h3>
                    <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                      {JSON.stringify(test.result, null, 2)}
                    </pre>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}