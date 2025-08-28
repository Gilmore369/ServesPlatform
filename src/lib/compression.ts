/**
 * Data compression utilities for large transfers
 * Implements requirement 2.1 - optimize data loading performance
 */

import { logger } from './logger';

export interface CompressionConfig {
  enabled: boolean;
  threshold: number; // Minimum size in bytes to trigger compression
  algorithm: 'gzip' | 'deflate';
  level: number; // Compression level 1-9
}

export interface CompressionResult {
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  data: string;
}

/**
 * Default compression configuration
 */
export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  enabled: true,
  threshold: 1024, // 1KB threshold
  algorithm: 'gzip',
  level: 6 // Balanced compression
};

/**
 * Compression service for API responses and large data transfers
 */
export class CompressionService {
  private config: CompressionConfig;

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = { ...DEFAULT_COMPRESSION_CONFIG, ...config };
  }

  /**
   * Compress data if it exceeds the threshold
   */
  async compressData(data: any): Promise<CompressionResult> {
    const startTime = performance.now();
    
    try {
      // Convert data to JSON string
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
      const originalSize = new Blob([jsonString]).size;

      // Check if compression should be applied
      if (!this.config.enabled || originalSize < this.config.threshold) {
        return {
          compressed: false,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1,
          data: jsonString
        };
      }

      // Apply compression using browser's CompressionStream API
      const compressedData = await this.performCompression(jsonString);
      const compressedSize = new Blob([compressedData]).size;
      const compressionRatio = originalSize / compressedSize;

      const duration = performance.now() - startTime;
      
      logger.debug('Data compression completed', {
        originalSize,
        compressedSize,
        compressionRatio: compressionRatio.toFixed(2),
        duration: `${duration.toFixed(2)}ms`,
        algorithm: this.config.algorithm
      });

      return {
        compressed: true,
        originalSize,
        compressedSize,
        compressionRatio,
        data: compressedData
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      
      logger.error('Compression failed, returning uncompressed data', error, {
        duration: `${duration.toFixed(2)}ms`
      });

      // Fallback to uncompressed data
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
      const originalSize = new Blob([jsonString]).size;

      return {
        compressed: false,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        data: jsonString
      };
    }
  }

  /**
   * Decompress data if it was compressed
   */
  async decompressData(compressedData: string, wasCompressed: boolean): Promise<string> {
    if (!wasCompressed) {
      return compressedData;
    }

    const startTime = performance.now();

    try {
      const decompressedData = await this.performDecompression(compressedData);
      const duration = performance.now() - startTime;
      
      logger.debug('Data decompression completed', {
        duration: `${duration.toFixed(2)}ms`,
        algorithm: this.config.algorithm
      });

      return decompressedData;

    } catch (error) {
      const duration = performance.now() - startTime;
      
      logger.error('Decompression failed', error, {
        duration: `${duration.toFixed(2)}ms`
      });

      throw new Error(`Decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform actual compression using browser APIs
   */
  private async performCompression(data: string): Promise<string> {
    // Check if CompressionStream is available (modern browsers)
    if (typeof CompressionStream !== 'undefined') {
      return this.compressWithStream(data);
    }

    // Fallback to base64 encoding for older browsers
    return this.compressWithBase64(data);
  }

  /**
   * Perform actual decompression using browser APIs
   */
  private async performDecompression(data: string): Promise<string> {
    // Check if DecompressionStream is available (modern browsers)
    if (typeof DecompressionStream !== 'undefined') {
      return this.decompressWithStream(data);
    }

    // Fallback to base64 decoding for older browsers
    return this.decompressWithBase64(data);
  }

  /**
   * Compress using modern CompressionStream API
   */
  private async compressWithStream(data: string): Promise<string> {
    const stream = new CompressionStream(this.config.algorithm);
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    // Write data to compression stream
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(data));
    await writer.close();

    // Read compressed data
    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    // Convert to base64 for transport
    const compressedArray = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      compressedArray.set(chunk, offset);
      offset += chunk.length;
    }

    return btoa(String.fromCharCode(...compressedArray));
  }

  /**
   * Decompress using modern DecompressionStream API
   */
  private async decompressWithStream(data: string): Promise<string> {
    const stream = new DecompressionStream(this.config.algorithm);
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    // Convert from base64 and write to decompression stream
    const compressedData = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    await writer.write(compressedData);
    await writer.close();

    // Read decompressed data
    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    // Convert back to string
    const decompressedArray = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      decompressedArray.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder();
    return decoder.decode(decompressedArray);
  }

  /**
   * Fallback compression using base64 (minimal compression)
   */
  private async compressWithBase64(data: string): Promise<string> {
    // Simple base64 encoding as fallback (not actual compression)
    return btoa(unescape(encodeURIComponent(data)));
  }

  /**
   * Fallback decompression using base64
   */
  private async decompressWithBase64(data: string): Promise<string> {
    // Simple base64 decoding as fallback
    return decodeURIComponent(escape(atob(data)));
  }

  /**
   * Update compression configuration
   */
  updateConfig(updates: Partial<CompressionConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): CompressionConfig {
    return { ...this.config };
  }

  /**
   * Get compression statistics for monitoring
   */
  getCompressionStats(results: CompressionResult[]): {
    totalRequests: number;
    compressedRequests: number;
    averageCompressionRatio: number;
    totalBytesSaved: number;
  } {
    const compressedResults = results.filter(r => r.compressed);
    
    return {
      totalRequests: results.length,
      compressedRequests: compressedResults.length,
      averageCompressionRatio: compressedResults.length > 0 
        ? compressedResults.reduce((sum, r) => sum + r.compressionRatio, 0) / compressedResults.length
        : 1,
      totalBytesSaved: compressedResults.reduce((sum, r) => sum + (r.originalSize - r.compressedSize), 0)
    };
  }
}

// Export singleton instance
export const compressionService = new CompressionService();

/**
 * Utility function to compress API response data
 */
export async function compressAPIResponse(data: any): Promise<{
  data: string;
  compressed: boolean;
  metadata: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
}> {
  const result = await compressionService.compressData(data);
  
  return {
    data: result.data,
    compressed: result.compressed,
    metadata: {
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      compressionRatio: result.compressionRatio
    }
  };
}

/**
 * Utility function to decompress API response data
 */
export async function decompressAPIResponse(
  data: string, 
  compressed: boolean
): Promise<any> {
  const decompressedString = await compressionService.decompressData(data, compressed);
  
  try {
    return JSON.parse(decompressedString);
  } catch (error) {
    logger.error('Failed to parse decompressed JSON data', error);
    return decompressedString;
  }
}