/**
 * CRUD Operations Tester Component
 * Comprehensive testing interface for all CRUD operations
 * Requirements: 4.3
 */

'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  duration: number;
  timestamp: string;
}

interface CRUDTesterProps {
  className?: string;
}

export default function CRUDTester({ className = '' }: CRUDTesterProps) {
  const [selectedTable, setSelectedTable] = useState('Materiales');
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [isRunning, setIsRunning] = useState<Record<string, boolean>>({});
  const [testData, setTestData] = useState({
    createData: JSON.stringify({
      sku: 'TEST001',
      descripcion: 'Material de Prueba',
      categoria: 'Test',
      unidad: 'Unidad',
      costo_ref: 10.50,
      stock_actual: 100,
      stock_minimo: 10,
      proveedor_principal: 'Proveedor Test',
      activo: true
    }, null, 2),
    updateData: JSON.stringify({
      descripcion: 'Material de Prueba Actualizado',
      costo_ref: 15.75,
      stock_actual: 150
    }, null, 2),
    recordId: '1'
  });

  const tables = [
    'Materiales', 'Proyectos', 'Actividades', 'Usuarios', 
    'Colaboradores', 'Clientes', 'BOM', 'Asignaciones', 'Horas'
  ];

  const operations = [
    { key: 'list', name: 'List (Read All)', description: 'Fetch all records with pagination' },
    { key: 'get', name: 'Get (Read One)', description: 'Fetch a specific record by ID' },
    { key: 'create', name: 'Create', description: 'Create a new record' },
    { key: 'update', name: 'Update', description: 'Update an existing record' },
    { key: 'delete', name: 'Delete', description: 'Delete a record by ID' }
  ];

  const setOperationRunning = (operation: string, running: boolean) => {
    setIsRunning(prev => ({ ...prev, [operation]: running }));
  };

  const setOperationResult = (operation: string, result: TestResult) => {
    setTestResults(prev => ({ ...prev, [operation]: result }));
  };

  const runOperation = async (operation: string) => {
    const startTime = Date.now();
    setOperationRunning(operation, true);

    try {
      let response;
      let testParams;

      switch (operation) {
        case 'list':
          response = await api.list(selectedTable, { limit: 10 });
          break;

        case 'get':
          response = await api.get(selectedTable, testData.recordId);
          break;

        case 'create':
          try {
            testParams = JSON.parse(testData.createData);
          } catch (e) {
            throw new Error('Invalid JSON in create data');
          }
          response = await api.create(selectedTable, testParams);
          break;

        case 'update':
          try {
            testParams = JSON.parse(testData.updateData);
          } catch (e) {
            throw new Error('Invalid JSON in update data');
          }
          response = await api.update(selectedTable, testData.recordId, testParams);
          break;

        case 'delete':
          response = await api.delete(selectedTable, testData.recordId);
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      const duration = Date.now() - startTime;

      if (response.ok) {
        setOperationResult(operation, {
          success: true,
          message: `${operation} operation completed successfully`,
          data: response.data,
          duration,
          timestamp: new Date().toISOString()
        });
      } else {
        setOperationResult(operation, {
          success: false,
          message: response.message || `${operation} operation failed`,
          error: response.message,
          duration,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setOperationResult(operation, {
        success: false,
        message: `${operation} operation failed: ${errorMessage}`,
        error: errorMessage,
        duration,
        timestamp: new Date().toISOString()
      });
    } finally {
      setOperationRunning(operation, false);
    }
  };

  const runAllOperations = async () => {
    for (const operation of operations) {
      await runOperation(operation.key);
      // Small delay between operations
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const clearResults = () => {
    setTestResults({});
  };

  const getStatusIcon = (result?: TestResult) => {
    if (!result) return '⚪';
    return result.success ? '✅' : '❌';
  };

  const getStatusColor = (result?: TestResult) => {
    if (!result) return 'text-gray-500';
    return result.success ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">CRUD Operations Tester</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={runAllOperations}
              disabled={Object.values(isRunning).some(running => running)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Run All Tests
            </button>
            <button
              onClick={clearResults}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear Results
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              Record ID (for Get, Update, Delete)
            </label>
            <input
              type="text"
              value={testData.recordId}
              onChange={(e) => setTestData(prev => ({ ...prev, recordId: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter record ID"
            />
          </div>
        </div>

        {/* Test Data Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Create Data (JSON)
            </label>
            <textarea
              value={testData.createData}
              onChange={(e) => setTestData(prev => ({ ...prev, createData: e.target.value }))}
              rows={8}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Enter JSON data for create operation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Data (JSON)
            </label>
            <textarea
              value={testData.updateData}
              onChange={(e) => setTestData(prev => ({ ...prev, updateData: e.target.value }))}
              rows={8}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Enter JSON data for update operation"
            />
          </div>
        </div>

        {/* Operations */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Operations</h3>
          
          {operations.map(operation => {
            const result = testResults[operation.key];
            const running = isRunning[operation.key];
            
            return (
              <div key={operation.key} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getStatusIcon(result)}</span>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{operation.name}</h4>
                      <p className="text-xs text-gray-500">{operation.description}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => runOperation(operation.key)}
                    disabled={running}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {running ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Running...
                      </div>
                    ) : (
                      'Test'
                    )}
                  </button>
                </div>

                {result && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${getStatusColor(result)}`}>
                        {result.success ? 'Success' : 'Failed'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {result.duration}ms • {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">{result.message}</p>
                    
                    {result.error && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
                        <strong>Error:</strong> {result.error}
                      </div>
                    )}
                    
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                          View Response Data
                        </summary>
                        <pre className="text-xs bg-white p-2 rounded border mt-1 overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {Object.keys(testResults).length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Test Summary</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {Object.keys(testResults).length}
                </div>
                <div className="text-xs text-gray-500">Total Tests</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Object.values(testResults).filter(r => r.success).length}
                </div>
                <div className="text-xs text-gray-500">Passed</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {Object.values(testResults).filter(r => !r.success).length}
                </div>
                <div className="text-xs text-gray-500">Failed</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(Object.values(testResults).reduce((sum, r) => sum + r.duration, 0) / Object.values(testResults).length)}ms
                </div>
                <div className="text-xs text-gray-500">Avg Time</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}