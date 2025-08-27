'use client'

import { useEffect } from 'react'
import { initializeMonitoring } from '@/lib/monitoring'
import { logger } from '@/lib/logger'

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize monitoring only in production or when explicitly enabled
    const shouldInitialize = 
      process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ||
      process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true'
    
    if (shouldInitialize) {
      try {
        initializeMonitoring()
        logger.info('Monitoring initialized successfully', {
          environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
          version: process.env.NEXT_PUBLIC_APP_VERSION
        })
      } catch (error) {
        logger.error('Failed to initialize monitoring', error as Error)
      }
    }
  }, [])

  return <>{children}</>
}