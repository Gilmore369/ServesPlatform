/**
 * Performance optimizations tests
 * Tests compression, lazy loading, and query optimization features
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { compressionService, CompressionService } from '../../lib/compression';
import { queryOptimizer, QueryOptimizer, queryPerformanceMonitor } from '../../lib/query-optimizer';
import { CRUDOperation } from '../../lib/google-sheets-api-service';

// Mock data for testing
const mockLargeData = {
  data: Array.from({ length: 1000 }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
    description: `This is a detailed description for item ${i} with lots of text to make it larger`,
    category: `Category ${i % 10}`,
    price: Math.random() * 1000,
    stock: Math.floor(Math.random() * 100),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))
};

const mockSmallData = {
  data: [
    { id: '1', name: 'Item 1', description: 'Small item' },
    { id: '2', name: 'Item 2', description: 'Another small item' }
  ]
};

describe('CompressionService', () => {
  let compressionService: CompressionService;

  beforeEach(() => {
    compressionService = new CompressionService({
      enabled: true,
      threshold: 100, // Low threshold for testing
      algorithm: 'gzip',
      level: 6
    });
  });

  describe('compressData', () => {
    it('should compress large data', async () => {
      const result = await compressionService.compressData(mockLargeData);

      expect(result.compressed).toBe(true);
      expect(result.originalSize).toBeGreaterThan(result.compressedSize);
      expect(result.compressionRatio).toBeGreaterThan(1);
      expect(result.data).toBeDefined();
    }, 10000);

    it('should not compress small data below threshold', async () => {
      const smallCompressionService = new CompressionService({
        enabled: true,
        threshold: 10000, // High threshold
        algorithm: 'gzip',
        level: 6
      });

      const result = await smallCompressionService.compressData(mockSmallData);

      expect(result.compressed).toBe(false);
      expect(result.originalSize).toBe(result.compressedSize);
      expect(result.compressionRatio).toBe(1);
    });

    it('should handle compression disabled', async () => {
      const disabledCompressionService = new CompressionService({
        enabled: false,
        threshold: 100,
        algorithm: 'gzip',
        level: 6
      });

      const result = await disabledCompressionService.compressData(mockLargeData);

      expect(result.compressed).toBe(false);
      expect(result.compressionRatio).toBe(1);
    });

    it('should handle string input', async () => {
      const largeString = 'x'.repeat(2000);
      const result = await compressionService.compressData(largeString);

      expect(result.compressed).toBe(true);
      expect(result.compressionRatio).toBeGreaterThan(1);
    });
  });

  describe('decompressData', () => {
    it('should decompress compressed data', async () => {
      const originalData = JSON.stringify(mockLargeData);
      const compressionResult = await compressionService.compressData(originalData);

      if (compressionResult.compressed) {
        const decompressed = await compressionService.decompressData(
          compressionResult.data,
          true
        );

        expect(decompressed).toBe(originalData);
      }
    }, 10000);

    it('should return uncompressed data as-is', async () => {
      const originalData = JSON.stringify(mockSmallData);
      const decompressed = await compressionService.decompressData(originalData, false);

      expect(decompressed).toBe(originalData);
    });
  });

  describe('getCompressionStats', () => {
    it('should calculate compression statistics', () => {
      const results = [
        {
          compressed: true,
          originalSize: 1000,
          compressedSize: 500,
          compressionRatio: 2,
          data: 'compressed-data-1'
        },
        {
          compressed: true,
          originalSize: 2000,
          compressedSize: 800,
          compressionRatio: 2.5,
          data: 'compressed-data-2'
        },
        {
          compressed: false,
          originalSize: 100,
          compressedSize: 100,
          compressionRatio: 1,
          data: 'uncompressed-data'
        }
      ];

      const stats = compressionService.getCompressionStats(results);

      expect(stats.totalRequests).toBe(3);
      expect(stats.compressedRequests).toBe(2);
      expect(stats.averageCompressionRatio).toBe(2.25);
      expect(stats.totalBytesSaved).toBe(1700); // (1000-500) + (2000-800) + (100-0)
    });
  });
});

describe('QueryOptimizer', () => {
  describe('optimizeQuery', () => {
    it('should optimize large dataset queries', () => {
      const operation: CRUDOperation = {
        table: 'Materiales',
        operation: 'list',
        pagination: { page: 1, limit: 50 }
      };

      const optimized = QueryOptimizer.optimizeQuery(operation, 5000, 2);

      expect(optimized.optimization.useServerSidePagination).toBe(true);
      expect(optimized.optimization.useServerSideFiltering).toBe(true);
      expect(optimized.optimization.useServerSideSorting).toBe(true);
      expect(optimized.optimization.cacheStrategy).toBe('aggressive');
      expect(optimized.estimatedCost).toBeGreaterThan(1);
      expect(optimized.reasoning).toContain('Very large dataset detected - using server-side operations');
    });

    it('should optimize medium dataset queries', () => {
      const operation: CRUDOperation = {
        table: 'Proyectos',
        operation: 'list',
        filters: { estado: 'activo' }
      };

      const optimized = QueryOptimizer.optimizeQuery(operation, 1500, 1);

      expect(optimized.optimization.useServerSidePagination).toBe(true);
      expect(optimized.optimization.useServerSideFiltering).toBe(false);
      expect(optimized.optimization.cacheStrategy).toBe('moderate');
      expect(optimized.reasoning).toContain('Large dataset detected - using server-side pagination');
    });

    it('should optimize complex filter queries', () => {
      const operation: CRUDOperation = {
        table: 'Horas',
        operation: 'list',
        filters: {
          colaborador_id: '123',
          fecha_inicio: { from: '2024-01-01', to: '2024-01-31' },
          proyecto_id: { in: ['proj1', 'proj2', 'proj3'] },
          estado: 'completado'
        }
      };

      const optimized = QueryOptimizer.optimizeQuery(operation, 500, 4);

      expect(optimized.optimization.useServerSideFiltering).toBe(true);
      expect(optimized.optimization.cacheStrategy).toBe('minimal');
      expect(optimized.reasoning).toContain('Complex filters detected - using server-side filtering');
    });

    it('should optimize single record queries', () => {
      const operation: CRUDOperation = {
        table: 'Usuarios',
        operation: 'get',
        id: '123'
      };

      const optimized = QueryOptimizer.optimizeQuery(operation, 100, 0);

      expect(optimized.optimization.cacheStrategy).toBe('aggressive');
      expect(optimized.optimization.indexHints).toContain('id');
      expect(optimized.reasoning).toContain('Single record fetch - using aggressive caching');
    });

    it('should optimize write operations', () => {
      const operation: CRUDOperation = {
        table: 'Materiales',
        operation: 'update',
        id: '123',
        data: { stock_actual: 50 }
      };

      const optimized = QueryOptimizer.optimizeQuery(operation, 1000, 0);

      expect(optimized.optimization.cacheStrategy).toBe('minimal');
      expect(optimized.reasoning).toContain('Write operation - using minimal caching');
    });
  });

  describe('buildOptimizedParams', () => {
    it('should build optimized parameters', () => {
      const operation: CRUDOperation = {
        table: 'Materiales',
        operation: 'list',
        filters: { categoria: 'herramientas' },
        pagination: { page: 2, limit: 50 }
      };

      const optimization = {
        useServerSidePagination: true,
        useServerSideFiltering: true,
        useServerSideSorting: true,
        batchSize: 100,
        cacheStrategy: 'moderate' as const,
        indexHints: ['categoria', 'activo']
      };

      const params = QueryOptimizer.buildOptimizedParams(operation, optimization);

      expect(params.table).toBe('Materiales');
      expect(params.operation).toBe('list');
      expect(params.page).toBe(2);
      expect(params.limit).toBe(50);
      expect(params.filters).toBe(JSON.stringify({ categoria: 'herramientas' }));
      expect(params.server_side_pagination).toBe(true);
      expect(params.server_side_filtering).toBe(true);
      expect(params.server_side_sorting).toBe(true);
      expect(params.index_hints).toBe('categoria,activo');
      expect(params.cache_strategy).toBe('moderate');
    });
  });

  describe('analyzeQueryPerformance', () => {
    it('should analyze slow query performance', () => {
      const operation: CRUDOperation = {
        table: 'Horas',
        operation: 'list'
      };

      const stats = {
        totalRecords: 10000,
        filteredRecords: 100,
        executionTime: 6000, // 6 seconds
        cacheHit: false,
        optimizationsApplied: []
      };

      const analysis = QueryOptimizer.analyzeQueryPerformance(operation, stats);

      expect(analysis.performanceScore).toBeLessThan(70);
      expect(analysis.suggestions).toContain('Query execution time is very slow (>5s)');
      expect(analysis.suggestions).toContain('Low filter efficiency - transferring too much unused data');
      expect(analysis.optimizations).toContain('Consider server-side pagination and filtering');
    });

    it('should analyze good query performance', () => {
      const operation: CRUDOperation = {
        table: 'Usuarios',
        operation: 'get',
        id: '123'
      };

      const stats = {
        totalRecords: 1,
        filteredRecords: 1,
        executionTime: 500, // 0.5 seconds
        cacheHit: true,
        optimizationsApplied: ['cache-hit']
      };

      const analysis = QueryOptimizer.analyzeQueryPerformance(operation, stats);

      expect(analysis.performanceScore).toBeGreaterThan(90);
      expect(analysis.suggestions.length).toBeLessThan(2);
    });
  });

  describe('generateExecutionPlan', () => {
    it('should generate execution plan for optimized query', () => {
      const operation: CRUDOperation = {
        table: 'Materiales',
        operation: 'list',
        filters: { categoria: 'herramientas' }
      };

      const optimized = QueryOptimizer.optimizeQuery(operation, 2000, 2);
      const plan = QueryOptimizer.generateExecutionPlan(optimized);

      expect(plan.steps.length).toBeGreaterThan(5);
      expect(plan.steps[0]).toContain('Initialize list operation on Materiales');
      expect(plan.estimatedTime).toBeGreaterThan(0);
      expect(plan.resourceUsage.memory).toBeDefined();
      expect(plan.resourceUsage.network).toBeDefined();
      expect(plan.resourceUsage.cpu).toBeDefined();
    });
  });
});

describe('QueryPerformanceMonitor', () => {
  beforeEach(() => {
    // Clear any existing stats
    (queryPerformanceMonitor as any).queryStats = new Map();
  });

  describe('recordQueryStats', () => {
    it('should record query statistics', () => {
      const operation: CRUDOperation = {
        table: 'Materiales',
        operation: 'list'
      };

      const stats = {
        totalRecords: 1000,
        filteredRecords: 50,
        executionTime: 1500,
        cacheHit: false,
        optimizationsApplied: ['server-side-pagination']
      };

      queryPerformanceMonitor.recordQueryStats(operation, stats);

      const analytics = queryPerformanceMonitor.getQueryAnalytics('Materiales', 'list');
      expect(analytics.totalQueries).toBe(1);
      expect(analytics.averageExecutionTime).toBe(1500);
      expect(analytics.cacheHitRate).toBe(0);
    });

    it('should maintain query history limit', () => {
      const operation: CRUDOperation = {
        table: 'Test',
        operation: 'list'
      };

      // Record more than 100 queries
      for (let i = 0; i < 150; i++) {
        const stats = {
          totalRecords: 100,
          filteredRecords: 10,
          executionTime: 1000 + i,
          cacheHit: i % 2 === 0,
          optimizationsApplied: []
        };
        queryPerformanceMonitor.recordQueryStats(operation, stats);
      }

      const analytics = queryPerformanceMonitor.getQueryAnalytics('Test', 'list');
      expect(analytics.totalQueries).toBe(100); // Should be limited to 100
    });
  });

  describe('getQueryAnalytics', () => {
    it('should calculate query analytics', () => {
      const operation: CRUDOperation = {
        table: 'Proyectos',
        operation: 'list'
      };

      // Record multiple queries with different performance
      const queries = [
        { executionTime: 1000, cacheHit: true },
        { executionTime: 1500, cacheHit: false },
        { executionTime: 800, cacheHit: true },
        { executionTime: 2000, cacheHit: false }
      ];

      queries.forEach(query => {
        queryPerformanceMonitor.recordQueryStats(operation, {
          totalRecords: 100,
          filteredRecords: 50,
          executionTime: query.executionTime,
          cacheHit: query.cacheHit,
          optimizationsApplied: []
        });
      });

      const analytics = queryPerformanceMonitor.getQueryAnalytics('Proyectos', 'list');

      expect(analytics.totalQueries).toBe(4);
      expect(analytics.averageExecutionTime).toBe(1325); // (1000+1500+800+2000)/4
      expect(analytics.cacheHitRate).toBe(0.5); // 2 out of 4
      expect(analytics.performanceTrend).toBe('stable');
    });

    it('should detect performance trends', () => {
      const operation: CRUDOperation = {
        table: 'TrendTest',
        operation: 'list'
      };

      // Record 40 queries: first 20 slow, last 20 fast (improving trend)
      for (let i = 0; i < 40; i++) {
        const executionTime = i < 20 ? 3000 : 1000; // Improvement after 20 queries
        queryPerformanceMonitor.recordQueryStats(operation, {
          totalRecords: 100,
          filteredRecords: 50,
          executionTime,
          cacheHit: false,
          optimizationsApplied: []
        });
      }

      const analytics = queryPerformanceMonitor.getQueryAnalytics('TrendTest', 'list');
      expect(analytics.performanceTrend).toBe('improving');
    });
  });

  describe('getOverallPerformanceSummary', () => {
    it('should provide overall performance summary', () => {
      // Record queries for multiple tables
      const tables = ['Materiales', 'Proyectos', 'Horas'];
      const operations = ['list', 'get'];

      tables.forEach(table => {
        operations.forEach(operation => {
          for (let i = 0; i < 5; i++) {
            queryPerformanceMonitor.recordQueryStats(
              { table, operation } as CRUDOperation,
              {
                totalRecords: 100,
                filteredRecords: 50,
                executionTime: 1000 + Math.random() * 1000,
                cacheHit: Math.random() > 0.5,
                optimizationsApplied: []
              }
            );
          }
        });
      });

      const summary = queryPerformanceMonitor.getOverallPerformanceSummary();

      expect(summary.totalQueries).toBe(30); // 3 tables * 2 operations * 5 queries
      expect(summary.averageExecutionTime).toBeGreaterThan(0);
      expect(summary.overallCacheHitRate).toBeGreaterThanOrEqual(0);
      expect(summary.overallCacheHitRate).toBeLessThanOrEqual(1);
      expect(summary.slowestQueries.length).toBeLessThanOrEqual(5);
      expect(summary.recommendations).toBeDefined();
    });
  });
});

describe('Integration Tests', () => {
  it('should work together: compression + optimization', async () => {
    // Create a large dataset operation
    const operation: CRUDOperation = {
      table: 'Materiales',
      operation: 'list',
      filters: { categoria: 'herramientas' },
      pagination: { page: 1, limit: 100 }
    };

    // Optimize the query
    const optimized = QueryOptimizer.optimizeQuery(operation, 5000, 2);
    expect(optimized.optimization.useServerSidePagination).toBe(true);

    // Simulate large response data
    const responseData = mockLargeData;

    // Compress the response
    const compressionResult = await compressionService.compressData(responseData);
    expect(compressionResult.compressed).toBe(true);
    expect(compressionResult.compressionRatio).toBeGreaterThan(1);

    // Record performance stats
    const stats = {
      totalRecords: 5000,
      filteredRecords: 100,
      executionTime: 1200,
      cacheHit: false,
      optimizationsApplied: optimized.reasoning
    };

    queryPerformanceMonitor.recordQueryStats(operation, stats);

    // Verify analytics
    const analytics = queryPerformanceMonitor.getQueryAnalytics('Materiales', 'list');
    expect(analytics.totalQueries).toBe(1);
    expect(analytics.averageExecutionTime).toBe(1200);
  }, 10000);
});