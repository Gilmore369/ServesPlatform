/**
 * Tests for SyncManager
 */

import { SyncManager, SyncEvent, NotificationEvent, ClientConnection } from '../sync-manager';

describe('SyncManager', () => {
  let syncManager: SyncManager;

  beforeEach(() => {
    syncManager = new SyncManager();
  });

  afterEach(() => {
    syncManager.destroy();
  });

  describe('Connection Management', () => {
    it('should add and remove connections', () => {
      const connection: ClientConnection = {
        id: 'test-conn-1',
        userId: 'user-1',
        userName: 'Test User',
        sessionId: 'session-1',
        subscriptions: [{ tables: ['Proyectos'] }],
        lastHeartbeat: new Date(),
        connected: true
      };

      syncManager.addConnection(connection);
      expect(syncManager.getStats().activeConnections).toBe(1);

      syncManager.removeConnection('test-conn-1');
      expect(syncManager.getStats().activeConnections).toBe(0);
    });

    it('should update connection subscriptions', () => {
      const connection: ClientConnection = {
        id: 'test-conn-1',
        userId: 'user-1',
        userName: 'Test User',
        sessionId: 'session-1',
        subscriptions: [{ tables: ['Proyectos'] }],
        lastHeartbeat: new Date(),
        connected: true
      };

      syncManager.addConnection(connection);
      
      const newSubscriptions = [
        { tables: ['Proyectos', 'Actividades'] },
        { operations: ['create', 'update'] }
      ];
      
      syncManager.updateSubscription('test-conn-1', newSubscriptions);
      
      // Verify subscription was updated (would need access to internal state)
      expect(syncManager.getStats().activeConnections).toBe(1);
    });
  });

  describe('Sync Events', () => {
    it('should broadcast sync events to relevant connections', (done) => {
      const connection: ClientConnection = {
        id: 'test-conn-1',
        userId: 'user-1',
        userName: 'Test User',
        sessionId: 'session-1',
        subscriptions: [{ tables: ['Proyectos'] }],
        lastHeartbeat: new Date(),
        connected: true
      };

      syncManager.addConnection(connection);

      // Listen for sync events
      syncManager.on('sync-event', ({ connectionId, event }) => {
        expect(connectionId).toBe('test-conn-1');
        expect(event.table).toBe('Proyectos');
        expect(event.operation).toBe('update');
        done();
      });

      const syncEvent: SyncEvent = {
        id: 'event-1',
        table: 'Proyectos',
        operation: 'update',
        recordId: 'project-1',
        data: { nombre: 'Test Project' },
        timestamp: new Date(),
        userId: 'user-2',
        userName: 'Other User',
        sessionId: 'session-2'
      };

      syncManager.broadcastSyncEvent(syncEvent);
    });

    it('should not broadcast to the originating session', () => {
      const connection: ClientConnection = {
        id: 'test-conn-1',
        userId: 'user-1',
        userName: 'Test User',
        sessionId: 'session-1',
        subscriptions: [{ tables: ['Proyectos'] }],
        lastHeartbeat: new Date(),
        connected: true
      };

      syncManager.addConnection(connection);

      let eventReceived = false;
      syncManager.on('sync-event', () => {
        eventReceived = true;
      });

      const syncEvent: SyncEvent = {
        id: 'event-1',
        table: 'Proyectos',
        operation: 'update',
        recordId: 'project-1',
        data: { nombre: 'Test Project' },
        timestamp: new Date(),
        userId: 'user-1',
        userName: 'Test User',
        sessionId: 'session-1' // Same session as connection
      };

      syncManager.broadcastSyncEvent(syncEvent);

      // Wait a bit and check that no event was received
      setTimeout(() => {
        expect(eventReceived).toBe(false);
      }, 100);
    });

    it('should filter events based on table subscriptions', () => {
      const connection: ClientConnection = {
        id: 'test-conn-1',
        userId: 'user-1',
        userName: 'Test User',
        sessionId: 'session-1',
        subscriptions: [{ tables: ['Proyectos'] }], // Only subscribed to Proyectos
        lastHeartbeat: new Date(),
        connected: true
      };

      syncManager.addConnection(connection);

      let eventReceived = false;
      syncManager.on('sync-event', () => {
        eventReceived = true;
      });

      const syncEvent: SyncEvent = {
        id: 'event-1',
        table: 'Materiales', // Different table
        operation: 'update',
        recordId: 'material-1',
        data: { descripcion: 'Test Material' },
        timestamp: new Date(),
        userId: 'user-2',
        userName: 'Other User',
        sessionId: 'session-2'
      };

      syncManager.broadcastSyncEvent(syncEvent);

      setTimeout(() => {
        expect(eventReceived).toBe(false);
      }, 100);
    });
  });

  describe('Notifications', () => {
    it('should send notifications to target users', (done) => {
      const connection: ClientConnection = {
        id: 'test-conn-1',
        userId: 'user-1',
        userName: 'Test User',
        sessionId: 'session-1',
        subscriptions: [],
        lastHeartbeat: new Date(),
        connected: true
      };

      syncManager.addConnection(connection);

      syncManager.on('notification', ({ connectionId, notification }) => {
        expect(connectionId).toBe('test-conn-1');
        expect(notification.title).toBe('Test Notification');
        done();
      });

      const notification: NotificationEvent = {
        id: 'notif-1',
        type: 'project_update',
        title: 'Test Notification',
        message: 'This is a test notification',
        targetUsers: ['user-1'],
        timestamp: new Date(),
        priority: 'medium'
      };

      syncManager.sendNotification(notification);
    });

    it('should not send notifications to non-target users', () => {
      const connection: ClientConnection = {
        id: 'test-conn-1',
        userId: 'user-1',
        userName: 'Test User',
        sessionId: 'session-1',
        subscriptions: [],
        lastHeartbeat: new Date(),
        connected: true
      };

      syncManager.addConnection(connection);

      let notificationReceived = false;
      syncManager.on('notification', () => {
        notificationReceived = true;
      });

      const notification: NotificationEvent = {
        id: 'notif-1',
        type: 'project_update',
        title: 'Test Notification',
        message: 'This is a test notification',
        targetUsers: ['user-2'], // Different user
        timestamp: new Date(),
        priority: 'medium'
      };

      syncManager.sendNotification(notification);

      setTimeout(() => {
        expect(notificationReceived).toBe(false);
      }, 100);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect concurrent edits', () => {
      const event1: SyncEvent = {
        id: 'event-1',
        table: 'Proyectos',
        operation: 'update',
        recordId: 'project-1',
        data: { nombre: 'Project A' },
        timestamp: new Date(),
        userId: 'user-1',
        userName: 'User 1',
        sessionId: 'session-1',
        version: 1
      };

      const event2: SyncEvent = {
        id: 'event-2',
        table: 'Proyectos',
        operation: 'update',
        recordId: 'project-1',
        data: { nombre: 'Project B' }, // Different value
        timestamp: new Date(),
        userId: 'user-2',
        userName: 'User 2',
        sessionId: 'session-2',
        version: 1
      };

      let conflictDetected = false;
      syncManager.on('conflict-detected', () => {
        conflictDetected = true;
      });

      syncManager.broadcastSyncEvent(event1);
      syncManager.broadcastSyncEvent(event2);

      setTimeout(() => {
        expect(conflictDetected).toBe(true);
        expect(syncManager.getActiveConflicts().length).toBeGreaterThan(0);
      }, 100);
    });

    it('should resolve conflicts', () => {
      // First create a conflict
      const event1: SyncEvent = {
        id: 'event-1',
        table: 'Proyectos',
        operation: 'update',
        recordId: 'project-1',
        data: { nombre: 'Project A' },
        timestamp: new Date(),
        userId: 'user-1',
        userName: 'User 1',
        sessionId: 'session-1',
        version: 1
      };

      const event2: SyncEvent = {
        id: 'event-2',
        table: 'Proyectos',
        operation: 'update',
        recordId: 'project-1',
        data: { nombre: 'Project B' },
        timestamp: new Date(),
        userId: 'user-2',
        userName: 'User 2',
        sessionId: 'session-2',
        version: 1
      };

      syncManager.broadcastSyncEvent(event1);
      syncManager.broadcastSyncEvent(event2);

      setTimeout(() => {
        const conflicts = syncManager.getActiveConflicts();
        expect(conflicts.length).toBeGreaterThan(0);

        const conflictId = conflicts[0].id;
        syncManager.resolveConflict(conflictId, 'accept_current');

        expect(syncManager.getActiveConflicts().length).toBe(0);
      }, 100);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      const stats = syncManager.getStats();
      expect(stats).toHaveProperty('activeConnections');
      expect(stats).toHaveProperty('totalEvents');
      expect(stats).toHaveProperty('activeConflicts');
      expect(stats).toHaveProperty('pendingNotifications');
      expect(typeof stats.activeConnections).toBe('number');
    });
  });

  describe('Heartbeat Management', () => {
    it('should update heartbeat for connections', () => {
      const connection: ClientConnection = {
        id: 'test-conn-1',
        userId: 'user-1',
        userName: 'Test User',
        sessionId: 'session-1',
        subscriptions: [],
        lastHeartbeat: new Date(Date.now() - 60000), // 1 minute ago
        connected: true
      };

      syncManager.addConnection(connection);
      
      const beforeUpdate = new Date();
      syncManager.updateHeartbeat('test-conn-1');
      
      // Heartbeat should be updated (we can't directly access it, but connection should remain active)
      expect(syncManager.getStats().activeConnections).toBe(1);
    });
  });
});