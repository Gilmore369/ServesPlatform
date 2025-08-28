'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getMonitoringData } from '@/lib/monitoring'
import { logger } from '@/lib/logger'
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Clock, 
  Database, 
  RefreshCw, 
  Server, 
  TrendingUp,
  Zap,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface MonitoringData {
  api: {
    totalRequests: number
    errorRate: number
    cacheHitRate: number
    avgResponseTime: number
    maxResponseTime: number
    endpointStats: Array<{
      endpoint: string
      count: number
      avgTime: number
      errorRate: number
    }>
  } | null
  system: {
    currentMemoryUsage: number
    totalMetrics: number
  } | null
  alerts: Array<{
    type: string
    message: string
    timestamp: number
  }>
  totalRequests: number
  timeRange: number
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  uptime: number
  memory: {
    used: number
    total: number
  }
  checks: {
    api: string
    database: string
    auth: string
  }
}

export function MonitoringDashboard() {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null)
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [timeRange, setTimeRange] = useState<number>(3600000) // 1 hour
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchMonitoringData = async () => {
    try {
      setIsLoading(true)
      
      // Get monitoring metrics
      const data = getMonitoringData(timeRange)
      setMonitoringData(data)
      
      // Get health status
      const healthResponse = await fetch('/api/health')
      const health = await healthResponse.json()
      setHealthStatus(health)
      
      setLastUpdate(new Date())
      logger.info('Monitoring dashboard data refreshed', { 
        timeRange: timeRange / 1000 / 60,
        totalRequests: data.totalRequests 
      })
    } catch (error) {
      logger.error('Failed to fetch monitoring data', error as Error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMonitoringData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000)
    return () => clearInterval(interval)
  }, [timeRange])

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
        return 'text-green-600'
      case 'unhealthy':
        return 'text-red-600'
      default:
        return 'text-yellow-600'
    }
  }

  const getAlertSeverity = (type: string) => {
    if (type.includes('critical') || type.includes('error')) return 'destructive'
    if (type.includes('high') || type.includes('warning')) return 'default'
    return 'secondary'
  }

  if (isLoading && !monitoringData) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando datos de monitoreo...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Monitoreo</h1>
          <p className="text-muted-foreground">
            Métricas de rendimiento y estado del sistema
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            Última actualización: {lastUpdate.toLocaleTimeString()}
          </Badge>
          <Button onClick={fetchMonitoringData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex space-x-2">
        <Button
          variant={timeRange === 900000 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange(900000)}
        >
          15m
        </Button>
        <Button
          variant={timeRange === 3600000 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange(3600000)}
        >
          1h
        </Button>
        <Button
          variant={timeRange === 14400000 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange(14400000)}
        >
          4h
        </Button>
        <Button
          variant={timeRange === 86400000 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange(86400000)}
        >
          24h
        </Button>
      </div>

      {/* Alerts */}
      {monitoringData?.alerts && monitoringData.alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
            Alertas Activas
          </h2>
          {monitoringData.alerts.map((alert, index) => (
            <Alert key={index} variant={getAlertSeverity(alert.type) as any}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="capitalize">
                {alert.type.replace(/_/g, ' ')}
              </AlertTitle>
              <AlertDescription>
                {alert.message}
                <span className="text-xs text-muted-foreground ml-2">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="api">API Metrics</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="health">Estado</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Requests
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {monitoringData?.totalRequests || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Últimos {monitoringData?.timeRange || 0} minutos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Error Rate
                </CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {monitoringData?.api?.errorRate?.toFixed(2) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Tasa de errores
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cache Hit Rate
                </CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {monitoringData?.api?.cacheHitRate?.toFixed(2) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Eficiencia de caché
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Response Time
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {monitoringData?.api?.avgResponseTime || 0}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  Tiempo promedio
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas por Endpoint</CardTitle>
              <CardDescription>
                Rendimiento detallado de cada endpoint de la API
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monitoringData?.api?.endpointStats ? (
                <div className="space-y-4">
                  {monitoringData.api.endpointStats.map((endpoint, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{endpoint.endpoint}</div>
                        <div className="text-sm text-muted-foreground">
                          {endpoint.count} requests
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{endpoint.avgTime}ms</div>
                        <div className="text-sm text-muted-foreground">
                          {endpoint.errorRate.toFixed(2)}% errors
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No hay datos de endpoints disponibles</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  Memoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {monitoringData?.system?.currentMemoryUsage?.toFixed(2) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Uso actual de memoria
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Métricas Totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {monitoringData?.system?.totalMetrics || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Métricas recolectadas
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className={`h-5 w-5 mr-2 ${getStatusColor(healthStatus?.status || '')}`} />
                Estado del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              {healthStatus ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm font-medium">Estado</div>
                      <div className={`text-lg font-bold ${getStatusColor(healthStatus.status)}`}>
                        {healthStatus.status}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Uptime</div>
                      <div className="text-lg font-bold">
                        {formatUptime(healthStatus.uptime)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Versión</div>
                      <div className="text-lg font-bold">{healthStatus.version}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Entorno</div>
                      <div className="text-lg font-bold">{healthStatus.environment}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-2">Memoria</div>
                    <div className="text-sm">
                      {healthStatus.memory.used}MB / {healthStatus.memory.total}MB
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-2">Verificaciones</div>
                    <div className="space-y-2">
                      {Object.entries(healthStatus.checks).map(([check, status]) => (
                        <div key={check} className="flex items-center justify-between">
                          <span className="capitalize">{check}</span>
                          <Badge variant={status === 'ok' ? 'default' : 'destructive'}>
                            {status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No se pudo obtener el estado del sistema</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}