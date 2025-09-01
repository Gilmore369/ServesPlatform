"use client";

import React, { useState, useEffect } from 'react';

interface ConnectionStatus {
  health: 'loading' | 'success' | 'error';
  dashboardStats: 'loading' | 'success' | 'error';
  projects: 'loading' | 'success' | 'error';
  personnel: 'loading' | 'success' | 'error';
}

interface TestResult {
  endpoint: string;
  status: 'loading' | 'success' | 'error';
  message: string;
  data?: any;
  duration?: number;
}

const ConnectionDiagnostic: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults([]);

    const tests = [
      {
        name: 'Health Check',
        endpoint: '/api/health',
        test: async () => {
          const response = await fetch('/api/health');
          return await response.json();
        }
      },
      {
        name: 'Dashboard Stats',
        endpoint: '/api/dashboard/stats',
        test: async () => {
          const response = await fetch('/api/dashboard/stats');
          return await response.json();
        }
      },
      {
        name: 'Projects API',
        endpoint: '/api/proyectos',
        test: async () => {
          const response = await fetch('/api/proyectos');
          return await response.json();
        }
      },
      {
        name: 'Personnel API',
        endpoint: '/api/usuarios',
        test: async () => {
          const response = await fetch('/api/usuarios');
          return await response.json();
        }
      }
    ];

    for (const test of tests) {
      const startTime = Date.now();
      
      // Add loading result
      setResults(prev => [...prev, {
        endpoint: test.name,
        status: 'loading',
        message: 'Testing...'
      }]);

      try {
        const data = await test.test();
        const duration = Date.now() - startTime;
        
        // Update with success result
        setResults(prev => prev.map(result => 
          result.endpoint === test.name 
            ? {
                endpoint: test.name,
                status: 'success',
                message: `✅ Success (${duration}ms)`,
                data,
                duration
              }
            : result
        ));
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Update with error result
        setResults(prev => prev.map(result => 
          result.endpoint === test.name 
            ? {
                endpoint: test.name,
                status: 'error',
                message: `❌ Error: ${error.message} (${duration}ms)`,
                duration
              }
            : result
        ));
      }
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>;
      case 'success':
        return <div className="w-4 h-4 bg-green-500 rounded-full"></div>;
      case 'error':
        return <div className="w-4 h-4 bg-red-500 rounded-full"></div>;
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full"></div>;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Diagnóstico de Conexión"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-96 max-h-96 overflow-y-auto z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Diagnóstico de Conexión</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        <button
          onClick={runDiagnostic}
          disabled={isRunning}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Ejecutando Pruebas...' : 'Ejecutar Diagnóstico'}
        </button>

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Resultados:</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{result.endpoint}</div>
                  <div className="text-xs text-gray-600">{result.message}</div>
                  {result.data && (
                    <details className="mt-1">
                      <summary className="text-xs text-blue-600 cursor-pointer">Ver datos</summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_BASE_URL}</p>
          <p><strong>Token:</strong> {process.env.NEXT_PUBLIC_API_TOKEN}</p>
          <p><strong>Force Real API:</strong> {process.env.NEXT_PUBLIC_FORCE_REAL_API}</p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionDiagnostic;