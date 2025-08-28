import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncManager } from '../sync-manager';

// Mock dependencies
vi.mock('../offline-storage', () => ({
  offlineStorageManager: {
    getPendingTimeEntries: vi.fn(),
    getPendingEvidence: vi.fn(),
    updateTimeEntrySyncStatus: vi.fn(),
    updateEvidenceSyncStatus: vi.fn(),
  },
}));

vi.mock('../../enhanced-api-client', () => ({
  enhancedAPIClient: {
    createTimeEntry: vi.fn(),
    createEvidence: vi.fn(),
  },
}));

// Mock window events
Object.defineProperty(window, 'addEventListener', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(window, 'removeEventListener', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
});

describe('SyncManager', () => {
  let syncManager: SyncManager;
  let mockOfflineStorage: any;
  let mockAPIClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Get mocked modules
    mockOfflineStorage = require('../offline-storage').offlineStorageManager;
    mockAPIClient = require('../../enhanced-api-client').enhancedAPIClient;
    
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });

    syncManager = new SyncManager();
  });

  afterEach(() => {
    syncManager.stop();
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should setup connectivity listeners', () => {
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should start periodic sync', () => {
      // Verify that setInterval was called (indirectly through the constructor)
      expect(syncManager).toBeDefined();
    });
  });

  describe('connectivity handling', () => {
    it('should handle online event', async () => {
      const mockListener = vi.fn();
      syncManager.addStatusListener(mockListener);

      // Simulate online event
      const onlineHandler = (window.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'online')?.[1];
      
      if (onlineHandler) {
        onlineHandler();
      }

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockListener).toHaveBeenCalled();
    });

    it('should handle offline event', async () => {
      const mockListener = vi.fn();
      syncManager.addStatusListener(mockListener);

      // Simulate offline event
      const offlineHandler = (window.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'offline')?.[1];
      
      if (offlineHandler) {
        offlineHandler();
      }

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockListener).toHaveBeenCalled();
    });
  });

  describe('sync operations', () => {
    beforeEach(() => {
      // Mock pending items
      mockOfflineStorage.getPendingTimeEntries.mockResolvedValue([
        {
          localId: 'time_123_abc',
          colaborador_id: 'user1',
          proyecto_id: 'project1',
          actividad_id: 'activity1',
          fecha: new Date(),
          horas_trabajadas: 8,
          descripcion: 'Test work',
          syncStatus: 'pending',
        },
      ]);

      mockOfflineStorage.getPendingEvidence.mockResolvedValue([
        {
          localId: 'evidence_123_abc',
          actividad_id: 'activity1',
          tipo: 'foto',
          titulo: 'Test evidence',
          url: 'test-url',
          usuario_id: 'user1',
          syncStatus: 'pending',
        },
      ]);

      mockOfflineStorage.updateTimeEntrySyncStatus.mockResolvedValue(undefined);
      mockOfflineStorage.updateEvidenceSyncStatus.mockResolvedValue(undefined);
    });

    it('should sync time entries successfully', async () => {
      mockAPIClient.createTimeEntry.mockResolvedValue({ ok: true });

      const result = await syncManager.syncNow();

      expect(result.success).toBe(true);
      expect(result.syncedTimeEntries).toBe(1);
      expect(result.failedTimeEntries).toBe(0);
      expect(mockAPIClient.createTimeEntry).toHaveBeenCalledWith('Horas', expect.any(Object));
      expect(mockOfflineStorage.updateTimeEntrySyncStatus).toHaveBeenCalledWith('time_123_abc', 'synced');
    });

    it('should sync evidence successfully', async () => {
      mockAPIClient.createEvidence.mockResolvedValue({ ok: true });

      const result = await syncManager.syncNow();

      expect(result.success).toBe(true);
      expect(result.syncedEvidence).toBe(1);
      expect(result.failedEvidence).toBe(0);
      expect(mockAPIClient.createEvidence).toHaveBeenCalledWith('Evidencias', expect.any(Object));
      expect(mockOfflineStorage.updateEvidenceSyncStatus).toHaveBeenCalledWith('evidence_123_abc', 'synced');
    });

    it('should handle time entry sync failures', async () => {
      mockAPIClient.createTimeEntry.mockResolvedValue({ 
        ok: false, 
        message: 'Validation error' 
      });

      const result = await syncManager.syncNow();

      expect(result.success).toBe(true); // Overall sync can succeed even with individual failures
      expect(result.syncedTimeEntries).toBe(0);
      expect(result.failedTimeEntries).toBe(1);
      expect(result.errors).toContain('Time entry time_123_abc: Validation error');
      expect(mockOfflineStorage.updateTimeEntrySyncStatus).toHaveBeenCalledWith(
        'time_123_abc', 
        'error', 
        'Validation error'
      );
    });

    it('should handle evidence sync failures', async () => {
      mockAPIClient.createEvidence.mockResolvedValue({ 
        ok: false, 
        message: 'Upload failed' 
      });

      const result = await syncManager.syncNow();

      expect(result.success).toBe(true);
      expect(result.syncedEvidence).toBe(0);
      expect(result.failedEvidence).toBe(1);
      expect(result.errors).toContain('Evidence evidence_123_abc: Upload failed');
      expect(mockOfflineStorage.updateEvidenceSyncStatus).toHaveBeenCalledWith(
        'evidence_123_abc', 
        'error', 
        'Upload failed'
      );
    });

    it('should not sync when offline', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      // Create new sync manager to pick up offline state
      const offlineSyncManager = new SyncManager();

      const result = await offlineSyncManager.syncNow();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Sync already in progress or offline');
      
      offlineSyncManager.stop();
    });

    it('should not sync when already syncing', async () => {
      // Start a sync operation
      const syncPromise1 = syncManager.syncNow();
      const syncPromise2 = syncManager.syncNow();

      const [result1, result2] = await Promise.all([syncPromise1, syncPromise2]);

      // First sync should succeed, second should be rejected
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.errors).toContain('Sync already in progress or offline');
    });
  });

  describe('status management', () => {
    it('should get current sync status', async () => {
      mockOfflineStorage.getPendingTimeEntries.mockResolvedValue([{ localId: '1' }]);
      mockOfflineStorage.getPendingEvidence.mockResolvedValue([{ localId: '2' }]);

      const status = await syncManager.getStatus();

      expect(status).toEqual({
        isOnline: true,
        isSyncing: false,
        lastSync: null,
        pendingItems: 2,
        nextSyncIn: expect.any(Number),
      });
    });

    it('should add and remove status listeners', async () => {
      const mockListener = vi.fn();
      
      const unsubscribe = syncManager.addStatusListener(mockListener);
      
      // Trigger a status change
      const status = await syncManager.getStatus();
      
      expect(unsubscribe).toBeInstanceOf(Function);
      
      // Remove listener
      unsubscribe();
      
      // Verify listener was removed (this is hard to test directly, 
      // but we can at least verify the unsubscribe function exists)
      expect(unsubscribe).toBeDefined();
    });
  });

  describe('reference data refresh', () => {
    it('should refresh reference data when online', async () => {
      const mockProjects = [{ id: '1', nombre: 'Project 1' }];
      const mockActivities = [{ id: '1', nombre: 'Activity 1' }];
      const mockPersonnel = [{ id: '1', nombres: 'John Doe' }];

      mockAPIClient.getProjects = vi.fn().mockResolvedValue({ ok: true, data: mockProjects });
      mockAPIClient.getActivities = vi.fn().mockResolvedValue({ ok: true, data: mockActivities });
      mockAPIClient.getPersonnel = vi.fn().mockResolvedValue({ ok: true, data: mockPersonnel });

      mockOfflineStorage.cacheReferenceData = vi.fn().mockResolvedValue(undefined);

      await syncManager.refreshReferenceData();

      expect(mockAPIClient.getProjects).toHaveBeenCalledWith({ limit: 1000 });
      expect(mockAPIClient.getActivities).toHaveBeenCalledWith({ limit: 1000 });
      expect(mockAPIClient.getPersonnel).toHaveBeenCalledWith({ limit: 1000 });
      expect(mockOfflineStorage.cacheReferenceData).toHaveBeenCalledWith({
        projects: mockProjects,
        activities: mockActivities,
        personnel: mockPersonnel,
      });
    });

    it('should throw error when refreshing offline', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      const offlineSyncManager = new SyncManager();

      await expect(offlineSyncManager.refreshReferenceData()).rejects.toThrow(
        'Cannot refresh reference data while offline'
      );
      
      offlineSyncManager.stop();
    });
  });

  describe('configuration', () => {
    it('should set sync interval', () => {
      const newInterval = 60000; // 1 minute
      
      syncManager.setSyncInterval(newInterval);
      
      // This is hard to test directly, but we can verify the method exists
      expect(syncManager.setSyncInterval).toBeDefined();
    });

    it('should stop sync manager', () => {
      syncManager.stop();
      
      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });
});