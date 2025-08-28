/**
 * Query optimization utilities for Google Sheets operations
 * Implements requirement 2.1, 2.2 - optimize queries with efficient filters and indices
 */

import { logger } from './logger';
import { CRUDOperation } from './google-sheets-api-service';

export interface QueryOptimization {
  useServerSidePagination: boolean;
  useServerSideFiltering: boolean;
  useServerSideSorting: boolean;
  batchSize: number;
  cacheStrategy: 'aggressive' | 'moderate' | 'minimal';
  indexHints: string[];
}

export interface OptimizedQuery {
  operation: CRUDOperation;
  optimization: QueryOptimization;
  estimatedCost: number;
  reasoning: string[];
}

export interface QueryStats {
  totalRecords: number;
  filteredRecords: number;
  executionTime: number;
  cacheHit: boolean;
  optimizationsApplied: string[];
}

/**
 * Query optimizer for Google Sheets operations
 */
export class QueryOptimizer {
  private static readonly LARGE_DATASET_THRESHOLD = 1000;
  private static readonly VERY_LARGE_DATASET_THRESHOLD = 5000;
  private static readonly COMPLEX_FILTER_THRESHOLD = 3;

  /**
   * Optimize a CRUD operation based on data characteristics
   */
  static optimizeQuery(
    operation: CRUDOperation,
    datasetSize: number = 0,
    filterComplexity: number = 0
  ): OptimizedQuery {
    const optimization: QueryOptimization = {
      useServerSidePagination: false,
      useServerSideFiltering: false,
      useServerSideSorting: false,
      batchSize: 50,
      cacheStrategy: 'moderate',
      indexHints: []
    };

    const reasoning: string[] = [];
    let estimatedCost = 1;

    // Analyze dataset size
    if (datasetSize > this.VERY_LARGE_DATASET_THRESHOLD) {
      optimization.useServerSidePagination = true;
      optimization.useServerSideFiltering = true;
      optimization.useServerSideSorting = true;
      optimization.batchSize = 100;
      optimization.cacheStrategy = 'aggressive';
      estimatedCost += 3;
      reasoning.push('Very large dataset detected - using server-side operations');
    } else if (datasetSize > this.LARGE_DATASET_THRESHOLD) {
      optimization.useServerSidePagination = true;
      optimization.useServerSideFiltering = filterComplexity > 1;
      optimization.batchSize = 75;
      optimization.cacheStrategy = 'moderate';
      estimatedCost += 2;
      reasoning.push('Large dataset detected - using server-side pagination');
    }

    // Analyze filter complexity
    if (filterComplexity > this.COMPLEX_FILTER_THRESHOLD) {
      optimization.useServerSideFiltering = true;
      optimization.cacheStrategy = 'minimal'; // Complex filters change frequently
      estimatedCost += 1;
      reasoning.push('Complex filters detected - using server-side filtering');
    }

    // Operation-specific optimizations
    switch (operation.operation) {
      case 'list':
        optimization.indexHints = this.getIndexHints(operation.table, operation.filters);
        if (operation.pagination) {
          optimization.useServerSidePagination = true;
          reasoning.push('Pagination requested - using server-side pagination');
        }
        break;

      case 'get':
        optimization.cacheStrategy = 'aggressive';
        optimization.indexHints = ['id'];
        reasoning.push('Single record fetch - using aggressive caching');
        break;

      case 'create':
      case 'update':
      case 'delete':
        optimization.cacheStrategy = 'minimal';
        reasoning.push('Write operation - using minimal caching');
        break;
    }

    // Table-specific optimizations
    const tableOptimizations = this.getTableSpecificOptimizations(operation.table);
    optimization.indexHints.push(...tableOptimizations.indexHints);
    reasoning.push(...tableOptimizations.reasoning);

    return {
      operation,
      optimization,
      estimatedCost,
      reasoning
    };
  }

