import { NextRequest, NextResponse } from 'next/server'
import { getMonitoringData } from '@/lib/monitoring'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = parseInt(searchParams.get('timeRange') || '3600000') // Default 1 hour
    
    // Get monitoring data
    const data = getMonitoringData(timeRange)
    
    logger.info('Monitoring data requested', {
      timeRange: timeRange / 1000 / 60, // minutes
      totalRequests: data.totalRequests,
      hasAlerts: data.alerts.length > 0
    })
    
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    logger.error('Failed to get monitoring data', error as Error)
    return NextResponse.json(
      { error: 'Failed to get monitoring data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json()
    
    switch (action) {
      case 'clear_alerts':
        // In a real implementation, you would clear alerts from storage
        logger.info('Alerts cleared by user', { timestamp: new Date().toISOString() })
        return NextResponse.json({ success: true }, { status: 200 })
        
      case 'export_metrics':
        // Export metrics data
        const timeRange = data.timeRange || 3600000
        const metrics = getMonitoringData(timeRange)
        
        logger.info('Metrics exported', { 
          timeRange: timeRange / 1000 / 60,
          totalRequests: metrics.totalRequests 
        })
        
        return NextResponse.json({
          success: true,
          data: metrics,
          exportedAt: new Date().toISOString()
        }, { status: 200 })
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    logger.error('Failed to process monitoring action', error as Error)
    return NextResponse.json(
      { error: 'Failed to process monitoring action' },
      { status: 500 }
    )
  }
}