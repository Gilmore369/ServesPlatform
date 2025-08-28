/**
 * Comprehensive Audit Logging System
 * Tracks all user actions, data changes, and system events for compliance and debugging
 */

import { logger } from './logger'

export interface AuditEvent {
  eventType: AuditEventType
  userId?: string
  sessionId?: string
  resource: string
  resourceId?: string
  action: string
  details?: Record<string, any>
  metadata?: {
    ip?: string
    userAgent?: string
    timestamp: string
    requestId?: string
  }
  changes?: {
    before?: any
    after?: any
    fields?: string[]
  }
  result: 'success' | 'failure' | 'partial'
  errorMessage?: string
}

export enum AuditEventType {
  // Authentication events
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',
  LOGIN_FAILED = 'auth.login_failed',
  TOKEN_REFRESH = 'auth.token_refresh',
  PASSWORD_CHANGE = 'auth.password_change',
  
  // Data operations
  CREATE = 'data.create',
  READ = 'data.read',
  UPDATE = 'data.update',
  DELETE = 'data.delete',
  BULK_UPDATE = 'data.bulk_update',
  BULK_DELETE = 'data.bulk_delete',
  
  // System events
  SYSTEM_START = 'system.start',
  SYSTEM_SHUTDOWN = 'system.shutdown',
  CONFIG_CHANGE = 'system.config_change',
  CACHE_CLEAR = 'system.cache_clear',
  
  // Security events
  UNAUTHORIZED_ACCESS = 'security.unauthorized_access',
  PERMISSION_DENIED = 'security.permission_denied',
  SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
  DATA_EXPORT = 'security.data_export',
  
  // Business events
  PROJECT_STATUS_CHANGE = 'business.project_status_change',
  MATERIAL_STOCK_UPDATE = 'business.material_stock_update',
  TASK_COMPLETION = 'business.task_completion',
  REPORT_GENERATION = 'business.report_generation'
}

class AuditLogger {
  private auditBuffer: AuditEvent[] = []
  private bufferSize = 100
  private flushInterval = 30000 // 30 seconds
  private flushTimer?: NodeJS.Timeout

  constructor() {
    this.startPeriodicFlush()
  }

  /**
   * Log an audit event
   */
  log(event: Omit<AuditEvent, 'metadata'> & { metadata?: Partial<AuditEvent['metadata']> }) {
    const auditEvent: AuditEvent = {
      ...event,
      metadata: {
        timestamp: new Date().toISOString(),
        ...event.metadata
      }
    }

    // Add to buffer
    this.auditBuffer.push(auditEvent)

    // Log immediately for critical events
    if (this.isCriticalEvent(event.eventType)) {
      this.logEvent(auditEvent)
    }

    // Flush buffer if it's full
    if (this.auditBuffer.length >= this.bufferSize) {
      this.flush()
    }
  }

  /**
   * Log authentication events
   */
  logAuth(
    action: 'login' | 'logout' | 'login_failed' | 'token_refresh' | 'password_change',
    userId?: string,
    details?: Record<string, any>,
    metadata?: Partial<AuditEvent['metadata']>
  ) {
    const eventTypeMap = {
      login: AuditEventType.LOGIN,
      logout: AuditEventType.LOGOUT,
      login_failed: AuditEventType.LOGIN_FAILED,
      token_refresh: AuditEventType.TOKEN_REFRESH,
      password_change: AuditEventType.PASSWORD_CHANGE
    }

    this.log({
      eventType: eventTypeMap[action],
      userId,
      resource: 'auth',
      action,
      details,
      metadata,
      result: action === 'login_failed' ? 'failure' : 'success'
    })
  }

  /**
   * Log data operations
   */
  logDataOperation(
    operation: 'create' | 'read' | 'update' | 'delete' | 'bulk_update' | 'bulk_delete',
    resource: string,
    resourceId?: string,
    userId?: string,
    changes?: AuditEvent['changes'],
    result: AuditEvent['result'] = 'success',
    details?: Record<string, any>,
    metadata?: Partial<AuditEvent['metadata']>
  ) {
    const eventTypeMap = {
      create: AuditEventType.CREATE,
      read: AuditEventType.READ,
      update: AuditEventType.UPDATE,
      delete: AuditEventType.DELETE,
      bulk_update: AuditEventType.BULK_UPDATE,
      bulk_delete: AuditEventType.BULK_DELETE
    }

    this.log({
      eventType: eventTypeMap[operation],
      userId,
      resource,
      resourceId,
      action: operation,
      details,
      metadata,
      changes,
      result
    })
  }

