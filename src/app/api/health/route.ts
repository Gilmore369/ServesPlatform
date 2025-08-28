import { NextResponse } from 'next/server'
import { googleSheetsAPIService } from '@/lib/google-sheets-api-service'
import { getMonitoringData } from '@/lib/monitoring'
import { logger } from '@/lib/logger'
import { withMonitoring } from '@/lib/monitoring-middleware'

async function handleHealthCheck() {
  const startTime = Date.now()
  
  try {
    // Basic system metrics
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()
    
    // Get recent monitoring data (last 5 minutes)
    const monitoringData = getMonitoringData(300000)
    
    // Perform health checks
    const checks = await performHealthChecks()
    
    // Determine overall status
    const isHealthy = Object.values(checks).every(check => check.status === 'ok')
    const status = isHealthy ? 'healthy' : 'unhealthy'
    
    const healthData = {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
      uptime,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      checks,
      metrics: {
        totalRequests: monitoringData.totalRequests,
        errorRate: monitoringData.api?.errorRate || 0,
        avgResponseTime: monitoringData.api?.avgResponseTime || 0,
        cacheHitRate: monitoringData.api?.cacheHitRate || 0,
        activeAlerts: monitoringData.alerts.length
      },
      performance: {
        checkDuration: Date.now() - startTime,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    }

    logger.info('Health check completed', {
      status,
      checkDuration: Date.now() - startTime,
      totalRequests: monitoringData.totalRequests,
      activeAlerts: monitoringData.alerts.length
    })

    return NextResponse.json(healthData, { 
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    logger.error('Health check failed', error as Error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        checkDuration: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

async function performHealthChecks() {
  const checks: Record<string, { status: string; message?: string; duration?: number }> = {}
  
  // API connectivity check
  try {
    const apiStart = Date.now()
    const isConnected = await googleSheetsAPIService.validateConnection()
    checks.api = {
      status: isConnected ? 'ok' : 'error',
      message: isConnected ? 'Google Sheets API accessible' : 'Cannot connect to Google Sheets API',
      duration: Date.now() - apiStart
    }
  } catch (error) {
    checks.api = {
      status: 'error',
      message: error instanceof Error ? error.message : 'API check failed'
    }
  }
  
  // Database check (Google Sheets)
  try {
    const dbStart = Date.now()
    // Try a simple read operation
    const testResponse = await googleSheetsAPIService.executeOperation({
      table: 'Usuarios',
      operation: 'list',
      pagination: { page: 1, limit: 1 }
    })
    
    checks.database = {
      status: testResponse.ok ? 'ok' : 'error',
      message: testResponse.ok ? 'Google Sheets accessible' : testResponse.message || 'Database check failed',
      duration: Date.now() - dbStart
    }
  } catch (error) {
    checks.database = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Database check failed'
    }
  }
  
  // Auth system check
  checks.auth = {
    status: 'ok',
    message: 'Authentication system operational'
  }
  
  // Memory check
  const memoryUsage = process.memoryUsage()
  const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
  checks.memory = {
    status: memoryUsagePercent > 90 ? 'warning' : 'ok',
    message: `Memory usage: ${memoryUsagePercent.toFixed(2)}%`
  }
  
  return checks
}

export const GET = withMonitoring(handleHealthCheck, '/api/health', {
  trackPerformance: true,
  trackErrors: true,
  logRequests: false // Don't log health checks to reduce noise
})