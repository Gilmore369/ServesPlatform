/**
 * Smart Cache Strategies for Google Sheets Integration
 * Implements intelligent caching patterns based on data usage patterns and business logic
 */

import { cacheManager, DataType, TTL_CONFIG } from './cache-manager';
import { CacheMutator } from './swr-integration';
import { logger } from '../logger';

export interface CacheStrategy {
  name: string;
  description: string;
  shouldCache: (key: string, data: any) => boolean;
  getTTL: (key: string, data: any) => number;
  getInvalidationPattern: (key: string) => string[];
}

export interface SmartCacheConfig {
  enablePredictiveLoading?: boolean;
  enableDataPrefetching?: boolean;
  enableUsageAnalytics?: boolean;
  maxPredictiveEntries?: number;
}

/**
 * Usage analytics for predictive caching
 */
interface UsagePattern {
  key: string;
  accessCount: number;
  lastAccessed: number;
  averageInterval: number;
  relatedKeys: string[];
}

/**
 * Smart Cache Manager with predictive loading and usage analytics
 */
export class SmartCacheManager {
  private usagePatterns = new Map<string, UsagePattern>();
  private config: SmartCacheConfig;
  private strategies = new Map<string, CacheStrategy>();

  constructor(config: SmartCacheConfig = {}) {
    this.config = {
      enablePredictiveLoading: true,
      enableDataPrefetching: true,
      enableUsageAnalytics: true,
      maxPredictiveEntries: 100,
      ...config
    };

    this.initializeStrategies();
    this.startAnalyticsCollection();
  }

  /**
   * Initialize caching strategies
   */
  private initializeStrategies(): void {
    // Dashboard data strategy - high priority, frequent updates
    this.strategies.set('dashboard', {
      name: 'Dashboard Strategy',
      description: 'Optimized for dashboard components with real-time requirements',
      shouldCache: (key, data) => {
        return key.includes('dashboard') || key.includes('stats') || key.includes('summary');
      },
      getTTL: (key, data) => {
        // Shorter TTL for dashboard data
        return 180; // 3 minutes
      },
      getInvalidationPattern: (key) => {
        return ['dashboard:*', 'stats:*', 'summary:*'];
      }
    });

    // List data strategy - medium priority, batch loading
    this.strategies.set('list', {
      name: 'List Strategy',
      description: 'Optimized for list views with pagination',
      shouldCache: (key, data) => {
        return key.includes(':list') && Array.isArray(data);
      },
      getTTL: (key, data) => {
        const itemCount = Array.isArray(data) ? data.length : 0;
        // Longer TTL for larger lists (they change less frequently)
        return itemCount > 100 ? 900 : 300; // 15 min vs 5 min
      },
      getInvalidationPattern: (key) => {
        const table = key.split(':')[0];
        return [`${table}:list*`, `${table}:search*`];
      }
    });

    // Reference data strategy - low priority, long-term caching
    this.strategies.set('reference', {
      name: 'Reference Strategy',
      description: 'Optimized for reference data that rarely changes',
      shouldCache: (key, data) => {
        return key.includes('clientes') || key.includes('usuarios') || key.includes('config');
      },
      getTTL: (key, data) => {
        return 3600; // 1 hour
      },
      getInvalidationPattern: (key) => {
        const table = key.split(':')[0];
        return [`${table}:*`];
      }
    });

    // Real-time data strategy - high priority, short TTL
    this.strategies.set('realtime', {
      name: 'Real-time Strategy',
      description: 'Optimized for frequently changing data',
      shouldCache: (key, data) => {
        return key.includes('actividades') || key.includes('horas') || key.includes('progreso');
      },
      getTTL: (key, data) => {
        return 120; // 2 minutes
      },
      getInvalidationPattern: (key) => {
        const table = key.split(':')[0];
        return [`${table}:*`, 'dashboard:*', 'proyectos:*'];
      }
    });

    // Report data strategy - medium priority, scheduled invalidation
    this.strategies.set('report', {
      name: 'Report Strategy',
      description: 'Optimized for report data with scheduled updates',
      shouldCache: (key, data) => {
        return key.includes('report') || key.includes('analytics');
      },
      getTTL: (key, data) => {
        // Reports can be cached longer, especially if they're expensive to generate
        return 1800; // 30 minutes
      },
      getInvalidationPattern: (key) => {
        return ['report:*', 'analytics:*'];
      }
    });
  }

  /**
   * Smart cache set with strategy selection
   */
  async smartSet<T>(key: string, data: T, context?: any): Promise<void> {
    const strategy = this.selectStrategy(key, data);
    const ttl = strategy ? strategy.getTTL(key, data) : TTL_CONFIG.list;

    await cacheManager.set(key, data, ttl);

    // Record usage pattern
    if (this.config.enableUsageAnalytics) {
      this.recordUsage(key);
    }

    // Trigger predictive loading if enabled
    if (this.config.enablePredictiveLoading) {
      await this.triggerPredictiveLoading(key, data);
    }

    logger.debug('Smart cache set', {
      key,
      strategy: strategy?.name || 'default',
      ttl,
      dataSize: JSON.stringify(data).length
    });
  }

