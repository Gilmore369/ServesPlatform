/**
 * Integration test for Error Handler with Google Sheets API Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleSheetsAPIService, CRUDOperation } from '../google-sheets-api-service';
import { ErrorType } from '../error-handler';
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

describe('Error Handler Integration', () => {
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

  it('should handle network errors with cache fallback', async () => {
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
    expect(result.message).toBeDefined();
    expect(result.metadata?.cacheHit).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2); // Retried once
  });

  it('should classify errors correctly', async () => {
    const operation: CRUDOperation = {
      table: 'Usuarios',
      operation: 'create',
      data: { name: 'Test User' }
    };

    // Mock validation error response
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      ok: false,
      message: 'Validation failed: email is required'
    }), { status: 400 }));

    const result = await apiService.executeOperation(operation);

    expect(result.ok).toBe(false);
    expect(result.metadata?.errorType).toBe(ErrorType.VALIDATION_ERROR);
    expect(result.message).toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(1); // No retry for validation errors
  });

  it('should retry on server errors', async () => {
    const operation: CRUDOperation = {
      table: 'Materiales',
      operation: 'get',
      id: '123'
    };

    // Mock server error then success
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: false,
        message: 'Internal Server Error'
      }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        data: { id: '123', name: 'Test Material' }
      }), { status: 200 }));

    const result = await apiService.executeOperation(operation);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ id: '123', name: 'Test Material' });
    expect(mockFetch).toHaveBeenCalledTimes(2); // Retried once
  });

  it('should handle timeout errors', async () => {
    const operation: CRUDOperation = {
      table: 'Clientes',
      operation: 'list'
    };

    // Mock timeout error
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValue(abortError);

    const result = await apiService.executeOperation(operation);

    expect(result.ok).toBe(false);
    expect(result.metadata?.errorType).toBe(ErrorType.TIMEOUT_ERROR);
    expect(mockFetch).toHaveBeenCalledTimes(2); // Retried once
  });

  it('should use cached data when available', async () => {
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

  it('should validate connection', async () => {
    // Mock successful response
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      ok: true,
      data: []
    }), { status: 200 }));

    const isValid = await apiService.validateConnection();

    expect(isValid).toBe(true);
  });

  it('should handle connection validation failure', async () => {
    // Mock network failure
    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

    const isValid = await apiService.validateConnection();

    expect(isValid).toBe(false);
  });
});