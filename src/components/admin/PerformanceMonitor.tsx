/**
 * Performance monitoring dashboard component
 * Displays query performance analytics and optimization suggestions
 */

import React, { useState, useEffect } from 'react';
import { queryPerformanceMonitor } from '../../lib/query-optimizer';
import { compressionService } from '../../lib/compression';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface PerformanceMetrics {
  totalQueries: number;
  averageExecutionTime: number;
  overallCacheHitRate: number;
  slowestQueries: Array<{
    table: string;
    operation: string;
    averageTime: number;
  }>;
  recommendations: string[];
}

interface CompressionStats {
  totalRequests: number;
  compressedRequests: number;
  averageCompressionRatio: number;
  totalBytesSaved: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [compressionStats, setCompressionStats] = useState<CompressionStats | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [tableAnalytics, setTableAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const tables = [
    'Proyectos', 'Actividades', 'Materiales', 'Colaboradores', 
    'Horas', 'Clientes', 'BOM', 'Asignaciones'
  ];

  const operations = ['list', 'get', 'create', 'update', 'delete'];

  useEffect(() => {
    loadPerformanceMetrics();
  }, []);

  useEffect(() => {
    if (selectedTable && selectedOperation) {
      loadTableAnalytics();
    }
  }, [selectedTable, selectedOperation]);

  const loadPerformanceMetrics = async () => {
    setIsLoading(true);
    try {
      // Get overall performance summary
      const metrics = queryPerformanceMonitor.getOverallPerformanceSummary();
      setPerformanceMetrics(metrics);

      // Get compression statistics (mock data for now)
      const compressionData: CompressionStats = {
        totalRequests: 150,
        compressedRequests: 89,
        averageCompressionRatio: 2.3,
        totalBytesSaved: 1024 * 1024 * 2.5 // 2.5 MB
      };
      setCompressionStats(compressionData);

    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTableAnalytics = async () => {
    if (!selectedTable || !selectedOperation) return;

    try {
      const analytics = queryPerformanceMonitor.getQueryAnalytics(selectedTable, selectedOperation);
      setTableAnalytics(analytics);
    } catch (error) {
      console.error('Failed to load table analytics:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getPerformanceColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'improving': return '📈';
      case 'degrading': return '📉';
      default: return '➡️';
    }
  };

  if (isLoading && !performanceMetrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando métricas de rendimiento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Monitor de Rendimiento</h2>
        <Button onClick={loadPerformanceMetrics} disabled={isLoading}>
          {isLoading ? 'Actualizando...' : 'Actualizar Métricas'}
        </Button>
      </div>

      {/* Overall Performance Summary */}
      {performanceMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm font-medium text-gray-500">Total de Consultas</div>
            <div className="text-2xl font-bold text-gray-900">
              {performanceMetrics.totalQueries.toLocaleString()}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-medium text-gray-500">Tiempo Promedio</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatTime(performanceMetrics.averageExecutionTime)}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-medium text-gray-500">Tasa de Cache Hit</div>
            <div className="text-2xl font-bold text-gray-900">
              {(performanceMetrics.overallCacheHitRate * 100).toFixed(1)}%
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-medium text-gray-500">Consultas Lentas</div>
            <div className="text-2xl font-bold text-red-600">
              {performanceMetrics.slowestQueries.length}
            </div>
          </Card>
        </div>
      )}

      {/* Compression Statistics */}
      {compressionStats && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas de Compresión</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-500">Requests Comprimidos</div>
              <div className="text-xl font-bold text-gray-900">
                {compressionStats.compressedRequests} / {compressionStats.totalRequests}
                <span className="text-sm text-gray-500 ml-1">
                  ({((compressionStats.compressedRequests / compressionStats.totalRequests) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500">Ratio Promedio</div>
              <div className="text-xl font-bold text-green-600">
                {compressionStats.averageCompressionRatio.toFixed(1)}x
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500">Bytes Ahorrados</div>
              <div className="text-xl font-bold text-blue-600">
                {formatBytes(compressionStats.totalBytesSaved)}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500">Eficiencia</div>
              <div className="text-xl font-bold text-green-600">
                {((1 - 1/compressionStats.averageCompressionRatio) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Slowest Queries */}
      {performanceMetrics && performanceMetrics.slowestQueries.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Consultas Más Lentas</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tabla
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tiempo Promedio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {performanceMetrics.slowestQueries.map((query, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {query.table}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {query.operation.toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      {formatTime(query.averageTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTable(query.table);
                          setSelectedOperation(query.operation);
                        }}
                      >
                        Analizar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Table-Specific Analytics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Análisis Específico por Tabla</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tabla
            </label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar tabla...</option>
              {tables.map(table => (
                <option key={table} value={table}>{table}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Operación
            </label>
            <select
              value={selectedOperation}
              onChange={(e) => setSelectedOperation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar operación...</option>
              {operations.map(operation => (
                <option key={operation} value={operation}>{operation.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {tableAnalytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Tiempo Promedio</div>
              <div className="text-xl font-bold text-gray-900">
                {formatTime(tableAnalytics.averageExecutionTime)}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Cache Hit Rate</div>
              <div className="text-xl font-bold text-gray-900">
                {(tableAnalytics.cacheHitRate * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Total Consultas</div>
              <div className="text-xl font-bold text-gray-900">
                {tableAnalytics.totalQueries}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Tendencia</div>
              <div className="text-xl font-bold text-gray-900">
                {getTrendIcon(tableAnalytics.performanceTrend)} {tableAnalytics.performanceTrend}
              </div>
            </div>
          </div>
        )}

        {tableAnalytics && tableAnalytics.recommendations.length > 0 && (
          <div className="mt-4">
            <h4 className="text-md font-semibold text-gray-900 mb-2">Recomendaciones</h4>
            <ul className="space-y-1">
              {tableAnalytics.recommendations.map((recommendation: string, index: number) => (
                <li key={index} className="text-sm text-gray-600 flex items-start">
                  <span className="text-yellow-500 mr-2">⚠️</span>
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* General Recommendations */}
      {performanceMetrics && performanceMetrics.recommendations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recomendaciones Generales</h3>
          <ul className="space-y-2">
            {performanceMetrics.recommendations.map((recommendation, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start">
                <span className="text-blue-500 mr-2">💡</span>
                {recommendation}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

export default PerformanceMonitor;