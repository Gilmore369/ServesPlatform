'use client';

import { useState, useEffect, useCallback } from 'react';
import { syncManager, SyncStatus, SyncResult } from '../lib/offline/sync-manager';
import { offlineStorageManager, OfflineTimeEntry, OfflineEvidence } from '../lib/offline/offline-storage';
import { TimeEntry, Evidence } from '../lib/types';

export interface OfflineCapabilities {
  isSupported: boolean;
  storageInfo: {
    used: number;
    available: number;
    percentage: number;
  };
}

/**
 * Hook for managing offline synchronization and storage
 */
export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSync: null,
    pendingItems: 0,
    nextSyncIn: 0
  });

  const [capabilities, setCapabilities] = useState<OfflineCapabilities>({
    isSupported: false,
    storageInfo: { used: 0, available: 0, percentage: 0 }
  });

  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // Initialize and setup status listener
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initialize = async () => {
      try {
        // Initialize offline storage
        await offlineStorageManager.initialize();

        // Check capabilities
        const storageInfo = await offlineStorageManager.getStorageInfo();
        setCapabilities({
          isSupported: true,
          storageInfo
        });

        // Setup sync status listener
        unsubscribe = syncManager.addStatusListener(setSyncStatus);

        // Get initial status
        const initialStatus = await syncManager.getStatus();
        setSyncStatus(initialStatus);

      } catch (error) {
        console.error('Failed to initialize offline sync:', error);
        setCapabilities({
          isSupported: false,
          storageInfo: { used: 0, available: 0, percentage: 0 }
        });
      }
    };

    initialize();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  /**
   * Store time entry for offline sync
   */
  const storeTimeEntryOffline = useCallback(async (timeEntry: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at' | 'aprobado' | 'aprobado_por'>): Promise<string> => {
    try {
      const localId = await offlineStorageManager.storeTimeEntry({
        ...timeEntry,
        aprobado: false
      });

      // Update sync status to reflect new pending item
      const status = await syncManager.getStatus();
      setSyncStatus(status);

      return localId;
    } catch (error) {
      console.error('Failed to store time entry offline:', error);
      throw error;
    }
  }, []);

  /**
   * Store evidence for offline sync
   */
  const storeEvidenceOffline = useCallback(async (
    evidence: Omit<Evidence, 'id' | 'created_at' | 'updated_at'>,
    fileData?: string
  ): Promise<string> => {
    try {
      const localId = await offlineStorageManager.storeEvidence({
        ...evidence,
        localFileData: fileData
      });

      // Update sync status to reflect new pending item
      const status = await syncManager.getStatus();
      setSyncStatus(status);

      return localId;
    } catch (error) {
      console.error('Failed to store evidence offline:', error);
      throw error;
    }
  }, []);

  /**
   * Manually trigger sync
   */
  const triggerSync = useCallback(async (): Promise<SyncResult> => {
    try {
      const result = await syncManager.syncNow();
      setLastSyncResult(result);
      return result;
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      const errorResult: SyncResult = {
        success: false,
        syncedTimeEntries: 0,
        syncedEvidence: 0,
        failedTimeEntries: 0,
        failedEvidence: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
      setLastSyncResult(errorResult);
      return errorResult;
    }
  }, []);

  /**
   * Refresh reference data
   */
  const refreshReferenceData = useCallback(async (): Promise<void> => {
    try {
      await syncManager.refreshReferenceData();
    } catch (error) {
      console.error('Failed to refresh reference data:', error);
      throw error;
    }
  }, []);

  /**
   * Get cached reference data
   */
  const getCachedData = useCallback(async () => {
    try {
      const [projects, activities, personnel] = await Promise.all([
        offlineStorageManager.getCachedProjects(),
        offlineStorageManager.getCachedActivities(),
        offlineStorageManager.getCachedPersonnel()
      ]);

      return { projects, activities, personnel };
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return { projects: [], activities: [], personnel: [] };
    }
  }, []);

  /**
   * Get pending items for review
   */
  const getPendingItems = useCallback(async () => {
    try {
      const [timeEntries, evidence] = await Promise.all([
        offlineStorageManager.getPendingTimeEntries(),
        offlineStorageManager.getPendingEvidence()
      ]);

      return { timeEntries, evidence };
    } catch (error) {
      console.error('Failed to get pending items:', error);
      return { timeEntries: [], evidence: [] };
    }
  }, []);

  /**
   * Clear all offline data
   */
  const clearOfflineData = useCallback(async (): Promise<void> => {
    try {
      await offlineStorageManager.clearAllData();
      
      // Update capabilities after clearing
      const storageInfo = await offlineStorageManager.getStorageInfo();
      setCapabilities(prev => ({
        ...prev,
        storageInfo
      }));

      // Update sync status
      const status = await syncManager.getStatus();
      setSyncStatus(status);

    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }, []);

  /**
   * Cleanup old synced entries
   */
  const cleanupSyncedEntries = useCallback(async (): Promise<void> => {
    try {
      await offlineStorageManager.cleanupSyncedEntries();
      
      // Update storage info
      const storageInfo = await offlineStorageManager.getStorageInfo();
      setCapabilities(prev => ({
        ...prev,
        storageInfo
      }));

    } catch (error) {
      console.error('Failed to cleanup synced entries:', error);
      throw error;
    }
  }, []);

  /**
   * Update storage info
   */
  const updateStorageInfo = useCallback(async (): Promise<void> => {
    try {
      const storageInfo = await offlineStorageManager.getStorageInfo();
      setCapabilities(prev => ({
        ...prev,
        storageInfo
      }));
    } catch (error) {
      console.error('Failed to update storage info:', error);
    }
  }, []);

  return {
    // Status
    syncStatus,
    capabilities,
    lastSyncResult,
    
    // Actions
    storeTimeEntryOffline,
    storeEvidenceOffline,
    triggerSync,
    refreshReferenceData,
    getCachedData,
    getPendingItems,
    clearOfflineData,
    cleanupSyncedEntries,
    updateStorageInfo,
    
    // Computed values
    isOfflineCapable: capabilities.isSupported,
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.isSyncing,
    hasPendingItems: syncStatus.pendingItems > 0,
    storageUsageHigh: capabilities.storageInfo.percentage > 80
  };
}