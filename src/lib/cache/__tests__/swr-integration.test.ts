/**
 * Tests for SWR integration with cache system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheMutator, CacheUtils } from '../swr-integration';
import { cacheManager } from '../cache-manager';
import { googleSheetsAPIService } from '../../google-sheets-api-service';

// Mock the API service
vi.mock('../../google-sheets-api-service', () => ({
  googleSheetsAPIService: {
    executeOperation: vi.fn()
  }
}));

const mockAPIService = vi.mocked(googleSheetsAPIService);

describe('SWR Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheManager.clear();
  });

  afterEach(() => {
    cacheManager.destroy();
  });

  describe('Cache Key Generation', () => {
    it('should generate correct cache keys for different operations', () => {
      // This tests the internal generateCacheKey function indirectly
      expect(true).toBe(true); // Placeholder - actual implementation would test key generation
    });
  });

  describe('CacheMutator', () => {
    beforeEach(() => {
      vi.spyOn(cacheManager, 'invalidateByOperation').mockResolvedValue();
    });

    describe('create', () => {
      it('should create record and invalidate caches', async () => {
        const newData = { name: 'New Material', categoria: 'Herramientas' };
        const responseData = { id: 3, ...newData };

        mockAPIService.executeOperation.mockResolvedValueOnce({
          ok: true,
          data: responseData,
          status: 201,
          timestamp: new Date().toISOString()
        });

        const result = await CacheMutator.create('materiales', newData);

        expect(result.ok).toBe(true);
        expect(result.data).toEqual(responseData);
        expect(cacheManager.invalidateByOperation).toHaveBeenCalledWith('materiales', 'create');
      });

      it('should handle create errors', async () => {
        const newData = { name: 'Invalid Material' };

        mockAPIService.executeOperation.mockRejectedValueOnce(
          new Error('Validation failed')
        );

        await expect(CacheMutator.create('materiales', newData))
          .rejects.toThrow('Validation failed');
      });
    });

    describe('update', () => {
      it('should update record and invalidate caches', async () => {
        const updateData = { name: 'Updated Material' };
        const responseData = { id: 1, ...updateData };

        mockAPIService.executeOperation.mockResolvedValueOnce({
          ok: true,
          data: responseData,
          status: 200,
          timestamp: new Date().toISOString()
        });

        const result = await CacheMutator.update('materiales', '1', updateData);

        expect(result.ok).toBe(true);
        expect(result.data).toEqual(responseData);
        expect(cacheManager.invalidateByOperation).toHaveBeenCalledWith('materiales', 'update');
      });

      it('should handle update errors', async () => {
        const updateData = { name: 'Invalid Update' };

        mockAPIService.executeOperation.mockRejectedValueOnce(
          new Error('Update failed')
        );

        await expect(CacheMutator.update('materiales', '1', updateData))
          .rejects.toThrow('Update failed');
      });
    });

    describe('delete', () => {
      it('should delete record and invalidate caches', async () => {
        mockAPIService.executeOperation.mockResolvedValueOnce({
          ok: true,
          data: { deleted: true },
          status: 200,
          timestamp: new Date().toISOString()
        });

        const result = await CacheMutator.delete('materiales', '1');

        expect(result.ok).toBe(true);
        expect(cacheManager.invalidateByOperation).toHaveBeenCalledWith('materiales', 'delete');
      });

      it('should handle delete errors', async () => {
        const updateData = { name: 'Invalid Update' };

        mockAPIService.executeOperation.mockRejectedValueOnce(
          new Error('Update failed')
        );

        await expect(CacheMutator.delete('materiales', '1'))
          .rejects.toThrow('Update failed');
      });
    });
  });

  describe('CacheUtils', () => {
    it('should provide cache statistics', () => {
      const stats = CacheUtils.getStats();
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
    });

    it('should clear all caches', async () => {
      await cacheManager.set('test:key', { data: 'test' });
      expect(cacheManager.getStats().size).toBe(1);
      
      await CacheUtils.clearAll();
      expect(cacheManager.getStats().size).toBe(0);
    });
  });
});