  /**
   * Log security events
   */
  logSecurity(
    event: 'unauthorized_access' | 'permission_denied' | 'suspicious_activity' | 'data_export',
    resource: string,
    userId?: string,
    details?: Record<string, any>,
    metadata?: Partial<AuditEvent['metadata']>
  ) {
    const eventTypeMap = {
      unauthorized_access: AuditEventType.UNAUTHORIZED_ACCESS,
      permission_denied: AuditEventType.PERMISSION_DENIED,
      suspicious_activity: AuditEventType.SUSPICIOUS_ACTIVITY,
      data_export: AuditEventType.DATA_EXPORT
    }

    this.log({
      eventType: eventTypeMap[event],
      userId,
      resource,
      action: event,
      details,
      metadata,
      result: event === 'data_export' ? 'success' : 'failure'
    })
  }

  /**
   * Log business events
   */
  logBusiness(
    event: 'project_status_change' | 'material_stock_update' | 'task_completion' | 'report_generation',
    resource: string,
    resourceId?: string,
    userId?: string,
    changes?: AuditEvent['changes'],
    details?: Record<string, any>,
    metadata?: Partial<AuditEvent['metadata']>
  ) {
    const eventTypeMap = {
      project_status_change: AuditEventType.PROJECT_STATUS_CHANGE,
      material_stock_update: AuditEventType.MATERIAL_STOCK_UPDATE,
      task_completion: AuditEventType.TASK_COMPLETION,
      report_generation: AuditEventType.REPORT_GENERATION
    }

    this.log({
      eventType: eventTypeMap[event],
      userId,
      resource,
      resourceId,
      action: event,
      details,
      metadata,
      changes,
      result: 'success'
    })
  }

  /**
   * Get audit trail for a specific resource
   */
  async getAuditTrail(
    resource: string,
    resourceId?: string,
    options?: {
      startDate?: Date
      endDate?: Date
      userId?: string
      eventTypes?: AuditEventType[]
      limit?: number
    }
  ): Promise<AuditEvent[]> {
    // In a real implementation, this would query a database
    // For now, we'll return filtered events from the buffer
    let events = this.auditBuffer.filter(event => {
      if (event.resource !== resource) return false
      if (resourceId && event.resourceId !== resourceId) return false
      if (options?.userId && event.userId !== options.userId) return false
      if (options?.eventTypes && !options.eventTypes.includes(event.eventType)) return false
      
      if (options?.startDate || options?.endDate) {
        const eventDate = new Date(event.metadata?.timestamp || 0)
        if (options.startDate && eventDate < options.startDate) return false
        if (options.endDate && eventDate > options.endDate) return false
      }
      
      return true
    })

    // Sort by timestamp (newest first)
    events.sort((a, b) => {
      const timeA = new Date(a.metadata?.timestamp || 0).getTime()
      const timeB = new Date(b.metadata?.timestamp || 0).getTime()
      return timeB - timeA
    })

    // Apply limit
    if (options?.limit) {
      events = events.slice(0, options.limit)
    }

    return events
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(
    startDate: Date,
    endDate: Date,
    options?: {
      userId?: string
      eventTypes?: AuditEventType[]
      resources?: string[]
      format?: 'json' | 'csv'
    }
  ): Promise<{ events: AuditEvent[]; summary: any }> {
    const events = this.auditBuffer.filter(event => {
      const eventDate = new Date(event.metadata?.timestamp || 0)
      if (eventDate < startDate || eventDate > endDate) return false
      
      if (options?.userId && event.userId !== options.userId) return false
      if (options?.eventTypes && !options.eventTypes.includes(event.eventType)) return false
      if (options?.resources && !options.resources.includes(event.resource)) return false
      
      return true
    })

    // Generate summary statistics
    const summary = {
      totalEvents: events.length,
      dateRange: { startDate, endDate },
      eventsByType: this.groupBy(events, 'eventType'),
      eventsByUser: this.groupBy(events, 'userId'),
      eventsByResource: this.groupBy(events, 'resource'),
      successRate: events.filter(e => e.result === 'success').length / events.length * 100,
      failureRate: events.filter(e => e.result === 'failure').length / events.length * 100
    }

    return { events, summary }
  }

  /**
   * Flush audit buffer to persistent storage
   */
  private async flush() {
    if (this.auditBuffer.length === 0) return

    const eventsToFlush = [...this.auditBuffer]
    this.auditBuffer = []

    try {
      // Log all events
      for (const event of eventsToFlush) {
        this.logEvent(event)
      }

      // In production, you would also send to external audit service
      if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
        await this.sendToAuditService(eventsToFlush)
      }
    } catch (error) {
      logger.error('Failed to flush audit events', error as Error)
      // Re-add events to buffer if flush failed
      this.auditBuffer.unshift(...eventsToFlush)
    }
  }