  /**
   * Smart cache get with usage tracking
   */
  async smartGet<T>(key: string): Promise<T | null> {
    const data = await cacheManager.get<T>(key);

    if (data && this.config.enableUsageAnalytics) {
      this.recordUsage(key);
    }

    return data;
  }

  /**
   * Predictive cache loading based on usage patterns
   */
  async triggerPredictiveLoading(accessedKey: string, data: any): Promise<void> {
    const pattern = this.usagePatterns.get(accessedKey);
    if (!pattern || pattern.relatedKeys.length === 0) {
      return;
    }

    // Load related data that's likely to be accessed next
    const predictions = this.getPredictiveKeys(accessedKey);
    
    for (const predictedKey of predictions.slice(0, 3)) { // Limit to top 3 predictions
      const cachedData = await cacheManager.get(predictedKey);
      if (!cachedData) {
        // Trigger background loading
        this.backgroundLoad(predictedKey);
      }
    }

    logger.debug('Predictive loading triggered', {
      accessedKey,
      predictions: predictions.slice(0, 3)
    });
  }

  /**
   * Background loading for predictive caching
   */
  private async backgroundLoad(key: string): Promise<void> {
    try {
      // This would typically trigger the actual data loading
      // For now, we'll just log the intent
      logger.debug('Background loading initiated', { key });
      
      // In a real implementation, this would:
      // 1. Parse the key to understand what data to load
      // 2. Create the appropriate CRUD operation
      // 3. Execute the operation in the background
      // 4. Store the result in cache
    } catch (error) {
      logger.warn('Background loading failed', { key, error });
    }
  }

  /**
   * Get predictive keys based on usage patterns
   */
  private getPredictiveKeys(key: string): string[] {
    const pattern = this.usagePatterns.get(key);
    if (!pattern) return [];

    // Sort related keys by access frequency and recency
    return pattern.relatedKeys
      .map(relatedKey => {
        const relatedPattern = this.usagePatterns.get(relatedKey);
        const score = relatedPattern ? 
          (relatedPattern.accessCount * 0.7) + 
          (Date.now() - relatedPattern.lastAccessed < 300000 ? 0.3 : 0) : 0;
        return { key: relatedKey, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(item => item.key);
  }

  /**
   * Select appropriate caching strategy
   */
  private selectStrategy(key: string, data: any): CacheStrategy | null {
    for (const strategy of this.strategies.values()) {
      if (strategy.shouldCache(key, data)) {
        return strategy;
      }
    }
    return null;
  }

  /**
   * Record usage pattern for analytics
   */
  private recordUsage(key: string): void {
    const now = Date.now();
    const existing = this.usagePatterns.get(key);

    if (existing) {
      const timeSinceLastAccess = now - existing.lastAccessed;
      const newAverageInterval = (existing.averageInterval + timeSinceLastAccess) / 2;

      this.usagePatterns.set(key, {
        ...existing,
        accessCount: existing.accessCount + 1,
        lastAccessed: now,
        averageInterval: newAverageInterval
      });
    } else {
      this.usagePatterns.set(key, {
        key,
        accessCount: 1,
        lastAccessed: now,
        averageInterval: 0,
        relatedKeys: []
      });
    }

    // Update related keys based on temporal proximity
    this.updateRelatedKeys(key, now);
  }

  /**
   * Update related keys based on access patterns
   */
  private updateRelatedKeys(currentKey: string, timestamp: number): void {
    const timeWindow = 30000; // 30 seconds
    
    for (const [otherKey, pattern] of this.usagePatterns.entries()) {
      if (otherKey === currentKey) continue;
      
      // If accessed within time window, consider them related
      if (Math.abs(timestamp - pattern.lastAccessed) < timeWindow) {
        const currentPattern = this.usagePatterns.get(currentKey)!;
        const otherPattern = this.usagePatterns.get(otherKey)!;
        
        // Add bidirectional relationship
        if (!currentPattern.relatedKeys.includes(otherKey)) {
          currentPattern.relatedKeys.push(otherKey);
        }
        if (!otherPattern.relatedKeys.includes(currentKey)) {
          otherPattern.relatedKeys.push(currentKey);
        }
      }
    }
  }

  /**
   * Start analytics collection
   */
  private startAnalyticsCollection(): void {
    if (!this.config.enableUsageAnalytics) return;

    // Cleanup old patterns every hour
    setInterval(() => {
      this.cleanupOldPatterns();
    }, 60 * 60 * 1000);

    // Generate analytics report every 6 hours
    setInterval(() => {
      this.generateAnalyticsReport();
    }, 6 * 60 * 60 * 1000);
  }

  /**
   * Cleanup old usage patterns
   */
  private cleanupOldPatterns(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    let cleanedCount = 0;

    for (const [key, pattern] of this.usagePatterns.entries()) {
      if (pattern.lastAccessed < cutoffTime && pattern.accessCount < 5) {
        this.usagePatterns.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Usage patterns cleanup completed', {
        cleaned: cleanedCount,
        remaining: this.usagePatterns.size
      });
    }
  }

  /**
   * Generate analytics report
   */
  private generateAnalyticsReport(): void {
    const patterns = Array.from(this.usagePatterns.values());
    const topPatterns = patterns
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    const report = {
      totalPatterns: patterns.length,
      topAccessedKeys: topPatterns.map(p => ({
        key: p.key,
        accessCount: p.accessCount,
        averageInterval: Math.round(p.averageInterval / 1000) // Convert to seconds
      })),
      cacheStats: cacheManager.getStats(),
      timestamp: new Date().toISOString()
    };

    logger.info('Cache analytics report', report);
  }

  /**
   * Get usage analytics
   */
  getAnalytics() {
    const patterns = Array.from(this.usagePatterns.values());
    
    return {
      totalPatterns: patterns.length,
      mostAccessed: patterns
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 10)
        .map(p => ({
          key: p.key,
          accessCount: p.accessCount,
          lastAccessed: new Date(p.lastAccessed).toISOString(),
          relatedKeysCount: p.relatedKeys.length
        })),
      cacheStats: cacheManager.getStats(),
      strategies: Array.from(this.strategies.keys())
    };
  }

  /**
   * Optimize cache based on usage patterns
   */
  async optimizeCache(): Promise<void> {
    const patterns = Array.from(this.usagePatterns.values());
    
    // Identify frequently accessed data that should have longer TTL
    const frequentlyAccessed = patterns
      .filter(p => p.accessCount > 10 && p.averageInterval < 300000) // Accessed >10 times, avg interval <5min
      .map(p => p.key);

    // Identify rarely accessed data that should be evicted
    const rarelyAccessed = patterns
      .filter(p => p.accessCount < 3 && (Date.now() - p.lastAccessed) > 3600000) // <3 accesses, >1hr old
      .map(p => p.key);

    // Extend TTL for frequently accessed data
    for (const key of frequentlyAccessed) {
      const data = await cacheManager.get(key);
      if (data) {
        await cacheManager.set(key, data, TTL_CONFIG.static); // Use longer TTL
      }
    }

    // Remove rarely accessed data
    for (const key of rarelyAccessed) {
      await cacheManager.invalidate(key);
    }

    logger.info('Cache optimization completed', {
      extendedTTL: frequentlyAccessed.length,
      evicted: rarelyAccessed.length
    });
  }

  /**
   * Preload critical data based on usage patterns
   */
  async preloadCriticalData(): Promise<void> {
    const criticalKeys = this.identifyCriticalKeys();
    
    for (const key of criticalKeys) {
      const cachedData = await cacheManager.get(key);
      if (!cachedData) {
        await this.backgroundLoad(key);
      }
    }

    logger.info('Critical data preloading initiated', {
      keys: criticalKeys
    });
  }

  /**
   * Identify critical keys that should always be cached
   */
  private identifyCriticalKeys(): string[] {
    const patterns = Array.from(this.usagePatterns.values());
    
    return patterns
      .filter(p => 
        p.accessCount > 5 && // Accessed multiple times
        p.averageInterval < 600000 && // Average interval < 10 minutes
        (p.key.includes('dashboard') || p.key.includes('user') || p.key.includes('config'))
      )
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 20) // Top 20 critical keys
      .map(p => p.key);
  }
}

