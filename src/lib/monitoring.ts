/**
 * Enhanced Monitoring and Performance Tracking System
 * Implements comprehensive metrics collection for Google Sheets API operations
 */

import { logger } from './logger';

export interface MonitoringConfig {
  enableErrorTracking: boolean;
  enablePerformanceTracking: boolean;
  enableAnalytics: boolean;
  enableAPIMetrics: boolean;
  enableAlerts: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  metricsRetentionDays: number;
  alertThresholds: AlertThresholds;
}

export interface AlertThresholds {
  apiResponseTime: number; // milliseconds
  errorRate: number; // percentage
  cacheHitRate: number; // percentage (minimum)
  memoryUsage: number; // percentage
  requestsPerMinute: number; // maximum
}

export const monitoringConfig: MonitoringConfig = {
  enableErrorTracking: process.env.NEXT_PUBLIC_ENABLE_ERROR_MONITORING === 'true',
  enablePerformanceTracking: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
  enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  enableAPIMetrics: process.env.NEXT_PUBLIC_ENABLE_API_METRICS !== 'false', // Default enabled
  enableAlerts: process.env.NEXT_PUBLIC_ENABLE_ALERTS === 'true',
  logLevel: (process.env.NEXT_PUBLIC_LOG_LEVEL as MonitoringConfig['logLevel']) || 'info',
  metricsRetentionDays: parseInt(process.env.NEXT_PUBLIC_METRICS_RETENTION_DAYS || '30'),
  alertThresholds: {
    apiResponseTime: parseInt(process.env.NEXT_PUBLIC_ALERT_API_RESPONSE_TIME || '5000'),
    errorRate: parseFloat(process.env.NEXT_PUBLIC_ALERT_ERROR_RATE || '5.0'),
    cacheHitRate: parseFloat(process.env.NEXT_PUBLIC_ALERT_CACHE_HIT_RATE || '70.0'),
    memoryUsage: parseFloat(process.env.NEXT_PUBLIC_ALERT_MEMORY_USAGE || '80.0'),
    requestsPerMinute: parseInt(process.env.NEXT_PUBLIC_ALERT_REQUESTS_PER_MINUTE || '1000')
  }
};

// Performance Metrics Storage
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  context?: Record<string, any>;
  tags?: string[];
}

interface APIMetric {
  endpoint: string;
  method: string;
  status: number;
  duration: number;
  timestamp: number;
  userId?: string;
  cacheHit?: boolean;
  error?: string;
}

interface SystemMetric {
  type: 'memory' | 'cpu' | 'requests' | 'errors';
  value: number;
  timestamp: number;
  context?: Record<string, any>;
}

class MetricsCollector {
  private performanceMetrics: PerformanceMetric[] = [];
  private apiMetrics: APIMetric[] = [];
  private systemMetrics: SystemMetric[] = [];
  private alertHistory: Array<{ type: string; message: string; timestamp: number }> = [];

  // Store metrics with automatic cleanup
  addPerformanceMetric(metric: PerformanceMetric) {
    this.performanceMetrics.push(metric);
    this.cleanupOldMetrics();
  }

  addAPIMetric(metric: APIMetric) {
    this.apiMetrics.push(metric);
    this.cleanupOldMetrics();
    this.checkAPIAlerts(metric);
  }

  addSystemMetric(metric: SystemMetric) {
    this.systemMetrics.push(metric);
    this.cleanupOldMetrics();
    this.checkSystemAlerts(metric);
  }

  // Get metrics for dashboard
  getMetricsSummary(timeRange: number = 3600000) { // Default 1 hour
    const now = Date.now();
    const cutoff = now - timeRange;

    const recentAPIMetrics = this.apiMetrics.filter(m => m.timestamp > cutoff);
    const recentSystemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoff);

