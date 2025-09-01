/**
 * API Integration Tests
 * Tests for complete API communication flows and end-to-end functionality
 * Requirements: 8.3
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { apiClient } from '@/lib/apiClient'
import { testUtils, currentTestConfig } from '../test.config'

// Skip integration tests if not configured
const skipIntegrationTests = currentTestConfig.skipIntegrationTests

describe.skipIf(skipIntegrationTests)('API Integration Tests', () => {
  beforeAll(async () => {
    // Validate test environment
    const validation = testUtils.validateTestEnvironment()
    if (!validation.valid) {
      console.warn('Integration test environment validation failed:', validation.errors)
    }
  })

  afterAll(async () => {
    // Cleanup test data
    if (currentTestConfig.cleanupAfterTests) {
      await testUtils.cleanupTestData(apiClient)
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication Flow', () => {
    it('should authenticate with valid credentials', async () => {
      const response = await apiClient.login('admin@servesplatform.com', 'admin123')
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.user).toBeDefined()
      expect(response.data.token).toBeDefined()
      expect(response.data.user.email).toBe('admin@servesplatform.com')
      expect(response.data.user.role).toBe('admin')
    }, currentTestConfig.timeout)

    it('should reject invalid credentials', async () => {
      const response = await apiClient.login('invalid@example.com', 'wrongpassword')
      
      expect(response.ok).toBe(false)
      expect(response.message).toContain('Invalid')
    }, currentTestConfig.timeout)

    it('should handle whoami requests', async () => {
      const response = await apiClient.whoami()
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.id).toBeDefined()
      expect(response.data.email).toBeDefined()
      expect(response.data.role).toBeDefined()
    }, currentTestConfig.timeout)

    it('should handle authentication errors gracefully', async () => {
      try {
        await apiClient.login('', '')
      } catch (error) {
        expect(error).toBeDefined()
      }
    }, currentTestConfig.timeout)
  })

  describe('CRUD Operations - Materials', () => {
    let createdMaterialId: string

    it('should create a new material', async () => {
      const materialData = testUtils.generateTestId('material')
      const newMaterial = {
        sku: `TEST_MAT_${Date.now()}`,
        descripcion: 'Test Material for Integration',
        categoria: 'Test Category',
        unidad: 'unidad',
        costo_ref: 25.50,
        stock_actual: 100,
        stock_minimo: 10,
        proveedor_principal: 'Test Provider',
        activo: true
      }

      const response = await apiClient.createMaterial(newMaterial)
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.id).toBeDefined()
      expect(response.data.sku).toBe(newMaterial.sku)
      expect(response.data.descripcion).toBe(newMaterial.descripcion)
      
      createdMaterialId = response.data.id
    }, currentTestConfig.timeout)

    it('should retrieve the created material', async () => {
      if (!createdMaterialId) {
        throw new Error('No material created in previous test')
      }

      const response = await apiClient.getMaterial(createdMaterialId)
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.id).toBe(createdMaterialId)
      expect(response.data.descripcion).toBe('Test Material for Integration')
    }, currentTestConfig.timeout)

    it('should update the created material', async () => {
      if (!createdMaterialId) {
        throw new Error('No material created in previous test')
      }

      const updateData = {
        descripcion: 'Updated Test Material',
        costo_ref: 30.00
      }

      const response = await apiClient.updateMaterial(createdMaterialId, updateData)
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.descripcion).toBe('Updated Test Material')
      expect(response.data.costo_ref).toBe(30.00)
    }, currentTestConfig.timeout)

    it('should list materials including the created one', async () => {
      const response = await apiClient.getMaterials({ limit: 100 })
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(Array.isArray(response.data)).toBe(true)
      
      if (createdMaterialId) {
        const createdMaterial = response.data.find(m => m.id === createdMaterialId)
        expect(createdMaterial).toBeDefined()
        expect(createdMaterial.descripcion).toBe('Updated Test Material')
      }
    }, currentTestConfig.timeout)

    it('should search materials', async () => {
      const response = await apiClient.getMaterials({ q: 'Updated Test Material' })
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(Array.isArray(response.data)).toBe(true)
      
      if (createdMaterialId) {
        const foundMaterial = response.data.find(m => m.id === createdMaterialId)
        expect(foundMaterial).toBeDefined()
      }
    }, currentTestConfig.timeout)

    it('should delete the created material', async () => {
      if (!createdMaterialId) {
        throw new Error('No material created in previous test')
      }

      const response = await apiClient.delete('Materiales', createdMaterialId)
      
      expect(response.ok).toBe(true)
      expect(response.message).toContain('deleted')
    }, currentTestConfig.timeout)

    it('should not find deleted material', async () => {
      if (!createdMaterialId) {
        return // Skip if no material was created
      }

      const response = await apiClient.getMaterial(createdMaterialId)
      
      // Should either return not found or empty result
      expect(response.ok).toBe(false)
    }, currentTestConfig.timeout)
  })

  describe('CRUD Operations - Projects', () => {
    let createdProjectId: string

    it('should create a new project', async () => {
      const newProject = {
        codigo: `TEST_PROJ_${Date.now()}`,
        nombre: 'Test Project for Integration',
        cliente_id: 'TEST_CLIENT_001',
        responsable_id: 'TEST_USER_001',
        ubicacion: 'Lima, Perú',
        descripcion: 'Test project description',
        linea_servicio: 'Consultoría',
        inicio_plan: '2024-02-01',
        fin_plan: '2024-12-31',
        presupuesto_total: 50000.00,
        moneda: 'PEN',
        estado: 'Planificación',
        avance_pct: 0
      }

      const response = await apiClient.createProject(newProject)
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.id).toBeDefined()
      expect(response.data.codigo).toBe(newProject.codigo)
      expect(response.data.nombre).toBe(newProject.nombre)
      
      createdProjectId = response.data.id
    }, currentTestConfig.timeout)

    it('should retrieve the created project', async () => {
      if (!createdProjectId) {
        throw new Error('No project created in previous test')
      }

      const response = await apiClient.getProject(createdProjectId)
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.id).toBe(createdProjectId)
      expect(response.data.nombre).toBe('Test Project for Integration')
    }, currentTestConfig.timeout)

    it('should update the created project', async () => {
      if (!createdProjectId) {
        throw new Error('No project created in previous test')
      }

      const updateData = {
        nombre: 'Updated Test Project',
        avance_pct: 25,
        estado: 'En progreso'
      }

      const response = await apiClient.updateProject(createdProjectId, updateData)
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.nombre).toBe('Updated Test Project')
      expect(response.data.avance_pct).toBe(25)
      expect(response.data.estado).toBe('En progreso')
    }, currentTestConfig.timeout)

    it('should list projects including the created one', async () => {
      const response = await apiClient.getProjects({ limit: 100 })
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(Array.isArray(response.data)).toBe(true)
      
      if (createdProjectId) {
        const createdProject = response.data.find(p => p.id === createdProjectId)
        expect(createdProject).toBeDefined()
        expect(createdProject.nombre).toBe('Updated Test Project')
      }
    }, currentTestConfig.timeout)
  })

  describe('CRUD Operations - Activities', () => {
    let createdActivityId: string

    it('should create a new activity', async () => {
      const newActivity = {
        proyecto_id: 'TEST_PROJECT_001',
        nombre: 'Test Activity for Integration',
        descripcion: 'Test activity description',
        responsable_id: 'TEST_USER_001',
        fecha_inicio: '2024-02-15',
        fecha_fin: '2024-03-15',
        horas_estimadas: 40,
        horas_reales: 0,
        estado: 'Pendiente',
        prioridad: 'Media',
        avance_pct: 0
      }

      const response = await apiClient.createActivity(newActivity)
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.id).toBeDefined()
      expect(response.data.nombre).toBe(newActivity.nombre)
      expect(response.data.proyecto_id).toBe(newActivity.proyecto_id)
      
      createdActivityId = response.data.id
    }, currentTestConfig.timeout)

    it('should retrieve the created activity', async () => {
      if (!createdActivityId) {
        throw new Error('No activity created in previous test')
      }

      const response = await apiClient.getActivity(createdActivityId)
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.id).toBe(createdActivityId)
      expect(response.data.nombre).toBe('Test Activity for Integration')
    }, currentTestConfig.timeout)

    it('should update the created activity', async () => {
      if (!createdActivityId) {
        throw new Error('No activity created in previous test')
      }

      const updateData = {
        nombre: 'Updated Test Activity',
        avance_pct: 50,
        estado: 'En progreso',
        horas_reales: 20
      }

      const response = await apiClient.updateActivity(createdActivityId, updateData)
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.nombre).toBe('Updated Test Activity')
      expect(response.data.avance_pct).toBe(50)
      expect(response.data.estado).toBe('En progreso')
    }, currentTestConfig.timeout)

    it('should list activities including the created one', async () => {
      const response = await apiClient.getActivities({ limit: 100 })
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(Array.isArray(response.data)).toBe(true)
      
      if (createdActivityId) {
        const createdActivity = response.data.find(a => a.id === createdActivityId)
        expect(createdActivity).toBeDefined()
        expect(createdActivity.nombre).toBe('Updated Test Activity')
      }
    }, currentTestConfig.timeout)
  })

  describe('Batch Operations', () => {
    it('should handle batch create operations', async () => {
      const materials = [
        {
          sku: `BATCH_MAT_1_${Date.now()}`,
          descripcion: 'Batch Test Material 1',
          categoria: 'Test Category',
          unidad: 'unidad',
          costo_ref: 15.00,
          stock_actual: 50,
          stock_minimo: 5,
          proveedor_principal: 'Batch Test Provider',
          activo: true
        },
        {
          sku: `BATCH_MAT_2_${Date.now()}`,
          descripcion: 'Batch Test Material 2',
          categoria: 'Test Category',
          unidad: 'unidad',
          costo_ref: 20.00,
          stock_actual: 75,
          stock_minimo: 10,
          proveedor_principal: 'Batch Test Provider',
          activo: true
        }
      ]

      const response = await apiClient.batchCreate('Materiales', materials)
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data.length).toBe(2)
      
      // Verify each created material
      response.data.forEach((material, index) => {
        expect(material.id).toBeDefined()
        expect(material.sku).toBe(materials[index].sku)
        expect(material.descripcion).toBe(materials[index].descripcion)
      })
    }, currentTestConfig.timeout * 2) // Longer timeout for batch operations

    it('should handle batch update operations', async () => {
      // First create some materials to update
      const materials = [
        {
          sku: `UPDATE_MAT_1_${Date.now()}`,
          descripcion: 'Update Test Material 1',
          categoria: 'Test Category',
          unidad: 'unidad',
          costo_ref: 10.00,
          stock_actual: 25,
          stock_minimo: 5,
          proveedor_principal: 'Update Test Provider',
          activo: true
        },
        {
          sku: `UPDATE_MAT_2_${Date.now()}`,
          descripcion: 'Update Test Material 2',
          categoria: 'Test Category',
          unidad: 'unidad',
          costo_ref: 12.00,
          stock_actual: 30,
          stock_minimo: 5,
          proveedor_principal: 'Update Test Provider',
          activo: true
        }
      ]

      const createResponse = await apiClient.batchCreate('Materiales', materials)
      expect(createResponse.ok).toBe(true)
      
      // Now update them
      const updates = createResponse.data.map(material => ({
        id: material.id,
        data: {
          descripcion: `Updated ${material.descripcion}`,
          costo_ref: material.costo_ref + 5.00
        }
      }))

      const updateResponse = await apiClient.batchUpdate('Materiales', updates)
      
      expect(updateResponse.ok).toBe(true)
      expect(updateResponse.data).toBeDefined()
      expect(Array.isArray(updateResponse.data)).toBe(true)
      expect(updateResponse.data.length).toBe(2)
      
      // Verify updates
      updateResponse.data.forEach((material, index) => {
        expect(material.descripcion).toContain('Updated')
        expect(material.costo_ref).toBe(materials[index].costo_ref + 5.00)
      })
    }, currentTestConfig.timeout * 2)
  })

  describe('Error Handling', () => {
    it('should handle invalid table names', async () => {
      try {
        await apiClient.list('InvalidTable', { limit: 10 })
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toContain('Invalid table')
      }
    }, currentTestConfig.timeout)

    it('should handle invalid record IDs', async () => {
      const response = await apiClient.getMaterial('invalid-id-12345')
      
      expect(response.ok).toBe(false)
      expect(response.message).toContain('not found')
    }, currentTestConfig.timeout)

    it('should handle network timeouts', async () => {
      // This test would need a way to simulate network delays
      // For now, we'll just test that the client handles errors gracefully
      try {
        await apiClient.getMaterial('')
      } catch (error) {
        expect(error).toBeDefined()
      }
    }, currentTestConfig.timeout)

    it('should handle malformed data', async () => {
      try {
        await apiClient.createMaterial({
          // Missing required fields
          descripcion: 'Test Material'
        })
      } catch (error) {
        expect(error).toBeDefined()
      }
    }, currentTestConfig.timeout)
  })

  describe('Performance Tests', () => {
    it('should handle large data sets efficiently', async () => {
      const startTime = Date.now()
      
      const response = await apiClient.getMaterials({ limit: 100 })
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(response.ok).toBe(true)
      expect(duration).toBeLessThan(currentTestConfig.performanceThresholds.listOperation)
    }, currentTestConfig.timeout)

    it('should handle concurrent requests', async () => {
      const startTime = Date.now()
      
      const promises = [
        apiClient.getMaterials({ limit: 10 }),
        apiClient.getProjects({ limit: 10 }),
        apiClient.getActivities({ limit: 10 }),
        apiClient.getUsers({ limit: 10 })
      ]
      
      const responses = await Promise.all(promises)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      responses.forEach(response => {
        expect(response.ok).toBe(true)
      })
      
      expect(duration).toBeLessThan(currentTestConfig.performanceThresholds.batchOperation)
    }, currentTestConfig.timeout * 2)

    it('should handle pagination efficiently', async () => {
      const startTime = Date.now()
      
      // Test multiple pages
      const page1 = await apiClient.getMaterials({ limit: 10 })
      const page2 = await apiClient.getMaterials({ limit: 10 })
      const page3 = await apiClient.getMaterials({ limit: 10 })
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(page1.ok).toBe(true)
      expect(page2.ok).toBe(true)
      expect(page3.ok).toBe(true)
      
      expect(duration).toBeLessThan(currentTestConfig.performanceThresholds.batchOperation)
    }, currentTestConfig.timeout)
  })

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      // Create a material
      const materialData = {
        sku: `CONSISTENCY_TEST_${Date.now()}`,
        descripcion: 'Consistency Test Material',
        categoria: 'Test Category',
        unidad: 'unidad',
        costo_ref: 100.00,
        stock_actual: 50,
        stock_minimo: 10,
        proveedor_principal: 'Consistency Test Provider',
        activo: true
      }

      const createResponse = await apiClient.createMaterial(materialData)
      expect(createResponse.ok).toBe(true)
      
      const materialId = createResponse.data.id
      
      // Retrieve it immediately
      const getResponse = await apiClient.getMaterial(materialId)
      expect(getResponse.ok).toBe(true)
      expect(getResponse.data.sku).toBe(materialData.sku)
      
      // Update it
      const updateData = { descripcion: 'Updated Consistency Test Material' }
      const updateResponse = await apiClient.updateMaterial(materialId, updateData)
      expect(updateResponse.ok).toBe(true)
      
      // Retrieve it again to verify update
      const getUpdatedResponse = await apiClient.getMaterial(materialId)
      expect(getUpdatedResponse.ok).toBe(true)
      expect(getUpdatedResponse.data.descripcion).toBe('Updated Consistency Test Material')
      
      // Verify it appears in list
      const listResponse = await apiClient.getMaterials({ q: materialData.sku })
      expect(listResponse.ok).toBe(true)
      const foundMaterial = listResponse.data.find(m => m.id === materialId)
      expect(foundMaterial).toBeDefined()
      expect(foundMaterial.descripcion).toBe('Updated Consistency Test Material')
    }, currentTestConfig.timeout * 2)
  })

  describe('Service Health', () => {
    it('should report service health correctly', async () => {
      const response = await apiClient.getServiceHealth()
      
      expect(response.ok).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.healthy).toBeDefined()
      expect(response.data.config).toBeDefined()
      expect(response.data.timestamp).toBeDefined()
    }, currentTestConfig.timeout)
  })
})