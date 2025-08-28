'use client';

import { offlineStorageManager, OfflineTimeEntry, OfflineEvidence } from './offline-storage';
import { enhancedAPIClient } from '../enhanced-api-client';
import { TimeEntry, Evidence } from '../types';

export interface SyncResult {
  success: boolean;
  syncedTimeEntries: number;
  syncedEvidence: number;
  failedTimeEntries: number;
  failedEvidence: number;
  errors: string[];
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingItems: number;
  nextSyncIn: number; // seconds
}

/**
 * Sync Manager for handling automatic synchronization of offline data
 */
export class SyncManager {
  private isOnline = true;
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSync: Date | null = null;
  private pendingItems = 0;
  private syncIntervalMs = 30000; // 30 seconds
  private listeners: Array<(status: SyncStatus) => void> = [];

  constructor() {
    this.setupConnectivityListeners();
    this.startPeriodicSync();
  }

  /**
   * Setup network connectivity listeners
   */
  private setupConnectivityListeners(): void {
    if (typeof window === 'undefined') return;

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('📱 SyncManager: Connection restored');
      this.isOnline = true;
      this.notifyListeners();
      this.syncNow();
    });

    window.addEventListener('offline', () => {
      console.log('📱 SyncManager: Connection lost');
      this.isOnline = false;
      this.notifyListeners();
    });

    // Initial connectivity check
    this.isOnline = navigator.onLine;
  }

  /**
   * Start periodic sync when online
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncNow();
      }
    }, this.syncIntervalMs);
  }

  /**
   * Perform immediate sync
   */
  async syncNow(): Promise<SyncResult> {
    if (!this.isOnline || this.isSyncing) {
      return {
        success: false,
        syncedTimeEntries: 0,
        syncedEvidence: 0,
        failedTimeEntries: 0,
        failedEvidence: 0,
        errors: ['Sync already in progress or offline']
      };
    }

    this.isSyncing = true;
    this.notifyListeners();

    console.log('📱 SyncManager: Starting sync...');

    const result: SyncResult = {
      success: true,
      syncedTimeEntries: 0,
      syncedEvidence: 0,
      failedTimeEntries: 0,
      failedEvidence: 0,
      errors: []
    };

    try {
      // Sync time entries
      const timeEntriesResult = await this.syncTimeEntries();
      result.syncedTimeEntries = timeEntriesResult.synced;
      result.failedTimeEntries = timeEntriesResult.failed;
      result.errors.push(...timeEntriesResult.errors);

      // Sync evidence
      const evidenceResult = await this.syncEvidence();
      result.syncedEvidence = evidenceResult.synced;
      result.failedEvidence = evidenceResult.failed;
      result.errors.push(...evidenceResult.errors);

      // Update last sync time
      this.lastSync = new Date();
      
      // Update pending items count
      await this.updatePendingItemsCount();

      console.log('📱 SyncManager: Sync completed', result);

    } catch (error) {
      console.error('📱 SyncManager: Sync failed', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return result;
  }

  /**
   * Sync pending time entries
   */
  private async syncTimeEntries(): Promise<{ synced: number; failed: number; errors: string[] }> {
    const result = { synced: 0, failed: 0, errors: [] as string[] };

    try {
      const pendingEntries = await offlineStorageManager.getPendingTimeEntries();
      
      for (const entry of pendingEntries) {
        try {
          // Mark as syncing
          await offlineStorageManager.updateTimeEntrySyncStatus(entry.localId, 'syncing');

          // Convert offline entry to API format
          const timeEntryData: Partial<TimeEntry> = {
            colaborador_id: entry.colaborador_id,
            proyecto_id: entry.proyecto_id,
            actividad_id: entry.actividad_id,
            fecha: entry.fecha,
            horas_trabajadas: entry.horas_trabajadas,
            descripcion: entry.descripcion,
            aprobado: entry.aprobado || false
          };

          // Send to API
          const response = await enhancedAPIClient.createTimeEntry('Horas', timeEntryData);

          if (response.ok) {
            // Mark as synced
            await offlineStorageManager.updateTimeEntrySyncStatus(entry.localId, 'synced');
            result.synced++;
            console.log('📱 SyncManager: Time entry synced', entry.localId);
          } else {
            // Mark as error
            await offlineStorageManager.updateTimeEntrySyncStatus(
              entry.localId, 
              'error', 
              response.message || 'Sync failed'
            );
            result.failed++;
            result.errors.push(`Time entry ${entry.localId}: ${response.message}`);
          }

        } catch (error) {
          // Mark as error
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await offlineStorageManager.updateTimeEntrySyncStatus(entry.localId, 'error', errorMessage);
          result.failed++;
          result.errors.push(`Time entry ${entry.localId}: ${errorMessage}`);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get pending time entries';
      result.errors.push(errorMessage);
    }

    return result;
  }

  /**
   * Sync pending evidence
   */
  private async syncEvidence(): Promise<{ synced: number; failed: number; errors: string[] }> {
    const result = { synced: 0, failed: 0, errors: [] as string[] };

    try {
      const pendingEvidence = await offlineStorageManager.getPendingEvidence();
      
      for (const evidence of pendingEvidence) {
        try {
          // Mark as syncing
          await offlineStorageManager.updateEvidenceSyncStatus(evidence.localId, 'syncing');

          // Handle file upload if there's local file data
          let fileUrl = evidence.url;
          if (evidence.localFileData) {
            // In a real implementation, you would upload the file to a storage service
            // For now, we'll simulate this by keeping the original URL
            // TODO: Implement actual file upload to cloud storage
            console.log('📱 SyncManager: File upload needed for evidence', evidence.localId);
          }

          // Convert offline evidence to API format
          const evidenceData: Partial<Evidence> = {
            actividad_id: evidence.actividad_id,
            tipo: evidence.tipo,
            titulo: evidence.titulo,
            descripcion: evidence.descripcion,
            url: fileUrl,
            usuario_id: evidence.usuario_id
          };

          // Send to API
          const response = await enhancedAPIClient.createEvidence('Evidencias', evidenceData);

          if (response.ok) {
            // Mark as synced
            await offlineStorageManager.updateEvidenceSyncStatus(evidence.localId, 'synced');
            result.synced++;
            console.log('📱 SyncManager: Evidence synced', evidence.localId);
          } else {
            // Mark as error
            await offlineStorageManager.updateEvidenceSyncStatus(
              evidence.localId, 
              'error', 
              response.message || 'Sync failed'
            );
            result.failed++;
            result.errors.push(`Evidence ${evidence.localId}: ${response.message}`);
          }

        } catch (error) {
          // Mark as error
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await offlineStorageManager.updateEvidenceSyncStatus(evidence.localId, 'error', errorMessage);
          result.failed++;
          result.errors.push(`Evidence ${evidence.localId}: ${errorMessage}`);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get pending evidence';
      result.errors.push(errorMessage);
    }

    return result;
  }

  /**
   * Update pending items count
   */
  private async updatePendingItemsCount(): Promise<void> {
    try {
      const [pendingTimeEntries, pendingEvidence] = await Promise.all([
        offlineStorageManager.getPendingTimeEntries(),
        offlineStorageManager.getPendingEvidence()
      ]);

      this.pendingItems = pendingTimeEntries.length + pendingEvidence.length;
    } catch (error) {
      console.error('📱 SyncManager: Failed to update pending items count', error);
    }
  }

  /**
   * Get current sync status
   */
  async getStatus(): Promise<SyncStatus> {
    await this.updatePendingItemsCount();

    const nextSyncIn = this.syncInterval ? 
      Math.max(0, Math.ceil((this.syncIntervalMs - (Date.now() % this.syncIntervalMs)) / 1000)) : 0;

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSync: this.lastSync,
      pendingItems: this.pendingItems,
      nextSyncIn
    };
  }

  /**
   * Add status change listener
   */
  addStatusListener(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of status changes
   */
  private async notifyListeners(): Promise<void> {
    const status = await this.getStatus();
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('📱 SyncManager: Error in status listener', error);
      }
    });
  }

  /**
   * Force refresh reference data from server
   */
  async refreshReferenceData(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot refresh reference data while offline');
    }

    try {
      console.log('📱 SyncManager: Refreshing reference data...');

      // Fetch fresh data from API
      const [projectsResponse, activitiesResponse, personnelResponse] = await Promise.all([
        enhancedAPIClient.getProjects({ limit: 1000 }),
        enhancedAPIClient.getActivities({ limit: 1000 }),
        enhancedAPIClient.getPersonnel({ limit: 1000 })
      ]);

      // Cache the data for offline use
      await offlineStorageManager.cacheReferenceData({
        projects: projectsResponse.ok ? projectsResponse.data : [],
        activities: activitiesResponse.ok ? activitiesResponse.data : [],
        personnel: personnelResponse.ok ? personnelResponse.data : []
      });

      console.log('📱 SyncManager: Reference data refreshed');

    } catch (error) {
      console.error('📱 SyncManager: Failed to refresh reference data', error);
      throw error;
    }
  }

  /**
   * Set sync interval
   */
  setSyncInterval(intervalMs: number): void {
    this.syncIntervalMs = intervalMs;
    this.startPeriodicSync();
  }

  /**
   * Stop sync manager
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.setupConnectivityListeners);
      window.removeEventListener('offline', this.setupConnectivityListeners);
    }
  }
}

// Export singleton instance
export const syncManager = new SyncManager();