    return {
      api: this.calculateAPIStats(recentAPIMetrics),
      system: this.calculateSystemStats(recentSystemMetrics),
      alerts: this.alertHistory.filter(a => a.timestamp > cutoff),
      totalRequests: recentAPIMetrics.length,
      timeRange: timeRange / 1000 / 60 // minutes
    };
  }

  private calculateAPIStats(metrics: APIMetric[]) {
    if (metrics.length === 0) return null;

    const totalRequests = metrics.length;
    const errorRequests = metrics.filter(m => m.status >= 400).length;
    const cacheHits = metrics.filter(m => m.cacheHit).length;
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const maxResponseTime = Math.max(...metrics.map(m => m.duration));

    // Group by endpoint
    const endpointStats = metrics.reduce((acc, metric) => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!acc[key]) {
        acc[key] = { count: 0, totalTime: 0, errors: 0 };
      }
      acc[key].count++;
      acc[key].totalTime += metric.duration;
      if (metric.status >= 400) acc[key].errors++;
      return acc;
    }, {} as Record<string, { count: number; totalTime: number; errors: number }>);

    return {
      totalRequests,
      errorRate: (errorRequests / totalRequests) * 100,
      cacheHitRate: (cacheHits / totalRequests) * 100,
      avgResponseTime: Math.round(avgResponseTime),
      maxResponseTime,
      endpointStats: Object.entries(endpointStats).map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avgTime: Math.round(stats.totalTime / stats.count),
        errorRate: (stats.errors / stats.count) * 100
      }))
    };
  }

  private calculateSystemStats(metrics: SystemMetric[]) {
    if (metrics.length === 0) return null;

    const memoryMetrics = metrics.filter(m => m.type === 'memory');
    const currentMemory = memoryMetrics.length > 0 ? memoryMetrics[memoryMetrics.length - 1].value : 0;

    return {
      currentMemoryUsage: currentMemory,
      totalMetrics: metrics.length
    };
  }

  private checkAPIAlerts(metric: APIMetric) {
    if (!monitoringConfig.enableAlerts) return;

    // Check response time alert
    if (metric.duration > monitoringConfig.alertThresholds.apiResponseTime) {
      this.triggerAlert('high_response_time', 
        `API response time exceeded threshold: ${metric.duration}ms for ${metric.method} ${metric.endpoint}`);
    }

    // Check error rate (calculate over last 100 requests)
    const recentMetrics = this.apiMetrics.slice(-100);
    const errorRate = (recentMetrics.filter(m => m.status >= 400).length / recentMetrics.length) * 100;
    if (errorRate > monitoringConfig.alertThresholds.errorRate) {
      this.triggerAlert('high_error_rate', 
        `Error rate exceeded threshold: ${errorRate.toFixed(2)}%`);
    }
  }

  private checkSystemAlerts(metric: SystemMetric) {
    if (!monitoringConfig.enableAlerts) return;

    if (metric.type === 'memory' && metric.value > monitoringConfig.alertThresholds.memoryUsage) {
      this.triggerAlert('high_memory_usage', 
        `Memory usage exceeded threshold: ${metric.value.toFixed(2)}%`);
    }
  }

  private triggerAlert(type: string, message: string) {
    const alert = { type, message, timestamp: Date.now() };
    this.alertHistory.push(alert);
    
    logger.warn(`ALERT: ${message}`, { alertType: type });
    
    // In production, send to external alerting service
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
      this.sendAlert(alert);
    }
  }

  private async sendAlert(alert: { type: string; message: string; timestamp: number }) {
    try {
      // Send to external alerting service (Slack, PagerDuty, etc.)
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      });
    } catch (error) {
      logger.error('Failed to send alert', error as Error);
    }
  }

  private cleanupOldMetrics() {
    const cutoff = Date.now() - (monitoringConfig.metricsRetentionDays * 24 * 60 * 60 * 1000);
    
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp > cutoff);
    this.apiMetrics = this.apiMetrics.filter(m => m.timestamp > cutoff);
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoff);
    this.alertHistory = this.alertHistory.filter(a => a.timestamp > cutoff);
  }
}

// Global metrics collector instance
const metricsCollector = new MetricsCollector();

/**
 * Track errors with enhanced context and alerting
 */
export function trackError(error: Error, context?: Record<string, any>) {
  if (!monitoringConfig.enableErrorTracking) return;

  const errorData = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined
  };

  // Log error with structured logging
  logger.error('Error tracked', error, context);

  // Add to system metrics
  metricsCollector.addSystemMetric({
    type: 'errors',
    value: 1,
    timestamp: Date.now(),
    context: { errorType: error.name, ...context }
  });

  // In production, send to external error tracking service
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
    sendToErrorTrackingService(errorData);
  }
}

/**
 * Track performance metrics with enhanced collection and alerting
 */
export function trackPerformance(metric: string, value: number, context?: Record<string, any>) {
  if (!monitoringConfig.enablePerformanceTracking) return;

  const performanceData: PerformanceMetric = {
    name: metric,
    value,
    timestamp: Date.now(),
    context,
    tags: context?.tags || []
  };

  // Add to metrics collector
  metricsCollector.addPerformanceMetric(performanceData);

  // Log performance metric
  logger.performance(metric, value, context?.component, context);

  // In production, send to external analytics service
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
    sendToAnalyticsService('performance', performanceData);
  }
}

/**
 * Track API operations with comprehensive metrics collection
 */
export function trackAPIOperation(
  endpoint: string,
  method: string,
  status: number,
  duration: number,
  options?: {
    userId?: string;
    cacheHit?: boolean;
    error?: string;
    context?: Record<string, any>;
  }
) {
  if (!monitoringConfig.enableAPIMetrics) return;

  const apiMetric: APIMetric = {
    endpoint,
    method,
    status,
    duration,
    timestamp: Date.now(),
    userId: options?.userId,
    cacheHit: options?.cacheHit,
    error: options?.error
  };

  // Add to metrics collector
  metricsCollector.addAPIMetric(apiMetric);

  // Log API operation
  logger.apiCall(method, endpoint, duration, status, options?.context);
}

/**
 * Track user events with enhanced analytics
 */
