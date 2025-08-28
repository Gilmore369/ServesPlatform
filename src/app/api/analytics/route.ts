import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { withMonitoring } from '@/lib/monitoring-middleware'

async function handleAnalytics(request: NextRequest) {
  const { type, data } = await request.json()
  
  // Log analytics event
  if (type === 'performance') {
    logger.performance(
      data.name,
      data.value,
      data.component,
      {
        url: data.url,
        userAgent: data.userAgent,
        timestamp: data.timestamp,
        ...data
      }
    )
  } else if (type === 'event') {
    logger.userAction(
      data.userId || 'anonymous',
      data.action,
      data.category,
      {
        label: data.label,
        value: data.value,
        url: data.url,
        timestamp: data.timestamp
      }
    )
  } else {
    logger.info(`Analytics event: ${type}`, data)
  }
  
  // In production, you might want to send this to an external analytics service
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
    // Example: Send to external analytics service
    // await sendToAnalyticsService(type, data)
  }
  
  return NextResponse.json({ success: true }, { status: 200 })
}

export const POST = withMonitoring(handleAnalytics, '/api/analytics', {
  trackPerformance: true,
  trackErrors: true,
  logRequests: true,
  includeRequestBody: true
})