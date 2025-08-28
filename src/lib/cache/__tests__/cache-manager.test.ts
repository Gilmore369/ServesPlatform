/**
 * Tests for the intelligent cache manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager, TTL_CONFIG, INVALIDATION_PATTERNS } from '../cache-manager';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager({
      maxSize: 10,
      strategy: 'lru'
    });
  });

  afterEach(() => {
    cacheManager.destroy();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cache entries', async () => {
      const testData = { id: 1, name: 'Test' };
      
      await cacheManager.set('test:key', testData);
      const result = await cacheManager.get('test:key');
      
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cacheManager.get('non:existent');
      expect(result).toBeNull();
    });

    it('should respect TTL and expire entries', async () => {
      const testData = { id: 1, name: 'Test' };
      
      // Set with 1 second TTL
      await cacheManager.set('test:key', testData, 1);
      
      // Should be available immediately
      let result = await cacheManager.get('test:key');
      expect(result).toEqual(testData);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be expired
      result = await cacheManager.get('test:key');
      expect(result).toBeNull();
    });
  });

  describe('TTL Configuration by Data Type', () => {
    it('should use correct TTL for different data types', async () => {
      const testData = { id: 1, name: 'Test' };
      
      // Test list data type (should use 300s TTL)
      await cacheManager.set('materiales:list', testData);
      const entry = cacheManager.getEntryInfo('materiales:list');
      expect(entry.exists).toBe(true);
      expect(entry.ttl).toBe(TTL_CONFIG.list);
      
      // Test material data type (should use 1200s TTL for materials)
      await cacheManager.set('materiales:get:123', testData);
      const recordEntry = cacheManager.getEntryInfo('materiales:get:123');
      expect(recordEntry.exists).toBe(true);
      expect(recordEntry.ttl).toBe(TTL_CONFIG.material);
    });

    it('should infer data types correctly', async () => {
      const testData = { id: 1, name: 'Test' };
      
      // Test various key patterns - usuarios:list should be inferred as 'list' type, not 'user'
      await cacheManager.set('usuarios:list', testData);
      expect(cacheManager.getEntryInfo('usuarios:list').ttl).toBe(TTL_CONFIG.list);
      
      // Test project record - should be inferred as 'project' type
      await cacheManager.set('proyectos:get:456', testData);
      expect(cacheManager.getEntryInfo('proyectos:get:456').ttl).toBe(TTL_CONFIG.project);
      
      await cacheManager.set('config:static', testData);
      expect(cacheManager.getEntryInfo('config:static').ttl).toBe(TTL_CONFIG.static);
    });
  });

  describe('Cache Invalidation', () => {
    beforeEach(async () => {
      // Set up test data
      await cacheManager.set('materiales:list', { data: 'list' });
      await cacheManager.set('materiales:get:1', { data: 'record1' });
      await cacheManager.set('materiales:get:2', { data: 'record2' });
      await cacheManager.set('proyectos:list', { data: 'projects' });
    });

    it('should invalidate entries by pattern', async () => {
      const invalidated = await cacheManager.invalidate('materiales:*');
      expect(invalidated).toBe(3); // Should invalidate 3 material entries
      
      // Material entries should be gone
      expect(await cacheManager.get('materiales:list')).toBeNull();
      expect(await cacheManager.get('materiales:get:1')).toBeNull();
      
      // Project entries should remain
      expect(await cacheManager.get('proyectos:list')).toEqual({ data: 'projects' });
    });

    it('should invalidate by operation type', async () => {
      await cacheManager.invalidateByOperation('materiales', 'create');
      
      // Should invalidate material entries and related dashboard data
      expect(await cacheManager.get('materiales:list')).toBeNull();
    });

    it('should clear all cache entries', async () => {
      await cacheManager.clear();
      
      expect(await cacheManager.get('materiales:list')).toBeNull();
      expect(await cacheManager.get('proyectos:list')).toBeNull();
      expect(cacheManager.getStats().size).toBe(0);
    });
  });

  describe('Cache Size Management', () => {
    it('should enforce maximum cache size', async () => {
      // Fill cache to maximum
      for (let i = 0; i < 15; i++) {
        await cacheManager.set(`test:key:${i}`, { id: i });
      }
      
      // Should not exceed max size
      expect(cacheManager.getStats().size).toBeLessThanOrEqual(10);
    });

    it('should evict entries using LRU strategy', async () => {
      // Fill cache
      for (let i = 0; i < 10; i++) {
        await cacheManager.set(`test:key:${i}`, { id: i });
      }
      
      // Access some entries to make them recently used
      await cacheManager.get('test:key:5');
      await cacheManager.get('test:key:7');
      
      // Add one more entry to trigger eviction
      await cacheManager.set('test:key:new', { id: 'new' });
      
      // Recently accessed entries should still be there
      expect(await cacheManager.get('test:key:5')).toEqual({ id: 5 });
      expect(await cacheManager.get('test:key:7')).toEqual({ id: 7 });
      expect(await cacheManager.get('test:key:new')).toEqual({ id: 'new' });
    });
  });

  describe('Cache Statistics', () => {
    it('should track hit and miss statistics', async () => {
      await cacheManager.set('test:key', { data: 'test' });
      
      // Hit
      await cacheManager.get('test:key');
      
      // Miss
      await cacheManager.get('non:existent');
      
      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track cache size', async () => {
      expect(cacheManager.getStats().size).toBe(0);
      
      await cacheManager.set('test:key1', { data: 'test1' });
      expect(cacheManager.getStats().size).toBe(1);
      
      await cacheManager.set('test:key2', { data: 'test2' });
      expect(cacheManager.getStats().size).toBe(2);
      
      await cacheManager.clear();
      expect(cacheManager.getStats().size).toBe(0);
    });
  });

  describe('Entry Information', () => {
    it('should provide entry information for debugging', async () => {
      const testData = { id: 1, name: 'Test' };
      await cacheManager.set('test:key', testData, 300);
      
      const info = cacheManager.getEntryInfo('test:key');
      expect(info.exists).toBe(true);
      expect(info.ttl).toBe(300);
      expect(info.age).toBeGreaterThanOrEqual(0);
      expect(info.accessCount).toBe(1);
    });

    it('should return non-existent info for missing keys', () => {
      const info = cacheManager.getEntryInfo('non:existent');
      expect(info.exists).toBe(false);
      expect(info.age).toBeUndefined();
    });
  });

  describe('Invalidation Patterns', () => {
    it('should have correct invalidation patterns configured', () => {
      expect(INVALIDATION_PATTERNS.proyectos).toContain('proyectos:*');
      expect(INVALIDATION_PATTERNS.proyectos).toContain('dashboard:*');
      
      expect(INVALIDATION_PATTERNS.materiales).toContain('materiales:*');
      expect(INVALIDATION_PATTERNS.materiales).toContain('dashboard:*');
      
      expect(INVALIDATION_PATTERNS.usuarios).toContain('usuarios:*');
      expect(INVALIDATION_PATTERNS.usuarios).toContain('personal:*');
    });
  });
});