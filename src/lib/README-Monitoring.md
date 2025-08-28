# Sistema de Monitoreo y Logging

Este documento describe el sistema completo de monitoreo y logging implementado para ServesPlatform, que incluye métricas de rendimiento, logging detallado, auditoría y alertas automáticas.

## Características Principales

### 1. Monitoreo de Rendimiento
- **Métricas de API**: Tiempo de respuesta, tasa de errores, cache hit rate
- **Métricas del Sistema**: Uso de memoria, CPU, requests por minuto
- **Alertas Automáticas**: Notificaciones cuando se superan umbrales críticos
- **Dashboard en Tiempo Real**: Visualización de métricas con actualización automática

### 2. Logging Estructurado
- **Niveles de Log**: ERROR, WARN, INFO, DEBUG
- **Contexto Enriquecido**: Usuario, sesión, request ID, duración
- **Logging Remoto**: Envío a servicios externos en producción
- **Formato JSON**: Logs estructurados para análisis automatizado

### 3. Auditoría Completa
- **Eventos de Autenticación**: Login, logout, fallos de autenticación
- **Operaciones de Datos**: CRUD con tracking de cambios
- **Eventos de Seguridad**: Accesos no autorizados, exportación de datos
- **Eventos de Negocio**: Cambios de estado de proyectos, actualizaciones de stock

### 4. Sistema de Alertas
- **Umbrales Configurables**: Tiempo de respuesta, tasa de errores, uso de memoria
- **Múltiples Canales**: Slack, email, logs
- **Severidad**: Low, medium, high, critical
- **Historial de Alertas**: Tracking de alertas pasadas

## Configuración

### Variables de Entorno

```env
# Monitoreo
NEXT_PUBLIC_ENABLE_ERROR_MONITORING=true
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_API_METRICS=true
NEXT_PUBLIC_ENABLE_ALERTS=true

# Logging
NEXT_PUBLIC_LOG_LEVEL=info
NEXT_PUBLIC_ENABLE_REMOTE_LOGGING=true

# Alertas
NEXT_PUBLIC_ALERT_API_RESPONSE_TIME=5000
NEXT_PUBLIC_ALERT_ERROR_RATE=5.0
NEXT_PUBLIC_ALERT_CACHE_HIT_RATE=70.0
NEXT_PUBLIC_ALERT_MEMORY_USAGE=80.0
NEXT_PUBLIC_ALERT_REQUESTS_PER_MINUTE=1000

# Retención de datos
NEXT_PUBLIC_METRICS_RETENTION_DAYS=30

# Servicios externos
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ALERT_EMAIL_RECIPIENTS=admin@example.com,ops@example.com
```

## Uso

### 1. Monitoreo Básico

```typescript
import { trackError, trackPerformance, trackAPIOperation } from '@/lib/monitoring'

// Tracking de errores
try {
  // código que puede fallar
} catch (error) {
  trackError(error, { component: 'UserService', action: 'createUser' })
}

// Tracking de rendimiento
const startTime = performance.now()
// operación a medir
const duration = performance.now() - startTime
trackPerformance('user_creation_time', duration, { userId: 'user123' })

// Tracking de operaciones API
trackAPIOperation('/api/users', 'POST', 201, 150, {
  userId: 'user123',
  cacheHit: false
})
```

### 2. Wrapper para Funciones API

```typescript
import { withAPIMonitoring } from '@/lib/monitoring-middleware'

async function createUser(userData: any) {
  // lógica de creación de usuario
  return { success: true, userId: 'user123' }
}

// Envolver con monitoreo automático
export const monitoredCreateUser = withAPIMonitoring(
  createUser, 
  '/api/users', 
  'POST'
)
```

### 3. Middleware para Rutas API

```typescript
import { withMonitoring } from '@/lib/monitoring-middleware'

async function handleUserCreation(request: NextRequest) {
  const userData = await request.json()
  // lógica de creación
  return NextResponse.json({ success: true })
}

export const POST = withMonitoring(handleUserCreation, '/api/users', {
  trackPerformance: true,
  trackErrors: true,
  logRequests: true,
  includeRequestBody: true
})
```

### 4. Logging Estructurado

```typescript
import { logger } from '@/lib/logger'

// Logging básico
logger.info('User created successfully', { userId: 'user123', email: 'user@example.com' })
logger.error('Failed to create user', error, { userData })

// Logging de API calls
logger.apiCall('POST', '/api/users', 150, 201, { userId: 'user123' })

// Logging de acciones de usuario
logger.userAction('user123', 'create_project', 'ProjectForm', { projectId: 'proj456' })

// Logging de rendimiento
logger.performance('database_query', 250, 'UserService', { query: 'SELECT * FROM users' })
```

### 5. Auditoría

