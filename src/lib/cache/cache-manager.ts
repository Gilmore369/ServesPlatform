/**
 * Intelligent Cache Manager with TTL strategies differentiated by data type
 * Supports cache invalidation based on write operations
 */

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize: number;
  strategy: 'lru' | 'fifo';
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export type DataType = 
  | 'list' 
  | 'record' 
  | 'static' 
  | 'user' 
  | 'project' 
  | 'material' 
  | 'activity'
  | 'report';

/**
 * TTL Configuration by data type (in seconds)
 */
export const TTL_CONFIG: Record<DataType, number> = {
  list: 300,        // 5 minutes - Lists change frequently
  record: 600,      // 10 minutes - Individual records
  static: 3600,     // 1 hour - Static/reference data
  user: 1800,       // 30 minutes - User data
  project: 900,     // 15 minutes - Project data
  material: 1200,   // 20 minutes - Material data
  activity: 600,    // 10 minutes - Activity data
  report: 1800      // 30 minutes - Report data
};

/**
 * Cache invalidation patterns by operation type
 */
export const INVALIDATION_PATTERNS: Record<string, string[]> = {
  // When creating/updating/deleting projects
  'proyectos': [
    'proyectos:*',
    'dashboard:*',
    'reports:proyectos:*'
  ],
  // When creating/updating/deleting materials
  'materiales': [
    'materiales:*',
    'dashboard:*',
    'reports:materiales:*'
  ],
  // When creating/updating/deleting users
  'usuarios': [
    'usuarios:*',
    'personal:*',
    'dashboard:*'
  ],
  // When creating/updating/deleting activities
  'actividades': [
    'actividades:*',
    'proyectos:*',
    'dashboard:*',
    'reports:actividades:*'
  ],
  // When creating/updating/deleting clients
  'clientes': [
    'clientes:*',
    'proyectos:*',
    'dashboard:*'
  ]
};

export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
  private config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 600, // Default 10 minutes
      maxSize: 1000,
      strategy: 'lru',
      ...config
    };

    // Start cleanup interval every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get data from cache with automatic TTL validation
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      this.updateHitRate();
      return null;
    }

    // Update access statistics for LRU
    entry.accessCount++;
    entry.lastAccessed = now;
    
    this.stats.hits++;
    this.updateHitRate();
    
    console.log(`🎯 Cache HIT: ${key}`, {
      age: Math.round((now - entry.timestamp) / 1000),
      ttl: entry.ttl,
      accessCount: entry.accessCount
    });

    return entry.data;
  }

  /**
   * Set data in cache with intelligent TTL based on data type
   */
  async set<T>(key: string, value: T, customTtl?: number): Promise<void> {
    const dataType = this.inferDataType(key);
    const ttl = customTtl || TTL_CONFIG[dataType] || this.config.ttl;
    const now = Date.now();

    // Enforce cache size limit - evict until we have space
    while (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: now,
      ttl,
      accessCount: 1,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;

    console.log(`💾 Cache SET: ${key}`, {
      dataType,
      ttl,
      size: this.cache.size
    });
  }

  /**
   * Invalidate cache entries based on patterns
   */
  async invalidate(pattern: string): Promise<number> {
    let invalidatedCount = 0;
    const regex = new RegExp(pattern.replace('*', '.*'));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    this.stats.size = this.cache.size;

    if (invalidatedCount > 0) {
      console.log(`🗑️ Cache INVALIDATED: ${pattern}`, {
        count: invalidatedCount,
        remaining: this.cache.size
      });
    }

    return invalidatedCount;
  }

  /**
   * Invalidate cache based on write operations
   */
  async invalidateByOperation(table: string, operation: 'create' | 'update' | 'delete'): Promise<void> {
    const patterns = INVALIDATION_PATTERNS[table.toLowerCase()] || [`${table.toLowerCase()}:*`];
    
    console.log(`🔄 Cache invalidation triggered by ${operation} on ${table}`, {
      patterns
    });

    for (const pattern of patterns) {
      await this.invalidate(pattern);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.stats.size = 0;
    
    console.log(`🧹 Cache CLEARED`, {
      previousSize,
      currentSize: 0
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache entry info for debugging
   */
  getEntryInfo(key: string): { exists: boolean; age?: number; ttl?: number; accessCount?: number } {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return { exists: false };
    }

    const now = Date.now();
    return {
      exists: true,
      age: Math.round((now - entry.timestamp) / 1000),
      ttl: entry.ttl,
      accessCount: entry.accessCount
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.stats.size = this.cache.size;
      console.log(`🧽 Cache cleanup completed`, {
        cleaned: cleanedCount,
        remaining: this.cache.size
      });
    }
  }

  /**
   * Evict oldest entries based on strategy
   */
  private evictOldest(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string;

    if (this.config.strategy === 'lru') {
      // Evict least recently used
      let oldestAccess = Date.now();
      keyToEvict = '';
      
      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccessed < oldestAccess) {
          oldestAccess = entry.lastAccessed;
          keyToEvict = key;
        }
      }
    } else {
      // FIFO - evict first inserted (oldest timestamp)
      let oldestTimestamp = Date.now();
      keyToEvict = '';
      
      for (const [key, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
          keyToEvict = key;
        }
      }
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      console.log(`⚡ Cache eviction (${this.config.strategy}): ${keyToEvict}`);
    }
  }

  /**
   * Infer data type from cache key
   */
  private inferDataType(key: string): DataType {
    const keyLower = key.toLowerCase();
    
    if (keyLower.includes('list') || keyLower.includes('all')) return 'list';
    if (keyLower.includes('user') || keyLower.includes('usuario')) return 'user';
    if (keyLower.includes('project') || keyLower.includes('proyecto')) return 'project';
    if (keyLower.includes('material')) return 'material';
    if (keyLower.includes('actividad') || keyLower.includes('activity')) return 'activity';
    if (keyLower.includes('report') || keyLower.includes('reporte')) return 'report';
    if (keyLower.includes('static') || keyLower.includes('config')) return 'static';
    
    // Check if it's a single record (contains ID pattern)
    if (/:\d+$/.test(key) || /:[a-f0-9-]{36}$/.test(key)) return 'record';
    
    return 'list'; // Default to list
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Destroy cache manager and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Export singleton instance
export const cacheManager = new CacheManager({
  maxSize: 2000,
  strategy: 'lru'
});