import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  GoogleSheetsAPIService, 
  GoogleSheetsAPIError, 
  ErrorType,
  CRUDOperation 
} from '../google-sheets-api-service';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock config
vi.mock('../config', () => ({
  config: {
    apiBaseUrl: 'https://test-api.example.com',
    apiToken: 'test-token',
    appVersion: '1.0.0'
  }
}));

// Mock JWT Manager
vi.mock('../jwt', () => ({
  JWTManager: {
    getToken: vi.fn(() => 'mock-jwt-token')
  }
}));

describe('GoogleSheetsAPIService', () => {
  let service: GoogleSheetsAPIService;

  beforeEach(() => {
    service = new GoogleSheetsAPIService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('executeOperation', () => {
    it('should successfully execute a list operation', async () => {
      const mockResponse = {
        ok: true,
        data: [{ id: '1', name: 'Test User' }],
        message: 'Success'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const operation: CRUDOperation = {
        table: 'Usuarios',
        operation: 'list',
        pagination: { page: 1, limit: 10 }
      };

      const result = await service.executeOperation(operation);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
      expect(result.status).toBe(200);
      expect(result.metadata?.executionTime).toBeGreaterThan(0);
    });

    it('should handle network errors with retry', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ ok: true, data: [] })
        });

      const operation: CRUDOperation = {
        table: 'Usuarios',
        operation: 'list'
      };

      const result = await service.executeOperation(operation);
      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should throw GoogleSheetsAPIError for non-retryable errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({ ok: false, message: 'Bad Request' })
      });

      const operation: CRUDOperation = {
        table: 'Usuarios',
        operation: 'list'
      };

      await expect(service.executeOperation(operation)).rejects.toThrow(GoogleSheetsAPIError);
    });

    it('should handle timeout errors', async () => {
      vi.useFakeTimers();
      
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 35000))
      );

      const operation: CRUDOperation = {
        table: 'Usuarios',
        operation: 'list'
      };

      const promise = service.executeOperation(operation, { timeout: 1000 });
      
      vi.advanceTimersByTime(1001);
      
      await expect(promise).rejects.toThrow(GoogleSheetsAPIError);
      
      vi.useRealTimers();
    });

    it('should classify HTTP errors correctly', async () => {
      const testCases = [
        { status: 401, expectedType: ErrorType.PERMISSION_ERROR },
        { status: 400, expectedType: ErrorType.VALIDATION_ERROR },
        { status: 409, expectedType: ErrorType.DATA_CONFLICT },
        { status: 429, expectedType: ErrorType.RATE_LIMIT },
        { status: 500, expectedType: ErrorType.SERVER_ERROR }
      ];

      for (const testCase of testCases) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: testCase.status,
          statusText: 'Error',
          json: vi.fn().mockResolvedValue({ ok: false, message: 'Error' })
        });

        const operation: CRUDOperation = {
          table: 'Usuarios',
          operation: 'list'
        };

        try {
          await service.executeOperation(operation);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(GoogleSheetsAPIError);
          expect((error as GoogleSheetsAPIError).type).toBe(testCase.expectedType);
        }
      }
    });
  });

  describe('batchOperations', () => {
    it('should execute multiple operations successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ ok: true, data: [{ id: '1' }] })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ ok: true, data: { id: '2' } })
        });

      const operations: CRUDOperation[] = [
        { table: 'Usuarios', operation: 'list' },
        { table: 'Proyectos', operation: 'get', id: '2' }
      ];

      const results = await service.batchOperations(operations);
      
      expect(results).toHaveLength(2);
      expect(results[0].ok).toBe(true);
      expect(results[1].ok).toBe(true);
    });
  });

  describe('validateConnection', () => {
    it('should return true for successful connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ ok: true, data: [] })
      });

      const isValid = await service.validateConnection();
      expect(isValid).toBe(true);
    });

    it('should return false for failed connection', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const isValid = await service.validateConnection();
      expect(isValid).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should allow configuration updates', () => {
      const newConfig = {
        timeout: 60000,
        retryAttempts: 5
      };

      service.updateConfig(newConfig);
      const config = service.getConfig();

      expect(config.timeout).toBe(60000);
      expect(config.retryAttempts).toBe(5);
    });
  });

  describe('error handling', () => {
    it('should create proper APIError objects', () => {
      const error = new GoogleSheetsAPIError(
        'Test error',
        ErrorType.VALIDATION_ERROR,
        400,
        false,
        { field: 'email' }
      );

      const apiError = error.toAPIError();

      expect(apiError.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(apiError.message).toBe('Test error');
      expect(apiError.status).toBe(400);
      expect(apiError.retryable).toBe(false);
      expect(apiError.details).toEqual({ field: 'email' });
      expect(apiError.timestamp).toBeDefined();
    });
  });
});