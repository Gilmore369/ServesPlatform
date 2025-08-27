# Instrucciones de Despliegue a Producción - ServesPlatform

## 📋 Resumen

Esta guía te llevará paso a paso para desplegar ServesPlatform a producción de manera segura y optimizada.

## 🚀 Proceso de Despliegue Automatizado

### Opción 1: Despliegue Completo Automatizado (Recomendado)

```bash
# Ejecuta todo el pipeline de producción
npm run deploy:production
```

Este comando ejecuta automáticamente:
- ✅ Validación del sistema
- ✅ Suite completa de pruebas
- ✅ Construcción optimizada
- ✅ Análisis de bundle
- ✅ Despliegue a Vercel
- ✅ Validación post-despliegue

### Opción 2: Proceso Manual Paso a Paso

Si prefieres control total sobre cada paso:

```bash
# 1. Validar sistema
npm run validate

# 2. Ejecutar pruebas
npm run test

# 3. Verificar tipos TypeScript
npm run type-check

# 4. Verificar código
npm run lint

# 5. Construir para producción
npm run build:production

# 6. Analizar bundle
npm run optimize

# 7. Desplegar
npm run deploy:vercel
```

## 🔧 Configuración Previa

### 1. Variables de Entorno

Copia y configura las variables de producción:

```bash
# Copia el archivo de ejemplo
cp .env.production .env.local
```

Edita `.env.local` con tus valores reales:

```env
# Configuración de API
NEXT_PUBLIC_API_BASE=https://script.google.com/macros/s/TU_SCRIPT_ID/exec
NEXT_PUBLIC_API_TOKEN=tu-token-de-produccion

# Configuración de la aplicación
NEXT_PUBLIC_APP_NAME=ServesPlatform
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENVIRONMENT=production

# Monitoreo y logging
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_MONITORING=true
NEXT_PUBLIC_ENABLE_REMOTE_LOGGING=true
NEXT_PUBLIC_LOG_LEVEL=INFO

# Monitoreo de rendimiento
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
NEXT_PUBLIC_PERFORMANCE_BUDGET_JS=500
NEXT_PUBLIC_PERFORMANCE_BUDGET_CSS=100
```

### 2. Configurar Google Apps Script

Antes del despliegue, asegúrate de que tu Google Apps Script esté configurado:

1. **Despliega el script** siguiendo las instrucciones en `google-apps-script/SETUP_INSTRUCTIONS.md`
2. **Configura las propiedades del script**:
   - `SHEET_ID`: ID de tu hoja de Google Sheets de producción
   - `API_TOKEN`: Token seguro para la API
   - `JWT_SECRET`: Secreto para JWT
   - `ENVIRONMENT`: "production"

3. **Prueba los endpoints**:
   ```bash
   # Prueba autenticación
   curl -X POST "TU_SCRIPT_URL" \
     -H "Content-Type: application/json" \
     -d '{"action": "auth", "email": "admin@serves.com", "password": "tu-password"}'
   ```

### 3. Instalar Vercel CLI

Si no tienes Vercel CLI instalado:

```bash
npm install -g vercel
vercel login
```

## 📊 Validación Pre-Despliegue

### Ejecutar Validación Completa

```bash
npm run production-check
```

Esta validación verifica:
- ✅ Variables de entorno configuradas
- ✅ Archivos requeridos presentes
- ✅ Configuración de seguridad
- ✅ Optimizaciones de Next.js
- ✅ Configuración de TypeScript
- ✅ Pruebas pasando
- ✅ Bundle optimizado

### Validaciones Individuales

```bash
# Validar solo el sistema
npm run validate

# Solo pruebas unitarias
npm run test:unit

# Solo pruebas de integración
npm run test:integration

# Solo pruebas E2E
npm run test:e2e

# Solo análisis de bundle
npm run optimize
```

## 🏗️ Proceso de Construcción

### Construcción Optimizada

```bash
# Construcción completa con optimizaciones
npm run build:production
```

Este comando:
1. Limpia archivos anteriores
2. Valida el sistema
3. Ejecuta pruebas unitarias
4. Construye la aplicación
5. Optimiza el bundle

### Análisis de Bundle

```bash
# Analizar tamaño del bundle
npm run build:analyze
```

Esto genera un reporte visual del tamaño de tu bundle para identificar oportunidades de optimización.

## 🚀 Despliegue

### Despliegue a Vercel

```bash
# Despliegue directo
npm run deploy:vercel

# O despliegue con validación completa
npm run deploy:production
```

### Configurar Variables en Vercel

1. Ve al Dashboard de Vercel
2. Selecciona tu proyecto
3. Ve a Settings > Environment Variables
4. Agrega todas las variables de `.env.production`