  /**
   * Get index hints for efficient querying
   */
  private static getIndexHints(table: string, filters?: Record<string, any>): string[] {
    const hints: string[] = [];

    // Primary index hints by table
    const tableIndexes: Record<string, string[]> = {
      'Proyectos': ['id', 'codigo', 'estado', 'responsable_id', 'cliente_id'],
      'Actividades': ['id', 'proyecto_id', 'estado', 'responsable_id'],
      'Materiales': ['id', 'sku', 'categoria', 'activo'],
      'Colaboradores': ['id', 'email', 'activo', 'rol'],
      'Horas': ['id', 'colaborador_id', 'proyecto_id', 'fecha'],
      'Clientes': ['id', 'razon_social', 'activo'],
      'BOM': ['id', 'proyecto_id', 'material_id'],
      'Asignaciones': ['id', 'colaborador_id', 'proyecto_id']
    };

    // Add table-specific indexes
    if (tableIndexes[table]) {
      hints.push(...tableIndexes[table]);
    }

    // Add filter-based indexes
    if (filters) {
      Object.keys(filters).forEach(filterKey => {
        if (!hints.includes(filterKey)) {
          hints.push(filterKey);
        }
      });
    }

    return hints;
  }

  /**
   * Get table-specific optimizations
   */
  private static getTableSpecificOptimizations(table: string): {
    indexHints: string[];
    reasoning: string[];
  } {
    const optimizations: Record<string, { indexHints: string[]; reasoning: string[] }> = {
      'Proyectos': {
        indexHints: ['estado', 'fecha_inicio', 'fecha_fin'],
        reasoning: ['Projects often filtered by status and dates']
      },
      'Actividades': {
        indexHints: ['proyecto_id', 'estado', 'fecha_inicio'],
        reasoning: ['Activities commonly filtered by project and status']
      },
      'Horas': {
        indexHints: ['colaborador_id', 'fecha', 'proyecto_id'],
        reasoning: ['Time entries frequently queried by user and date']
      },
      'Materiales': {
        indexHints: ['categoria', 'activo', 'stock_actual'],
        reasoning: ['Materials often filtered by category and stock status']
      },
      'Colaboradores': {
        indexHints: ['rol', 'activo', 'departamento'],
        reasoning: ['Personnel filtered by role and active status']
      }
    };

    return optimizations[table] || { indexHints: [], reasoning: [] };
  }

  /**
   * Build optimized query parameters
   */
  static buildOptimizedParams(
    operation: CRUDOperation,
    optimization: QueryOptimization
  ): Record<string, any> {
    const params: Record<string, any> = {
      table: operation.table,
      operation: operation.operation
    };

    // Add operation-specific parameters
    if (operation.id) params.id = operation.id;
    if (operation.data) params.data = operation.data;

    // Apply optimizations
    if (optimization.useServerSidePagination && operation.pagination) {
      params.page = operation.pagination.page;
      params.limit = Math.min(operation.pagination.limit, optimization.batchSize);
      params.server_side_pagination = true;
    }

    if (optimization.useServerSideFiltering && operation.filters) {
      params.filters = JSON.stringify(operation.filters);
      params.server_side_filtering = true;
    }

    if (optimization.useServerSideSorting) {
      params.server_side_sorting = true;
    }

    // Add index hints
    if (optimization.indexHints.length > 0) {
      params.index_hints = optimization.indexHints.join(',');
    }

    // Add cache strategy
    params.cache_strategy = optimization.cacheStrategy;

    return params;
  }

  /**
   * Analyze query performance and suggest improvements
   */
  static analyzeQueryPerformance(
    operation: CRUDOperation,
    stats: QueryStats
  ): {
    performanceScore: number;
    suggestions: string[];
    optimizations: string[];
  } {
    const suggestions: string[] = [];
    const optimizations: string[] = [];
    let performanceScore = 100;

    // Analyze execution time
    if (stats.executionTime > 5000) { // > 5 seconds
      performanceScore -= 30;
      suggestions.push('Query execution time is very slow (>5s)');
      optimizations.push('Consider server-side pagination and filtering');
    } else if (stats.executionTime > 2000) { // > 2 seconds
      performanceScore -= 15;
      suggestions.push('Query execution time is slow (>2s)');
      optimizations.push('Consider optimizing filters or reducing data size');
    }

    // Analyze data transfer efficiency
    const transferRatio = stats.filteredRecords / Math.max(stats.totalRecords, 1);
    if (transferRatio < 0.1 && stats.totalRecords > 100) {
      performanceScore -= 20;
      suggestions.push('Low filter efficiency - transferring too much unused data');
      optimizations.push('Use server-side filtering to reduce data transfer');
    }

    // Analyze cache effectiveness
    if (!stats.cacheHit && operation.operation === 'list') {
      performanceScore -= 10;
      suggestions.push('Cache miss for list operation');
      optimizations.push('Consider implementing better caching strategy');
    }

    // Table-specific analysis
    const tableSpecificSuggestions = this.getTableSpecificSuggestions(
      operation.table,
      stats
    );
    suggestions.push(...tableSpecificSuggestions.suggestions);
    optimizations.push(...tableSpecificSuggestions.optimizations);

    return {
      performanceScore: Math.max(0, performanceScore),
      suggestions,
      optimizations
    };
  }

