/**
 * Connection Health Monitor Component
 * Displays real-time API connection status and health metrics
 * Requirements: 4.1, 4.3
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  ConnectionMonitor, 
  HealthCheckResult, 
  performHealthCheck,
  formatTestResult 
} from '@/lib/api-test-utils';

interface ConnectionHealthMonitorProps {
  autoStart?: boolean;
  intervalMs?: number;
  showDetails?: boolean;
  className?: string;
}

export default function ConnectionHealthMonitor({
  autoStart = true,
  intervalMs = 30000,
  showDetails = false,
  className = ''
}: ConnectionHealthMonitorProps) {
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [monitor, setMonitor] = useState<ConnectionMonitor | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (autoStart) {
      startMonitoring();
    }

    return () => {
      if (monitor) {
        monitor.stop();
      }
    };
  }, [autoStart, intervalMs]);

  const startMonitoring = () => {
    if (monitor) {
      monitor.stop();
    }

    const newMonitor = new ConnectionMonitor(intervalMs);
    
    newMonitor.onHealthChange((result) => {
      setHealth(result);
      setIsLoading(false);
    });

    newMonitor.start();
    setMonitor(newMonitor);
    setIsMonitoring(true);
    setIsLoading(true);
  };

  const stopMonitoring = () => {
    if (monitor) {
      monitor.stop();
      setIsMonitoring(false);
    }
  };

  const runManualCheck = async () => {
    setIsLoading(true);
    try {
      const result = await performHealthCheck();
      setHealth(result);
    } catch (error) {
      console.error('Manual health check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌';
  };

  const getOverallStatusBadge = () => {
    if (isLoading) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-1"></div>
          Checking...
        </span>
      );
    }

    if (!health) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Unknown
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        health.healthy 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {getStatusIcon(health.healthy)} {health.healthy ? 'Healthy' : 'Issues Detected'}
      </span>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium text-gray-900">Connection Health</h3>
          {getOverallStatusBadge()}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={runManualCheck}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
            ) : (
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Check Now
          </button>
          
          {isMonitoring ? (
            <button
              onClick={stopMonitoring}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Stop Monitor
            </button>
          ) : (
            <button
              onClick={startMonitoring}
              className="inline-flex items-center px-3 py-1.5 border border-green-300 shadow-sm text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1M9 10v5a2 2 0 002 2h2a2 2 0 002-2v-5" />
              </svg>
              Start Monitor
            </button>
          )}
        </div>
      </div>

      {health && (
        <div className="space-y-3">
          {/* Service Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">API Connection</span>
                <span className={`text-sm ${getStatusColor(health.services.api.success)}`}>
                  {getStatusIcon(health.services.api.success)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{health.services.api.duration}ms</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Authentication</span>
                <span className={`text-sm ${getStatusColor(health.services.auth.success)}`}>
                  {getStatusIcon(health.services.auth.success)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{health.services.auth.duration}ms</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Database</span>
                <span className={`text-sm ${getStatusColor(health.services.database.success)}`}>
                  {getStatusIcon(health.services.database.success)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{health.services.database.duration}ms</p>
            </div>
          </div>

          {/* Overall Status */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Overall Status</span>
              <span className={`text-sm ${getStatusColor(health.overall.success)}`}>
                {health.overall.message}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Last checked: {new Date(health.overall.timestamp).toLocaleTimeString()}
            </p>
          </div>

          {/* Detailed Information */}
          {showDetails && (
            <div className="mt-4 space-y-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
              
              <div className="bg-gray-50 rounded-lg p-3 text-xs">
                <h4 className="font-medium text-gray-700 mb-2">Service Details</h4>
                <div className="space-y-2 font-mono text-gray-600">
                  <div>
                    <strong>API:</strong> {formatTestResult(health.services.api)}
                  </div>
                  <div>
                    <strong>Auth:</strong> {formatTestResult(health.services.auth)}
                  </div>
                  <div>
                    <strong>Database:</strong> {formatTestResult(health.services.database)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {!health.healthy && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-red-800 mb-2">Issues Detected</h4>
              <div className="space-y-1 text-xs text-red-700">
                {!health.services.api.success && (
                  <div>• API: {health.services.api.message}</div>
                )}
                {!health.services.auth.success && (
                  <div>• Authentication: {health.services.auth.message}</div>
                )}
                {!health.services.database.success && (
                  <div>• Database: {health.services.database.message}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!health && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-sm">Click "Check Now" to test connection health</p>
        </div>
      )}
    </div>
  );
}