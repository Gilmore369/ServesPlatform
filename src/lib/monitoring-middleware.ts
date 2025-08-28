/**
 * Monitoring Middleware for API Routes
 * Automatically tracks performance metrics and errors for all API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { trackAPIOperation, trackError } from './monitoring'
import { logger } from './logger'

export interface MonitoringOptions {
  trackPerformance?: boolean
  trackErrors?: boolean
  logRequests?: boolean
  includeRequestBody?: boolean
  includeResponseBody?: boolean
}

const defaultOptions: MonitoringOptions = {
  trackPerformance: true,
  trackErrors: true,
  logRequests: true,
  includeRequestBody: false,
  includeResponseBody: false
}

/**
 * Higher-order function to wrap API route handlers with monitoring
 */
export function withMonitoring<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  endpoint: string,
  options: MonitoringOptions = {}
): T {
  const config = { ...defaultOptions, ...options }
  
  return (async (request: NextRequest, ...args: any[]) => {
    const startTime = performance.now()
    const method = request.method
    const requestId = generateRequestId()
    
    // Extract user info if available
    const userId = extractUserId(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ip = getClientIP(request)
    
    // Log request start
    if (config.logRequests) {
      const requestData: any = {
        method,
        endpoint,
        userAgent,
        ip,
        requestId
      }
      
      if (userId) requestData.userId = userId
      
      if (config.includeRequestBody && method !== 'GET') {
        try {
          // Clone request to read body without consuming it
          const clonedRequest = request.clone()
          const body = await clonedRequest.text()
          if (body) {
            requestData.body = body.length > 1000 ? body.substring(0, 1000) + '...' : body
          }
        } catch (error) {
          // Ignore body reading errors
        }
      }
      
      logger.info(`API Request: ${method} ${endpoint}`, requestData)
    }
    
    let response: NextResponse
    let status = 200
    let error: string | undefined
    
    try {
      // Execute the handler
      response = await handler(request, ...args)
      status = response.status
      
      // Log successful response
      if (config.logRequests) {
        const responseData: any = {
          method,
          endpoint,
          status,
          requestId,
          duration: performance.now() - startTime
        }
        
        if (userId) responseData.userId = userId
        
        if (config.includeResponseBody && status < 400) {
          try {
            const responseClone = response.clone()
            const body = await responseClone.text()
            if (body) {
              responseData.responseBody = body.length > 1000 ? body.substring(0, 1000) + '...' : body
            }
          } catch (error) {
            // Ignore response body reading errors
          }
        }
        
        logger.info(`API Response: ${method} ${endpoint}`, responseData)
      }
      
    } catch (err) {
      status = 500
      error = err instanceof Error ? err.message : 'Unknown error'
      
      // Log error
      logger.error(`API Error: ${method} ${endpoint}`, err as Error, {
        requestId,
        userId,
        duration: performance.now() - startTime
      })
      
      // Track error for monitoring
      if (config.trackErrors) {
        trackError(err instanceof Error ? err : new Error(String(err)), {
          endpoint,
          method,
          requestId,
          userId,
          userAgent,
          ip
        })
      }
      
      // Return error response
      response = NextResponse.json(
        { 
          error: 'Internal server error',
          requestId,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
    
    // Track performance metrics
    if (config.trackPerformance) {
      const duration = performance.now() - startTime
      
      trackAPIOperation(endpoint, method, status, duration, {
        userId,
        error,
        context: {
          requestId,
          userAgent: userAgent.substring(0, 100), // Truncate long user agents
          ip
        }
      })
    }
    
    return response
  }) as T
}

/**
 * Middleware for monitoring all API routes (if using middleware.ts)
 */
export function createMonitoringMiddleware(options: MonitoringOptions = {}) {
  const config = { ...defaultOptions, ...options }
  
  return async (request: NextRequest) => {
    // Only monitor API routes
    if (!request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.next()
    }
    
    const startTime = performance.now()
    const method = request.method
    const endpoint = request.nextUrl.pathname
    const requestId = generateRequestId()
    
    // Extract user info
    const userId = extractUserId(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ip = getClientIP(request)
    
    // Log request
    if (config.logRequests) {
      logger.info(`Middleware: ${method} ${endpoint}`, {
        method,
        endpoint,
        userAgent,
        ip,
        requestId,
        userId
      })
    }
    
    // Continue to the actual handler
    const response = NextResponse.next()
    
    // Track the request (we can't get the actual response status here)
    if (config.trackPerformance) {
      const duration = performance.now() - startTime
      
      trackAPIOperation(endpoint, method, 200, duration, {
        userId,
        context: {
          requestId,
          userAgent: userAgent.substring(0, 100),
          ip,
          middleware: true
        }
      })
    }
    
    return response
  }
}

/**
 * Utility functions
 */
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

function extractUserId(request: NextRequest): string | undefined {
  // Try to extract user ID from JWT token or session
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      // In a real implementation, you would decode the JWT token
      // For now, we'll just return a placeholder
      return 'user_from_token'
    }
    
    // Try to get from cookies
    const sessionCookie = request.cookies.get('session')
    if (sessionCookie) {
      // In a real implementation, you would decode the session
      return 'user_from_session'
    }
    
    return undefined
  } catch (error) {
    return undefined
  }
}

function getClientIP(request: NextRequest): string {
  // Try various headers for client IP
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  return 'unknown'
}

/**
 * Performance tracking decorator for class methods
 */
export function trackMethodPerformance(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value
  
  descriptor.value = async function (...args: any[]) {
    const startTime = performance.now()
    const className = target.constructor.name
    const methodName = `${className}.${propertyName}`
    
    try {
      const result = await method.apply(this, args)
      const duration = performance.now() - startTime
      
      logger.performance(`Method execution: ${methodName}`, duration, className, {
        args: args.length,
        success: true
      })
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      
      logger.error(`Method error: ${methodName}`, error as Error, {
        duration,
        args: args.length
      })
      
      trackError(error instanceof Error ? error : new Error(String(error)), {
        method: methodName,
        className,
        duration
      })
      
      throw error
    }
  }
  
  return descriptor
}

export default {
  withMonitoring,
  createMonitoringMiddleware,
  trackMethodPerformance
}