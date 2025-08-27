/**
 * Structured Logging System for Production
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  userId?: string
  sessionId?: string
  requestId?: string
  component?: string
  action?: string
  duration?: number
  error?: {
    name: string
    message: string
    stack?: string
  }
}

class Logger {
  private logLevel: LogLevel
  private isProduction: boolean
  private enableRemoteLogging: boolean

  constructor() {
    this.isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production'
    this.logLevel = this.getLogLevel()
    this.enableRemoteLogging = process.env.NEXT_PUBLIC_ENABLE_REMOTE_LOGGING === 'true'
  }

  private getLogLevel(): LogLevel {
    const level = process.env.NEXT_PUBLIC_LOG_LEVEL || (this.isProduction ? 'INFO' : 'DEBUG')
    
    switch (level.toUpperCase()) {
      case 'ERROR': return LogLevel.ERROR
      case 'WARN': return LogLevel.WARN
      case 'INFO': return LogLevel.INFO
      case 'DEBUG': return LogLevel.DEBUG
      default: return LogLevel.INFO
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, context, ...meta } = entry
    const levelName = LogLevel[level]
    
    if (this.isProduction) {
      // Structured JSON logging for production
      return JSON.stringify({
        timestamp,
        level: levelName,
        message,
        ...meta,
        ...(context && { context })
      })
    } else {
      // Human-readable logging for development
      const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
      const contextStr = context ? ` ${JSON.stringify(context)}` : ''
      return `[${timestamp}] ${levelName}: ${message}${metaStr}${contextStr}`
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    meta?: Partial<LogEntry>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      ...meta
    }
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return

    const formattedLog = this.formatLogEntry(entry)

    // Console output
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(formattedLog)
        break
      case LogLevel.WARN:
        console.warn(formattedLog)
        break
      case LogLevel.INFO:
        console.info(formattedLog)
        break
      case LogLevel.DEBUG:
        console.debug(formattedLog)
        break
    }

    // Send to remote logging service in production
    if (this.enableRemoteLogging && this.isProduction) {
      this.sendToRemoteLogger(entry)
    }
  }

  private async sendToRemoteLogger(entry: LogEntry): Promise<void> {
    try {
      // Send to logging service (e.g., LogRocket, DataDog, etc.)
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry)
      })
    } catch (error) {
      // Fallback to console if remote logging fails
      console.error('Failed to send log to remote service:', error)
    }
  }

  /**
   * Log error messages
   */
  error(message: string, error?: Error, context?: Record<string, any>, meta?: Partial<LogEntry>): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, {
      ...meta,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    })
    this.writeLog(entry)
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: Record<string, any>, meta?: Partial<LogEntry>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context, meta)
    this.writeLog(entry)
  }

  /**
   * Log info messages
   */
  info(message: string, context?: Record<string, any>, meta?: Partial<LogEntry>): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, context, meta)
    this.writeLog(entry)
  }

  /**
   * Log debug messages
   */
  debug(message: string, context?: Record<string, any>, meta?: Partial<LogEntry>): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, meta)
    this.writeLog(entry)
  }

  /**
   * Log API calls
   */
  apiCall(
    method: string,
    endpoint: string,
    duration: number,
    status: number,
    context?: Record<string, any>
  ): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO
    const message = `API ${method} ${endpoint} - ${status} (${duration}ms)`
    
    this.writeLog(this.createLogEntry(level, message, context, {
      action: 'api_call',
      duration,
      context: {
        method,
        endpoint,
        status,
        ...context
      }
    }))
  }

  /**
   * Log user actions
   */
  userAction(
    userId: string,
    action: string,
    component?: string,
    context?: Record<string, any>
  ): void {
    const message = `User ${userId} performed ${action}${component ? ` in ${component}` : ''}`
    
    this.writeLog(this.createLogEntry(LogLevel.INFO, message, context, {
      userId,
      action,
      component
    }))
  }

  /**
   * Log performance metrics
   */
  performance(
    metric: string,
    value: number,
    component?: string,
    context?: Record<string, any>
  ): void {
    const message = `Performance: ${metric} = ${value}ms${component ? ` (${component})` : ''}`
    
    this.writeLog(this.createLogEntry(LogLevel.INFO, message, context, {
      action: 'performance',
      component,
      duration: value
    }))
  }

  /**
   * Log authentication events
   */
  auth(
    event: 'login' | 'logout' | 'token_refresh' | 'auth_failure',
    userId?: string,
    context?: Record<string, any>
  ): void {
    const level = event === 'auth_failure' ? LogLevel.WARN : LogLevel.INFO
    const message = `Auth event: ${event}${userId ? ` for user ${userId}` : ''}`
    
    this.writeLog(this.createLogEntry(level, message, context, {
      userId,
      action: 'auth',
      context: { event, ...context }
    }))
  }

  /**
   * Log security events
   */
  security(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: Record<string, any>
  ): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN
    const message = `Security event: ${event} (${severity})`
    
    this.writeLog(this.createLogEntry(level, message, context, {
      action: 'security',
      context: { event, severity, ...context }
    }))
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger()
    const originalWriteLog = childLogger.writeLog.bind(childLogger)
    
    childLogger.writeLog = (entry: LogEntry) => {
      originalWriteLog({
        ...entry,
        context: { ...context, ...entry.context }
      })
    }
    
    return childLogger
  }
}

// Create singleton instance
export const logger = new Logger()

/**
 * React Hook for component logging
 */
export function useLogger(componentName: string) {
  return logger.child({ component: componentName })
}

/**
 * Higher-order function for API route logging
 */
export function withLogging<T extends (...args: any[]) => any>(
  fn: T,
  context: { endpoint: string; method: string }
): T {
  return (async (...args: any[]) => {
    const startTime = performance.now()
    const requestId = Math.random().toString(36).substring(7)
    
    logger.info(`API ${context.method} ${context.endpoint} started`, {}, { requestId })
    
    try {
      const result = await fn(...args)
      const duration = performance.now() - startTime
      
      logger.apiCall(context.method, context.endpoint, duration, 200, { requestId })
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      
      logger.apiCall(context.method, context.endpoint, duration, 500, { 
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      throw error
    }
  }) as T
}

/**
 * Middleware for request logging
 */
export function createRequestLogger() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now()
    const requestId = Math.random().toString(36).substring(7)
    
    // Log request start
    logger.info(`${req.method} ${req.url}`, {
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    }, { requestId })
    
    // Log response
    const originalSend = res.send
    res.send = function(data: any) {
      const duration = Date.now() - startTime
      logger.apiCall(req.method, req.url, duration, res.statusCode, { requestId })
      return originalSend.call(this, data)
    }
    
    next()
  }
}

export default logger