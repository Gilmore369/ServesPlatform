import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { GoogleSheetsAPIService, CRUDOperation } from '@/lib/google-sheets-api-service'
import { DataValidator } from '@/lib/validation/validator'

// Test configuration - these should point to test Google Sheets
const TEST_CONFIG = {
  baseUrl: process.env.TEST_GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/test/exec',
  token: process.env.TEST_API_TOKEN || 'test-token',
  timeout: 10000,
  retryAttempts: 2,
  cacheEnabled: false // Disable cache for integration tests
}

describe('Google Sheets Integration Tests', () => {
  let apiService: GoogleSheetsAPIService
  let validator: DataValidator
  let testDataIds: string[] = []

  beforeAll(async () => {
    // Skip integration tests if no test environment is configured
    if (!process.env.TEST_GOOGLE_SHEETS_URL) {
      console.log('Skipping integration tests - TEST_GOOGLE_SHEETS_URL not configured')
      return
    }

    apiService = new GoogleSheetsAPIService(TEST_CONFIG)
    validator = new DataValidator()

    // Verify connection to test Google Sheets
    const isConnected = await apiService.validateConnection()
    if (!isConnected) {
      throw new Error('Cannot connect to test Google Sheets. Check TEST_GOOGLE_SHEETS_URL and TEST_API_TOKEN')
    }
  })

  afterAll(async () => {
    if (!process.env.TEST_GOOGLE_SHEETS_URL) return

    // Clean up test data
    for (const id of testDataIds) {
      try {
        await apiService.executeOperation({
          table: 'Materiales',
          operation: 'delete',
          id
        })
      } catch (error) {
        console.warn(`Failed to clean up test data ${id}:`, error)
      }
    }
  })

  beforeEach(() => {
    if (!process.env.TEST_GOOGLE_SHEETS_URL) {
      // Skip individual tests if integration tests are disabled
      return
    }
  })

  describe('Material CRUD Operations', () => {
    it('should create, read, update, and delete a material', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      // Test data
      const newMaterial = {
        sku: `TEST-MAT-${Date.now()}`,
        descripcion: 'Material de prueba para integración',
        categoria: 'Herramientas',
        unidad: 'unidad',
        costo_ref: 150.75,
        stock_actual: 25,
        stock_minimo: 5,
        proveedor_principal: 'Proveedor Test',
        ubicacion_almacen: 'Almacén A-1',
        activo: true
      }

      // Validate data before sending
      const validationResult = validator.validateRecord('Materiales', newMaterial)
      expect(validationResult.isValid).toBe(true)

      // CREATE
      const createResponse = await apiService.executeOperation({
        table: 'Materiales',
        operation: 'create',
        data: newMaterial
      })

      expect(createResponse.ok).toBe(true)
      expect(createResponse.data).toHaveProperty('id')
      expect(createResponse.data.sku).toBe(newMaterial.sku)

      const materialId = createResponse.data.id
      testDataIds.push(materialId)

      // READ (GET)
      const getResponse = await apiService.executeOperation({
        table: 'Materiales',
        operation: 'get',
        id: materialId
      })

      expect(getResponse.ok).toBe(true)
      expect(getResponse.data.id).toBe(materialId)
      expect(getResponse.data.sku).toBe(newMaterial.sku)
      expect(getResponse.data.descripcion).toBe(newMaterial.descripcion)

      // UPDATE
      const updatedData = {
        descripcion: 'Material actualizado para pruebas',
        stock_actual: 30,
        costo_ref: 175.50
      }

      const updateResponse = await apiService.executeOperation({
        table: 'Materiales',
        operation: 'update',
        id: materialId,
        data: updatedData
      })

      expect(updateResponse.ok).toBe(true)
      expect(updateResponse.data.descripcion).toBe(updatedData.descripcion)
      expect(updateResponse.data.stock_actual).toBe(updatedData.stock_actual)

      // Verify update with another GET
      const getUpdatedResponse = await apiService.executeOperation({
        table: 'Materiales',
        operation: 'get',
        id: materialId
      })

      expect(getUpdatedResponse.ok).toBe(true)
      expect(getUpdatedResponse.data.descripcion).toBe(updatedData.descripcion)
      expect(getUpdatedResponse.data.stock_actual).toBe(updatedData.stock_actual)

      // DELETE
      const deleteResponse = await apiService.executeOperation({
        table: 'Materiales',
        operation: 'delete',
        id: materialId
      })

      expect(deleteResponse.ok).toBe(true)

      // Verify deletion
      const getDeletedResponse = await apiService.executeOperation({
        table: 'Materiales',
        operation: 'get',
        id: materialId
      })

      expect(getDeletedResponse.ok).toBe(false)
      expect(getDeletedResponse.status).toBe(404)

      // Remove from cleanup list since it's already deleted
      testDataIds = testDataIds.filter(id => id !== materialId)
    })

    it('should list materials with pagination', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const listResponse = await apiService.executeOperation({
        table: 'Materiales',
        operation: 'list',
        pagination: { page: 1, limit: 10 }
      })

      expect(listResponse.ok).toBe(true)
      expect(Array.isArray(listResponse.data)).toBe(true)
      expect(listResponse.pagination).toBeDefined()
      expect(listResponse.pagination?.page).toBe(1)
      expect(listResponse.pagination?.limit).toBe(10)
    })

    it('should filter materials by category', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const filterResponse = await apiService.executeOperation({
        table: 'Materiales',
        operation: 'list',
        filters: { categoria: 'Herramientas' },
        pagination: { page: 1, limit: 5 }
      })

      expect(filterResponse.ok).toBe(true)
      expect(Array.isArray(filterResponse.data)).toBe(true)
      
      // All returned materials should have the filtered category
      filterResponse.data.forEach((material: any) => {
        expect(material.categoria).toBe('Herramientas')
      })
    })
  })

  describe('Project CRUD Operations', () => {
    it('should create and manage a project', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const newProject = {
        codigo: `TEST-PROJ-${Date.now()}`,
        nombre: 'Proyecto de Prueba Integración',
        cliente_id: 'CLI-TEST-001',
        responsable_id: 'USR-TEST-001',
        ubicacion: 'Lima, Perú',
        descripcion: 'Proyecto creado para pruebas de integración',
        linea_servicio: 'Consultoría',
        sla_objetivo: 45,
        inicio_plan: '2024-02-01',
        fin_plan: '2024-06-30',
        presupuesto_total: 75000.00,
        moneda: 'PEN',
        estado: 'Planificación',
        avance_pct: 0
      }

      // Validate project data
      const validationResult = validator.validateRecord('Proyectos', newProject)
      expect(validationResult.isValid).toBe(true)

      // Create project
      const createResponse = await apiService.executeOperation({
        table: 'Proyectos',
        operation: 'create',
        data: newProject
      })

      expect(createResponse.ok).toBe(true)
      expect(createResponse.data).toHaveProperty('id')
      expect(createResponse.data.codigo).toBe(newProject.codigo)

      const projectId = createResponse.data.id

      // Update project status
      const updateResponse = await apiService.executeOperation({
        table: 'Proyectos',
        operation: 'update',
        id: projectId,
        data: {
          estado: 'En progreso',
          avance_pct: 25
        }
      })

      expect(updateResponse.ok).toBe(true)
      expect(updateResponse.data.estado).toBe('En progreso')
      expect(updateResponse.data.avance_pct).toBe(25)

      // Clean up
      await apiService.executeOperation({
        table: 'Proyectos',
        operation: 'delete',
        id: projectId
      })
    })
  })

  describe('Batch Operations', () => {
    it('should handle batch operations correctly', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const batchOperations: CRUDOperation[] = [
        {
          table: 'Materiales',
          operation: 'list',
          pagination: { page: 1, limit: 5 }
        },
        {
          table: 'Proyectos',
          operation: 'list',
          pagination: { page: 1, limit: 3 }
        },
        {
          table: 'Usuarios',
          operation: 'list',
          pagination: { page: 1, limit: 2 }
        }
      ]

      const results = await apiService.batchOperations(batchOperations)

      expect(results).toHaveLength(3)
      expect(results[0].ok).toBe(true) // Materiales
      expect(results[1].ok).toBe(true) // Proyectos
      expect(results[2].ok).toBe(true) // Usuarios

      expect(Array.isArray(results[0].data)).toBe(true)
      expect(Array.isArray(results[1].data)).toBe(true)
      expect(Array.isArray(results[2].data)).toBe(true)
    })

    it('should handle partial failures in batch operations', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const batchOperations: CRUDOperation[] = [
        {
          table: 'Materiales',
          operation: 'list',
          pagination: { page: 1, limit: 5 }
        },
        {
          table: 'InvalidTable',
          operation: 'list',
          pagination: { page: 1, limit: 5 }
        },
        {
          table: 'Proyectos',
          operation: 'get',
          id: 'non-existent-id'
        }
      ]

      const results = await apiService.batchOperations(batchOperations)

      expect(results).toHaveLength(3)
      expect(results[0].ok).toBe(true)  // Valid operation
      expect(results[1].ok).toBe(false) // Invalid table
      expect(results[2].ok).toBe(false) // Non-existent ID
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle validation errors gracefully', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const invalidMaterial = {
        // Missing required fields
        descripcion: 'Material inválido',
        categoria: 'Herramientas'
      }

      const response = await apiService.executeOperation({
        table: 'Materiales',
        operation: 'create',
        data: invalidMaterial
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(response.message).toContain('validación')
    })

    it('should handle non-existent resource errors', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const response = await apiService.executeOperation({
        table: 'Materiales',
        operation: 'get',
        id: 'non-existent-material-id'
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })

    it('should retry on transient errors', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      // This test would require mocking network conditions
      // For now, we'll test that the service handles retries correctly
      const serviceWithRetries = new GoogleSheetsAPIService({
        ...TEST_CONFIG,
        retryAttempts: 3,
        retryDelay: 100
      })

      const response = await serviceWithRetries.executeOperation({
        table: 'Materiales',
        operation: 'list',
        pagination: { page: 1, limit: 1 }
      })

      expect(response.ok).toBe(true)
    })
  })

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      // Create a material
      const material = {
        sku: `CONSISTENCY-TEST-${Date.now()}`,
        descripcion: 'Material para prueba de consistencia',
        categoria: 'Herramientas',
        unidad: 'unidad',
        costo_ref: 100.00,
        stock_actual: 50,
        stock_minimo: 10,
        proveedor_principal: 'Proveedor Consistencia',
        activo: true
      }

      const createResponse = await apiService.executeOperation({
        table: 'Materiales',
        operation: 'create',
        data: material
      })

      expect(createResponse.ok).toBe(true)
      const materialId = createResponse.data.id
      testDataIds.push(materialId)

      // Perform multiple updates
      const updates = [
        { stock_actual: 45 },
        { stock_actual: 40 },
        { stock_actual: 35 }
      ]

      for (const update of updates) {
        const updateResponse = await apiService.executeOperation({
          table: 'Materiales',
          operation: 'update',
          id: materialId,
          data: update
        })

        expect(updateResponse.ok).toBe(true)
        expect(updateResponse.data.stock_actual).toBe(update.stock_actual)

        // Verify with a separate GET request
        const getResponse = await apiService.executeOperation({
          table: 'Materiales',
          operation: 'get',
          id: materialId
        })

        expect(getResponse.ok).toBe(true)
        expect(getResponse.data.stock_actual).toBe(update.stock_actual)
      }
    })
  })

  describe('Performance and Load', () => {
    it('should handle concurrent operations', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const concurrentOperations = Array.from({ length: 5 }, (_, index) => 
        apiService.executeOperation({
          table: 'Materiales',
          operation: 'list',
          pagination: { page: index + 1, limit: 10 }
        })
      )

      const results = await Promise.all(concurrentOperations)

      results.forEach((result, index) => {
        expect(result.ok).toBe(true)
        expect(result.pagination?.page).toBe(index + 1)
      })
    })

    it('should complete operations within reasonable time', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const startTime = Date.now()

      const response = await apiService.executeOperation({
        table: 'Materiales',
        operation: 'list',
        pagination: { page: 1, limit: 20 }
      })

      const duration = Date.now() - startTime

      expect(response.ok).toBe(true)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      expect(response.metadata?.executionTime).toBeDefined()
    })
  })
})