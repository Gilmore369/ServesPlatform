/**
 * Request queue manager for optimizing API performance
 */

import { logger } from './logger';

export interface QueuedRequest<T = any> {
  id: string;
  key: string;
  request: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  priority: number;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export interface RequestQueueConfig {
  maxConcurrent: number;
  requestDelay: number;
  maxRetries: number;
  retryDelay: number;
  dedupingInterval: number;
}

export class RequestQueue {
  private queue: QueuedRequest[] = [];
  private activeRequests = new Map<string, Promise<any>>();
  private pendingRequests = new Set<string>();
  private config: RequestQueueConfig;
  private processing = false;

  constructor(config: Partial<RequestQueueConfig> = {}) {
    this.config = {
      maxConcurrent: 5,
      requestDelay: 50,
      maxRetries: 3,
      retryDelay: 1000,
      dedupingInterval: 5000,
      ...config
    };
  }

  /**
   * Add request to queue with deduplication
   */
  async enqueue<T>(
    key: string,
    request: () => Promise<T>,
    priority = 0,
    maxRetries = this.config.maxRetries
  ): Promise<T> {
    // Check if there's already an active request with the same key
    const existingRequest = this.activeRequests.get(key);
    if (existingRequest) {
      logger.debug(`Deduplicating request: ${key}`);
      return existingRequest;
    }

    // Check if there's a recent request in the queue
    const now = Date.now();
    const existingQueuedRequest = this.queue.find(
      req => req.key === key && 
      (now - req.timestamp) < this.config.dedupingInterval
    );

    if (existingQueuedRequest) {
      logger.debug(`Found existing queued request: ${key}`);
      return new Promise((resolve, reject) => {
        existingQueuedRequest.resolve = resolve;
        existingQueuedRequest.reject = reject;
      });
    }

    // Create new request
    return new Promise<T>((resolve, reject) => {
      const queuedRequest: QueuedRequest<T> = {
        id: `${key}-${now}`,
        key,
        request,
        resolve,
        reject,
        priority,
        timestamp: now,
        retries: 0,
        maxRetries
      };

      this.queue.push(queuedRequest);
      this.sortQueue();
      this.processQueue();
    });
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0 && this.pendingRequests.size < this.config.maxConcurrent) {
        const request = this.queue.shift();
        if (!request) break;

        this.executeRequest(request);
        
        // Add delay between requests
        if (this.config.requestDelay > 0) {
          await this.delay(this.config.requestDelay);
        }
      }
    } finally {
      this.processing = false;
    }

    // Continue processing if there are more requests
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), this.config.requestDelay);
    }
  }

  /**
   * Execute a single request
   */
  private async executeRequest<T>(queuedRequest: QueuedRequest<T>): Promise<void> {
    const { id, key, request, resolve, reject } = queuedRequest;

    this.pendingRequests.add(id);

    try {
      // Create and store the promise for deduplication
      const requestPromise = request();
      this.activeRequests.set(key, requestPromise);

      const result = await requestPromise;
      resolve(result);

      logger.debug(`Request completed successfully: ${key}`);
    } catch (error) {
      logger.warn(`Request failed: ${key}`, error);

      // Retry logic
      if (queuedRequest.retries < queuedRequest.maxRetries) {
        queuedRequest.retries++;
        
        // Add back to queue with delay
        setTimeout(() => {
          this.queue.unshift(queuedRequest);
          this.processQueue();
        }, this.config.retryDelay * queuedRequest.retries);

        logger.debug(`Retrying request (${queuedRequest.retries}/${queuedRequest.maxRetries}): ${key}`);
      } else {
        reject(error);
        logger.error(`Request failed after ${queuedRequest.maxRetries} retries: ${key}`, error);
      }
    } finally {
      this.pendingRequests.delete(id);
      this.activeRequests.delete(key);
    }
  }

  /**
   * Sort queue by priority (higher priority first)
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      activeRequests: this.activeRequests.size,
      pendingRequests: this.pendingRequests.size,
      isProcessing: this.processing
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue.forEach(request => {
      request.reject(new Error('Request queue cleared'));
    });
    this.queue = [];
    this.activeRequests.clear();
    this.pendingRequests.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RequestQueueConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global request queue instance
export const globalRequestQueue = new RequestQueue({
  maxConcurrent: 3, // Conservative limit for Google Apps Script
  requestDelay: 100, // 100ms between requests
  maxRetries: 2,
  retryDelay: 1000,
  dedupingInterval: 5000
});

/**
 * Utility function to queue API requests
 */
export function queueRequest<T>(
  key: string,
  request: () => Promise<T>,
  priority = 0
): Promise<T> {
  return globalRequestQueue.enqueue(key, request, priority);
}

/**
 * Hook for using request queue in React components
 */
export function useRequestQueue() {
  const enqueue = <T>(
    key: string,
    request: () => Promise<T>,
    priority = 0
  ): Promise<T> => {
    return globalRequestQueue.enqueue(key, request, priority);
  };

  const getStats = () => {
    return globalRequestQueue.getStats();
  };

  const clear = () => {
    globalRequestQueue.clear();
  };

  return {
    enqueue,
    getStats,
    clear
  };
}

export default RequestQueue;