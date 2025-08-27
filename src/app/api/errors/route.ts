import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { error, context } = await request.json()
    
    // Log the error with structured logging
    logger.error(
      `Client Error: ${error.message}`,
      new Error(error.message),
      {
        url: error.url,
        userAgent: error.userAgent,
        timestamp: error.timestamp,
        ...context
      },
      {
        component: context?.component,
        userId: context?.userId,
        sessionId: context?.sessionId
      }
    )
    
    // In production, you might want to send this to an external service
    // like Sentry, Bugsnag, or DataDog
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
      // Example: Send to external error monitoring service
      // await sendToErrorMonitoringService(error, context)
    }
    
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    logger.error('Failed to process error report', err as Error)
    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 500 }
    )
  }
}