# 🚀 Guía Rápida - Despliegue a Producción

## ⚡ Despliegue en 5 Minutos

### 1. Configurar Variables (2 min)
```bash
# Copia y edita las variables de entorno
cp .env.production .env.local
# Edita .env.local con tus valores reales
```

### 2. Desplegar Automáticamente (3 min)
```bash
# Un solo comando para todo el proceso
npm run deploy:production
```

¡Listo! Tu aplicación estará en producción.

---

## 📋 Comandos Esenciales

### Despliegue
```bash
npm run deploy:production    # Despliegue completo automatizado
npm run deploy:vercel       # Solo despliegue (sin validaciones)
```

### Validación
```bash
npm run validate            # Validar sistema
npm run production-check    # Verificación completa de producción
npm run test               # Ejecutar todas las pruebas
```

### Monitoreo
```bash
npm run health-check        # Verificar salud del sistema
npm run monitor:performance # Monitorear rendimiento
npm run optimize           # Analizar optimizaciones
```

### Construcción
```bash
npm run build:production    # Construcción optimizada completa
npm run build:analyze      # Analizar tamaño del bundle
npm run clean              # Limpiar archivos temporales
```

---

## 🔧 Variables de Entorno Críticas

```env
# ⚠️ OBLIGATORIAS - Cambiar antes del despliegue
NEXT_PUBLIC_API_BASE=https://script.google.com/macros/s/TU_SCRIPT_ID/exec
NEXT_PUBLIC_API_TOKEN=tu-token-seguro-aqui
NEXT_PUBLIC_APP_NAME=ServesPlatform

# ✅ Recomendadas
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_MONITORING=true
```

---

## 🚨 Solución Rápida de Problemas

### Error: Variables de entorno faltantes
```bash
# Verifica que .env.local esté configurado
cat .env.local
```

### Error: Construcción fallida
```bash
npm run clean && npm install && npm run build
```

### Error: API no responde
```bash
# Verifica que Google Apps Script esté desplegado
curl -X POST "TU_SCRIPT_URL" -H "Content-Type: application/json" -d '{"action": "ping"}'
```

### Rollback de emergencia
1. Ve a Vercel Dashboard
2. Deployments → Encuentra versión anterior
3. "Promote to Production"

---

## ✅ Lista de Verificación Post-Despliegue

- [ ] Aplicación carga en la URL de producción
- [ ] Login funciona correctamente
- [ ] Dashboard es accesible
- [ ] `/api/health` responde OK
- [ ] No hay errores en consola del navegador
- [ ] Tiempo de carga < 3 segundos

---

## 📞 Contacto de Emergencia

**Si algo sale mal:**
1. 🔴 **Crítico**: Ejecuta rollback inmediatamente
2. 🟡 **Medio**: Revisa logs y aplica fix
3. 🟢 **Menor**: Documenta para próximo release

---

## 🎯 URLs Importantes

- **Producción**: `https://tu-app.vercel.app`
- **Health Check**: `https://tu-app.vercel.app/api/health`
- **Vercel Dashboard**: `https://vercel.com/dashboard`
- **Google Apps Script**: `https://script.google.com`

---

**💡 Tip**: Guarda esta guía como favorito para referencia rápida durante despliegues.