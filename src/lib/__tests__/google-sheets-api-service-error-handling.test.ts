/**
 * Tests for Google Sheets API Service Error Handling Integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleSheetsAPIService, CRUDOperation } from '../google-sheets-api-service';
import { EnhancedError, ErrorType } from '../error-handler';
import { cacheManager } from '../cache/cache-manager';

// Mock dependencies
vi.mock('../config', () => ({
  config: {
    apiBaseUrl: 'https://test-api.example.com',
    apiToken: 'test-token',
    appVersion: '1.0.0'
  }
}));

vi.mock('../jwt', () => ({
  JWTManager: {
    getToken: vi.fn().mockReturnValue('test-jwt-token')
  }
}));

vi.mock('../cache/cache-manager', () => ({
  cacheManager: {
    get: vi.fn(),
    set: vi.fn(),
    invalidateByOperation: vi.fn(),
    getEntryInfo: vi.fn()
  }
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GoogleSheetsAPIService Error Handling', () => {
  let apiService: GoogleSheetsAPIService;
  const mockCacheManager = cacheManager as any;

  beforeEach(() => {
    apiService = new GoogleSheetsAPIService({
      retryAttempts: 2,
      retryDelay: 10,
      maxRetryDelay: 100,
      cacheEnabled: true
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Network Error Handling', () => {
    it('should handle network errors with retry and cache fallback', async () => {
      const operation: CRUDOperation = {
        table: 'Proyectos',
        operation: 'list'
      };

      // Mock network failure
      mockFetch.mockRejectedValue(new TypeError('fetch failed'));

      // Mock cache fallback
      const cachedData = [{ id: 1, name: 'Cached Project' }];
      mockCacheManager.get.mockResolvedValueOnce(cachedData);
      mockCacheManager.getEntryInfo.mockReturnValueOnce({
        exists: true,
        age: 1800 // 30 minutes
      });

      const result = await apiService.executeOperation(operation);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(cachedData);
      expect(result.message).toContain('almacenados');
      expect(result.metadata?.cacheHit).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Retried once
    });

    it('should fail gracefully when no cache fallback available', async () => {
      const operation: CRUDOperation = {
        table: 'Proyectos',
        operation: 'create',
        data: { name: 'New Project' }
      };

      // Mock network failure
      mockFetch.mockRejectedValue(new TypeError('fetch failed'));

      const result = await apiService.executeOperation(operation);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('conexión');
      expect(result.metadata?.errorType).toBe(ErrorType.NETWORK_ERROR);
    });
  });

  describe('Timeout Error Handling', () => {
    it('should handle timeout errors with retry', async () => {
      const operation: CRUDOperation = {
        table: 'Materiales',
        operation: 'get',
        id: '123'
      };

      // Mock timeout on first call, success on second
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      
      mockFetch
        .mockRejectedValueOnce(abortError)
        .mockResolvedValueOnce(new Response(JSON.stringify({
          ok: true,
          data: { id: '123', name: 'Test Material' }
        }), { status: 200 }));

      const result = await apiService.executeOperation(operation);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ id: '123', name: 'Test Material' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('HTTP Error Classification', () => {
    it('should classify 401 as authentication error', async () => {
      const operation: CRUDOperation = {
        table: 'Usuarios',
        operation: 'list'
      };

      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        ok: false,
        message: 'Unauthorized'
      }), { status: 401 }));

      const result = await apiService.executeOperation(operation);

      expect(result.ok).toBe(false);
      expect(result.metadata?.errorType).toBe(ErrorType.AUTHENTICATION_ERROR);
      expect(result.message).toContain('sesión');
    });

    it('should classify 429 as rate limit with retry', async () => {
      const operation: CRUDOperation = {
        table: 'Actividades',
        operation: 'list'
      };

      // Mock rate limit response with retry-after header
      const rateLimitResponse = new Response(JSON.stringify({
        ok: false,
        message: 'Too Many Requests'
      }), { 
        status: 429,
        headers: { 'retry-after': '1' }
      });

      const successResponse = new Response(JSON.stringify({
        ok: true,
        data: [{ id: 1, name: 'Activity 1' }]
      }), { status: 200 });

      mockFetch
        .mockResolvedValueOnce(rateLimitResponse)
        .mockResolvedValueOnce(successResponse);

      const startTime = Date.now();
      const result = await apiService.executeOperation(operation);
      const endTime = Date.now();

      expect(result.ok).toBe(true);
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000); // At least 1 second delay
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should classify 500 as server error with retry', async () => {
      const operation: CRUDOperation = {
        table: 'Clientes',
        operation: 'get',
        id: '456'
      };

      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify({
          ok: false,
          message: 'Internal Server Error'
        }), { status: 500 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          ok: true,
          data: { id: '456', name: 'Test Client' }
        }), { status: 200 }));

      const result = await apiService.executeOperation(operation);

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry validation errors', async () => {
      const operation: CRUDOperation = {
        table: 'Materiales',
        operation: 'create',
        data: { name: '' } // Invalid data
      };

      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        ok: false,
        message: 'Validation failed: name is required'
      }), { status: 400 }));

      const result = await apiService.executeOperation(operation);

      expect(result.ok).toBe(false);
      expect(result.metadata?.errorType).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.message).toContain('válidos');
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retry
    });
  });

  describe('Cache Integration', () => {
    it('should return cached data immediately for read operations', async () => {
      const operation: CRUDOperation = {
        table: 'Proyectos',
        operation: 'list'
      };

      const cachedData = [{ id: 1, name: 'Cached Project' }];
      mockCacheManager.get.mockResolvedValueOnce(cachedData);

      const result = await apiService.executeOperation(operation);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(cachedData);
      expect(result.metadata?.cacheHit).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should cache successful read operations', async () => {
      const operation: CRUDOperation = {
        table: 'Materiales',
        operation: 'get',
        id: '789'
      };

      mockCacheManager.get.mockResolvedValueOnce(null); // No cache

      const responseData = { id: '789', name: 'Test Material' };
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        data: responseData
      }), { status: 200 }));

      const result = await apiService.executeOperation(operation);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(responseData);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('materiales:get:789'),
        responseData
      );
    });

    it('should invalidate cache for write operations', async () => {
      const operation: CRUDOperation = {
        table: 'Proyectos',
        operation: 'update',
        id: '123',
        data: { name: 'Updated Project' }
      };

      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        data: { id: '123', name: 'Updated Project' }
      }), { status: 200 }));

      const result = await apiService.executeOperation(operation);

      expect(result.ok).toBe(true);
      expect(mockCacheManager.invalidateByOperation).toHaveBeenCalledWith(
        'Proyectos',
        'update'
      );
    });
  });

  describe('Batch Operations', () => {
    it('should handle partial failures in batch operations', async () => {
      const operations: CRUDOperation[] = [
        { table: 'Proyectos', operation: 'get', id: '1' },
        { table: 'Proyectos', operation: 'get', id: '2' },
        { table: 'Proyectos', operation: 'get', id: '3' }
      ];

      // Mock responses: success, failure, success
      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify({
          ok: true,
          data: { id: '1', name: 'Project 1' }
        }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          ok: false,
          message: 'Not found'
        }), { status: 404 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          ok: true,
          data: { id: '3', name: 'Project 3' }
        }), { status: 200 }));

      const results = await apiService.batchOperations(operations);

      expect(results).toHaveLength(3);
      expect(results[0].ok).toBe(true);
      expect(results[1].ok).toBe(false);
      expect(results[2].ok).toBe(true);
      expect(results[1].metadata?.errorType).toBe(ErrorType.DATA_NOT_FOUND);
    });
  });

  describe('Configuration Updates', () => {
    it('should update error handler configuration', () => {
      const initialConfig = apiService.getConfig();
      expect(initialConfig.retryAttempts).toBe(2);

      apiService.updateConfig({
        retryAttempts: 5,
        retryDelay: 2000
      });

      const updatedConfig = apiService.getConfig();
      expect(updatedConfig.retryAttempts).toBe(5);
      expect(updatedConfig.retryDelay).toBe(2000);
    });
  });

  describe('Connection Validation', () => {
    it('should validate connection successfully', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        data: []
      }), { status: 200 }));

      const isValid = await apiService.validateConnection();

      expect(isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('table=Usuarios'),
        expect.any(Object)
      );
    });

    it('should handle connection validation failure', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

      const isValid = await apiService.validateConnection();

      expect(isValid).toBe(false);
    });
  });
});