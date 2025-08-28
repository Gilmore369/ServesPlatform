import { describe, it, expect } from 'vitest';
import { 
  GoogleSheetsAPIService, 
  GoogleSheetsAPIError, 
  ErrorType 
} from '../google-sheets-api-service';

describe('GoogleSheetsAPIService - Core Functionality', () => {
  let service: GoogleSheetsAPIService;

  beforeEach(() => {
    service = new GoogleSheetsAPIService();
  });

  describe('Configuration', () => {
    it('should initialize with default configuration', () => {
      const config = service.getConfig();
      
      expect(config.timeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.cacheEnabled).toBe(true);
      expect(config.backoffMultiplier).toBe(2);
    });

    it('should allow configuration updates', () => {
      const newConfig = {
        timeout: 60000,
        retryAttempts: 5,
        retryDelay: 2000
      };

      service.updateConfig(newConfig);
      const config = service.getConfig();

      expect(config.timeout).toBe(60000);
      expect(config.retryAttempts).toBe(5);
      expect(config.retryDelay).toBe(2000);
    });

    it('should accept custom configuration in constructor', () => {
      const customService = new GoogleSheetsAPIService({
        timeout: 45000,
        retryAttempts: 2
      });

      const config = customService.getConfig();
      expect(config.timeout).toBe(45000);
      expect(config.retryAttempts).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should create GoogleSheetsAPIError with correct properties', () => {
      const error = new GoogleSheetsAPIError(
        'Test error message',
        ErrorType.VALIDATION_ERROR,
        400,
        false,
        { field: 'email', value: 'invalid' }
      );

      expect(error.message).toBe('Test error message');
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.status).toBe(400);
      expect(error.retryable).toBe(false);
      expect(error.details).toEqual({ field: 'email', value: 'invalid' });
    });

    it('should convert to APIError format', () => {
      const error = new GoogleSheetsAPIError(
        'Test error',
        ErrorType.NETWORK_ERROR,
        0,
        true
      );

      const apiError = error.toAPIError();

      expect(apiError.type).toBe(ErrorType.NETWORK_ERROR);
      expect(apiError.message).toBe('Test error');
      expect(apiError.retryable).toBe(true);
      expect(apiError.timestamp).toBeDefined();
      expect(apiError.status).toBe(0);
    });
  });

  describe('Error Classification', () => {
    it('should classify HTTP errors correctly', () => {
      // Test private method through reflection for unit testing
      const service = new GoogleSheetsAPIService();
      const classifyMethod = (service as any).classifyHttpError.bind(service);
      const isRetryableMethod = (service as any).isRetryableError.bind(service);

      // Test error classification
      expect(classifyMethod(401)).toBe(ErrorType.PERMISSION_ERROR);
      expect(classifyMethod(403)).toBe(ErrorType.PERMISSION_ERROR);
      expect(classifyMethod(400)).toBe(ErrorType.VALIDATION_ERROR);
      expect(classifyMethod(422)).toBe(ErrorType.VALIDATION_ERROR);
      expect(classifyMethod(409)).toBe(ErrorType.DATA_CONFLICT);
      expect(classifyMethod(429)).toBe(ErrorType.RATE_LIMIT);
      expect(classifyMethod(500)).toBe(ErrorType.SERVER_ERROR);
      expect(classifyMethod(502)).toBe(ErrorType.SERVER_ERROR);

      // Test retryable classification
      expect(isRetryableMethod(500)).toBe(true);
      expect(isRetryableMethod(502)).toBe(true);
      expect(isRetryableMethod(503)).toBe(true);
      expect(isRetryableMethod(504)).toBe(true);
      expect(isRetryableMethod(429)).toBe(true);
      expect(isRetryableMethod(408)).toBe(true);
      expect(isRetryableMethod(400)).toBe(false);
      expect(isRetryableMethod(401)).toBe(false);
      expect(isRetryableMethod(404)).toBe(false);
    });
  });

  describe('Request Building', () => {
    it('should build correct request parameters', () => {
      // This test verifies the service can be instantiated and configured
      // without making actual HTTP requests
      const service = new GoogleSheetsAPIService({
        baseUrl: 'https://test.example.com',
        token: 'test-token-123',
        timeout: 15000
      });

      const config = service.getConfig();
      expect(config.baseUrl).toBe('https://test.example.com');
      expect(config.token).toBe('test-token-123');
      expect(config.timeout).toBe(15000);
    });
  });

  describe('Utility Methods', () => {
    it('should have sleep utility method', async () => {
      const service = new GoogleSheetsAPIService();
      const sleepMethod = (service as any).sleep.bind(service);

      const start = Date.now();
      await sleepMethod(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
      expect(elapsed).toBeLessThan(200);
    });
  });
});