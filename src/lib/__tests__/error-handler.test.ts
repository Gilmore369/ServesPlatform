/**
 * Tests for Enhanced Error Handler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ErrorHandler,
  ErrorClassifier,
  RetryHandler,
  FallbackHandler,
  EnhancedError,
  ErrorType
} from '../error-handler';
import { cacheManager } from '../cache/cache-manager';

// Mock cache manager
vi.mock('../cache/cache-manager', () => ({
  cacheManager: {
    get: vi.fn(),
    set: vi.fn(),
    getEntryInfo: vi.fn()
  }
}));

describe('ErrorClassifier', () => {
  it('should classify network errors correctly', () => {
    const networkError = new TypeError('fetch failed');
    const result = ErrorClassifier.classify(networkError);
    
    expect(result.type).toBe(ErrorType.NETWORK_ERROR);
    expect(result.retryable).toBe(true);
    expect(result.userMessage).toBeDefined();
    expect(result.userMessage).toContain('conexión');
  });

  it('should classify timeout errors correctly', () => {
    const timeoutError = new Error('timeout');
    timeoutError.name = 'AbortError';
    const result = ErrorClassifier.classify(timeoutError);
    
    expect(result.type).toBe(ErrorType.TIMEOUT_ERROR);
    expect(result.retryable).toBe(true);
  });

  it('should classify HTTP status codes correctly', () => {
    const httpError = { status: 401, message: 'Unauthorized' };
    const result = ErrorClassifier.classify(httpError);
    
    expect(result.type).toBe(ErrorType.AUTHENTICATION_ERROR);
    expect(result.status).toBe(401);
  });

  it('should classify rate limit errors with retry-after', () => {
    const rateLimitError = {
      status: 429,
      message: 'Too Many Requests',
      headers: { 'retry-after': '60' }
    };
    const result = ErrorClassifier.classify(rateLimitError);
    
    expect(result.type).toBe(ErrorType.RATE_LIMIT);
    expect(result.retryAfter).toBe(60);
    expect(result.retryable).toBe(true);
  });

  it('should classify validation errors correctly', () => {
    const validationError = new Error('validation failed');
    const result = ErrorClassifier.classify(validationError);
    
    expect(result.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(result.retryable).toBe(false);
  });
});

describe('RetryHandler', () => {
  let retryHandler: RetryHandler;
  let mockOperation: vi.Mock;

  beforeEach(() => {
    retryHandler = new RetryHandler({
      maxAttempts: 3,
      initialDelay: 10, // Short delay for tests
      maxDelay: 100,
      backoffMultiplier: 2,
      jitter: false // Disable jitter for predictable tests
    });
    mockOperation = vi.fn();
  });

  it('should succeed on first attempt', async () => {
    mockOperation.mockResolvedValueOnce('success');
    
    const result = await retryHandler.executeWithRetry(mockOperation);
    
    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const retryableError = new EnhancedError({
      message: 'Network error',
      type: ErrorType.NETWORK_ERROR
    });
    
    mockOperation
      .mockRejectedValueOnce(retryableError)
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValueOnce('success');
    
    const result = await retryHandler.executeWithRetry(mockOperation);
    
    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const nonRetryableError = new EnhancedError({
      message: 'Validation error',
      type: ErrorType.VALIDATION_ERROR
    });
    
    mockOperation.mockRejectedValueOnce(nonRetryableError);
    
    await expect(retryHandler.executeWithRetry(mockOperation))
      .rejects.toThrow('Validation error');
    
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should respect max attempts', async () => {
    const retryableError = new EnhancedError({
      message: 'Server error',
      type: ErrorType.SERVER_ERROR
    });
    
    mockOperation.mockRejectedValue(retryableError);
    
    await expect(retryHandler.executeWithRetry(mockOperation))
      .rejects.toThrow('Server error');
    
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('should use server-specified retry-after delay', async () => {
    const rateLimitError = new EnhancedError({
      message: 'Rate limited',
      type: ErrorType.RATE_LIMIT,
      retryAfter: 0.1 // 0.1 seconds for faster test
    });
    
    mockOperation
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce('success');
    
    const startTime = Date.now();
    const result = await retryHandler.executeWithRetry(mockOperation);
    const endTime = Date.now();
    
    expect(result).toBe('success');
    expect(endTime - startTime).toBeGreaterThanOrEqual(100); // At least 0.1 seconds
  });
});

describe('FallbackHandler', () => {
  let fallbackHandler: FallbackHandler;
  const mockCacheManager = cacheManager as any;

  beforeEach(() => {
    fallbackHandler = new FallbackHandler({
      enableCacheFallback: true,
      cacheMaxAge: 3600
    });
    vi.clearAllMocks();
  });

  it('should return cached data for connectivity errors', async () => {
    const networkError = new EnhancedError({
      message: 'Network error',
      type: ErrorType.NETWORK_ERROR
    });
    
    const cachedData = { id: 1, name: 'Test' };
    mockCacheManager.get.mockResolvedValueOnce(cachedData);
    mockCacheManager.getEntryInfo.mockReturnValueOnce({
      exists: true,
      age: 1800 // 30 minutes old
    });
    
    const result = await fallbackHandler.getFallbackData(
      'test:key',
      networkError
    );
    
    expect(result).toEqual({
      data: cachedData,
      fromCache: true,
      message: expect.stringContaining('almacenados')
    });
  });

  it('should not return cached data for validation errors', async () => {
    const validationError = new EnhancedError({
      message: 'Validation error',
      type: ErrorType.VALIDATION_ERROR
    });
    
    const result = await fallbackHandler.getFallbackData(
      'test:key',
      validationError
    );
    
    expect(result).toBeNull();
    expect(mockCacheManager.get).not.toHaveBeenCalled();
  });

  it('should not return cached data that is too old', async () => {
    const networkError = new EnhancedError({
      message: 'Network error',
      type: ErrorType.NETWORK_ERROR
    });
    
    const cachedData = { id: 1, name: 'Test' };
    mockCacheManager.get.mockResolvedValueOnce(cachedData);
    mockCacheManager.getEntryInfo.mockReturnValueOnce({
      exists: true,
      age: 7200 // 2 hours old (exceeds 1 hour max age)
    });
    
    const result = await fallbackHandler.getFallbackData(
      'test:key',
      networkError
    );
    
    expect(result).toBeNull();
  });

  it('should handle cache access errors gracefully', async () => {
    const networkError = new EnhancedError({
      message: 'Network error',
      type: ErrorType.NETWORK_ERROR
    });
    
    mockCacheManager.get.mockRejectedValueOnce(new Error('Cache error'));
    
    const result = await fallbackHandler.getFallbackData(
      'test:key',
      networkError
    );
    
    expect(result).toBeNull();
  });
});

describe('ErrorHandler Integration', () => {
  let errorHandler: ErrorHandler;
  let mockOperation: vi.Mock;
  const mockCacheManager = cacheManager as any;

  beforeEach(() => {
    errorHandler = new ErrorHandler(
      {
        maxAttempts: 2,
        initialDelay: 10,
        maxDelay: 100,
        jitter: false
      },
      {
        enableCacheFallback: true,
        cacheMaxAge: 3600
      }
    );
    mockOperation = vi.fn();
    vi.clearAllMocks();
  });

  it('should succeed with normal operation', async () => {
    mockOperation.mockResolvedValueOnce('success');
    
    const result = await errorHandler.executeWithErrorHandling(
      mockOperation,
      'test:key'
    );
    
    expect(result).toEqual({ data: 'success' });
  });

  it('should retry and then succeed', async () => {
    const networkError = new TypeError('fetch failed');
    
    mockOperation
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce('success');
    
    const result = await errorHandler.executeWithErrorHandling(
      mockOperation,
      'test:key'
    );
    
    expect(result).toEqual({ data: 'success' });
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('should fallback to cache after retry failures', async () => {
    const networkError = new TypeError('fetch failed');
    mockOperation.mockRejectedValue(networkError);
    
    const cachedData = { id: 1, name: 'Cached' };
    mockCacheManager.get.mockResolvedValueOnce(cachedData);
    mockCacheManager.getEntryInfo.mockReturnValueOnce({
      exists: true,
      age: 1800
    });
    
    const result = await errorHandler.executeWithErrorHandling(
      mockOperation,
      'test:key'
    );
    
    expect(result).toEqual({
      data: cachedData,
      fromCache: true,
      message: expect.stringContaining('almacenados')
    });
    expect(mockOperation).toHaveBeenCalledTimes(2); // Retried once
  });

  it('should throw enhanced error when no fallback available', async () => {
    const validationError = new Error('Invalid data');
    mockOperation.mockRejectedValue(validationError);
    
    await expect(errorHandler.executeWithErrorHandling(
      mockOperation,
      'test:key'
    )).rejects.toBeInstanceOf(EnhancedError);
  });

  it('should work without cache key (no fallback)', async () => {
    mockOperation.mockResolvedValueOnce('success');
    
    const result = await errorHandler.executeWithErrorHandling(mockOperation);
    
    expect(result).toEqual({ data: 'success' });
  });
});

describe('EnhancedError', () => {
  it('should create error with all details', () => {
    const error = new EnhancedError({
      message: 'Test error',
      type: ErrorType.NETWORK_ERROR,
      status: 500,
      context: { operation: 'test' }
    });
    
    expect(error.details.message).toBe('Test error');
    expect(error.details.type).toBe(ErrorType.NETWORK_ERROR);
    expect(error.details.status).toBe(500);
    expect(error.details.retryable).toBe(true);
    expect(error.details.userMessage).toContain('conexión');
    expect(error.details.context).toEqual({ operation: 'test' });
    expect(error.details.timestamp).toBeDefined();
  });

  it('should generate appropriate user messages', () => {
    const networkError = new EnhancedError({
      message: 'Network failed',
      type: ErrorType.NETWORK_ERROR
    });
    
    const validationError = new EnhancedError({
      message: 'Invalid input',
      type: ErrorType.VALIDATION_ERROR
    });
    
    expect(networkError.details.userMessage).toContain('conexión');
    expect(validationError.details.userMessage).toContain('válidos');
  });
});