import { Metadata } from 'next'
import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard'

export const metadata: Metadata = {
  title: 'Monitoreo del Sistema | ServesPlatform',
  description: 'Dashboard de monitoreo y métricas de rendimiento del sistema',
}

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function MonitoringPage() {
  return (
    <div className="container mx-auto py-6">
      <MonitoringDashboard />
    </div>
  )
}