  private logEvent(event: AuditEvent) {
    const logLevel = this.getLogLevel(event.eventType)
    const message = `AUDIT: ${event.action} on ${event.resource}${event.resourceId ? `/${event.resourceId}` : ''}`
    
    const context = {
      eventType: event.eventType,
      userId: event.userId,
      resource: event.resource,
      resourceId: event.resourceId,
      result: event.result,
      ...event.details,
      ...event.metadata
    }

    switch (logLevel) {
      case 'error':
        logger.error(message, undefined, context)
        break
      case 'warn':
        logger.warn(message, context)
        break
      case 'info':
        logger.info(message, context)
        break
      case 'debug':
        logger.debug(message, context)
        break
    }
  }

  private getLogLevel(eventType: AuditEventType): 'error' | 'warn' | 'info' | 'debug' {
    if (eventType.includes('security') || eventType.includes('unauthorized') || eventType.includes('failed')) {
      return 'error'
    }
    if (eventType.includes('delete') || eventType.includes('change')) {
      return 'warn'
    }
    if (eventType.includes('create') || eventType.includes('update') || eventType.includes('auth')) {
      return 'info'
    }
    return 'debug'
  }

  private isCriticalEvent(eventType: AuditEventType): boolean {
    const criticalEvents = [
      AuditEventType.LOGIN_FAILED,
      AuditEventType.UNAUTHORIZED_ACCESS,
      AuditEventType.PERMISSION_DENIED,
      AuditEventType.SUSPICIOUS_ACTIVITY,
      AuditEventType.SYSTEM_SHUTDOWN,
      AuditEventType.CONFIG_CHANGE
    ]
    return criticalEvents.includes(eventType)
  }

  private async sendToAuditService(events: AuditEvent[]) {
    try {
      // Send to external audit service (e.g., Splunk, DataDog, etc.)
      await fetch('/api/audit/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      })
    } catch (error) {
      logger.error('Failed to send audit events to external service', error as Error)
    }
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = String(item[key] || 'unknown')
      acc[value] = (acc[value] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flush() // Final flush
  }
}

// Global audit logger instance
export const auditLogger = new AuditLogger()

/**
 * Higher-order function to wrap functions with audit logging
 */
export function withAuditLogging<T extends (...args: any[]) => any>(
  fn: T,
  eventType: AuditEventType,
  resource: string,
  getContext?: (...args: Parameters<T>) => {
    resourceId?: string
    userId?: string
    details?: Record<string, any>
    metadata?: Partial<AuditEvent['metadata']>
  }
): T {
  return (async (...args: Parameters<T>) => {
    const context = getContext ? getContext(...args) : {}
    const startTime = Date.now()
    
    try {
      const result = await fn(...args)
      
      auditLogger.log({
        eventType,
        resource,
        action: eventType.split('.')[1] || 'unknown',
        result: 'success',
        ...context,
        metadata: {
          ...context.metadata,
          duration: Date.now() - startTime
        }
      })
      
      return result
    } catch (error) {
      auditLogger.log({
        eventType,
        resource,
        action: eventType.split('.')[1] || 'unknown',
        result: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        ...context,
        metadata: {
          ...context.metadata,
          duration: Date.now() - startTime
        }
      })
      
      throw error
    }
  }) as T
}

export default auditLogger