// Export singleton instance
export const smartCacheManager = new SmartCacheManager({
  enablePredictiveLoading: true,
  enableDataPrefetching: true,
  enableUsageAnalytics: true,
  maxPredictiveEntries: 50
});

/**
 * Cache warming utilities for application startup
 */
export class CacheWarmer {
  /**
   * Warm up cache with essential data on application start
   */
  static async warmupEssentialData(): Promise<void> {
    const essentialOperations = [
      { table: 'Usuarios', operation: 'list' as const, limit: 50 },
      { table: 'Proyectos', operation: 'list' as const, limit: 100 },
      { table: 'Materiales', operation: 'list' as const, limit: 200 },
      { table: 'Clientes', operation: 'list' as const, limit: 50 }
    ];

    logger.info('Starting cache warmup');

    for (const op of essentialOperations) {
      try {
        // This would trigger the actual loading in a real implementation
        const key = `${op.table}:list:limit:${op.limit}`;
        logger.debug('Warming up cache', { key });
        
        // In practice, this would execute the operation and cache the result
        // await smartCacheManager.smartSet(key, data);
      } catch (error) {
        logger.warn('Cache warmup failed for operation', { operation: op, error });
      }
    }

    logger.info('Cache warmup completed');
  }

  /**
   * Warm up user-specific data
   */
  static async warmupUserData(userId: string): Promise<void> {
    const userOperations = [
      `usuarios:get:${userId}`,
      `proyectos:list:responsable_id:${userId}`,
      `actividades:list:responsable_id:${userId}`
    ];

    for (const key of userOperations) {
      try {
        // Trigger background loading for user-specific data
        logger.debug('Warming up user data', { key, userId });
      } catch (error) {
        logger.warn('User data warmup failed', { key, userId, error });
      }
    }
  }
}

export default SmartCacheManager;