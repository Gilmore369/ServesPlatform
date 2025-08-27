import { http, HttpResponse } from 'msw'
import { mockUsers, mockProjects, mockActivities, mockPersonnel } from './data'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api'

export const handlers = [
  // Authentication endpoints
  http.post(`${API_BASE}/auth`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    
    const user = mockUsers.find(u => u.email === body.email)
    if (!user) {
      return HttpResponse.json({ ok: false, message: 'Usuario no encontrado' }, { status: 401 })
    }

    return HttpResponse.json({
      ok: true,
      jwt: 'mock-jwt-token',
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol
      }
    })
  }),

  http.get(`${API_BASE}/whoami`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ ok: false, message: 'Token requerido' }, { status: 401 })
    }

    return HttpResponse.json({
      ok: true,
      user: mockUsers[0] // Return admin user for tests
    })
  }),

  // CRUD endpoints
  http.get(`${API_BASE}/crud`, ({ request }) => {
    const url = new URL(request.url)
    const table = url.searchParams.get('table')
    const action = url.searchParams.get('action')

    switch (table) {
      case 'Proyectos':
        if (action === 'list') {
          return HttpResponse.json({ ok: true, data: mockProjects })
        }
        break
      case 'Actividades':
        if (action === 'list') {
          return HttpResponse.json({ ok: true, data: mockActivities })
        }
        break
      case 'Colaboradores':
        if (action === 'list') {
          return HttpResponse.json({ ok: true, data: mockPersonnel })
        }
        break
      case 'Usuarios':
        if (action === 'list') {
          return HttpResponse.json({ ok: true, data: mockUsers })
        }
        break
    }

    return HttpResponse.json({ ok: false, message: 'Endpoint no encontrado' }, { status: 404 })
  }),

  http.post(`${API_BASE}/crud`, async ({ request }) => {
    const body = await request.json() as any
    const { table, action, data } = body

    if (action === 'create') {
      const newItem = {
        ...data,
        id: `${table.toLowerCase()}_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      return HttpResponse.json({ ok: true, data: newItem })
    }

    if (action === 'update') {
      const updatedItem = {
        ...data,
        updated_at: new Date().toISOString()
      }

      return HttpResponse.json({ ok: true, data: updatedItem })
    }

    return HttpResponse.json({ ok: false, message: 'Acción no soportada' }, { status: 400 })
  }),

  // Dashboard KPIs
  http.get(`${API_BASE}/dashboard/kpis`, () => {
    return HttpResponse.json({
      ok: true,
      data: {
        proyectosActivos: 12,
        tareasPendientes: 45,
        personalActivo: 28,
        presupuestoRestante: 150000
      }
    })
  }),

  // Fallback handler
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`)
    return HttpResponse.json({ ok: false, message: 'Endpoint no encontrado' }, { status: 404 })
  })
]