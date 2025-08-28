import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { GoogleSheetsAPIService, CRUDOperation } from '@/lib/google-sheets-api-service'
import { performance } from 'perf_hooks'

// Performance test configuration
const PERFORMANCE_CONFIG = {
  baseUrl: process.env.TEST_GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/test/exec',
  token: process.env.TEST_API_TOKEN || 'test-token',
  timeout: 30000,
  retryAttempts: 1, // Minimal retries for performance testing
  cacheEnabled: false // Disable cache to test actual API performance
}

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  LIST_OPERATION: 3000,      // List operations should complete within 3 seconds
  GET_OPERATION: 2000,       // Get operations should complete within 2 seconds
  CREATE_OPERATION: 4000,    // Create operations should complete within 4 seconds
  UPDATE_OPERATION: 3000,    // Update operations should complete within 3 seconds
  DELETE_OPERATION: 2000,    // Delete operations should complete within 2 seconds
  BATCH_OPERATION: 10000,    // Batch operations should complete within 10 seconds
  CONCURRENT_OPERATIONS: 8000 // Concurrent operations should complete within 8 seconds
}

interface PerformanceMetrics {
  operation: string
  duration: number
  success: boolean
  timestamp: number
  metadata?: any
}

describe('API Performance Tests', () => {
  let apiService: GoogleSheetsAPIService
  let performanceMetrics: PerformanceMetrics[] = []
  let testDataIds: string[] = []

  beforeAll(async () => {
    if (!process.env.TEST_GOOGLE_SHEETS_URL) {
      console.log('Skipping performance tests - TEST_GOOGLE_SHEETS_URL not configured')
      return
    }

    apiService = new GoogleSheetsAPIService(PERFORMANCE_CONFIG)

    // Verify connection
    const isConnected = await apiService.validateConnection()
    if (!isConnected) {
      throw new Error('Cannot connect to test Google Sheets for performance testing')
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
        console.warn(`Failed to clean up performance test data ${id}:`, error)
      }
    }

    // Log performance summary
    if (performanceMetrics.length > 0) {
      console.log('\n=== Performance Test Summary ===')
      const groupedMetrics = performanceMetrics.reduce((acc, metric) => {
        if (!acc[metric.operation]) {
          acc[metric.operation] = []
        }
        acc[metric.operation].push(metric.duration)
        return acc
      }, {} as Record<string, number[]>)

      Object.entries(groupedMetrics).forEach(([operation, durations]) => {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length
        const min = Math.min(...durations)
        const max = Math.max(...durations)
        console.log(`${operation}: avg=${avg.toFixed(0)}ms, min=${min}ms, max=${max}ms`)
      })
    }
  })

  const measurePerformance = async <T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> => {
    const startTime = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - startTime
      
      performanceMetrics.push({
        operation,
        duration,
        success: true,
        timestamp: Date.now()
      })

      return { result, duration }
    } catch (error) {
      const duration = performance.now() - startTime
      
      performanceMetrics.push({
        operation,
        duration,
        success: false,
        timestamp: Date.now(),
        metadata: { error: error instanceof Error ? error.message : String(error) }
      })

      throw error
    }
  }

  describe('Single Operation Performance', () => {
    it('should list materials within performance threshold', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const { result, duration } = await measurePerformance('LIST_MATERIALS', () =>
        apiService.executeOperation({
          table: 'Materiales',
          operation: 'list',
          pagination: { page: 1, limit: 50 }
        })
      )

      expect(result.ok).toBe(true)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.LIST_OPERATION)
      expect(Array.isArray(result.data)).toBe(true)
    })

    it('should create material within performance threshold', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const materialData = {
        sku: `PERF-TEST-${Date.now()}`,
        descripcion: 'Material para prueba de rendimiento',
        categoria: 'Herramientas',
        unidad: 'unidad',
        costo_ref: 100.00,
        stock_actual: 25,
        stock_minimo: 5,
        proveedor_principal: 'Proveedor Performance',
        activo: true
      }

      const { result, duration } = await measurePerformance('CREATE_MATERIAL', () =>
        apiService.executeOperation({
          table: 'Materiales',
          operation: 'create',
          data: materialData
        })
      )

      expect(result.ok).toBe(true)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CREATE_OPERATION)
      expect(result.data).toHaveProperty('id')

      testDataIds.push(result.data.id)
    })

    it('should get material within performance threshold', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      // First create a material to get
      const createResponse = await apiService.executeOperation({
        table: 'Materiales',
        operation: 'create',
        data: {
          sku: `GET-PERF-${Date.now()}`,
          descripcion: 'Material para prueba GET',
          categoria: 'Herramientas',
          unidad: 'unidad',
          costo_ref: 50.00,
          stock_actual: 10,
          stock_minimo: 2,
          proveedor_principal: 'Proveedor GET',
          activo: true
        }
      })

      expect(createResponse.ok).toBe(true)
      const materialId = createResponse.data.id
      testDataIds.push(materialId)

      const { result, duration } = await measurePerformance('GET_MATERIAL', () =>
        apiService.executeOperation({
          table: 'Materiales',
          operation: 'get',
          id: materialId
        })
      )

      expect(result.ok).toBe(true)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.GET_OPERATION)
      expect(result.data.id).toBe(materialId)
    })

    it('should update material within performance threshold', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      // Create material to update
      const createResponse = await apiService.executeOperation({
        table: 'Materiales',
        operation: 'create',
        data: {
          sku: `UPDATE-PERF-${Date.now()}`,
          descripcion: 'Material para prueba UPDATE',
          categoria: 'Herramientas',
          unidad: 'unidad',
          costo_ref: 75.00,
          stock_actual: 15,
          stock_minimo: 3,
          proveedor_principal: 'Proveedor UPDATE',
          activo: true
        }
      })

      expect(createResponse.ok).toBe(true)
      const materialId = createResponse.data.id
      testDataIds.push(materialId)

      const { result, duration } = await measurePerformance('UPDATE_MATERIAL', () =>
        apiService.executeOperation({
          table: 'Materiales',
          operation: 'update',
          id: materialId,
          data: {
            descripcion: 'Material actualizado para rendimiento',
            stock_actual: 20
          }
        })
      )

      expect(result.ok).toBe(true)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.UPDATE_OPERATION)
      expect(result.data.descripcion).toBe('Material actualizado para rendimiento')
    })
  })

  describe('Batch Operation Performance', () => {
    it('should handle batch operations within performance threshold', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const batchOperations: CRUDOperation[] = [
        {
          table: 'Materiales',
          operation: 'list',
          pagination: { page: 1, limit: 10 }
        },
        {
          table: 'Proyectos',
          operation: 'list',
          pagination: { page: 1, limit: 10 }
        },
        {
          table: 'Usuarios',
          operation: 'list',
          pagination: { page: 1, limit: 10 }
        },
        {
          table: 'Actividades',
          operation: 'list',
          pagination: { page: 1, limit: 10 }
        }
      ]

      const { result, duration } = await measurePerformance('BATCH_OPERATIONS', () =>
        apiService.batchOperations(batchOperations)
      )

      expect(result).toHaveLength(4)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_OPERATION)
      
      result.forEach((response, index) => {
        expect(response.ok).toBe(true)
        expect(Array.isArray(response.data)).toBe(true)
      })
    })

    it('should handle large batch operations efficiently', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      // Create a larger batch of operations
      const largeBatchOperations: CRUDOperation[] = Array.from({ length: 10 }, (_, index) => ({
        table: 'Materiales',
        operation: 'list' as const,
        pagination: { page: index + 1, limit: 5 }
      }))

      const { result, duration } = await measurePerformance('LARGE_BATCH_OPERATIONS', () =>
        apiService.batchOperations(largeBatchOperations)
      )

      expect(result).toHaveLength(10)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_OPERATION * 2) // Allow more time for larger batch
      
      result.forEach((response) => {
        expect(response.ok).toBe(true)
      })
    })
  })

  describe('Concurrent Operation Performance', () => {
    it('should handle concurrent read operations efficiently', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const concurrentOperations = Array.from({ length: 5 }, (_, index) => 
        measurePerformance(`CONCURRENT_LIST_${index}`, () =>
          apiService.executeOperation({
            table: 'Materiales',
            operation: 'list',
            pagination: { page: index + 1, limit: 10 }
          })
        )
      )

      const startTime = performance.now()
      const results = await Promise.all(concurrentOperations)
      const totalDuration = performance.now() - startTime

      expect(totalDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATIONS)

      results.forEach(({ result, duration }) => {
        expect(result.ok).toBe(true)
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.LIST_OPERATION)
      })
    })

    it('should handle mixed concurrent operations', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const mixedOperations = [
        measurePerformance('CONCURRENT_LIST_MATERIALS', () =>
          apiService.executeOperation({
            table: 'Materiales',
            operation: 'list',
            pagination: { page: 1, limit: 10 }
          })
        ),
        measurePerformance('CONCURRENT_LIST_PROJECTS', () =>
          apiService.executeOperation({
            table: 'Proyectos',
            operation: 'list',
            pagination: { page: 1, limit: 10 }
          })
        ),
        measurePerformance('CONCURRENT_LIST_USERS', () =>
          apiService.executeOperation({
            table: 'Usuarios',
            operation: 'list',
            pagination: { page: 1, limit: 10 }
          })
        )
      ]

      const startTime = performance.now()
      const results = await Promise.all(mixedOperations)
      const totalDuration = performance.now() - startTime

      expect(totalDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATIONS)

      results.forEach(({ result }) => {
        expect(result.ok).toBe(true)
      })
    })
  })

  describe('Load Testing', () => {
    it('should maintain performance under sustained load', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const loadTestOperations = []
      const operationCount = 20

      // Create sustained load with multiple operation types
      for (let i = 0; i < operationCount; i++) {
        loadTestOperations.push(
          measurePerformance(`LOAD_TEST_${i}`, () =>
            apiService.executeOperation({
              table: 'Materiales',
              operation: 'list',
              pagination: { page: (i % 5) + 1, limit: 10 }
            })
          )
        )

        // Add small delay to simulate realistic usage pattern
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      const startTime = performance.now()
      const results = await Promise.all(loadTestOperations)
      const totalDuration = performance.now() - startTime

      // Calculate performance statistics
      const durations = results.map(r => r.duration)
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      const maxDuration = Math.max(...durations)
      const minDuration = Math.min(...durations)

      console.log(`Load test results: avg=${avgDuration.toFixed(0)}ms, min=${minDuration}ms, max=${maxDuration}ms, total=${totalDuration.toFixed(0)}ms`)

      // All operations should succeed
      results.forEach(({ result }) => {
        expect(result.ok).toBe(true)
      })

      // Average performance should remain reasonable
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.LIST_OPERATION)
      
      // No single operation should take excessively long
      expect(maxDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.LIST_OPERATION * 2)
    })

    it('should handle rapid sequential operations', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const sequentialOperations = []
      const operationCount = 10

      const startTime = performance.now()

      for (let i = 0; i < operationCount; i++) {
        const { result, duration } = await measurePerformance(`SEQUENTIAL_${i}`, () =>
          apiService.executeOperation({
            table: 'Materiales',
            operation: 'list',
            pagination: { page: 1, limit: 5 }
          })
        )

        expect(result.ok).toBe(true)
        sequentialOperations.push({ result, duration })
      }

      const totalDuration = performance.now() - startTime

      // Calculate performance degradation
      const firstHalf = sequentialOperations.slice(0, operationCount / 2)
      const secondHalf = sequentialOperations.slice(operationCount / 2)

      const firstHalfAvg = firstHalf.reduce((sum, op) => sum + op.duration, 0) / firstHalf.length
      const secondHalfAvg = secondHalf.reduce((sum, op) => sum + op.duration, 0) / secondHalf.length

      console.log(`Sequential test: first half avg=${firstHalfAvg.toFixed(0)}ms, second half avg=${secondHalfAvg.toFixed(0)}ms`)

      // Performance should not degrade significantly over time
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5) // Allow up to 50% degradation
      expect(totalDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.LIST_OPERATION * operationCount * 1.2)
    })
  })

  describe('Memory and Resource Usage', () => {
    it('should not cause memory leaks during extended operations', async () => {
      if (!process.env.TEST_GOOGLE_SHEETS_URL) return

      const initialMemory = process.memoryUsage()
      const operationCount = 50

      // Perform many operations to test for memory leaks
      for (let i = 0; i < operationCount; i++) {
        await apiService.executeOperation({
          table: 'Materiales',
          operation: 'list',
          pagination: { page: 1, limit: 5 }
        })

        // Force garbage collection periodically if available
        if (global.gc && i % 10 === 0) {
          global.gc()
        }
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      console.log(`Memory usage: initial=${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, final=${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, increase=${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)

      // Memory increase should be reasonable (less than 50MB for 50 operations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })
  })
})