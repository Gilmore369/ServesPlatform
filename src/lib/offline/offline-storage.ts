'use client';

import { TimeEntry, Evidence, Activity, Project, Personnel } from '../types';

// Offline storage configuration
export interface OfflineStorageConfig {
  dbName: string;
  version: number;
  maxStorageSize: number; // in MB
  syncInterval: number; // in milliseconds
}

// Offline data types
export interface OfflineTimeEntry extends Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'> {
  localId: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  lastModified: Date;
  errorMessage?: string;
}

export interface OfflineEvidence extends Omit<Evidence, 'id' | 'created_at' | 'updated_at'> {
  localId: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  lastModified: Date;
  errorMessage?: string;
  localFileData?: string; // Base64 encoded file data for offline storage
}

export interface OfflineData {
  timeEntries: OfflineTimeEntry[];
  evidence: OfflineEvidence[];
  projects: Project[];
  activities: Activity[];
  personnel: Personnel[];
  lastSync: Date;
}

/**
 * Offline Storage Manager using IndexedDB for mobile-optimized data persistence
 */
export class OfflineStorageManager {
  private db: IDBDatabase | null = null;
  private config: OfflineStorageConfig;
  private isInitialized = false;

  constructor(config?: Partial<OfflineStorageConfig>) {
    this.config = {
      dbName: 'ServesPlatformOffline',
      version: 1,
      maxStorageSize: 50, // 50MB
      syncInterval: 30000, // 30 seconds
      ...config
    };
  }

