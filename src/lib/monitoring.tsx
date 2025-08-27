/**
 * Performance and Error Monitoring Utilities
 */

import React from 'react'

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  url?: string
  userAgent?: string
}

interface ErrorReport {
  message: string
  stack?: string
  url: string
  timestamp: number
  userAgent?: string
  userId?: string
}

class MonitoringService {
  private isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production'
  private enableAnalytics = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
  private enableErrorMonitoring = process.env.NEXT_PUBLIC_ENABLE_ERROR_MONITORING === 'true'

  /**
   * Track performance metrics
   */
  trackPerformance(name: string, value: number, additionalData?: Record<string, any>) {
    if (!this.enableAnalytics) return

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    }

    // Log to console in development
    if (!this.isProduction) {
      console.log('Performance Metric:', metric, additionalData)
    }

    // Send to analytics service in production
    if (this.isProduction && typeof window !== 'undefined') {
      this.sendToAnalytics('performance', { ...metric, ...additionalData })
    }
  }

  /**
   * Track Core Web Vitals
   */
  trackWebVitals() {
    if (!this.enableAnalytics || typeof window === 'undefined') return

    // Track Largest Contentful Paint (LCP)
    this.observePerformanceEntry('largest-contentful-paint', (entry) => {
      this.trackPerformance('LCP', entry.startTime)
    })

    // Track First Input Delay (FID)
    this.observePerformanceEntry('first-input', (entry) => {
      this.trackPerformance('FID', entry.processingStart - entry.startTime)
    })

    // Track Cumulative Layout Shift (CLS)
    this.observePerformanceEntry('layout-shift', (entry) => {
      if (!entry.hadRecentInput) {
        this.trackPerformance('CLS', entry.value)
      }
    })
  }

  /**
   * Track page load performance
   */
  trackPageLoad() {
    if (!this.enableAnalytics || typeof window === 'undefined') return

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigation) {
        this.trackPerformance('TTFB', navigation.responseStart - navigation.requestStart)
        this.trackPerformance('DOM_LOAD', navigation.domContentLoadedEventEnd - navigation.navigationStart)
        this.trackPerformance('FULL_LOAD', navigation.loadEventEnd - navigation.navigationStart)
      }
    })
  }

  /**
   * Track API performance
   */
  trackAPICall(endpoint: string, duration: number, success: boolean) {
    if (!this.enableAnalytics) return

    this.trackPerformance('API_CALL', duration, {
      endpoint,
      success,
      type: 'api'
    })
  }

  /**
   * Track user interactions
   */
  trackUserAction(action: string, category: string, label?: string, value?: number) {
    if (!this.enableAnalytics) return

    const eventData = {
      action,
      category,
      label,
      value,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    }

    if (!this.isProduction) {
      console.log('User Action:', eventData)
    }

    if (this.isProduction && typeof window !== 'undefined') {
      this.sendToAnalytics('event', eventData)
    }
  }

  /**
   * Report errors
   */
  reportError(error: Error, context?: Record<string, any>) {
    if (!this.enableErrorMonitoring) return

    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    }

    // Log to console in development
    if (!this.isProduction) {
      console.error('Error Report:', errorReport, context)
    }

    // Send to error monitoring service in production
    if (this.isProduction) {
      this.sendToErrorService(errorReport, context)
    }
  }

  /**
   * Track component render performance
   */
  trackComponentRender(componentName: string, renderTime: number) {
    if (!this.enableAnalytics) return

    this.trackPerformance('COMPONENT_RENDER', renderTime, {
      component: componentName,
      type: 'render'
    })
  }

  /**
   * Monitor memory usage
   */
  trackMemoryUsage() {
    if (!this.enableAnalytics || typeof window === 'undefined') return

    // @ts-ignore - performance.memory is not in all browsers
    const memory = (performance as any).memory
    if (memory) {
      this.trackPerformance('MEMORY_USED', memory.usedJSHeapSize / 1024 / 1024, {
        total: memory.totalJSHeapSize / 1024 / 1024,
        limit: memory.jsHeapSizeLimit / 1024 / 1024,
        type: 'memory'
      })
    }
  }

  /**
   * Private helper methods
   */
  private observePerformanceEntry(type: string, callback: (entry: any) => void) {
    if (typeof window === 'undefined') return

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          callback(entry)
        }
      })
      observer.observe({ type, buffered: true })
    } catch (error) {
      // PerformanceObserver not supported
      console.warn(`PerformanceObserver for ${type} not supported`)
    }
  }

  private sendToAnalytics(type: string, data: any) {
    // Implement your analytics service integration here
    // Example: Google Analytics, Mixpanel, etc.
    
    if (typeof gtag !== 'undefined') {
      // Google Analytics 4
      gtag('event', type, data)
    }

    // Example: Custom analytics endpoint
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data })
    }).catch(console.error)
  }

  private sendToErrorService(error: ErrorReport, context?: any) {
    // Implement your error monitoring service integration here
    // Example: Sentry, Bugsnag, etc.

    // Example: Sentry
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(new Error(error.message), {
        extra: { ...error, ...context }
      })
    }

    // Example: Custom error endpoint
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error, context })
    }).catch(console.error)
  }
}

// Create singleton instance
export const monitoring = new MonitoringService()

/**
 * React Hook for performance monitoring
 */
export function usePerformanceMonitoring(componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const renderTime = performance.now() - startTime
      monitoring.trackComponentRender(componentName, renderTime)
    }
  }, [componentName])
}

/**
 * Higher-order component for error boundary with monitoring
 */
export function withErrorMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return class extends React.Component<P, { hasError: boolean }> {
    constructor(props: P) {
      super(props)
      this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      monitoring.reportError(error, {
        component: componentName,
        errorInfo
      })
    }

    render() {
      if (this.state.hasError) {
        return (
          <div className="p-4 text-center">
            <h2 className="text-lg font-semibold text-red-600">
              Algo salió mal
            </h2>
            <p className="text-gray-600">
              Ha ocurrido un error inesperado. Por favor, recarga la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Recargar página
            </button>
          </div>
        )
      }

      return <Component {...this.props} />
    }
  }
}

/**
 * Initialize monitoring on app start
 */
export function initializeMonitoring() {
  if (typeof window === 'undefined') return

  // Track page load performance
  monitoring.trackPageLoad()
  
  // Track Core Web Vitals
  monitoring.trackWebVitals()
  
  // Track memory usage periodically
  setInterval(() => {
    monitoring.trackMemoryUsage()
  }, 30000) // Every 30 seconds

  // Track unhandled errors
  window.addEventListener('error', (event) => {
    monitoring.reportError(new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    })
  })

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    monitoring.reportError(new Error(event.reason), {
      type: 'unhandledrejection'
    })
  })
}