```typescript
import { auditLogger, AuditEventType } from '@/lib/audit-logger'

// Logging de operaciones de datos
auditLogger.logDataOperation(
  'create',
  'users',
  'user123',
  'admin-user',
  undefined,
  'success',
  { name: 'John Doe', email: 'john@example.com' }
)

// Logging de eventos de autenticación
auditLogger.logAuth('login', 'user123', { method: 'password' }, { ip: '192.168.1.1' })

// Logging de eventos de seguridad
auditLogger.logSecurity('data_export', 'users', 'admin-user', { 
  format: 'csv', 
  recordCount: 100 
})

// Wrapper para funciones con auditoría automática
const auditedFunction = withAuditLogging(
  originalFunction,
  AuditEventType.CREATE,
  'users',
  (userData) => ({
    resourceId: userData.id,
    userId: userData.createdBy,
    details: { name: userData.name }
  })
)
```

### 6. Dashboard de Monitoreo

```typescript
// Acceder al dashboard
// Navegar a /admin/monitoring

// Obtener datos de monitoreo programáticamente
import { getMonitoringData } from '@/lib/monitoring'

const data = getMonitoringData(3600000) // Última hora
console.log(data.api.avgResponseTime)
console.log(data.api.errorRate)
console.log(data.alerts.length)
```

## API Endpoints

### Monitoreo
- `GET /api/monitoring?timeRange=3600000` - Obtener métricas
- `POST /api/monitoring` - Acciones (clear_alerts, export_metrics)

### Salud del Sistema
- `GET /api/health` - Estado completo del sistema

### Auditoría
- `GET /api/audit?resource=users&startDate=2024-01-01` - Trail de auditoría
- `POST /api/audit` - Generar reporte de auditoría

### Alertas
- `POST /api/alerts` - Procesar alertas (uso interno)

### Logs
- `POST /api/logs` - Enviar logs desde el cliente

### Analytics
- `POST /api/analytics` - Eventos de analytics

## Componentes React

### Dashboard de Monitoreo
```typescript
import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard'

export default function AdminPage() {
  return <MonitoringDashboard />
}
```

### Hook de Monitoreo
```typescript
import { useMonitoring } from '@/lib/monitoring'

function MyComponent() {
  const { trackError, trackPerformance, trackEvent } = useMonitoring('MyComponent')
  
  const handleAction = () => {
    try {
      // acción
      trackEvent('button_click', { buttonId: 'save' })
    } catch (error) {
      trackError(error, { action: 'save' })
    }
  }
}
```

## Integración con Google Sheets API

El sistema está completamente integrado con el servicio de Google Sheets:

```typescript
// Automáticamente tracked en GoogleSheetsAPIService
const response = await googleSheetsAPIService.executeOperation({
  table: 'Usuarios',
  operation: 'create',
  data: userData
})

// Genera automáticamente:
// - Métricas de rendimiento
// - Logs estructurados
// - Eventos de auditoría
// - Alertas si hay problemas
```

## Alertas y Notificaciones

### Configuración de Slack
```typescript
// En producción, las alertas se envían automáticamente a Slack
// Configurar SLACK_WEBHOOK_URL en variables de entorno
```

### Tipos de Alertas
- **High Response Time**: API response > 5 segundos
- **High Error Rate**: Tasa de errores > 5%
- **Low Cache Hit Rate**: Cache hit rate < 70%
- **High Memory Usage**: Uso de memoria > 80%
- **High Request Rate**: Requests > 1000/minuto

## Mejores Prácticas

### 1. Logging
- Usar niveles apropiados (ERROR para errores, INFO para eventos importantes)
- Incluir contexto relevante (userId, requestId, etc.)
- No loggear información sensible (passwords, tokens)
- Usar logging estructurado para facilitar análisis

### 2. Monitoreo
- Trackear métricas clave de negocio
- Establecer umbrales realistas para alertas
- Revisar métricas regularmente
- Usar el dashboard para identificar tendencias

### 3. Auditoría
- Loggear todas las operaciones de datos sensibles
- Incluir información de cambios (before/after)
- Trackear eventos de seguridad
- Mantener trazabilidad completa

### 4. Rendimiento
- Monitorear tiempo de respuesta de APIs críticas
- Trackear cache hit rates
- Alertar sobre degradación de rendimiento
- Usar métricas para optimización

## Troubleshooting

### Problemas Comunes

1. **Logs no aparecen en producción**
   - Verificar `NEXT_PUBLIC_ENABLE_REMOTE_LOGGING=true`
   - Comprobar endpoint `/api/logs`

2. **Alertas no se envían**
   - Verificar `NEXT_PUBLIC_ENABLE_ALERTS=true`
   - Comprobar configuración de Slack/email

3. **Dashboard no muestra datos**
   - Verificar que las métricas se estén recolectando
   - Comprobar endpoint `/api/monitoring`

4. **Rendimiento degradado**
   - Revisar configuración de retención de métricas
   - Ajustar frecuencia de recolección

### Debug

```typescript
// Habilitar debug logging
// NEXT_PUBLIC_LOG_LEVEL=debug

// Verificar estado del sistema
fetch('/api/health').then(r => r.json()).then(console.log)

// Obtener métricas actuales
import { getMonitoringData } from '@/lib/monitoring'
console.log(getMonitoringData())
```

## Extensiones Futuras

- Integración con servicios de APM (DataDog, New Relic)
- Métricas de negocio personalizadas
- Dashboards más avanzados con gráficos
- Machine learning para detección de anomalías
- Integración con sistemas de ticketing
- Métricas de experiencia de usuario (Core Web Vitals)