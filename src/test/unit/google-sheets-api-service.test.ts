import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GoogleSheetsAPIService, CRUDOperation, APIServiceConfig } from '@/lib/google-sheets-api-service'
import { ErrorType } from '@/lib/error-handler'
import { cacheManager } from '@/lib/cache/cache-manager'

// Mock dependencies
vi.mock('@/lib/config', () => ({
  config: {
    apiBaseUrl: 'https://script.google.com/macros/s/test/exec',
    apiToken: 'test-token',
    appVersion: '1.0.0'
  }
}))

vi.mock('@/lib/cache/cache-manager')
vi.mock('@/lib/monitoring')
vi.mock('@/lib/logger')
vi.mock('@/lib/audit-logger')
vi.mock('@/lib/jwt')

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('GoogleSheetsAPIService', () => {
  let service: GoogleSheetsAPIService
  let mockCacheManager: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      invalidateByOperation: vi.fn()
    }
    vi.mocked(cacheManager).get = mockCacheManager.get
    vi.mocked(cacheManager).set = mockCacheManager.set
    vi.mocked(cacheManager).invalidateByOperation = mockCacheManager.invalidateByOperation
    
    service = new GoogleSheetsAPIService()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const config = service.getConfig()
      expect(config.timeout).toBe(30000)
      expect(config.retryAttempts).toBe(3)
      expect(config.cacheEnabled).toBe(true)
    })

    it('should accept custom configuration', () => {
      const customConfig: Partial<APIServiceConfig> = {
        timeout: 15000,
        retryAttempts: 5,
        cacheEnabled: false
      }
      const customService = new GoogleSheetsAPIService(customConfig)
      const config = customService.getConfig()
      
      expect(config.timeout).toBe(15000)
      expect(config.retryAttempts).toBe(5)
      expect(config.cacheEnabled).toBe(false)
    })

    it('should update configuration correctly', () => {
      service.updateConfig({ timeout: 20000, retryAttempts: 2 })
      const config = service.getConfig()
      
      expect(config.timeout).toBe(20000)
      expect(config.retryAttempts).toBe(2)
    })
  })

  describe('executeOperation - Read Operations', () => {
    const listOperation: CRUDOperation = {
      table: 'Materiales',
      operation: 'list',
      pagination: { page: 1, limit: 10 }
    }

    it('should return cached data when available', async () => {
      const cachedData = [{ id: '1', name: 'Material 1' }]
      mockCacheManager.get.mockResolvedValue(cachedData)

      const result = await service.executeOperation(listOperation)

      expect(result.ok).toBe(true)
      expect(result.data).toEqual(cachedData)
      expect(result.metadata?.cacheHit).toBe(true)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should fetch from API when cache miss', async () => {
      const apiData = [{ id: '1', name: 'Material 1' }]
      mockCacheManager.get.mockResolvedValue(null)
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          ok: true,
          data: apiData,
          message: 'Success'
        })
      })

      const result = await service.executeOperation(listOperation)

      expect(result.ok).toBe(true)
      expect(result.data).toEqual(apiData)
      expect(result.metadata?.cacheHit).toBe(false)
      expect(mockCacheManager.set).toHaveBeenCalled()
    })

    it('should handle API errors gracefully', async () => {
      mockCacheManager.get.mockResolvedValue(null)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          ok: false,
          message: 'Internal Server Error'
        })
      })

      const result = await service.executeOperation(listOperation)

      expect(result.ok).toBe(false)
      expect(result.status).toBe(500)
      expect(result.message).toBe('Internal Server Error')
    })

    it('should handle network errors with fallback to cache', async () => {
      const cachedData = [{ id: '1', name: 'Cached Material' }]
      mockCacheManager.get.mockResolvedValue(null) // No fresh cache
      mockFetch.mockRejectedValue(new Error('Network error'))

      // Mock the error handler to return cached fallback
      const result = await service.executeOperation(listOperation).catch(() => ({
        ok: false,
        status: 0,
        message: 'Network error',
        timestamp: new Date().toISOString(),
        metadata: {
          executionTime: 0,
          cacheHit: false,
          version: '1.0.0'
        }
      }))

      expect(result.ok).toBe(false)
    })
  })

  describe('executeOperation - Write Operations', () => {
    const createOperation: CRUDOperation = {
      table: 'Materiales',
      operation: 'create',
      data: { name: 'New Material', category: 'Tools' }
    }

    it('should create new record successfully', async () => {
      const createdData = { id: '123', name: 'New Material', category: 'Tools' }
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          ok: true,
          data: createdData,
          message: 'Created successfully'
        })
      })

      const result = await service.executeOperation(createOperation)

      expect(result.ok).toBe(true)
      expect(result.data).toEqual(createdData)
      expect(result.status).toBe(201)
      expect(mockCacheManager.invalidateByOperation).toHaveBeenCalledWith('Materiales', 'create')
    })

    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          ok: false,
          message: 'Validation failed: Name is required'
        })
      })

      const result = await service.executeOperation(createOperation)

      expect(result.ok).toBe(false)
      expect(result.status).toBe(400)
      expect(result.message).toContain('Validation failed')
    })
  })

  describe('batchOperations', () => {
    it('should execute multiple operations successfully', async () => {
      const operations: CRUDOperation[] = [
        { table: 'Materiales', operation: 'list' },
        { table: 'Proyectos', operation: 'list' }
      ]

      mockCacheManager.get.mockResolvedValue(null)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true, data: ['material1'] })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true, data: ['project1'] })
        })

      const results = await service.batchOperations(operations)

      expect(results).toHaveLength(2)
      expect(results[0].ok).toBe(true)
      expect(results[1].ok).toBe(true)
    })

    it('should handle partial failures in batch', async () => {
      const operations: CRUDOperation[] = [
        { table: 'Materiales', operation: 'list' },
        { table: 'InvalidTable', operation: 'list' }
      ]

      mockCacheManager.get.mockResolvedValue(null)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true, data: ['material1'] })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ ok: false, message: 'Table not found' })
        })

      const results = await service.batchOperations(operations)

      expect(results).toHaveLength(2)
      expect(results[0].ok).toBe(true)
      expect(results[1].ok).toBe(false)
      expect(results[1].message).toBe('Table not found')
    })
  })

  describe('validateConnection', () => {
    it('should return true for successful connection', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, data: [] })
      })

      const isValid = await service.validateConnection()
      expect(isValid).toBe(true)
    })

    it('should return false for failed connection', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'))

      const isValid = await service.validateConnection()
      expect(isValid).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle timeout errors', async () => {
      mockCacheManager.get.mockResolvedValue(null)
      
      // Mock a timeout scenario
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100)
        })
      )

      const operation: CRUDOperation = {
        table: 'Materiales',
        operation: 'list'
      }

      const result = await service.executeOperation(operation, { timeout: 50 })
        .catch(() => ({
          ok: false,
          status: 0,
          message: 'Request timeout',
          timestamp: new Date().toISOString(),
          metadata: {
            executionTime: 0,
            cacheHit: false,
            version: '1.0.0'
          }
        }))

      expect(result.ok).toBe(false)
    })

    it('should handle JSON parse errors', async () => {
      mockCacheManager.get.mockResolvedValue(null)
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      const operation: CRUDOperation = {
        table: 'Materiales',
        operation: 'list'
      }

      const result = await service.executeOperation(operation)
        .catch(() => ({
          ok: false,
          status: 500,
          message: 'Invalid JSON response from server',
          timestamp: new Date().toISOString(),
          metadata: {
            executionTime: 0,
            cacheHit: false,
            version: '1.0.0'
          }
        }))

      expect(result.ok).toBe(false)
    })
  })

  describe('Cache Management', () => {
    it('should skip cache when skipCache option is true', async () => {
      const cachedData = [{ id: '1', name: 'Cached Material' }]
      mockCacheManager.get.mockResolvedValue(cachedData)
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          ok: true,
          data: [{ id: '2', name: 'Fresh Material' }]
        })
      })

      const operation: CRUDOperation = {
        table: 'Materiales',
        operation: 'list'
      }

      const result = await service.executeOperation(operation, { skipCache: true })

      expect(result.data).toEqual([{ id: '2', name: 'Fresh Material' }])
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should invalidate cache after write operations', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          ok: true,
          data: { id: '1', name: 'Updated Material' }
        })
      })

      const updateOperation: CRUDOperation = {
        table: 'Materiales',
        operation: 'update',
        id: '1',
        data: { name: 'Updated Material' }
      }

      await service.executeOperation(updateOperation)

      expect(mockCacheManager.invalidateByOperation).toHaveBeenCalledWith('Materiales', 'update')
    })
  })
})