import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const alert = await request.json()
    
    // Log the alert
    logger.warn(`ALERT TRIGGERED: ${alert.message}`, {
      alertType: alert.type,
      timestamp: alert.timestamp,
      severity: getSeverity(alert.type)
    })
    
    // In production, you would send this to external alerting services
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
      await Promise.all([
        sendToSlack(alert),
        sendToEmail(alert),
        // sendToPagerDuty(alert), // For critical alerts
      ])
    }
    
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    logger.error('Failed to process alert', error as Error)
    return NextResponse.json(
      { error: 'Failed to process alert' },
      { status: 500 }
    )
  }
}

function getSeverity(alertType: string): 'low' | 'medium' | 'high' | 'critical' {
  if (alertType.includes('critical')) return 'critical'
  if (alertType.includes('high') || alertType.includes('error')) return 'high'
  if (alertType.includes('warning') || alertType.includes('warn')) return 'medium'
  return 'low'
}

async function sendToSlack(alert: any) {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!slackWebhookUrl) return
  
  try {
    const severity = getSeverity(alert.type)
    const color = {
      low: '#36a64f',
      medium: '#ff9500',
      high: '#ff0000',
      critical: '#8b0000'
    }[severity]
    
    const payload = {
      text: `🚨 ServesPlatform Alert`,
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Alert Type',
              value: alert.type.replace(/_/g, ' ').toUpperCase(),
              short: true
            },
            {
              title: 'Severity',
              value: severity.toUpperCase(),
              short: true
            },
            {
              title: 'Message',
              value: alert.message,
              short: false
            },
            {
              title: 'Timestamp',
              value: new Date(alert.timestamp).toLocaleString(),
              short: true
            }
          ]
        }
      ]
    }
    
    await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    logger.info('Alert sent to Slack', { alertType: alert.type })
  } catch (error) {
    logger.error('Failed to send alert to Slack', error as Error)
  }
}

async function sendToEmail(alert: any) {
  // In production, integrate with email service (SendGrid, AWS SES, etc.)
  const emailRecipients = process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || []
  if (emailRecipients.length === 0) return
  
  try {
    const severity = getSeverity(alert.type)
    const subject = `[${severity.toUpperCase()}] ServesPlatform Alert: ${alert.type}`
    
    const emailBody = `
      Alert Details:
      
      Type: ${alert.type.replace(/_/g, ' ')}
      Severity: ${severity}
      Message: ${alert.message}
      Timestamp: ${new Date(alert.timestamp).toLocaleString()}
      
      Please check the monitoring dashboard for more details.
    `
    
    // Here you would integrate with your email service
    // await emailService.send({
    //   to: emailRecipients,
    //   subject,
    //   text: emailBody
    // })
    
    logger.info('Alert email prepared', { 
      alertType: alert.type,
      recipients: emailRecipients.length 
    })
  } catch (error) {
    logger.error('Failed to send alert email', error as Error)
  }
}