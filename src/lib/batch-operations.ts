/**
 * Batch operations utility for optimizing API performance
 */

import { apiClient } from './apiClient';
import { APIResponse } from './types';
import { logger } from './logger';

export interface BatchOperation {
  id: string;
  table: string;
  operation: 'create' | 'update' | 'delete';
  data?: any;
  itemId?: string;
}

export interface BatchResult<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
}

export class BatchProcessor {
  private queue: BatchOperation[] = [];
  private processing = false;
  private batchSize = 10;
  private batchDelay = 100; // ms between batches

  constructor(batchSize = 10, batchDelay = 100) {
    this.batchSize = batchSize;
    this.batchDelay = batchDelay;
  }

  /**
   * Add operation to batch queue
   */
  addOperation(operation: BatchOperation): void {
    this.queue.push(operation);
  }

  /**
   * Add multiple operations to batch queue
   */
  addOperations(operations: BatchOperation[]): void {
    this.queue.push(...operations);
  }

  /**
   * Process all queued operations in batches
   */
  async processBatch(): Promise<BatchResult[]> {
    if (this.processing) {
      throw new Error('Batch processing already in progress');
    }

    this.processing = true;
    const results: BatchResult[] = [];

    try {
      // Process operations in chunks
      for (let i = 0; i < this.queue.length; i += this.batchSize) {
        const batch = this.queue.slice(i, i + this.batchSize);
        const batchResults = await this.processBatchChunk(batch);
        results.push(...batchResults);

        // Add delay between batches to avoid overwhelming the API
        if (i + this.batchSize < this.queue.length) {
          await this.delay(this.batchDelay);
        }
      }

      // Clear the queue after processing
      this.queue = [];
      
      return results;
    } catch (error) {
      logger.error('Batch processing failed', error);
      throw error;
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a single batch chunk
   */
  private async processBatchChunk(batch: BatchOperation[]): Promise<BatchResult[]> {
    const promises = batch.map(async (operation): Promise<BatchResult> => {
      try {
        let result: APIResponse;

        switch (operation.operation) {
          case 'create':
            result = await apiClient.create(operation.table, operation.data);
            break;
          case 'update':
            if (!operation.itemId) {
              throw new Error('Item ID required for update operation');
            }
            result = await apiClient.update(operation.table, operation.itemId, operation.data);
            break;
          case 'delete':
            if (!operation.itemId) {
              throw new Error('Item ID required for delete operation');
            }
            result = await apiClient.delete(operation.table, operation.itemId);
            break;
          default:
            throw new Error(`Unsupported operation: ${operation.operation}`);
        }

        return {
          id: operation.id,
          success: result.ok,
          data: result.data,
          error: result.ok ? undefined : result.message
        };
      } catch (error) {
        return {
          id: operation.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Check if batch is currently processing
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance for global use
export const globalBatchProcessor = new BatchProcessor();

/**
 * Utility functions for common batch operations
 */

export async function batchCreateItems<T>(
  table: string,
  items: Partial<T>[],
  batchSize = 10
): Promise<BatchResult[]> {
  const processor = new BatchProcessor(batchSize);
  
  const operations: BatchOperation[] = items.map((item, index) => ({
    id: `create-${index}`,
    table,
    operation: 'create',
    data: item
  }));

  processor.addOperations(operations);
  return processor.processBatch();
}

export async function batchUpdateItems<T>(
  table: string,
  updates: Array<{ id: string; data: Partial<T> }>,
  batchSize = 10
): Promise<BatchResult[]> {
  const processor = new BatchProcessor(batchSize);
  
  const operations: BatchOperation[] = updates.map((update, index) => ({
    id: `update-${index}`,
    table,
    operation: 'update',
    itemId: update.id,
    data: update.data
  }));

  processor.addOperations(operations);
  return processor.processBatch();
}

export async function batchDeleteItems(
  table: string,
  ids: string[],
  batchSize = 10
): Promise<BatchResult[]> {
  const processor = new BatchProcessor(batchSize);
  
  const operations: BatchOperation[] = ids.map((id, index) => ({
    id: `delete-${index}`,
    table,
    operation: 'delete',
    itemId: id
  }));

  processor.addOperations(operations);
  return processor.processBatch();
}

/**
 * Hook for using batch operations in React components
 */
export function useBatchOperations() {
  const processor = new BatchProcessor();

  const addOperation = (operation: BatchOperation) => {
    processor.addOperation(operation);
  };

  const addOperations = (operations: BatchOperation[]) => {
    processor.addOperations(operations);
  };

  const processBatch = async () => {
    return processor.processBatch();
  };

  const getQueueSize = () => {
    return processor.getQueueSize();
  };

  const clearQueue = () => {
    processor.clearQueue();
  };

  const isProcessing = () => {
    return processor.isProcessing();
  };

  return {
    addOperation,
    addOperations,
    processBatch,
    getQueueSize,
    clearQueue,
    isProcessing
  };
}

export default BatchProcessor;