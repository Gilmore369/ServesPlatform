import { NextRequest, NextResponse } from 'next/server'
import { auditLogger, AuditEventType } from '@/lib/audit-logger'
import { logger } from '@/lib/logger'
import { withMonitoring } from '@/lib/monitoring-middleware'

async function handleAuditQuery(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const resource = searchParams.get('resource')
  const resourceId = searchParams.get('resourceId')
  const userId = searchParams.get('userId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const eventTypes = searchParams.get('eventTypes')?.split(',') as AuditEventType[]
  const limit = parseInt(searchParams.get('limit') || '100')
  
  if (!resource) {
    return NextResponse.json(
      { error: 'Resource parameter is required' },
      { status: 400 }
    )
  }
  
  const options = {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    userId: userId || undefined,
    eventTypes,
    limit
  }
  
  const auditTrail = await auditLogger.getAuditTrail(resource, resourceId, options)
  
  logger.info('Audit trail requested', {
    resource,
    resourceId,
    userId,
    eventCount: auditTrail.length,
    dateRange: options.startDate && options.endDate ? {
      start: options.startDate.toISOString(),
      end: options.endDate.toISOString()
    } : undefined
  })
  
  return NextResponse.json({
    success: true,
    data: auditTrail,
    metadata: {
      resource,
      resourceId,
      count: auditTrail.length,
      filters: options
    }
  })
}

async function handleAuditReport(request: NextRequest) {
  const { startDate, endDate, userId, eventTypes, resources, format = 'json' } = await request.json()
  
  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'Start date and end date are required' },
      { status: 400 }
    )
  }
  
  const report = await auditLogger.generateAuditReport(
    new Date(startDate),
    new Date(endDate),
    {
      userId,
      eventTypes,
      resources,
      format
    }
  )
  
  logger.info('Audit report generated', {
    dateRange: { startDate, endDate },
    eventCount: report.events.length,
    format,
    userId,
    eventTypes: eventTypes?.length || 0,
    resources: resources?.length || 0
  })
  
  if (format === 'csv') {
    const csv = convertToCSV(report.events)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-report-${startDate}-${endDate}.csv"`
      }
    })
  }
  
  return NextResponse.json({
    success: true,
    data: report,
    metadata: {
      generatedAt: new Date().toISOString(),
      format
    }
  })
}

function convertToCSV(events: any[]): string {
  if (events.length === 0) return 'No events found'
  
  const headers = [
    'Timestamp',
    'Event Type',
    'User ID',
    'Resource',
    'Resource ID',
    'Action',
    'Result',
    'Details',
    'IP Address',
    'User Agent'
  ]
  
  const rows = events.map(event => [
    event.metadata?.timestamp || '',
    event.eventType || '',
    event.userId || '',
    event.resource || '',
    event.resourceId || '',
    event.action || '',
    event.result || '',
    JSON.stringify(event.details || {}),
    event.metadata?.ip || '',
    event.metadata?.userAgent || ''
  ])
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  
  return csvContent
}

export const GET = withMonitoring(handleAuditQuery, '/api/audit', {
  trackPerformance: true,
  trackErrors: true,
  logRequests: true
})

export const POST = withMonitoring(handleAuditReport, '/api/audit', {
  trackPerformance: true,
  trackErrors: true,
  logRequests: true,
  includeRequestBody: true
})