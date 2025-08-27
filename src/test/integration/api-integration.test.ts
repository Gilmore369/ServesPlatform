import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { server } from '../mocks/server'

describe('API Integration Tests', () => {
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  describe('Authentication Flow', () => {
    it('should authenticate user with valid credentials', async () => {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@serves.com',
          password: 'admin123'
        })
      })

      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(data.jwt).toBeDefined()
      expect(data.user).toBeDefined()
    })

    it('should reject invalid credentials', async () => {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        })
      })

      const data = await response.json()
      expect(data.ok).toBe(false)
      expect(response.status).toBe(401)
    })

    it('should validate JWT token', async () => {
      const response = await fetch('/api/whoami', {
        headers: {
          'Authorization': 'Bearer valid-jwt-token'
        }
      })

      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(data.user).toBeDefined()
    })
  })

  describe('CRUD Operations', () => {
    it('should list projects', async () => {
      const response = await fetch('/api/crud?table=Proyectos&action=list', {
        headers: {
          'Authorization': 'Bearer valid-jwt-token'
        }
      })

      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('should create new project', async () => {
      const projectData = {
        codigo: 'TEST-001',
        nombre: 'Test Project',
        cliente_id: 'client_1',
        responsable_id: 'user_1',
        ubicacion: 'Test Location',
        descripcion: 'Test Description',
        linea_servicio: 'Eléctrico',
        sla_objetivo: 30,
        inicio_plan: '2024-01-01',
        fin_plan: '2024-01-31',
        presupuesto_total: 10000,
        moneda: 'PEN',
        estado: 'Planificación'
      }

      const response = await fetch('/api/crud', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          table: 'Proyectos',
          action: 'create',
          data: projectData
        })
      })

      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(data.data.id).toBeDefined()
      expect(data.data.codigo).toBe('TEST-001')
    })
  })

  describe('Dashboard Data', () => {
    it('should fetch dashboard KPIs', async () => {
      const response = await fetch('/api/dashboard/kpis', {
        headers: {
          'Authorization': 'Bearer valid-jwt-token'
        }
      })

      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(data.data).toHaveProperty('proyectosActivos')
      expect(data.data).toHaveProperty('tareasPendientes')
      expect(data.data).toHaveProperty('personalActivo')
      expect(data.data).toHaveProperty('presupuestoRestante')
    })
  })
})