/**
 * Monitoring and error tracking utilities
 */

export interface MonitoringConfig {
  enableErrorTracking: boolean;
  enablePerformanceTracking: boolean;
  enableAnalytics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export const monitoringConfig: MonitoringConfig = {
  enableErrorTracking: process.env.NEXT_PUBLIC_ENABLE_ERROR_MONITORING === 'true',
  enablePerformanceTracking: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
  enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  logLevel: (process.env.NEXT_PUBLIC_LOG_LEVEL as MonitoringConfig['logLevel']) || 'info',
};

/**
 * Track errors in production
 */
export function trackError(error: Error, context?: Record<string, any>) {
  if (!monitoringConfig.enableErrorTracking) return;

  // In production, you would send this to your error tracking service
  // For now, we'll just log it
  console.error('Error tracked:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track performance metrics
 */
export function trackPerformance(metric: string, value: number, context?: Record<string, any>) {
  if (!monitoringConfig.enablePerformanceTracking) return;

  // In production, you would send this to your analytics service
  console.log('Performance metric:', {
    metric,
    value,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track user events
 */
export function trackEvent(event: string, properties?: Record<string, any>) {
  if (!monitoringConfig.enableAnalytics) return;

  // In production, you would send this to your analytics service
  console.log('Event tracked:', {
    event,
    properties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Initialize monitoring
 */
export function initializeMonitoring() {
  if (typeof window === 'undefined') return;

  // Track unhandled errors
  if (monitoringConfig.enableErrorTracking) {
    window.addEventListener('error', (event) => {
      trackError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      trackError(new Error(event.reason), {
        type: 'unhandledrejection',
      });
    });
  }

  // Track performance metrics
  if (monitoringConfig.enablePerformanceTracking) {
    // Track page load time
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      trackPerformance('page_load_time', loadTime);
    });
  }
}

export default {
  trackError,
  trackPerformance,
  trackEvent,
  initializeMonitoring,
  config: monitoringConfig,
};