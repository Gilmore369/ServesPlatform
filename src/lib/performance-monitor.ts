/**
 * Performance monitoring utility for API operations
 */

import { logger } from './logger';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  totalOperations: number;
  averageDuration: number;
  successRate: number;
  errorRate: number;
  slowestOperation: PerformanceMetric | null;
  fastestOperation: PerformanceMetric | null;
  recentOperations: PerformanceMetric[];
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;
  private slowThreshold = 2000; // 2 seconds

  /**
   * Start timing an operation
   */
  startTiming(operation: string): () => void {
    const startTime = performance.now();
    const timestamp = Date.now();

    return (success = true, error?: string, metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      
      const metric: PerformanceMetric = {
        operation,
        duration,
        timestamp,
        success,
        error,
        metadata
      };

      this.addMetric(metric);

      // Log slow operations
      if (duration > this.slowThreshold) {
        logger.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`, {
          operation,
          duration,
          success,
          error,
          metadata
        });
      }
    };
  }

  /**
   * Add a metric to the collection
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(timeWindow?: number): PerformanceStats {
    const now = Date.now();
    const relevantMetrics = timeWindow 
      ? this.metrics.filter(m => now - m.timestamp <= timeWindow)
      : this.metrics;

    if (relevantMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        successRate: 0,
        errorRate: 0,
        slowestOperation: null,
        fastestOperation: null,
        recentOperations: []
      };
    }

    const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    const successfulOperations = relevantMetrics.filter(m => m.success).length;
    
    const sortedByDuration = [...relevantMetrics].sort((a, b) => a.duration - b.duration);
    const recentOperations = relevantMetrics
      .slice(-10)
      .sort((a, b) => b.timestamp - a.timestamp);

    return {
      totalOperations: relevantMetrics.length,
      averageDuration: totalDuration / relevantMetrics.length,
      successRate: successfulOperations / relevantMetrics.length,
      errorRate: (relevantMetrics.length - successfulOperations) / relevantMetrics.length,
      slowestOperation: sortedByDuration[sortedByDuration.length - 1] || null,
      fastestOperation: sortedByDuration[0] || null,
      recentOperations
    };
  }

  /**
   * Get metrics for a specific operation
   */
  getOperationStats(operation: string, timeWindow?: number): PerformanceStats {
    const now = Date.now();
    const operationMetrics = this.metrics.filter(m => {
      const matchesOperation = m.operation === operation;
      const withinTimeWindow = !timeWindow || (now - m.timestamp <= timeWindow);
      return matchesOperation && withinTimeWindow;
    });

    if (operationMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        successRate: 0,
        errorRate: 0,
        slowestOperation: null,
        fastestOperation: null,
        recentOperations: []
      };
    }

    const totalDuration = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    const successfulOperations = operationMetrics.filter(m => m.success).length;
    
    const sortedByDuration = [...operationMetrics].sort((a, b) => a.duration - b.duration);
    const recentOperations = operationMetrics
      .slice(-10)
      .sort((a, b) => b.timestamp - a.timestamp);

    return {
      totalOperations: operationMetrics.length,
      averageDuration: totalDuration / operationMetrics.length,
      successRate: successfulOperations / operationMetrics.length,
      errorRate: (operationMetrics.length - successfulOperations) / operationMetrics.length,
      slowestOperation: sortedByDuration[sortedByDuration.length - 1] || null,
      fastestOperation: sortedByDuration[0] || null,
      recentOperations
    };
  }

  /**
   * Get slow operations
   */
  getSlowOperations(threshold?: number): PerformanceMetric[] {
    const slowThreshold = threshold || this.slowThreshold;
    return this.metrics.filter(m => m.duration > slowThreshold);
  }

  /**
   * Get error operations
   */
  getErrorOperations(): PerformanceMetric[] {
    return this.metrics.filter(m => !m.success);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Set configuration
   */
  configure(options: {
    maxMetrics?: number;
    slowThreshold?: number;
  }): void {
    if (options.maxMetrics !== undefined) {
      this.maxMetrics = options.maxMetrics;
    }
    if (options.slowThreshold !== undefined) {
      this.slowThreshold = options.slowThreshold;
    }
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Generate performance report
   */
  generateReport(timeWindow?: number): string {
    const stats = this.getStats(timeWindow);
    const slowOps = this.getSlowOperations();
    const errorOps = this.getErrorOperations();

    const timeWindowText = timeWindow 
      ? ` (last ${Math.round(timeWindow / 1000 / 60)} minutes)`
      : '';

    return `
Performance Report${timeWindowText}
================================

General Statistics:
- Total Operations: ${stats.totalOperations}
- Average Duration: ${stats.averageDuration.toFixed(2)}ms
- Success Rate: ${(stats.successRate * 100).toFixed(1)}%
- Error Rate: ${(stats.errorRate * 100).toFixed(1)}%

Performance Issues:
- Slow Operations (>${this.slowThreshold}ms): ${slowOps.length}
- Failed Operations: ${errorOps.length}

${stats.slowestOperation ? `Slowest Operation: ${stats.slowestOperation.operation} (${stats.slowestOperation.duration.toFixed(2)}ms)` : ''}
${stats.fastestOperation ? `Fastest Operation: ${stats.fastestOperation.operation} (${stats.fastestOperation.duration.toFixed(2)}ms)` : ''}

Recent Operations:
${stats.recentOperations.map(op => 
  `- ${op.operation}: ${op.duration.toFixed(2)}ms ${op.success ? '✓' : '✗'}`
).join('\n')}
    `.trim();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator function to monitor performance of async functions
 */
export function monitorPerformance<T extends (...args: any[]) => Promise<any>>(
  operation: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const endTiming = performanceMonitor.startTiming(operation);
    
    try {
      const result = await fn(...args);
      endTiming(true, undefined, { args: args.length });
      return result;
    } catch (error) {
      endTiming(false, error instanceof Error ? error.message : 'Unknown error', { args: args.length });
      throw error;
    }
  }) as T;
}

/**
 * Hook for using performance monitoring in React components
 */
export function usePerformanceMonitor() {
  const startTiming = (operation: string) => {
    return performanceMonitor.startTiming(operation);
  };

  const getStats = (timeWindow?: number) => {
    return performanceMonitor.getStats(timeWindow);
  };

  const getOperationStats = (operation: string, timeWindow?: number) => {
    return performanceMonitor.getOperationStats(operation, timeWindow);
  };

  const generateReport = (timeWindow?: number) => {
    return performanceMonitor.generateReport(timeWindow);
  };

  return {
    startTiming,
    getStats,
    getOperationStats,
    generateReport
  };
}

export default PerformanceMonitor;