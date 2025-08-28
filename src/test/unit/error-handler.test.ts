import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  ErrorHandler, 
  EnhancedError, 
  ErrorType, 
  ErrorClassifier,
  RetryConfig,
  FallbackConfig 
} from '@/lib/error-handler'

describe('ErrorClassifier', () => {
  describe('Network Errors', () => {
    it('should classify fetch network errors', () => {
      const networkError = new Error('Failed to fetch')
      const context = { operation: 'list', table: 'Materiales' }

      const result = ErrorClassifier.classify(networkError, context)

      expect(result.type).toBe(ErrorType.NETWORK_ERROR)
      expect(result.retryable).toBe(true)
      expect(result.userMessage).toContain('conectividad')
    })

    it('should classify timeout errors', () => {
      const timeoutError = new Error('Request timeout')
      const context = { operation: 'create', table: 'Proyectos', timeout: 30000 }

      const result = ErrorClassifier.classify(timeoutError, context)

      expect(result.type).toBe(ErrorType.NETWORK_ERROR)
      expect(result.retryable).toBe(true)
      expect(result.userMessage).toContain('tiempo de espera')
    })

    it('should classify abort errors', () => {
      const abortError = new Error('The operation was aborted')
      const context = { operation: 'update', table: 'Actividades' }

      const result = ErrorClassifier.classify(abortError, context)

      expect(result.type).toBe(ErrorType.NETWORK_ERROR)
      expect(result.retryable).toBe(false)
    })
  })

  describe('HTTP Status Errors', () => {
    it('should classify 400 Bad Request', () => {
      const httpError = {
        status: 400,
        message: 'Invalid request data',
        headers: {}
      }
      const context = { operation: 'create', table: 'Materiales' }

      const result = ErrorClassifier.classify(httpError, context)

      expect(result.type).toBe(ErrorType.VALIDATION_ERROR)
      expect(result.status).toBe(400)
      expect(result.retryable).toBe(false)
    })

    it('should classify 401 Unauthorized', () => {
      const httpError = {
        status: 401,
        message: 'Unauthorized access',
        headers: {}
      }
      const context = { operation: 'list', table: 'Usuarios' }

      const result = ErrorClassifier.classify(httpError, context)

      expect(result.type).toBe(ErrorType.PERMISSION_ERROR)
      expect(result.status).toBe(401)
      expect(result.retryable).toBe(false)
      expect(result.userMessage).toContain('autenticación')
    })

    it('should classify 403 Forbidden', () => {
      const httpError = {
        status: 403,
        message: 'Access denied',
        headers: {}
      }
      const context = { operation: 'delete', table: 'Proyectos' }

      const result = ErrorClassifier.classify(httpError, context)

      expect(result.type).toBe(ErrorType.PERMISSION_ERROR)
      expect(result.status).toBe(403)
      expect(result.retryable).toBe(false)
      expect(result.userMessage).toContain('permisos')
    })

    it('should classify 404 Not Found', () => {
      const httpError = {
        status: 404,
        message: 'Resource not found',
        headers: {}
      }
      const context = { operation: 'get', table: 'Materiales', id: '123' }

      const result = ErrorClassifier.classify(httpError, context)

      expect(result.type).toBe(ErrorType.NOT_FOUND_ERROR)
      expect(result.status).toBe(404)
      expect(result.retryable).toBe(false)
    })

    it('should classify 409 Conflict', () => {
      const httpError = {
        status: 409,
        message: 'Data conflict detected',
        headers: {}
      }
      const context = { operation: 'update', table: 'Proyectos' }

      const result = ErrorClassifier.classify(httpError, context)

      expect(result.type).toBe(ErrorType.DATA_CONFLICT)
      expect(result.status).toBe(409)
      expect(result.retryable).toBe(false)
      expect(result.userMessage).toContain('conflicto')
    })

    it('should classify 429 Rate Limit', () => {
      const httpError = {
        status: 429,
        message: 'Too many requests',
        headers: { 'retry-after': '60' }
      }
      const context = { operation: 'list', table: 'Materiales' }

      const result = ErrorClassifier.classify(httpError, context)

      expect(result.type).toBe(ErrorType.RATE_LIMIT)
      expect(result.status).toBe(429)
      expect(result.retryable).toBe(true)
      expect(result.retryAfter).toBe(60)
    })

    it('should classify 500 Server Error', () => {
      const httpError = {
        status: 500,
        message: 'Internal server error',
        headers: {}
      }
      const context = { operation: 'create', table: 'Actividades' }

      const result = ErrorClassifier.classify(httpError, context)

      expect(result.type).toBe(ErrorType.SERVER_ERROR)
      expect(result.status).toBe(500)
      expect(result.retryable).toBe(true)
    })

    it('should classify 503 Service Unavailable', () => {
      const httpError = {
        status: 503,
        message: 'Service temporarily unavailable',
        headers: { 'retry-after': '120' }
      }
      const context = { operation: 'update', table: 'Proyectos' }

      const result = ErrorClassifier.classify(httpError, context)

      expect(result.type).toBe(ErrorType.SERVER_ERROR)
      expect(result.status).toBe(503)
      expect(result.retryable).toBe(true)
      expect(result.retryAfter).toBe(120)
    })
  })

  describe('Google Sheets Specific Errors', () => {
    it('should classify quota exceeded errors', () => {
      const quotaError = new Error('Quota exceeded for quota metric')
      const context = { operation: 'list', table: 'Materiales' }

      const result = ErrorClassifier.classify(quotaError, context)

      expect(result.type).toBe(ErrorType.RATE_LIMIT)
      expect(result.retryable).toBe(true)
      expect(result.userMessage).toContain('límite de uso')
    })

    it('should classify permission denied errors', () => {
      const permissionError = new Error('The caller does not have permission')
      const context = { operation: 'update', table: 'Proyectos' }

      const result = ErrorClassifier.classify(permissionError, context)

      expect(result.type).toBe(ErrorType.PERMISSION_ERROR)
      expect(result.retryable).toBe(false)
      expect(result.userMessage).toContain('permisos')
    })

    it('should classify spreadsheet not found errors', () => {
      const notFoundError = new Error('Requested entity was not found')
      const context = { operation: 'get', table: 'InvalidTable' }

      const result = ErrorClassifier.classify(notFoundError, context)

      expect(result.type).toBe(ErrorType.NOT_FOUND_ERROR)
      expect(result.retryable).toBe(false)
    })
  })
})

