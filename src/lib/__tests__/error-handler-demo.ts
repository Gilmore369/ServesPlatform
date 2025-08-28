/**
 * Demonstration of Enhanced Error Handler functionality
 * This script shows the key features implemented in task 4
 */

import {
  ErrorHandler,
  ErrorClassifier,
  RetryHandler,
  FallbackHandler,
  EnhancedError,
  ErrorType
} from '../error-handler';

// Mock cache manager for demo
const mockCache = new Map();
const mockCacheManager = {
  get: async (key: string) => mockCache.get(key),
  set: async (key: string, value: any) => mockCache.set(key, value),
  getEntryInfo: (key: string) => ({
    exists: mockCache.has(key),
    age: 1800 // 30 minutes
  })
};

// Replace the real cache manager for this demo
vi.mock('../cache/cache-manager', () => ({
  cacheManager: mockCacheManager
}));

async function demonstrateErrorClassification() {
  console.log('\n=== Error Classification Demo ===');
  
  // Network error
  const networkError = new TypeError('fetch failed');
  const networkResult = ErrorClassifier.classify(networkError);
  console.log('Network Error:', {
    type: networkResult.type,
    retryable: networkResult.retryable,
    userMessage: networkResult.userMessage
  });
  
  // HTTP 401 error
  const authError = { status: 401, message: 'Unauthorized' };
  const authResult = ErrorClassifier.classify(authError);
  console.log('Auth Error:', {
    type: authResult.type,
    retryable: authResult.retryable,
    userMessage: authResult.userMessage
  });
  
  // Rate limit error with retry-after
  const rateLimitError = {
    status: 429,
    message: 'Too Many Requests',
    headers: { 'retry-after': '60' }
  };
  const rateLimitResult = ErrorClassifier.classify(rateLimitError);
  console.log('Rate Limit Error:', {
    type: rateLimitResult.type,
    retryable: rateLimitResult.retryable,
    retryAfter: rateLimitResult.retryAfter,
    userMessage: rateLimitResult.userMessage
  });
}

async function demonstrateRetryLogic() {
  console.log('\n=== Retry Logic Demo ===');
  
  const retryHandler = new RetryHandler({
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 1000,
    backoffMultiplier: 2,
    jitter: false
  });
  
  let attemptCount = 0;
  const flakyOperation = async () => {
    attemptCount++;
    console.log(`  Attempt ${attemptCount}`);
    
    if (attemptCount < 3) {
      throw new EnhancedError({
        message: 'Server temporarily unavailable',
        type: ErrorType.SERVER_ERROR
      });
    }
    
    return 'Success!';
  };
  
  try {
    const result = await retryHandler.executeWithRetry(flakyOperation);
    console.log('Final result:', result);
    console.log('Total attempts:', attemptCount);
  } catch (error) {
    console.log('Failed after retries:', error);
  }
}

async function demonstrateCacheFallback() {
  console.log('\n=== Cache Fallback Demo ===');
  
  const fallbackHandler = new FallbackHandler({
    enableCacheFallback: true,
    cacheMaxAge: 3600
  });
  
  // Set up cached data
  await mockCacheManager.set('demo:data', { id: 1, name: 'Cached Data' });
  
  const networkError = new EnhancedError({
    message: 'Network connection failed',
    type: ErrorType.NETWORK_ERROR
  });
  
  const fallbackResult = await fallbackHandler.getFallbackData(
    'demo:data',
    networkError
  );
  
  console.log('Fallback result:', fallbackResult);
}

async function demonstrateFullErrorHandling() {
  console.log('\n=== Full Error Handler Demo ===');
  
  const errorHandler = new ErrorHandler(
    {
      maxAttempts: 2,
      initialDelay: 50,
      maxDelay: 200,
      jitter: false
    },
    {
      enableCacheFallback: true,
      cacheMaxAge: 3600
    }
  );
  
  // Set up cached data
  await mockCacheManager.set('api:users', [{ id: 1, name: 'John Doe' }]);
  
  let attemptCount = 0;
  const failingOperation = async () => {
    attemptCount++;
    console.log(`  API call attempt ${attemptCount}`);
    
    // Always fail to demonstrate fallback
    throw new TypeError('fetch failed');
  };
  
  try {
    const result = await errorHandler.executeWithErrorHandling(
      failingOperation,
      'api:users'
    );
    
    console.log('Result:', result);
    console.log('Data source:', result.fromCache ? 'Cache' : 'API');
  } catch (error) {
    console.log('Final error:', error);
  }
}

async function runDemo() {
  console.log('🚀 Enhanced Error Handler Demo');
  console.log('This demonstrates the key features implemented in task 4:');
  console.log('1. Error classification by type');
  console.log('2. Exponential backoff retry system');
  console.log('3. Cache fallback for connectivity errors');
  
  await demonstrateErrorClassification();
  await demonstrateRetryLogic();
  await demonstrateCacheFallback();
  await demonstrateFullErrorHandling();
  
  console.log('\n✅ Demo completed successfully!');
  console.log('\nKey improvements implemented:');
  console.log('- Enhanced error classification with user-friendly messages');
  console.log('- Exponential backoff with jitter and server-specified retry delays');
  console.log('- Intelligent cache fallback for connectivity issues');
  console.log('- Comprehensive error context and metadata');
}

// Export for potential use in tests
export { runDemo };

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}