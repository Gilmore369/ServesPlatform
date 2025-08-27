# 🏗️ ServesPlatform

Plataforma de gestión de proyectos de construcción desarrollada con Next.js y Google Apps Script.

## 🚀 Características

- ✅ Gestión de materiales con control de stock
- ✅ Dashboard de proyectos en tiempo real
- ✅ Sistema de autenticación
- ✅ API backend con Google Apps Script
- ✅ Interfaz responsive y moderna
- ✅ Optimizado para producción

## 🛠️ Tecnologías

- **Frontend**: Next.js 15.5.1, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Google Apps Script
- **Deployment**: Vercel
- **Data Fetching**: SWR

## 📦 Instalación

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Cuenta de Google (para Apps Script)

### Configuración Local

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/serves-platform.git
   cd serves-platform
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env.local
   ```
   
   Editar `.env.local` con tus valores:
   ```env
   NEXT_PUBLIC_API_BASE_URL=tu_url_de_google_apps_script
   NEXT_PUBLIC_API_TOKEN=tu_token_de_api
   ```

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

5. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

## 🌐 Despliegue en Producción

### Google Apps Script
1. Ve a [script.google.com](https://script.google.com)
2. Crea un nuevo proyecto
3. Copia el código de `google-apps-script/Code-SIMPLE-FUNCIONAL.gs`
4. Despliega como Web App
5. Copia la URL generada

### Vercel
1. Conecta tu repositorio de GitHub con Vercel
2. Configura las variables de entorno
3. Despliega automáticamente

## 📊 Funcionalidades

### Dashboard
- Métricas de proyectos en tiempo real
- Gráficos de progreso
- Alertas de stock bajo

### Gestión de Materiales
- Lista completa de materiales
- Control de stock en tiempo real
- Alertas de stock mínimo
- Gestión de proveedores

### API Endpoints
- `GET /api?action=crud&operation=list&table=Materiales` - Listar materiales
- `GET /api?action=auth` - Autenticación
- `GET /api?action=whoami` - Información del usuario

## 🔧 Scripts Disponibles

```bash
npm run dev          # Desarrollo
npm run build        # Build para producción
npm run start        # Servidor de producción
npm run lint         # Linting
npm run test         # Tests
```

## 📁 Estructura del Proyecto

```
serves-platform/
├── src/
│   ├── app/           # App Router (Next.js 13+)
│   ├── components/    # Componentes reutilizables
│   ├── lib/          # Utilidades y configuración
│   └── types/        # Tipos de TypeScript
├── public/           # Archivos estáticos
├── google-apps-script/ # Código del backend
└── docs/            # Documentación
```

## 🔐 Autenticación

### Usuario de Prueba
- **Email**: admin@servesplatform.com
- **Password**: admin123

## 📈 Datos de Ejemplo

El sistema incluye 5 materiales de ejemplo:
- Cemento Portland Tipo I
- Fierro de Construcción 1/2"
- Ladrillo King Kong 18 huecos
- Arena Gruesa
- Pintura Látex Blanco

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Soporte

Si tienes problemas o preguntas:
1. Revisa la documentación en `/docs`
2. Abre un issue en GitHub
3. Verifica que Google Apps Script esté desplegado correctamente

## 🎯 Roadmap

- [ ] Integración con Google Sheets
- [ ] Sistema de notificaciones
- [ ] Reportes avanzados
- [ ] App móvil
- [ ] Integración con proveedores

---

Desarrollado con ❤️ para la industria de la construcción