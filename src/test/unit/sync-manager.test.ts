import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SyncManager, SyncEvent, SyncStatus } from '@/lib/sync/sync-manager'
import { OfflineStorageManager } from '@/lib/offline/offline-storage'

// Mock dependencies
vi.mock('@/lib/offline/offline-storage')
vi.mock('@/lib/google-sheets-api-service')

describe('SyncManager', () => {
  let syncManager: SyncManager
  let mockOfflineStorage: any
  let mockEventListeners: Map<string, Function[]>

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockEventListeners = new Map()
    mockOfflineStorage = {
      getPendingOperations: vi.fn(),
      markOperationSynced: vi.fn(),
      addPendingOperation: vi.fn(),
      clearSyncedOperations: vi.fn()
    }

    vi.mocked(OfflineStorageManager).mockImplementation(() => mockOfflineStorage)

    syncManager = new SyncManager()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Event Subscription', () => {
    it('should subscribe to table changes', () => {
      const callback = vi.fn()
      
      syncManager.subscribeToChanges('Materiales', callback)
      
      // Simulate a change event
      const event: SyncEvent = {
        table: 'Materiales',
        operation: 'create',
        recordId: 'MAT-001',
        timestamp: new Date(),
        userId: 'user123',
        data: { name: 'New Material' }
      }

      syncManager.broadcastChange(event)
      
      expect(callback).toHaveBeenCalledWith(event)
    })

    it('should handle multiple subscribers for the same table', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      
      syncManager.subscribeToChanges('Materiales', callback1)
      syncManager.subscribeToChanges('Materiales', callback2)
      
      const event: SyncEvent = {
        table: 'Materiales',
        operation: 'update',
        recordId: 'MAT-001',
        timestamp: new Date(),
        userId: 'user123',
        data: { stock: 25 }
      }

      syncManager.broadcastChange(event)
      
      expect(callback1).toHaveBeenCalledWith(event)
      expect(callback2).toHaveBeenCalledWith(event)
    })

    it('should unsubscribe from changes', () => {
      const callback = vi.fn()
      
      const unsubscribe = syncManager.subscribeToChanges('Materiales', callback)
      unsubscribe()
      
      const event: SyncEvent = {
        table: 'Materiales',
        operation: 'delete',
        recordId: 'MAT-001',
        timestamp: new Date(),
        userId: 'user123'
      }

      syncManager.broadcastChange(event)
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Sync Status Management', () => {
    it('should track sync status for tables', () => {
      const now = new Date()
      syncManager.updateLastSync('Materiales', now)
      
      const lastSync = syncManager.getLastSync('Materiales')
      expect(lastSync).toEqual(now)
    })

    it('should return null for tables never synced', () => {
      const lastSync = syncManager.getLastSync('NeverSyncedTable')
      expect(lastSync).toBeNull()
    })

    it('should track sync status', () => {
      syncManager.setSyncStatus('Materiales', SyncStatus.SYNCING)
      expect(syncManager.getSyncStatus('Materiales')).toBe(SyncStatus.SYNCING)
      
      syncManager.setSyncStatus('Materiales', SyncStatus.SYNCED)
      expect(syncManager.getSyncStatus('Materiales')).toBe(SyncStatus.SYNCED)
    })
  })

  describe('Offline Operation Management', () => {
    it('should queue operations when offline', async () => {
      const operation = {
        table: 'Materiales',
        operation: 'create' as const,
        data: { name: 'Offline Material' },
        timestamp: new Date()
      }

      await syncManager.queueOfflineOperation(operation)
      
      expect(mockOfflineStorage.addPendingOperation).toHaveBeenCalledWith(operation)
    })

    it('should sync pending operations when online', async () => {
      const pendingOperations = [
        {
          id: '1',
          table: 'Materiales',
          operation: 'create' as const,
          data: { name: 'Material 1' },
          timestamp: new Date()
        },
        {
          id: '2',
          table: 'Materiales',
          operation: 'update' as const,
          data: { name: 'Updated Material' },
          recordId: 'MAT-001',
          timestamp: new Date()
        }
      ]

      mockOfflineStorage.getPendingOperations.mockResolvedValue(pendingOperations)

      // Mock successful API calls
      const mockApiService = {
        executeOperation: vi.fn().mockResolvedValue({ ok: true, data: { id: 'new-id' } })
      }

      const syncResult = await syncManager.syncPendingOperations(mockApiService as any)
      
      expect(syncResult.successful).toBe(2)
      expect(syncResult.failed).toBe(0)
      expect(mockOfflineStorage.markOperationSynced).toHaveBeenCalledTimes(2)
    })

    it('should handle sync failures gracefully', async () => {
      const pendingOperations = [
        {
          id: '1',
          table: 'Materiales',
          operation: 'create' as const,
          data: { name: 'Material 1' },
          timestamp: new Date()
        },
        {
          id: '2',
          table: 'InvalidTable',
          operation: 'create' as const,
          data: { name: 'Invalid' },
          timestamp: new Date()
        }
      ]

      mockOfflineStorage.getPendingOperations.mockResolvedValue(pendingOperations)

      const mockApiService = {
        executeOperation: vi.fn()
          .mockResolvedValueOnce({ ok: true, data: { id: 'new-id' } })
          .mockResolvedValueOnce({ ok: false, status: 400, message: 'Invalid table' })
      }

      const syncResult = await syncManager.syncPendingOperations(mockApiService as any)
      
      expect(syncResult.successful).toBe(1)
      expect(syncResult.failed).toBe(1)
      expect(syncResult.errors).toHaveLength(1)
      expect(mockOfflineStorage.markOperationSynced).toHaveBeenCalledTimes(1)
    })
  })

  describe('Real-time Sync', () => {
    it('should start real-time sync', () => {
      const mockWebSocket = {
        addEventListener: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        readyState: WebSocket.OPEN
      }

      // Mock WebSocket constructor
      global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket)

      syncManager.startRealTimeSync('ws://localhost:8080/sync')
      
      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8080/sync')
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('should handle WebSocket messages', () => {
      const callback = vi.fn()
      syncManager.subscribeToChanges('Materiales', callback)

      const mockWebSocket = {
        addEventListener: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        readyState: WebSocket.OPEN
      }

      global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket)

      syncManager.startRealTimeSync('ws://localhost:8080/sync')
      
      // Get the message handler
      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')[1]

      // Simulate receiving a sync event
      const syncEvent: SyncEvent = {
        table: 'Materiales',
        operation: 'update',
        recordId: 'MAT-001',
        timestamp: new Date(),
        userId: 'user456',
        data: { stock: 30 }
      }

      messageHandler({
        data: JSON.stringify(syncEvent)
      })

      expect(callback).toHaveBeenCalledWith(syncEvent)
    })

    it('should stop real-time sync', () => {
      const mockWebSocket = {
        addEventListener: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        readyState: WebSocket.OPEN
      }

      global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket)

      syncManager.startRealTimeSync('ws://localhost:8080/sync')
      syncManager.stopRealTimeSync()
      
      expect(mockWebSocket.close).toHaveBeenCalled()
    })
  })

  describe('Conflict Resolution', () => {
    it('should detect conflicts based on timestamps', () => {
      const localChange = {
        recordId: 'MAT-001',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        data: { stock: 25 }
      }

      const remoteChange = {
        recordId: 'MAT-001',
        timestamp: new Date('2024-01-01T10:05:00Z'),
        data: { stock: 30 }
      }

      const hasConflict = syncManager.detectConflict(localChange, remoteChange)
      expect(hasConflict).toBe(true)
    })

    it('should resolve conflicts using last-write-wins strategy', () => {
      const localChange = {
        recordId: 'MAT-001',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        data: { stock: 25, description: 'Local change' }
      }

      const remoteChange = {
        recordId: 'MAT-001',
        timestamp: new Date('2024-01-01T10:05:00Z'),
        data: { stock: 30, description: 'Remote change' }
      }

      const resolved = syncManager.resolveConflict(localChange, remoteChange, 'last-write-wins')
      
      expect(resolved.timestamp).toEqual(remoteChange.timestamp)
      expect(resolved.data).toEqual(remoteChange.data)
    })

    it('should resolve conflicts using merge strategy', () => {
      const localChange = {
        recordId: 'MAT-001',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        data: { stock: 25, description: 'Local description', category: 'Tools' }
      }

      const remoteChange = {
        recordId: 'MAT-001',
        timestamp: new Date('2024-01-01T10:05:00Z'),
        data: { stock: 30, location: 'Warehouse A' }
      }

      const resolved = syncManager.resolveConflict(localChange, remoteChange, 'merge')
      
      expect(resolved.data).toEqual({
        stock: 30, // Remote wins for conflicting field
        description: 'Local description', // Local field preserved
        category: 'Tools', // Local field preserved
        location: 'Warehouse A' // Remote field added
      })
    })
  })

  describe('Sync Statistics', () => {
    it('should track sync statistics', async () => {
      const pendingOperations = [
        {
          id: '1',
          table: 'Materiales',
          operation: 'create' as const,
          data: { name: 'Material 1' },
          timestamp: new Date()
        }
      ]

      mockOfflineStorage.getPendingOperations.mockResolvedValue(pendingOperations)

      const mockApiService = {
        executeOperation: vi.fn().mockResolvedValue({ ok: true, data: { id: 'new-id' } })
      }

      await syncManager.syncPendingOperations(mockApiService as any)
      
      const stats = syncManager.getSyncStatistics()
      
      expect(stats.totalOperationsSynced).toBe(1)
      expect(stats.successfulSyncs).toBe(1)
      expect(stats.failedSyncs).toBe(0)
      expect(stats.lastSyncAttempt).toBeInstanceOf(Date)
    })

    it('should reset sync statistics', () => {
      // Perform some operations to generate stats
      syncManager.setSyncStatus('Materiales', SyncStatus.SYNCED)
      
      let stats = syncManager.getSyncStatistics()
      expect(stats.totalOperationsSynced).toBeGreaterThanOrEqual(0)
      
      syncManager.resetSyncStatistics()
      
      stats = syncManager.getSyncStatistics()
      expect(stats.totalOperationsSynced).toBe(0)
      expect(stats.successfulSyncs).toBe(0)
      expect(stats.failedSyncs).toBe(0)
    })
  })

  describe('Network Status Integration', () => {
    it('should handle online/offline status changes', () => {
      const onlineCallback = vi.fn()
      const offlineCallback = vi.fn()

      syncManager.onNetworkStatusChange(onlineCallback, offlineCallback)

      // Simulate going offline
      syncManager.setNetworkStatus(false)
      expect(offlineCallback).toHaveBeenCalled()

      // Simulate going online
      syncManager.setNetworkStatus(true)
      expect(onlineCallback).toHaveBeenCalled()
    })

    it('should automatically sync when coming back online', async () => {
      const pendingOperations = [
        {
          id: '1',
          table: 'Materiales',
          operation: 'create' as const,
          data: { name: 'Offline Material' },
          timestamp: new Date()
        }
      ]

      mockOfflineStorage.getPendingOperations.mockResolvedValue(pendingOperations)

      const mockApiService = {
        executeOperation: vi.fn().mockResolvedValue({ ok: true, data: { id: 'new-id' } })
      }

      // Set up auto-sync
      syncManager.enableAutoSync(mockApiService as any)

      // Simulate coming back online
      syncManager.setNetworkStatus(true)

      // Wait for auto-sync to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockApiService.executeOperation).toHaveBeenCalled()
    })
  })
})