  /**
   * Get table-specific performance suggestions
   */
  private static getTableSpecificSuggestions(
    table: string,
    stats: QueryStats
  ): {
    suggestions: string[];
    optimizations: string[];
  } {
    const suggestions: string[] = [];
    const optimizations: string[] = [];

    switch (table) {
      case 'Horas':
        if (stats.totalRecords > 1000) {
          suggestions.push('Large time entry dataset detected');
          optimizations.push('Consider date range filtering by default');
        }
        break;

      case 'Actividades':
        if (stats.totalRecords > 500) {
          suggestions.push('Large activities dataset detected');
          optimizations.push('Consider filtering by project or status by default');
        }
        break;

      case 'Materiales':
        if (stats.totalRecords > 1000) {
          suggestions.push('Large materials catalog detected');
          optimizations.push('Consider category-based filtering and search');
        }
        break;

      case 'AuditLog':
        suggestions.push('Audit log queries should always use date filtering');
        optimizations.push('Implement automatic date range limits');
        break;
    }

    return { suggestions, optimizations };
  }

  /**
   * Generate query execution plan
   */
  static generateExecutionPlan(optimizedQuery: OptimizedQuery): {
    steps: string[];
    estimatedTime: number;
    resourceUsage: {
      memory: 'low' | 'medium' | 'high';
      network: 'low' | 'medium' | 'high';
      cpu: 'low' | 'medium' | 'high';
    };
  } {
    const steps: string[] = [];
    let estimatedTime = 100; // Base time in ms
    
    const resourceUsage = {
      memory: 'low' as const,
      network: 'low' as const,
      cpu: 'low' as const
    };

    // Build execution steps
    steps.push(`1. Initialize ${optimizedQuery.operation.operation} operation on ${optimizedQuery.operation.table}`);

    if (optimizedQuery.optimization.indexHints.length > 0) {
      steps.push(`2. Apply index hints: ${optimizedQuery.optimization.indexHints.join(', ')}`);
      estimatedTime += 50;
    }

    if (optimizedQuery.optimization.useServerSideFiltering) {
      steps.push('3. Apply server-side filtering');
      estimatedTime += 200;
      resourceUsage.cpu = 'medium';
    }

    if (optimizedQuery.optimization.useServerSideSorting) {
      steps.push('4. Apply server-side sorting');
      estimatedTime += 150;
      resourceUsage.cpu = 'medium';
    }

    if (optimizedQuery.optimization.useServerSidePagination) {
      steps.push('5. Apply server-side pagination');
      estimatedTime += 100;
      resourceUsage.network = 'low';
    } else {
      resourceUsage.network = 'medium';
      resourceUsage.memory = 'medium';
    }

    // Cache strategy impact
    switch (optimizedQuery.optimization.cacheStrategy) {
      case 'aggressive':
        steps.push('6. Check aggressive cache');
        estimatedTime = Math.max(50, estimatedTime * 0.3);
        break;
      case 'moderate':
        steps.push('6. Check moderate cache');
        estimatedTime = Math.max(100, estimatedTime * 0.6);
        break;
      case 'minimal':
        steps.push('6. Minimal cache check');
        break;
    }

    steps.push('7. Execute optimized query');
    steps.push('8. Process and return results');

    return {
      steps,
      estimatedTime: Math.round(estimatedTime),
      resourceUsage
    };
  }
}

/**
 * Query performance monitor
 */
export class QueryPerformanceMonitor {
  private static queryStats: Map<string, QueryStats[]> = new Map();

  /**
   * Record query execution statistics
   */
  static recordQueryStats(
    operation: CRUDOperation,
    stats: QueryStats
  ): void {
    const key = `${operation.table}:${operation.operation}`;
    
    if (!this.queryStats.has(key)) {
      this.queryStats.set(key, []);
    }

    const queryHistory = this.queryStats.get(key)!;
    queryHistory.push(stats);

    // Keep only last 100 entries per query type
    if (queryHistory.length > 100) {
      queryHistory.shift();
    }

    logger.debug('Query performance recorded', {
      operation: operation.operation,
      table: operation.table,
      executionTime: stats.executionTime,
      cacheHit: stats.cacheHit,
      optimizationsApplied: stats.optimizationsApplied
    });
  }

