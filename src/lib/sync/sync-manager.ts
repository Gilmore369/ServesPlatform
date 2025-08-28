/**
 * Real-time Synchronization Manager
 * Handles real-time data synchronization, notifications, and conflict detection
 */

import { EventEmitter } from 'events';
import { cacheManager } from '../cache/cache-manager';
import { logger } from '../logger';

// Sync Event Types
export interface SyncEvent {
  id: string;
  table: string;
  operation: 'create' | 'update' | 'delete';
  recordId: string;
  data?: any;
  previousData?: any;
  timestamp: Date;
  userId: string;
  userName: string;
  sessionId: string;
  version?: number;
}

// Notification Event Types
export interface NotificationEvent {
  id: string;
  type: 'project_update' | 'stock_alert' | 'activity_complete' | 'assignment_change';
  title: string;
  message: string;
  data?: any;
  targetUsers: string[];
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Conflict Detection
export interface DataConflict {
  id: string;
  table: string;
  recordId: string;
  field: string;
  currentValue: any;
  incomingValue: any;
  currentVersion: number;
  incomingVersion: number;
  timestamp: Date;
  conflictType: 'concurrent_edit' | 'version_mismatch' | 'data_integrity';
}

// Subscription Configuration
export interface SubscriptionConfig {
  tables?: string[];
  operations?: ('create' | 'update' | 'delete')[];
  userId?: string;
  projectId?: string;
  filters?: Record<string, any>;
}

// Client Connection
export interface ClientConnection {
  id: string;
  userId: string;
  userName: string;
  sessionId: string;
  subscriptions: SubscriptionConfig[];
  lastHeartbeat: Date;
  connected: boolean;
}

/**
 * Real-time Sync Manager
 * Manages real-time synchronization, notifications, and conflict detection
 */
export class SyncManager extends EventEmitter {
  private connections: Map<string, ClientConnection> = new Map();
  private syncEvents: SyncEvent[] = [];
  private notifications: NotificationEvent[] = [];
  private conflicts: DataConflict[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startHeartbeat();
    this.startCleanup();
  }

  /**
   * Add a client connection
   */
  addConnection(connection: ClientConnection): void {
    this.connections.set(connection.id, connection);
    logger.info('Client connected to sync manager', {
      connectionId: connection.id,
      userId: connection.userId,
      subscriptions: connection.subscriptions.length
    });

    // Send recent events to new connection
    this.sendRecentEvents(connection.id);
  }