  /**
   * Initialize IndexedDB database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('📱 OfflineStorageManager: IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('timeEntries')) {
          const timeEntriesStore = db.createObjectStore('timeEntries', { keyPath: 'localId' });
          timeEntriesStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          timeEntriesStore.createIndex('colaborador_id', 'colaborador_id', { unique: false });
          timeEntriesStore.createIndex('proyecto_id', 'proyecto_id', { unique: false });
        }

        if (!db.objectStoreNames.contains('evidence')) {
          const evidenceStore = db.createObjectStore('evidence', { keyPath: 'localId' });
          evidenceStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          evidenceStore.createIndex('actividad_id', 'actividad_id', { unique: false });
        }

        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('activities')) {
          const activitiesStore = db.createObjectStore('activities', { keyPath: 'id' });
          activitiesStore.createIndex('proyecto_id', 'proyecto_id', { unique: false });
        }

        if (!db.objectStoreNames.contains('personnel')) {
          db.createObjectStore('personnel', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Store time entry offline
   */
  async storeTimeEntry(timeEntry: Omit<OfflineTimeEntry, 'localId' | 'syncStatus' | 'lastModified'>): Promise<string> {
    await this.ensureInitialized();

    const localId = `time_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const offlineEntry: OfflineTimeEntry = {
      ...timeEntry,
      localId,
      syncStatus: 'pending',
      lastModified: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['timeEntries'], 'readwrite');
      const store = transaction.objectStore('timeEntries');
      const request = store.add(offlineEntry);

      request.onsuccess = () => {
        console.log('📱 OfflineStorageManager: Time entry stored offline', localId);
        resolve(localId);
      };

      request.onerror = () => {
        reject(new Error('Failed to store time entry offline'));
      };
    });
  }

  /**
   * Store evidence offline
   */
  async storeEvidence(evidence: Omit<OfflineEvidence, 'localId' | 'syncStatus' | 'lastModified'>): Promise<string> {
    await this.ensureInitialized();

    const localId = `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const offlineEvidence: OfflineEvidence = {
      ...evidence,
      localId,
      syncStatus: 'pending',
      lastModified: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['evidence'], 'readwrite');
      const store = transaction.objectStore('evidence');
      const request = store.add(offlineEvidence);

      request.onsuccess = () => {
        console.log('📱 OfflineStorageManager: Evidence stored offline', localId);
        resolve(localId);
      };

      request.onerror = () => {
        reject(new Error('Failed to store evidence offline'));
      };
    });
  }

  /**
   * Get pending time entries for sync
   */
  async getPendingTimeEntries(): Promise<OfflineTimeEntry[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['timeEntries'], 'readonly');
      const store = transaction.objectStore('timeEntries');
      const index = store.index('syncStatus');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get pending time entries'));
      };
    });
  }

  /**
   * Get pending evidence for sync
   */
  async getPendingEvidence(): Promise<OfflineEvidence[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['evidence'], 'readonly');
      const store = transaction.objectStore('evidence');
      const index = store.index('syncStatus');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get pending evidence'));
      };
    });
  }

  /**
   * Update sync status of time entry
   */
  async updateTimeEntrySyncStatus(localId: string, status: OfflineTimeEntry['syncStatus'], errorMessage?: string): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['timeEntries'], 'readwrite');
      const store = transaction.objectStore('timeEntries');
      const getRequest = store.get(localId);

      getRequest.onsuccess = () => {
        const entry = getRequest.result;
        if (entry) {
          entry.syncStatus = status;
          entry.lastModified = new Date();
          if (errorMessage) entry.errorMessage = errorMessage;

          const updateRequest = store.put(entry);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(new Error('Failed to update time entry sync status'));
        } else {
          reject(new Error('Time entry not found'));
        }
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get time entry for update'));
      };
    });
  }

  /**
   * Update sync status of evidence
   */
  async updateEvidenceSyncStatus(localId: string, status: OfflineEvidence['syncStatus'], errorMessage?: string): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['evidence'], 'readwrite');
      const store = transaction.objectStore('evidence');
      const getRequest = store.get(localId);

      getRequest.onsuccess = () => {
        const evidence = getRequest.result;
        if (evidence) {
          evidence.syncStatus = status;
          evidence.lastModified = new Date();
          if (errorMessage) evidence.errorMessage = errorMessage;

          const updateRequest = store.put(evidence);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(new Error('Failed to update evidence sync status'));
        } else {
          reject(new Error('Evidence not found'));
        }
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get evidence for update'));
      };
    });
  }

  /**
   * Cache reference data for offline use
   */
  async cacheReferenceData(data: {
    projects?: Project[];
    activities?: Activity[];
    personnel?: Personnel[];
  }): Promise<void> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(['projects', 'activities', 'personnel', 'metadata'], 'readwrite');

    // Cache projects
    if (data.projects) {
      const projectsStore = transaction.objectStore('projects');
      for (const project of data.projects) {
        projectsStore.put(project);
      }
    }

    // Cache activities
    if (data.activities) {
      const activitiesStore = transaction.objectStore('activities');
      for (const activity of data.activities) {
        activitiesStore.put(activity);
      }
    }

    // Cache personnel
    if (data.personnel) {
      const personnelStore = transaction.objectStore('personnel');
      for (const person of data.personnel) {
        personnelStore.put(person);
      }
    }

    // Update last sync timestamp
    const metadataStore = transaction.objectStore('metadata');
    metadataStore.put({ key: 'lastSync', value: new Date().toISOString() });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('📱 OfflineStorageManager: Reference data cached');
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Failed to cache reference data'));
      };
    });
  }

  /**
   * Get cached projects
   */
  async getCachedProjects(): Promise<Project[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get cached projects'));
      };
    });
  }

  /**
   * Get cached activities for a project
   */
  async getCachedActivities(projectId?: string): Promise<Activity[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['activities'], 'readonly');
      const store = transaction.objectStore('activities');

      if (projectId) {
        const index = store.index('proyecto_id');
        const request = index.getAll(projectId);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(new Error('Failed to get cached activities'));
        };
      } else {
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(new Error('Failed to get cached activities'));
        };
      }
    });
  }

  /**
   * Get cached personnel
   */
  async getCachedPersonnel(): Promise<Personnel[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['personnel'], 'readonly');
      const store = transaction.objectStore('personnel');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get cached personnel'));
      };
    });
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<{
    used: number;
    available: number;
    percentage: number;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      
      return {
        used: Math.round(used / (1024 * 1024)), // MB
        available: Math.round((quota - used) / (1024 * 1024)), // MB
        percentage: quota > 0 ? Math.round((used / quota) * 100) : 0
      };
    }

    return { used: 0, available: 0, percentage: 0 };
  }

  /**
   * Clear all offline data
   */
  async clearAllData(): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['timeEntries', 'evidence', 'projects', 'activities', 'personnel', 'metadata'], 'readwrite');

      const stores = ['timeEntries', 'evidence', 'projects', 'activities', 'personnel', 'metadata'];
      stores.forEach(storeName => {
        transaction.objectStore(storeName).clear();
      });

      transaction.oncomplete = () => {
        console.log('📱 OfflineStorageManager: All data cleared');
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Failed to clear offline data'));
      };
    });
  }

  /**
   * Remove synced entries to free up space
   */
  async cleanupSyncedEntries(): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['timeEntries', 'evidence'], 'readwrite');

      // Clean up synced time entries older than 7 days
      const timeEntriesStore = transaction.objectStore('timeEntries');
      const timeEntriesRequest = timeEntriesStore.getAll();

      timeEntriesRequest.onsuccess = () => {
        const entries = timeEntriesRequest.result;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);

        entries.forEach(entry => {
          if (entry.syncStatus === 'synced' && entry.lastModified < cutoffDate) {
            timeEntriesStore.delete(entry.localId);
          }
        });
      };

      // Clean up synced evidence older than 7 days
      const evidenceStore = transaction.objectStore('evidence');
      const evidenceRequest = evidenceStore.getAll();

      evidenceRequest.onsuccess = () => {
        const evidenceList = evidenceRequest.result;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);

        evidenceList.forEach(evidence => {
          if (evidence.syncStatus === 'synced' && evidence.lastModified < cutoffDate) {
            evidenceStore.delete(evidence.localId);
          }
        });
      };

      transaction.oncomplete = () => {
        console.log('📱 OfflineStorageManager: Synced entries cleaned up');
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Failed to cleanup synced entries'));
      };
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

// Export singleton instance
export const offlineStorageManager = new OfflineStorageManager();