## 📈 Monitoreo Post-Despliegue

### Verificar Salud del Sistema

```bash
# Verificar endpoint de salud
curl https://tu-dominio.vercel.app/api/health
```

### Monitoreo de Rendimiento

```bash
# Monitorear rendimiento (requiere app ejecutándose)
npm run monitor:performance https://tu-dominio.vercel.app
```

### Verificar Logs

```bash
# Ver logs en tiempo real (desarrollo)
npm run monitor:logs
```

## 🔍 Validación Post-Despliegue

### Lista de Verificación

- [ ] **Aplicación carga correctamente**
  - Visita tu URL de producción
  - Verifica que la página principal carga

- [ ] **Autenticación funciona**
  - Prueba login con credenciales válidas
  - Verifica que el dashboard es accesible

- [ ] **API endpoints responden**
  - Prueba `/api/health`
  - Verifica conexión con Google Sheets

- [ ] **Rendimiento aceptable**
  - Tiempo de carga < 3 segundos
  - Core Web Vitals en verde
  - Sin errores en consola

- [ ] **Funcionalidades principales**
  - Navegación entre páginas
  - Operaciones CRUD básicas
  - Responsive design

## 🛠️ Comandos de Mantenimiento

### Monitoreo Continuo

```bash
# Verificar salud del sistema
npm run health-check

# Monitorear rendimiento
npm run monitor:performance

# Validar configuración
npm run validate
```

### Optimización

```bash
# Limpiar archivos temporales
npm run clean

# Analizar dependencias no utilizadas
npm run optimize

# Verificar actualizaciones de seguridad
npm audit
```

## 🚨 Solución de Problemas

### Errores Comunes

#### 1. Error de Variables de Entorno
```
❌ Required environment variable missing: NEXT_PUBLIC_API_BASE
```

**Solución**: Verifica que `.env.local` esté configurado correctamente.

#### 2. Error de Construcción
```
❌ Build failed
```

**Solución**:
```bash
npm run clean
npm install
npm run build
```

#### 3. Error de Conexión API
```
❌ API connection failed
```

**Solución**:
- Verifica que Google Apps Script esté desplegado
- Confirma que la URL del script sea correcta
- Verifica el token de API

#### 4. Errores de Rendimiento
```
⚠️ Bundle size exceeds budget
```

**Solución**:
```bash
npm run build:analyze
# Revisa el reporte y optimiza componentes grandes
```

### Rollback de Emergencia

Si necesitas revertir el despliegue:

```bash
# En Vercel Dashboard
# 1. Ve a Deployments
# 2. Encuentra el despliegue anterior estable
# 3. Haz clic en "Promote to Production"
```

## 📞 Soporte y Escalación

### Niveles de Severidad

#### 🔴 Crítico (Aplicación no funciona)
1. Verifica status de Vercel
2. Revisa logs de error
3. Ejecuta rollback si es necesario
4. Contacta soporte técnico

#### 🟡 Alto (Funcionalidad limitada)
1. Identifica funcionalidad afectada
2. Revisa logs específicos
3. Aplica fix y redespliega
4. Monitorea resolución

#### 🟢 Medio/Bajo (Optimización)
1. Documenta el issue
2. Programa fix para próximo release
3. Monitorea impacto

### Contactos de Soporte

- **Técnico**: [Tu información de contacto]
- **DevOps**: [Información de contacto]
- **Producto**: [Información de contacto]

## 📚 Recursos Adicionales

### Documentación

- [Guía de Despliegue Técnica](./PRODUCTION_DEPLOYMENT.md)
- [Lista de Verificación](./PRODUCTION_CHECKLIST.md)
- [Reporte de Preparación](./PRODUCTION_READINESS.md)

### Herramientas de Monitoreo

- **Vercel Analytics**: Métricas de rendimiento automáticas
- **Google Analytics**: Configurar si `NEXT_PUBLIC_GA_ID` está definido
- **Sentry**: Configurar si `NEXT_PUBLIC_SENTRY_DSN` está definido

### Scripts Útiles

```bash
# Ver todos los scripts disponibles
npm run

# Ayuda específica de un script
npm run validate --help
```

---

## 🎉 ¡Felicitaciones!

Si has seguido todos estos pasos, tu aplicación ServesPlatform debería estar funcionando perfectamente en producción con:

- ✅ Monitoreo completo de rendimiento
- ✅ Logging estructurado
- ✅ Optimizaciones de bundle
- ✅ Seguridad mejorada
- ✅ Pipeline de despliegue automatizado

**¡Tu aplicación está lista para servir a tus usuarios!** 🚀

---

**Última actualización**: 27 de agosto, 2025  
**Versión**: 1.0.0  
**Estado**: ✅ Listo para Producción