export function trackEvent(event: string, properties?: Record<string, any>) {
  if (!monitoringConfig.enableAnalytics) return;

  const eventData = {
    event,
    properties,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    userId: properties?.userId
  };

  // Log user event
  logger.userAction(
    properties?.userId || 'anonymous',
    event,
    properties?.component,
    properties
  );

  // In production, send to external analytics service
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
    sendToAnalyticsService('event', eventData);
  }
}

/**
 * Track system metrics (memory, CPU, etc.)
 */
export function trackSystemMetrics() {
  if (typeof window === 'undefined') return;

  // Memory usage (if available)
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const memoryUsage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
    
    metricsCollector.addSystemMetric({
      type: 'memory',
      value: memoryUsage,
      timestamp: Date.now(),
      context: {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
    });
  }

  // Request rate tracking
  const requestCount = metricsCollector.getMetricsSummary(60000).totalRequests; // Last minute
  metricsCollector.addSystemMetric({
    type: 'requests',
    value: requestCount,
    timestamp: Date.now()
  });
}

/**
 * Get monitoring dashboard data
 */
export function getMonitoringData(timeRange?: number) {
  return metricsCollector.getMetricsSummary(timeRange);
}

/**
 * Initialize comprehensive monitoring system
 */
export function initializeMonitoring() {
  if (typeof window === 'undefined') return;

  logger.info('Initializing monitoring system', {
    config: monitoringConfig,
    timestamp: new Date().toISOString()
  });

  // Track unhandled errors
  if (monitoringConfig.enableErrorTracking) {
    window.addEventListener('error', (event) => {
      trackError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript_error'
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      trackError(new Error(event.reason), {
        type: 'unhandled_promise_rejection',
        reason: event.reason
      });
    });
  }

  // Track performance metrics
  if (monitoringConfig.enablePerformanceTracking) {
    // Track page load time
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        trackPerformance('page_load_time', navigation.loadEventEnd - navigation.fetchStart, {
          component: 'page_load',
          url: window.location.pathname
        });
        
        trackPerformance('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart, {
          component: 'dom_load',
          url: window.location.pathname
        });
      }
    });

    // Track resource loading times
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          trackPerformance('resource_load_time', resourceEntry.duration, {
            component: 'resource_load',
            resourceType: resourceEntry.initiatorType,
            resourceName: resourceEntry.name.split('/').pop()
          });
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
  }

  // Start system metrics collection
  if (monitoringConfig.enableAPIMetrics) {
    // Collect system metrics every 30 seconds
    setInterval(trackSystemMetrics, 30000);
    
    // Initial collection
    trackSystemMetrics();
  }

  logger.info('Monitoring system initialized successfully');
}

// Helper functions
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let sessionId = sessionStorage.getItem('monitoring_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('monitoring_session_id', sessionId);
  }
  return sessionId;
}

async function sendToErrorTrackingService(errorData: any) {
  try {
    await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    });
  } catch (error) {
    console.error('Failed to send error to tracking service:', error);
  }
}

async function sendToAnalyticsService(type: string, data: any) {
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data })
    });
  } catch (error) {
    console.error('Failed to send analytics data:', error);
  }
}

/**
 * Higher-order function to wrap API calls with monitoring
 */
export function withAPIMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  endpoint: string,
  method: string = 'GET'
): T {
  return (async (...args: any[]) => {
    const startTime = performance.now();
    let status = 200;
    let error: string | undefined;
    let cacheHit = false;

    try {
      const result = await fn(...args);
      
      // Check if result indicates cache hit
      if (result && typeof result === 'object' && result.metadata?.cacheHit) {
        cacheHit = true;
      }
      
      // Check if result indicates error
      if (result && typeof result === 'object' && !result.ok) {
        status = result.status || 500;
        error = result.message;
      }
      
      return result;
    } catch (err) {
      status = 500;
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const duration = performance.now() - startTime;
      trackAPIOperation(endpoint, method, status, duration, {
        cacheHit,
        error,
        context: { args: args.length }
      });
    }
  }) as T;
}

/**
 * React Hook for component-level monitoring
 */
export function useMonitoring(componentName: string) {
  const trackComponentError = (error: Error, context?: Record<string, any>) => {
    trackError(error, { component: componentName, ...context });
  };

  const trackComponentPerformance = (metric: string, value: number, context?: Record<string, any>) => {
    trackPerformance(metric, value, { component: componentName, ...context });
  };

  const trackComponentEvent = (event: string, properties?: Record<string, any>) => {
    trackEvent(event, { component: componentName, ...properties });
  };

  return {
    trackError: trackComponentError,
    trackPerformance: trackComponentPerformance,
    trackEvent: trackComponentEvent
  };
}

export default {
  trackError,
  trackPerformance,
  trackEvent,
  trackAPIOperation,
  trackSystemMetrics,
  getMonitoringData,
  initializeMonitoring,
  withAPIMonitoring,
  useMonitoring,
  config: monitoringConfig,
};