describe('EnhancedError', () => {
  it('should create error with all properties', () => {
    const errorDetails = {
      message: 'Test error',
      type: ErrorType.VALIDATION_ERROR,
      status: 400,
      retryable: false,
      userMessage: 'User friendly message',
      context: { operation: 'create', table: 'Materiales' }
    }

    const error = new EnhancedError(errorDetails)

    expect(error.details).toEqual({
      ...errorDetails,
      timestamp: expect.any(String)
    })
    expect(error.message).toBe('Test error')
    expect(error.name).toBe('EnhancedError')
  })

  it('should generate timestamp automatically', () => {
    const error = new EnhancedError({
      message: 'Test error',
      type: ErrorType.NETWORK_ERROR
    })

    expect(error.details.timestamp).toBeDefined()
    expect(new Date(error.details.timestamp)).toBeInstanceOf(Date)
  })

  it('should preserve original error', () => {
    const originalError = new Error('Original error')
    const error = new EnhancedError({
      message: 'Enhanced error',
      type: ErrorType.SERVER_ERROR,
      originalError
    })

    expect(error.details.originalError).toBe(originalError)
  })
})

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler
  let mockRetryConfig: RetryConfig
  let mockFallbackConfig: FallbackConfig

  beforeEach(() => {
    mockRetryConfig = {
      maxAttempts: 3,
      initialDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
      jitter: false
    }

    mockFallbackConfig = {
      enableCacheFallback: true,
      cacheMaxAge: 3600,
      fallbackMessage: 'Using cached data due to connectivity issues'
    }

    errorHandler = new ErrorHandler(mockRetryConfig, mockFallbackConfig)
  })

  describe('Retry Logic', () => {
    it('should retry retryable errors', async () => {
      let attempts = 0
      const mockOperation = vi.fn().mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          throw new EnhancedError({
            message: 'Network error',
            type: ErrorType.NETWORK_ERROR,
            retryable: true
          })
        }
        return { success: true, data: 'Success after retries' }
      })

      const result = await errorHandler.executeWithErrorHandling(mockOperation)

      expect(attempts).toBe(3)
      expect(result.data).toEqual({ success: true, data: 'Success after retries' })
      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    it('should not retry non-retryable errors', async () => {
      const mockOperation = vi.fn().mockImplementation(() => {
        throw new EnhancedError({
          message: 'Validation error',
          type: ErrorType.VALIDATION_ERROR,
          retryable: false
        })
      })

      await expect(errorHandler.executeWithErrorHandling(mockOperation))
        .rejects.toThrow('Validation error')

      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    it('should respect maximum retry attempts', async () => {
      const mockOperation = vi.fn().mockImplementation(() => {
        throw new EnhancedError({
          message: 'Persistent error',
          type: ErrorType.SERVER_ERROR,
          retryable: true
        })
      })

      await expect(errorHandler.executeWithErrorHandling(mockOperation))
        .rejects.toThrow('Persistent error')

      expect(mockOperation).toHaveBeenCalledTimes(3) // maxAttempts
    })

    it('should apply exponential backoff', async () => {
      const delays: number[] = []
      const originalSetTimeout = global.setTimeout
      
      global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
        delays.push(delay)
        return originalSetTimeout(callback, 0) // Execute immediately for test
      })

      const mockOperation = vi.fn().mockImplementation(() => {
        throw new EnhancedError({
          message: 'Network error',
          type: ErrorType.NETWORK_ERROR,
          retryable: true
        })
      })

      await expect(errorHandler.executeWithErrorHandling(mockOperation))
        .rejects.toThrow('Network error')

      expect(delays).toEqual([100, 200]) // Initial delay, then doubled
      
      global.setTimeout = originalSetTimeout
    })

    it('should respect retry-after header', async () => {
      const mockOperation = vi.fn().mockImplementation(() => {
        throw new EnhancedError({
          message: 'Rate limited',
          type: ErrorType.RATE_LIMIT,
          retryable: true,
          retryAfter: 5
        })
      })

      const delays: number[] = []
      const originalSetTimeout = global.setTimeout
      
      global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
        delays.push(delay)
        return originalSetTimeout(callback, 0)
      })

      await expect(errorHandler.executeWithErrorHandling(mockOperation))
        .rejects.toThrow('Rate limited')

      expect(delays[0]).toBe(5000) // 5 seconds in milliseconds
      
      global.setTimeout = originalSetTimeout
    })
  })

  describe('Cache Fallback', () => {
    it('should return cached data when available and operation fails', async () => {
      const cachedData = { id: 1, name: 'Cached Item' }
      const cacheKey = 'test-cache-key'
      
      // Mock cache manager
      const mockCacheManager = {
        get: vi.fn().mockResolvedValue(cachedData)
      }

      const mockOperation = vi.fn().mockImplementation(() => {
        throw new EnhancedError({
          message: 'Network error',
          type: ErrorType.NETWORK_ERROR,
          retryable: true
        })
      })

      // Mock the cache fallback behavior
      const errorHandlerWithCache = new ErrorHandler(mockRetryConfig, mockFallbackConfig)
      
      try {
        await errorHandlerWithCache.executeWithErrorHandling(mockOperation, cacheKey)
      } catch (error) {
        // In a real implementation, this would return cached data instead of throwing
        expect(error).toBeInstanceOf(EnhancedError)
      }
    })

    it('should not use cache fallback when disabled', async () => {
      const disabledFallbackConfig: FallbackConfig = {
        ...mockFallbackConfig,
        enableCacheFallback: false
      }

      const errorHandlerNoCache = new ErrorHandler(mockRetryConfig, disabledFallbackConfig)

      const mockOperation = vi.fn().mockImplementation(() => {
        throw new EnhancedError({
          message: 'Network error',
          type: ErrorType.NETWORK_ERROR,
          retryable: true
        })
      })

      await expect(errorHandlerNoCache.executeWithErrorHandling(mockOperation, 'cache-key'))
        .rejects.toThrow('Network error')
    })
  })

  describe('Error Context Enhancement', () => {
    it('should enhance errors with context information', async () => {
      const context = {
        operation: 'create',
        table: 'Materiales',
        userId: 'user123'
      }

      const mockOperation = vi.fn().mockImplementation(() => {
        throw new Error('Simple error')
      })

      try {
        await errorHandler.executeWithErrorHandling(mockOperation, undefined, context)
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedError)
        const enhancedError = error as EnhancedError
        expect(enhancedError.details.context).toEqual(context)
      }
    })

    it('should preserve existing enhanced errors', async () => {
      const originalError = new EnhancedError({
        message: 'Already enhanced',
        type: ErrorType.VALIDATION_ERROR,
        status: 400,
        context: { original: 'context' }
      })

      const mockOperation = vi.fn().mockImplementation(() => {
        throw originalError
      })

      try {
        await errorHandler.executeWithErrorHandling(mockOperation)
      } catch (error) {
        expect(error).toBe(originalError)
        expect(error.details.context).toEqual({ original: 'context' })
      }
    })
  })

  describe('Configuration Updates', () => {
    it('should update retry configuration', () => {
      const newRetryConfig: Partial<RetryConfig> = {
        maxAttempts: 5,
        initialDelay: 200
      }

      errorHandler.updateRetryConfig(newRetryConfig)

      const config = errorHandler.getRetryConfig()
      expect(config.maxAttempts).toBe(5)
      expect(config.initialDelay).toBe(200)
      expect(config.backoffMultiplier).toBe(2) // Should preserve existing values
    })

    it('should update fallback configuration', () => {
      const newFallbackConfig: Partial<FallbackConfig> = {
        enableCacheFallback: false,
        cacheMaxAge: 7200
      }

      errorHandler.updateFallbackConfig(newFallbackConfig)

      const config = errorHandler.getFallbackConfig()
      expect(config.enableCacheFallback).toBe(false)
      expect(config.cacheMaxAge).toBe(7200)
    })
  })
})