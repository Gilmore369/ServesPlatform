import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CacheManager, CacheConfig } from '@/lib/cache/cache-manager'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
})

describe('CacheManager', () => {
  let cacheManager: CacheManager
  let mockConfig: CacheConfig

  beforeEach(() => {
    vi.clearAllMocks()
    mockConfig = {
      ttl: 300, // 5 minutes
      maxSize: 100,
      strategy: 'lru'
    }
    cacheManager = new CacheManager(mockConfig)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Basic Cache Operations', () => {
    it('should store and retrieve data', async () => {
      const key = 'test-key'
      const data = { id: 1, name: 'Test Data' }

      await cacheManager.set(key, data)
      const retrieved = await cacheManager.get(key)

      expect(retrieved).toEqual(data)
    })

    it('should return null for non-existent keys', async () => {
      const result = await cacheManager.get('non-existent-key')
      expect(result).toBeNull()
    })

    it('should handle null and undefined values', async () => {
      await cacheManager.set('null-key', null)
      await cacheManager.set('undefined-key', undefined)

      const nullResult = await cacheManager.get('null-key')
      const undefinedResult = await cacheManager.get('undefined-key')

      expect(nullResult).toBeNull()
      expect(undefinedResult).toBeNull()
    })
  })

  describe('TTL (Time To Live)', () => {
    it('should respect custom TTL', async () => {
      const key = 'ttl-test'
      const data = { message: 'This will expire' }
      const customTTL = 1 // 1 second

      await cacheManager.set(key, data, customTTL)

      // Should be available immediately
      let result = await cacheManager.get(key)
      expect(result).toEqual(data)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Should be expired
      result = await cacheManager.get(key)
      expect(result).toBeNull()
    })

    it('should use default TTL when not specified', async () => {
      const key = 'default-ttl-test'
      const data = { message: 'Default TTL' }

      await cacheManager.set(key, data)

      // Should be available
      const result = await cacheManager.get(key)
      expect(result).toEqual(data)
    })

    it('should handle expired entries gracefully', async () => {
      // Mock localStorage to return expired data
      const expiredEntry = {
        data: { message: 'Expired' },
        timestamp: Date.now() - 10000, // 10 seconds ago
        ttl: 5 // 5 seconds TTL
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(expiredEntry))

      const result = await cacheManager.get('expired-key')
      expect(result).toBeNull()
    })
  })

  describe('Cache Size Management', () => {
    it('should enforce maximum cache size with LRU strategy', async () => {
      const smallCacheManager = new CacheManager({
        ttl: 300,
        maxSize: 3,
        strategy: 'lru'
      })

      // Fill cache to capacity
      await smallCacheManager.set('key1', 'data1')
      await smallCacheManager.set('key2', 'data2')
      await smallCacheManager.set('key3', 'data3')

      // All should be present
      expect(await smallCacheManager.get('key1')).toBe('data1')
      expect(await smallCacheManager.get('key2')).toBe('data2')
      expect(await smallCacheManager.get('key3')).toBe('data3')

      // Add one more - should evict least recently used
      await smallCacheManager.set('key4', 'data4')

      // key1 should be evicted (least recently used)
      expect(await smallCacheManager.get('key1')).toBeNull()
      expect(await smallCacheManager.get('key2')).toBe('data2')
      expect(await smallCacheManager.get('key3')).toBe('data3')
      expect(await smallCacheManager.get('key4')).toBe('data4')
    })

    it('should update LRU order on access', async () => {
      const smallCacheManager = new CacheManager({
        ttl: 300,
        maxSize: 3,
        strategy: 'lru'
      })

      await smallCacheManager.set('key1', 'data1')
      await smallCacheManager.set('key2', 'data2')
      await smallCacheManager.set('key3', 'data3')

      // Access key1 to make it recently used
      await smallCacheManager.get('key1')

      // Add new key - should evict key2 (now least recently used)
      await smallCacheManager.set('key4', 'data4')

      expect(await smallCacheManager.get('key1')).toBe('data1') // Should still be there
      expect(await smallCacheManager.get('key2')).toBeNull() // Should be evicted
      expect(await smallCacheManager.get('key3')).toBe('data3')
      expect(await smallCacheManager.get('key4')).toBe('data4')
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate cache by pattern', async () => {
      await cacheManager.set('users:list:page:1', ['user1', 'user2'])
      await cacheManager.set('users:list:page:2', ['user3', 'user4'])
      await cacheManager.set('users:get:123', { id: 123, name: 'User 123' })
      await cacheManager.set('projects:list:page:1', ['project1'])

      await cacheManager.invalidate('users:list:*')

      // Users list should be invalidated
      expect(await cacheManager.get('users:list:page:1')).toBeNull()
      expect(await cacheManager.get('users:list:page:2')).toBeNull()

      // Other users data should remain
      expect(await cacheManager.get('users:get:123')).toEqual({ id: 123, name: 'User 123' })

      // Other tables should remain
      expect(await cacheManager.get('projects:list:page:1')).toEqual(['project1'])
    })

    it('should invalidate by operation type', async () => {
      await cacheManager.set('Materiales:list:page:1', ['material1'])
      await cacheManager.set('Materiales:list:page:2', ['material2'])
      await cacheManager.set('Materiales:get:123', { id: 123, name: 'Material 123' })

      await cacheManager.invalidateByOperation('Materiales', 'create')

      // All Materiales cache should be invalidated after create operation
      expect(await cacheManager.get('Materiales:list:page:1')).toBeNull()
      expect(await cacheManager.get('Materiales:list:page:2')).toBeNull()
      expect(await cacheManager.get('Materiales:get:123')).toBeNull()
    })

    it('should clear all cache', async () => {
      await cacheManager.set('key1', 'data1')
      await cacheManager.set('key2', 'data2')
      await cacheManager.set('key3', 'data3')

      await cacheManager.clear()

      expect(await cacheManager.get('key1')).toBeNull()
      expect(await cacheManager.get('key2')).toBeNull()
      expect(await cacheManager.get('key3')).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      // Should not throw error
      await expect(cacheManager.set('key', 'data')).resolves.toBeUndefined()
    })

    it('should handle JSON parse errors', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json')

      const result = await cacheManager.get('invalid-key')
      expect(result).toBeNull()
    })

    it('should handle localStorage getItem errors', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage access denied')
      })

      const result = await cacheManager.get('error-key')
      expect(result).toBeNull()
    })
  })

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      await cacheManager.set('stats-key', 'stats-data')

      // Hit
      await cacheManager.get('stats-key')
      
      // Miss
      await cacheManager.get('non-existent-key')

      const stats = cacheManager.getStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBe(0.5)
    })

    it('should track cache size', async () => {
      await cacheManager.set('size-key-1', 'data1')
      await cacheManager.set('size-key-2', 'data2')

      const stats = cacheManager.getStats()
      expect(stats.size).toBe(2)
    })
  })

  describe('Complex Data Types', () => {
    it('should handle arrays', async () => {
      const arrayData = [1, 2, 3, { nested: 'object' }]
      await cacheManager.set('array-key', arrayData)

      const result = await cacheManager.get('array-key')
      expect(result).toEqual(arrayData)
    })

    it('should handle nested objects', async () => {
      const complexObject = {
        id: 1,
        user: {
          name: 'John',
          preferences: {
            theme: 'dark',
            notifications: true
          }
        },
        tags: ['important', 'urgent'],
        metadata: null
      }

      await cacheManager.set('complex-key', complexObject)

      const result = await cacheManager.get('complex-key')
      expect(result).toEqual(complexObject)
    })

    it('should handle dates correctly', async () => {
      const dateData = {
        created: new Date('2024-01-01T00:00:00Z'),
        updated: new Date('2024-01-02T12:00:00Z')
      }

      await cacheManager.set('date-key', dateData)

      const result = await cacheManager.get('date-key')
      
      // Dates will be serialized as strings
      expect(result.created).toBe('2024-01-01T00:00:00.000Z')
      expect(result.updated).toBe('2024-01-02T12:00:00.000Z')
    })
  })
})