  /**
   * Get performance analytics for a specific query type
   */
  static getQueryAnalytics(table: string, operation: string): {
    averageExecutionTime: number;
    cacheHitRate: number;
    totalQueries: number;
    performanceTrend: 'improving' | 'stable' | 'degrading';
    recommendations: string[];
  } {
    const key = `${table}:${operation}`;
    const queryHistory = this.queryStats.get(key) || [];

    if (queryHistory.length === 0) {
      return {
        averageExecutionTime: 0,
        cacheHitRate: 0,
        totalQueries: 0,
        performanceTrend: 'stable',
        recommendations: ['No query history available']
      };
    }

    const averageExecutionTime = queryHistory.reduce((sum, stat) => sum + stat.executionTime, 0) / queryHistory.length;
    const cacheHitRate = queryHistory.filter(stat => stat.cacheHit).length / queryHistory.length;

    // Analyze performance trend (last 20 vs previous 20)
    let performanceTrend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (queryHistory.length >= 40) {
      const recent = queryHistory.slice(-20);
      const previous = queryHistory.slice(-40, -20);
      
      const recentAvg = recent.reduce((sum, stat) => sum + stat.executionTime, 0) / recent.length;
      const previousAvg = previous.reduce((sum, stat) => sum + stat.executionTime, 0) / previous.length;
      
      const improvement = (previousAvg - recentAvg) / previousAvg;
      
      if (improvement > 0.1) {
        performanceTrend = 'improving';
      } else if (improvement < -0.1) {
        performanceTrend = 'degrading';
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (averageExecutionTime > 2000) {
      recommendations.push('Consider query optimization - average execution time is high');
    }
    
    if (cacheHitRate < 0.3) {
      recommendations.push('Improve caching strategy - low cache hit rate');
    }
    
    if (performanceTrend === 'degrading') {
      recommendations.push('Performance is degrading - investigate recent changes');
    }

    return {
      averageExecutionTime: Math.round(averageExecutionTime),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      totalQueries: queryHistory.length,
      performanceTrend,
      recommendations
    };
  }

  /**
   * Get overall performance summary
   */
  static getOverallPerformanceSummary(): {
    totalQueries: number;
    averageExecutionTime: number;
    overallCacheHitRate: number;
    slowestQueries: Array<{
      table: string;
      operation: string;
      averageTime: number;
    }>;
    recommendations: string[];
  } {
    const allStats: QueryStats[] = [];
    const queryAverages: Array<{
      table: string;
      operation: string;
      averageTime: number;
    }> = [];

    this.queryStats.forEach((stats, key) => {
      allStats.push(...stats);
      
      const [table, operation] = key.split(':');
      const averageTime = stats.reduce((sum, stat) => sum + stat.executionTime, 0) / stats.length;
      
      queryAverages.push({
        table,
        operation,
        averageTime
      });
    });

    const totalQueries = allStats.length;
    const averageExecutionTime = totalQueries > 0 
      ? allStats.reduce((sum, stat) => sum + stat.executionTime, 0) / totalQueries
      : 0;
    const overallCacheHitRate = totalQueries > 0
      ? allStats.filter(stat => stat.cacheHit).length / totalQueries
      : 0;

    const slowestQueries = queryAverages
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5);

    const recommendations: string[] = [];
    
    if (averageExecutionTime > 1500) {
      recommendations.push('Overall query performance needs improvement');
    }
    
    if (overallCacheHitRate < 0.4) {
      recommendations.push('Cache strategy needs optimization');
    }
    
    if (slowestQueries.length > 0 && slowestQueries[0].averageTime > 3000) {
      recommendations.push(`Focus on optimizing ${slowestQueries[0].table} ${slowestQueries[0].operation} queries`);
    }

    return {
      totalQueries,
      averageExecutionTime: Math.round(averageExecutionTime),
      overallCacheHitRate: Math.round(overallCacheHitRate * 100) / 100,
      slowestQueries,
      recommendations
    };
  }
}

// Export singleton instance
export const queryOptimizer = QueryOptimizer;
export const queryPerformanceMonitor = QueryPerformanceMonitor;