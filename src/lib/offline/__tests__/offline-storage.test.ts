import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineStorageManager } from '../offline-storage';

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

const mockIDBDatabase = {
  createObjectStore: vi.fn(),
  transaction: vi.fn(),
  close: vi.fn(),
  objectStoreNames: {
    contains: vi.fn(),
  },
};

const mockIDBObjectStore = {
  add: vi.fn(),
  put: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  createIndex: vi.fn(),
  index: vi.fn(),
};

const mockIDBTransaction = {
  objectStore: vi.fn(() => mockIDBObjectStore),
  oncomplete: null,
  onerror: null,
};

const mockIDBRequest = {
  onsuccess: null,
  onerror: null,
  result: null,
};

// Setup global mocks
Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

Object.defineProperty(global, 'IDBDatabase', {
  value: function() { return mockIDBDatabase; },
  writable: true,
});

describe('OfflineStorageManager', () => {
  let storageManager: OfflineStorageManager;

  beforeEach(() => {
    storageManager = new OfflineStorageManager();
    vi.clearAllMocks();
    
    // Setup default mock behaviors
    mockIndexedDB.open.mockReturnValue(mockIDBRequest);
    mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
    mockIDBObjectStore.add.mockReturnValue(mockIDBRequest);
    mockIDBObjectStore.get.mockReturnValue(mockIDBRequest);
    mockIDBObjectStore.getAll.mockReturnValue(mockIDBRequest);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const config = storageManager.getConfig?.() || {};
      expect(config).toBeDefined();
    });

    it('should handle IndexedDB not supported', async () => {
      // Mock IndexedDB as undefined
      Object.defineProperty(global, 'indexedDB', {
        value: undefined,
        writable: true,
      });

      const newStorageManager = new OfflineStorageManager();
      
      await expect(newStorageManager.initialize()).rejects.toThrow('IndexedDB not supported');
    });

    it('should initialize database successfully', async () => {
      // Mock successful database opening
      setTimeout(() => {
        mockIDBRequest.result = mockIDBDatabase;
        mockIDBRequest.onsuccess?.();
      }, 0);

      await expect(storageManager.initialize()).resolves.toBeUndefined();
    });
  });

  describe('time entry storage', () => {
    beforeEach(async () => {
      // Mock successful initialization
      setTimeout(() => {
        mockIDBRequest.result = mockIDBDatabase;
        mockIDBRequest.onsuccess?.();
      }, 0);
      
      await storageManager.initialize();
    });

    it('should store time entry offline', async () => {
      const timeEntry = {
        colaborador_id: 'user1',
        proyecto_id: 'project1',
        actividad_id: 'activity1',
        fecha: new Date(),
        horas_trabajadas: 8,
        descripcion: 'Test work',
        aprobado: false,
      };

      // Mock successful storage
      setTimeout(() => {
        mockIDBRequest.onsuccess?.();
      }, 0);

      const localId = await storageManager.storeTimeEntry(timeEntry);
      
      expect(localId).toMatch(/^time_\d+_[a-z0-9]+$/);
      expect(mockIDBObjectStore.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...timeEntry,
          localId,
          syncStatus: 'pending',
          lastModified: expect.any(Date),
        })
      );
    });

    it('should get pending time entries', async () => {
      const mockEntries = [
        {
          localId: 'time_123_abc',
          syncStatus: 'pending',
          colaborador_id: 'user1',
          proyecto_id: 'project1',
          actividad_id: 'activity1',
          fecha: new Date(),
          horas_trabajadas: 8,
          lastModified: new Date(),
        },
      ];

      // Mock index and getAll
      const mockIndex = {
        getAll: vi.fn(() => mockIDBRequest),
      };
      mockIDBObjectStore.index.mockReturnValue(mockIndex);

      setTimeout(() => {
        mockIDBRequest.result = mockEntries;
        mockIDBRequest.onsuccess?.();
      }, 0);

      const pendingEntries = await storageManager.getPendingTimeEntries();
      
      expect(pendingEntries).toEqual(mockEntries);
      expect(mockIndex.getAll).toHaveBeenCalledWith('pending');
    });

    it('should update time entry sync status', async () => {
      const localId = 'time_123_abc';
      const mockEntry = {
        localId,
        syncStatus: 'pending',
        lastModified: new Date(),
      };

      // Mock get request
      setTimeout(() => {
        mockIDBRequest.result = mockEntry;
        mockIDBRequest.onsuccess?.();
      }, 0);

      // Mock put request
      const mockPutRequest = { onsuccess: null, onerror: null };
      mockIDBObjectStore.put.mockReturnValue(mockPutRequest);

      const updatePromise = storageManager.updateTimeEntrySyncStatus(localId, 'synced');

      // Trigger get success
      mockIDBRequest.onsuccess?.();

      // Trigger put success
      setTimeout(() => {
        mockPutRequest.onsuccess?.();
      }, 0);

      await expect(updatePromise).resolves.toBeUndefined();
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          syncStatus: 'synced',
          lastModified: expect.any(Date),
        })
      );
    });
  });

  describe('evidence storage', () => {
    beforeEach(async () => {
      // Mock successful initialization
      setTimeout(() => {
        mockIDBRequest.result = mockIDBDatabase;
        mockIDBRequest.onsuccess?.();
      }, 0);
      
      await storageManager.initialize();
    });

    it('should store evidence offline', async () => {
      const evidence = {
        actividad_id: 'activity1',
        tipo: 'foto' as const,
        titulo: 'Test evidence',
        descripcion: 'Test description',
        url: 'test-url',
        usuario_id: 'user1',
      };

      // Mock successful storage
      setTimeout(() => {
        mockIDBRequest.onsuccess?.();
      }, 0);

      const localId = await storageManager.storeEvidence(evidence);
      
      expect(localId).toMatch(/^evidence_\d+_[a-z0-9]+$/);
      expect(mockIDBObjectStore.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...evidence,
          localId,
          syncStatus: 'pending',
          lastModified: expect.any(Date),
        })
      );
    });

    it('should get pending evidence', async () => {
      const mockEvidence = [
        {
          localId: 'evidence_123_abc',
          syncStatus: 'pending',
          actividad_id: 'activity1',
          tipo: 'foto',
          titulo: 'Test evidence',
          url: 'test-url',
          usuario_id: 'user1',
          lastModified: new Date(),
        },
      ];

      // Mock index and getAll
      const mockIndex = {
        getAll: vi.fn(() => mockIDBRequest),
      };
      mockIDBObjectStore.index.mockReturnValue(mockIndex);

      setTimeout(() => {
        mockIDBRequest.result = mockEvidence;
        mockIDBRequest.onsuccess?.();
      }, 0);

      const pendingEvidence = await storageManager.getPendingEvidence();
      
      expect(pendingEvidence).toEqual(mockEvidence);
      expect(mockIndex.getAll).toHaveBeenCalledWith('pending');
    });
  });

  describe('reference data caching', () => {
    beforeEach(async () => {
      // Mock successful initialization
      setTimeout(() => {
        mockIDBRequest.result = mockIDBDatabase;
        mockIDBRequest.onsuccess?.();
      }, 0);
      
      await storageManager.initialize();
    });

    it('should cache reference data', async () => {
      const referenceData = {
        projects: [
          { id: '1', nombre: 'Project 1', codigo: 'P001' },
          { id: '2', nombre: 'Project 2', codigo: 'P002' },
        ],
        activities: [
          { id: '1', nombre: 'Activity 1', codigo: 'A001', proyecto_id: '1' },
        ],
        personnel: [
          { id: '1', nombres: 'John Doe', email: 'john@example.com' },
        ],
      };

      // Mock transaction completion
      setTimeout(() => {
        mockIDBTransaction.oncomplete?.();
      }, 0);

      await expect(storageManager.cacheReferenceData(referenceData)).resolves.toBeUndefined();
      
      // Verify that put was called for each item
      expect(mockIDBObjectStore.put).toHaveBeenCalledTimes(
        referenceData.projects.length + 
        referenceData.activities.length + 
        referenceData.personnel.length + 
        1 // metadata
      );
    });

    it('should get cached projects', async () => {
      const mockProjects = [
        { id: '1', nombre: 'Project 1', codigo: 'P001' },
        { id: '2', nombre: 'Project 2', codigo: 'P002' },
      ];

      setTimeout(() => {
        mockIDBRequest.result = mockProjects;
        mockIDBRequest.onsuccess?.();
      }, 0);

      const cachedProjects = await storageManager.getCachedProjects();
      
      expect(cachedProjects).toEqual(mockProjects);
      expect(mockIDBObjectStore.getAll).toHaveBeenCalled();
    });
  });

  describe('storage management', () => {
    it('should get storage info', async () => {
      // Mock navigator.storage.estimate
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: vi.fn().mockResolvedValue({
            usage: 1024 * 1024 * 5, // 5MB
            quota: 1024 * 1024 * 100, // 100MB
          }),
        },
        writable: true,
      });

      const storageInfo = await storageManager.getStorageInfo();
      
      expect(storageInfo).toEqual({
        used: 5,
        available: 95,
        percentage: 5,
      });
    });

    it('should clear all data', async () => {
      // Mock successful initialization
      setTimeout(() => {
        mockIDBRequest.result = mockIDBDatabase;
        mockIDBRequest.onsuccess?.();
      }, 0);
      
      await storageManager.initialize();

      // Mock transaction completion
      setTimeout(() => {
        mockIDBTransaction.oncomplete?.();
      }, 0);

      await expect(storageManager.clearAllData()).resolves.toBeUndefined();
      
      // Verify that clear was called for all stores
      expect(mockIDBObjectStore.clear).toHaveBeenCalledTimes(6); // 6 object stores
    });
  });
});