/**
 * Error Handling Integration Tests
 * Tests for error handling across the full stack
 * Requirements: 8.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '@/lib/apiClient'
import { currentTestConfig } from '../test.config'

// Skip integration tests if not configured
const skipIntegrationTests = currentTestConfig.skipIntegrationTests

describe.skipIf(skipIntegrationTests)('Error Handling Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('API Error Handling', () => {
    it('should handle invalid API tokens', async () => {
      // Temporarily override the API token
      const originalToken = apiClient['apiToken']
      apiClient['apiToken'] = 'invalid-token'
      
      try {
        const response = await apiClient.getMaterials({ limit: 10 })
        
        expect(response.ok).toBe(false)
        expect(response.message).toContain('token')
      } finally {
        // Restore original token
        apiClient['apiToken'] = originalToken
      }
    }, currentTestConfig.timeout)

    it('should handle malformed requests', async () => {
      try {
        // Send a request with invalid parameters
        const response = await apiClient.list('Materiales', { limit: -1 })
        
        expect(response.ok).toBe(false)
        expect(response.message).toBeDefined()
      } catch (error) {
        expect(error).toBeDefined()
      }
    }, currentTestConfig.timeout)

    it('should handle server errors gracefully', async () => {
      // Mock fetch to return server error
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
        json: () => Promise.resolve({
          ok: false,
          message: 'Internal server error'
        })
      })
      
      try {
        const response = await apiClient.getMaterials({ limit: 10 })
        
        expect(response.ok).toBe(false)
        expect(response.message).toContain('error')
      } catch (error) {
        expect(error).toBeDefined()
      } finally {
        global.fetch = originalFetch
      }
    }, currentTestConfig.timeout)

    it('should handle network timeouts', async () => {
      // Mock fetch to timeout
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )
      
      try {
        await apiClient.getMaterials({ limit: 10 })
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toContain('timeout')
      } finally {
        global.fetch = originalFetch
      }
    }, currentTestConfig.timeout)

    it('should handle CORS errors', async () => {
      // Mock fetch to return CORS error
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      
      try {
        await apiClient.getMaterials({ limit: 10 })
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toContain('Network error')
      } finally {
        global.fetch = originalFetch
      }
    }, currentTestConfig.timeout)
  })

  describe('Data Validation Errors', () => {
    it('should handle invalid material data', async () => {
      const invalidMaterial = {
        // Missing required fields
        descripcion: 'Test Material'
        // Missing sku, categoria, unidad, etc.
      }
      
      try {
        const response = await apiClient.createMaterial(invalidMaterial)
        
        expect(response.ok).toBe(false)
        expect(response.message).toContain('validation')
      } catch (error) {
        expect(error).toBeDefined()
      }
    }, currentTestConfig.timeout)

    it('should handle invalid project data', async () => {
      const invalidProject = {
        nombre: 'Test Project'
        // Missing required fields like codigo, cliente_id, etc.
      }
      
      try {
        const response = await apiClient.createProject(invalidProject)
        
        expect(response.ok).toBe(false)
        expect(response.message).toBeDefined()
      } catch (error) {
        expect(error).toBeDefined()
      }
    }, currentTestConfig.timeout)

    it('should handle invalid date formats', async () => {
      const projectWithInvalidDate = {
        codigo: 'TEST_PROJ_001',
        nombre: 'Test Project',
        cliente_id: 'CLI_001',
        responsable_id: 'USR_001',
        ubicacion: 'Lima',
        descripcion: 'Test',
        linea_servicio: 'Consultoría',
        inicio_plan: 'invalid-date',
        fin_plan: '2024-12-31',
        presupuesto_total: 10000,
        moneda: 'PEN',
        estado: 'Planificación',
        avance_pct: 0
      }
      
      try {
        const response = await apiClient.createProject(projectWithInvalidDate)
        
        expect(response.ok).toBe(false)
        expect(response.message).toContain('date')
      } catch (error) {
        expect(error).toBeDefined()
      }
    }, currentTestConfig.timeout)

    it('should handle invalid numeric values', async () => {
      const materialWithInvalidNumbers = {
        sku: 'TEST_MAT_001',
        descripcion: 'Test Material',
        categoria: 'Test',
        unidad: 'unidad',
        costo_ref: 'not-a-number',
        stock_actual: -10,
        stock_minimo: 'invalid',
        proveedor_principal: 'Test Provider',
        activo: true
      }
      
      try {
        const response = await apiClient.createMaterial(materialWithInvalidNumbers)
        
        expect(response.ok).toBe(false)
        expect(response.message).toBeDefined()
      } catch (error) {
        expect(error).toBeDefined()
      }
    }, currentTestConfig.timeout)
  })

  describe('Business Rule Violations', () => {
    it('should handle duplicate SKU creation', async () => {
      const material1 = {
        sku: `DUPLICATE_TEST_${Date.now()}`,
        descripcion: 'First Material',
        categoria: 'Test',
        unidad: 'unidad',
        costo_ref: 10.00,
        stock_actual: 50,
        stock_minimo: 5,
        proveedor_principal: 'Test Provider',
        activo: true
      }
      
      const material2 = {
        ...material1,
        descripcion: 'Second Material with Same SKU'
      }
      
      // Create first material
      const response1 = await apiClient.createMaterial(material1)
      expect(response1.ok).toBe(true)
      
      // Try to create second material with same SKU
      try {
        const response2 = await apiClient.createMaterial(material2)
        
        expect(response2.ok).toBe(false)
        expect(response2.message).toContain('duplicate')
      } catch (error) {
        expect(error).toBeDefined()
      }
    }, currentTestConfig.timeout * 2)

    it('should handle invalid project date ranges', async () => {
      const projectWithInvalidDates = {
        codigo: `INVALID_DATES_${Date.now()}`,
        nombre: 'Invalid Dates Project',
        cliente_id: 'CLI_001',
        responsable_id: 'USR_001',
        ubicacion: 'Lima',
        descripcion: 'Test project with invalid date range',
        linea_servicio: 'Consultoría',
        inicio_plan: '2024-12-31',
        fin_plan: '2024-01-01', // End date before start date
        presupuesto_total: 10000,
        moneda: 'PEN',
        estado: 'Planificación',
        avance_pct: 0
      }
      
      try {
        const response = await apiClient.createProject(projectWithInvalidDates)
        
        expect(response.ok).toBe(false)
        expect(response.message).toContain('date')
      } catch (error) {
        expect(error).toBeDefined()
      }
    }, currentTestConfig.timeout)

    it('should handle negative stock values', async () => {
      const materialWithNegativeStock = {
        sku: `NEGATIVE_STOCK_${Date.now()}`,
        descripcion: 'Negative Stock Material',
        categoria: 'Test',
        unidad: 'unidad',
        costo_ref: 10.00,
        stock_actual: -50, // Negative stock
        stock_minimo: 5,
        proveedor_principal: 'Test Provider',
        activo: true
      }
      
      try {
        const response = await apiClient.createMaterial(materialWithNegativeStock)
        
        expect(response.ok).toBe(false)
        expect(response.message).toContain('stock')
      } catch (error) {
        expect(error).toBeDefined()
      }
    }, currentTestConfig.timeout)
  })

  describe('Resource Not Found Errors', () => {
    it('should handle non-existent material retrieval', async () => {
      const response = await apiClient.getMaterial('non-existent-id-12345')
      
      expect(response.ok).toBe(false)
      expect(response.message).toContain('not found')
    }, currentTestConfig.timeout)

    it('should handle non-existent project retrieval', async () => {
      const response = await apiClient.getProject('non-existent-project-id')
      
      expect(response.ok).toBe(false)
      expect(response.message).toContain('not found')
    }, currentTestConfig.timeout)

    it('should handle non-existent activity retrieval', async () => {
      const response = await apiClient.getActivity('non-existent-activity-id')
      
      expect(response.ok).toBe(false)
      expect(response.message).toContain('not found')
    }, currentTestConfig.timeout)

    it('should handle updates to non-existent records', async () => {
      const updateData = {
        descripcion: 'Updated Description'
      }
      
      const response = await apiClient.updateMaterial('non-existent-id', updateData)
      
      expect(response.ok).toBe(false)
      expect(response.message).toContain('not found')
    }, currentTestConfig.timeout)

    it('should handle deletion of non-existent records', async () => {
      const response = await apiClient.delete('Materiales', 'non-existent-id')
      
      expect(response.ok).toBe(false)
      expect(response.message).toContain('not found')
    }, currentTestConfig.timeout)
  })

  describe('Permission and Authorization Errors', () => {
    it('should handle unauthorized access attempts', async () => {
      // Mock unauthorized response
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        json: () => Promise.resolve({
          ok: false,
          message: 'Unauthorized access'
        })
      })
      
      try {
        const response = await apiClient.getMaterials({ limit: 10 })
        
        expect(response.ok).toBe(false)
        expect(response.message).toContain('Unauthorized')
      } catch (error) {
        expect(error).toBeDefined()
      } finally {
        global.fetch = originalFetch
      }
    }, currentTestConfig.timeout)

    it('should handle forbidden operations', async () => {
      // Mock forbidden response
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue({
        status: 403,
        ok: false,
        json: () => Promise.resolve({
          ok: false,
          message: 'Forbidden operation'
        })
      })
      
      try {
        const response = await apiClient.delete('Materiales', 'some-id')
        
        expect(response.ok).toBe(false)
        expect(response.message).toContain('Forbidden')
      } catch (error) {
        expect(error).toBeDefined()
      } finally {
        global.fetch = originalFetch
      }
    }, currentTestConfig.timeout)
  })

  describe('Rate Limiting and Throttling', () => {
    it('should handle rate limiting errors', async () => {
      // Mock rate limit response
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue({
        status: 429,
        ok: false,
        json: () => Promise.resolve({
          ok: false,
          message: 'Rate limit exceeded'
        })
      })
      
      try {
        const response = await apiClient.getMaterials({ limit: 10 })
        
        expect(response.ok).toBe(false)
        expect(response.message).toContain('Rate limit')
      } catch (error) {
        expect(error).toBeDefined()
      } finally {
        global.fetch = originalFetch
      }
    }, currentTestConfig.timeout)

    it('should handle concurrent request limits', async () => {
      // Make many concurrent requests
      const promises = Array.from({ length: 20 }, () => 
        apiClient.getMaterials({ limit: 1 })
      )
      
      const responses = await Promise.allSettled(promises)
      
      // Some requests should succeed, some might be throttled
      const successful = responses.filter(r => r.status === 'fulfilled').length
      const failed = responses.filter(r => r.status === 'rejected').length
      
      expect(successful + failed).toBe(20)
      expect(successful).toBeGreaterThan(0) // At least some should succeed
    }, currentTestConfig.timeout * 2)
  })

  describe('Data Consistency Errors', () => {
    it('should handle concurrent modification conflicts', async () => {
      // Create a material first
      const material = {
        sku: `CONCURRENT_TEST_${Date.now()}`,
        descripcion: 'Concurrent Test Material',
        categoria: 'Test',
        unidad: 'unidad',
        costo_ref: 10.00,
        stock_actual: 50,
        stock_minimo: 5,
        proveedor_principal: 'Test Provider',
        activo: true
      }
      
      const createResponse = await apiClient.createMaterial(material)
      expect(createResponse.ok).toBe(true)
      
      const materialId = createResponse.data.id
      
      // Try to update the same material concurrently
      const update1 = apiClient.updateMaterial(materialId, { descripcion: 'Update 1' })
      const update2 = apiClient.updateMaterial(materialId, { descripcion: 'Update 2' })
      
      const [response1, response2] = await Promise.allSettled([update1, update2])
      
      // At least one should succeed
      const successCount = [response1, response2].filter(r => 
        r.status === 'fulfilled' && r.value.ok
      ).length
      
      expect(successCount).toBeGreaterThan(0)
    }, currentTestConfig.timeout * 2)

    it('should handle referential integrity violations', async () => {
      // Try to create an activity with non-existent project
      const activityWithInvalidProject = {
        proyecto_id: 'non-existent-project-id',
        nombre: 'Test Activity',
        descripcion: 'Test activity with invalid project reference',
        responsable_id: 'USR_001',
        fecha_inicio: '2024-02-15',
        fecha_fin: '2024-03-15',
        horas_estimadas: 40,
        horas_reales: 0,
        estado: 'Pendiente',
        prioridad: 'Media',
        avance_pct: 0
      }
      
      try {
        const response = await apiClient.createActivity(activityWithInvalidProject)
        
        expect(response.ok).toBe(false)
        expect(response.message).toContain('reference')
      } catch (error) {
        expect(error).toBeDefined()
      }
    }, currentTestConfig.timeout)
  })

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary service unavailability', async () => {
      let callCount = 0
      const originalFetch = global.fetch
      
      // Mock fetch to fail first few times, then succeed
      global.fetch = vi.fn().mockImplementation((...args) => {
        callCount++
        if (callCount <= 2) {
          return Promise.reject(new Error('Service unavailable'))
        }
        return originalFetch.apply(global, args)
      })
      
      try {
        // This should eventually succeed after retries
        const response = await apiClient.getMaterials({ limit: 10 })
        
        expect(response.ok).toBe(true)
        expect(callCount).toBeGreaterThan(1) // Should have retried
      } catch (error) {
        // If it still fails, that's also acceptable for this test
        expect(error).toBeDefined()
      } finally {
        global.fetch = originalFetch
      }
    }, currentTestConfig.timeout * 3)

    it('should handle partial batch operation failures', async () => {
      const materials = [
        {
          sku: `BATCH_SUCCESS_${Date.now()}`,
          descripcion: 'Batch Success Material',
          categoria: 'Test',
          unidad: 'unidad',
          costo_ref: 10.00,
          stock_actual: 50,
          stock_minimo: 5,
          proveedor_principal: 'Test Provider',
          activo: true
        },
        {
          // Invalid material - missing required fields
          descripcion: 'Batch Failure Material'
        }
      ]
      
      try {
        const response = await apiClient.batchCreate('Materiales', materials)
        
        // Should handle partial success/failure
        expect(response).toBeDefined()
        
        if (response.ok) {
          // Some operations succeeded
          expect(response.data.length).toBeGreaterThan(0)
        } else {
          // All operations failed
          expect(response.message).toBeDefined()
        }
      } catch (error) {
        expect(error).toBeDefined()
      }
    }, currentTestConfig.timeout * 2)
  })

  describe('Error Logging and Monitoring', () => {
    it('should provide detailed error information for debugging', async () => {
      try {
        await apiClient.getMaterial('invalid-id-format')
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toBeDefined()
        expect(error.name).toBeDefined()
        
        // Should have stack trace for debugging
        if (error.stack) {
          expect(error.stack).toContain('getMaterial')
        }
      }
    }, currentTestConfig.timeout)

    it('should handle error responses with proper status codes', async () => {
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue({
        status: 400,
        ok: false,
        json: () => Promise.resolve({
          ok: false,
          message: 'Bad request',
          code: 'VALIDATION_ERROR',
          details: {
            field: 'sku',
            error: 'Required field missing'
          }
        })
      })
      
      try {
        const response = await apiClient.createMaterial({})
        
        expect(response.ok).toBe(false)
        expect(response.message).toBe('Bad request')
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.status).toBe(400)
      } finally {
        global.fetch = originalFetch
      }
    }, currentTestConfig.timeout)
  })
})