  /**
   * Remove a client connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      logger.info('Client disconnected from sync manager', {
        connectionId,
        userId: connection.userId
      });
    }
  }

  /**
   * Update client subscription
   */
  updateSubscription(connectionId: string, subscriptions: SubscriptionConfig[]): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscriptions = subscriptions;
      logger.info('Client subscription updated', {
        connectionId,
        subscriptions: subscriptions.length
      });
    }
  }

  /**
   * Broadcast a sync event to relevant clients
   */
  broadcastSyncEvent(event: SyncEvent): void {
    // Store event
    this.syncEvents.push(event);
    this.trimEventHistory();

    // Detect conflicts
    this.detectConflicts(event);

    // Find relevant connections
    const relevantConnections = this.findRelevantConnections(event);

    // Broadcast to relevant clients
    relevantConnections.forEach(connection => {
      this.emit('sync-event', {
        connectionId: connection.id,
        event
      });
    });

    // Invalidate cache
    this.invalidateCache(event);

    logger.info('Sync event broadcasted', {
      eventId: event.id,
      table: event.table,
      operation: event.operation,
      relevantConnections: relevantConnections.length
    });
  }

  /**
   * Send notification to specific users
   */
  sendNotification(notification: NotificationEvent): void {
    // Store notification
    this.notifications.push(notification);
    this.trimNotificationHistory();

    // Find target connections
    const targetConnections = Array.from(this.connections.values())
      .filter(conn => notification.targetUsers.includes(conn.userId));

    // Send to target clients
    targetConnections.forEach(connection => {
      this.emit('notification', {
        connectionId: connection.id,
        notification
      });
    });

    logger.info('Notification sent', {
      notificationId: notification.id,
      type: notification.type,
      targetUsers: notification.targetUsers.length,
      targetConnections: targetConnections.length
    });
  }

  /**
   * Get recent sync events for a table
   */
  getRecentEvents(table: string, since?: Date): SyncEvent[] {
    const sinceTime = since || new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes
    return this.syncEvents.filter(event => 
      event.table === table && event.timestamp >= sinceTime
    );
  }

  /**
   * Get active conflicts
   */
  getActiveConflicts(table?: string, recordId?: string): DataConflict[] {
    return this.conflicts.filter(conflict => {
      if (table && conflict.table !== table) return false;
      if (recordId && conflict.recordId !== recordId) return false;
      return true;
    });
  }

  /**
   * Resolve a conflict
   */
  resolveConflict(conflictId: string, resolution: 'accept_current' | 'accept_incoming' | 'merge'): void {
    const conflictIndex = this.conflicts.findIndex(c => c.id === conflictId);
    if (conflictIndex >= 0) {
      const conflict = this.conflicts[conflictIndex];
      this.conflicts.splice(conflictIndex, 1);

      logger.info('Conflict resolved', {
        conflictId,
        resolution,
        table: conflict.table,
        recordId: conflict.recordId
      });

      // Emit conflict resolution event
      this.emit('conflict-resolved', {
        conflict,
        resolution
      });
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    activeConnections: number;
    totalEvents: number;
    activeConflicts: number;
    pendingNotifications: number;
  } {
    return {
      activeConnections: this.connections.size,
      totalEvents: this.syncEvents.length,
      activeConflicts: this.conflicts.length,
      pendingNotifications: this.notifications.length
    };
  }

  /**
   * Update heartbeat for a connection
   */
  updateHeartbeat(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastHeartbeat = new Date();
      connection.connected = true;
    }
  }

  /**
   * Find connections relevant to a sync event
   */
  private findRelevantConnections(event: SyncEvent): ClientConnection[] {
    return Array.from(this.connections.values()).filter(connection => {
      // Skip the connection that originated the event
      if (connection.sessionId === event.sessionId) {
        return false;
      }

      // Check if any subscription matches
      return connection.subscriptions.some(sub => {
        // Check table filter
        if (sub.tables && !sub.tables.includes(event.table)) {
          return false;
        }

        // Check operation filter
        if (sub.operations && !sub.operations.includes(event.operation)) {
          return false;
        }

        // Check user filter
        if (sub.userId && sub.userId !== event.userId) {
          return false;
        }

        // Check project filter (if event data contains project info)
        if (sub.projectId && event.data?.proyecto_id !== sub.projectId) {
          return false;
        }

        return true;
      });
    });
  }

  /**
   * Detect conflicts in incoming sync events
   */
  private detectConflicts(event: SyncEvent): void {
    if (event.operation !== 'update') return;

    // Look for recent events on the same record
    const recentEvents = this.syncEvents.filter(e => 
      e.table === event.table &&
      e.recordId === event.recordId &&
      e.operation === 'update' &&
      e.id !== event.id &&
      e.timestamp > new Date(Date.now() - 30000) // Last 30 seconds
    );

    recentEvents.forEach(recentEvent => {
      if (this.hasDataConflict(event, recentEvent)) {
        const conflict: DataConflict = {
          id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          table: event.table,
          recordId: event.recordId,
          field: 'multiple', // Could be enhanced to detect specific fields
          currentValue: recentEvent.data,
          incomingValue: event.data,
          currentVersion: recentEvent.version || 1,
          incomingVersion: event.version || 1,
          timestamp: new Date(),
          conflictType: 'concurrent_edit'
        };

        this.conflicts.push(conflict);

        logger.warn('Data conflict detected', {
          conflictId: conflict.id,
          table: event.table,
          recordId: event.recordId
        });

        // Emit conflict event
        this.emit('conflict-detected', conflict);
      }
    });
  }

  /**
   * Check if two events have conflicting data
   */
  private hasDataConflict(event1: SyncEvent, event2: SyncEvent): boolean {
    if (!event1.data || !event2.data) return false;

    // Simple conflict detection - could be enhanced
    const keys1 = Object.keys(event1.data);
    const keys2 = Object.keys(event2.data);
    
    // Check if they modify the same fields with different values
    return keys1.some(key => 
      keys2.includes(key) && 
      event1.data[key] !== event2.data[key]
    );
  }

  /**
   * Send recent events to a new connection
   */
  private sendRecentEvents(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const recentTime = new Date(Date.now() - 2 * 60 * 1000); // Last 2 minutes
    const recentEvents = this.syncEvents.filter(event => 
      event.timestamp >= recentTime
    );

    recentEvents.forEach(event => {
      if (this.findRelevantConnections(event).some(c => c.id === connectionId)) {
        this.emit('sync-event', {
          connectionId,
          event
        });
      }
    });
  }

  /**
   * Invalidate cache based on sync event
   */
  private invalidateCache(event: SyncEvent): void {
    // Invalidate cache for the affected table
    cacheManager.invalidateByOperation(event.table, event.operation as any);

    // Invalidate related caches based on table relationships
    this.invalidateRelatedCaches(event);
  }

  /**
   * Invalidate related caches based on table relationships
   */
  private invalidateRelatedCaches(event: SyncEvent): void {
    const relationships: Record<string, string[]> = {
      'Proyectos': ['Actividades', 'Asignaciones', 'BOM', 'SolicitudCompra'],
      'Actividades': ['Proyectos', 'Asignaciones', 'RegistroHoras', 'Evidencias'],
      'Materiales': ['BOM', 'SolicitudCompra'],
      'Personal': ['Asignaciones', 'RegistroHoras'],
      'Usuarios': ['Proyectos', 'Actividades', 'Asignaciones']
    };

    const relatedTables = relationships[event.table] || [];
    relatedTables.forEach(table => {
      cacheManager.invalidateByOperation(table, 'list');
    });
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = 60000; // 1 minute timeout

      this.connections.forEach((connection, connectionId) => {
        if (now.getTime() - connection.lastHeartbeat.getTime() > timeout) {
          connection.connected = false;
          logger.warn('Connection heartbeat timeout', {
            connectionId,
            userId: connection.userId,
            lastHeartbeat: connection.lastHeartbeat
          });
        }
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Start cleanup of old data
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.trimEventHistory();
      this.trimNotificationHistory();
      this.cleanupOldConflicts();
      this.cleanupDisconnectedClients();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Trim event history to prevent memory leaks
   */
  private trimEventHistory(): void {
    const maxEvents = 1000;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoffTime = new Date(Date.now() - maxAge);

    this.syncEvents = this.syncEvents
      .filter(event => event.timestamp >= cutoffTime)
      .slice(-maxEvents);
  }

  /**
   * Trim notification history
   */
  private trimNotificationHistory(): void {
    const maxNotifications = 500;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoffTime = new Date(Date.now() - maxAge);

    this.notifications = this.notifications
      .filter(notification => notification.timestamp >= cutoffTime)
      .slice(-maxNotifications);
  }

  /**
   * Cleanup old conflicts
   */
  private cleanupOldConflicts(): void {
    const maxAge = 60 * 60 * 1000; // 1 hour
    const cutoffTime = new Date(Date.now() - maxAge);

    this.conflicts = this.conflicts.filter(conflict => 
      conflict.timestamp >= cutoffTime
    );
  }

  /**
   * Cleanup disconnected clients
   */
  private cleanupDisconnectedClients(): void {
    const timeout = 5 * 60 * 1000; // 5 minutes
    const cutoffTime = new Date(Date.now() - timeout);

    this.connections.forEach((connection, connectionId) => {
      if (connection.lastHeartbeat < cutoffTime) {
        this.removeConnection(connectionId);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.connections.clear();
    this.syncEvents = [];
    this.notifications = [];
    this.conflicts = [];
    this.removeAllListeners();
  }
}

// Export singleton instance
export const syncManager = new SyncManager();