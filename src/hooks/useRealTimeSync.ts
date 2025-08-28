/**
 * React hook for real-time synchronization
 * Provides real-time data updates, notifications, and conflict detection
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { JWTManager } from '@/lib/jwt';
import { logger } from '@/lib/logger';

// Event types from SSE
export interface SyncEventData {
  id: string;
  table: string;
  operation: 'create' | 'update' | 'delete';
  recordId: string;
  data?: any;
  timestamp: string;
  userId: string;
  userName: string;
}

export interface NotificationData {
  id: string;
  type: 'project_update' | 'stock_alert' | 'activity_complete' | 'assignment_change';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export interface ConflictData {
  id: string;
  table: string;
  recordId: string;
  field: string;
  conflictType: 'concurrent_edit' | 'version_mismatch' | 'data_integrity';
  timestamp: string;
}

export interface ConnectionStats {
  activeConnections: number;
  totalEvents: number;
  activeConflicts: number;
  pendingNotifications: number;
}

// Hook configuration
export interface RealTimeSyncConfig {
  tables?: string[];
  operations?: ('create' | 'update' | 'delete')[];
  projectId?: string;
  userId?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  onSyncEvent?: (event: SyncEventData) => void;
  onNotification?: (notification: NotificationData) => void;
  onConflict?: (conflict: ConflictData) => void;
  onConnectionChange?: (connected: boolean) => void;
}

// Hook return type
export interface RealTimeSyncReturn {
  connected: boolean;
  connectionId: string | null;
  stats: ConnectionStats | null;
  events: SyncEventData[];
  notifications: NotificationData[];
  conflicts: ConflictData[];
  connect: () => void;
  disconnect: () => void;
  clearEvents: () => void;
  clearNotifications: () => void;
  broadcastEvent: (event: Omit<SyncEventData, 'id' | 'timestamp' | 'userId' | 'userName'>) => Promise<void>;
}

/**
 * Real-time synchronization hook
 */
export function useRealTimeSync(config: RealTimeSyncConfig = {}): RealTimeSyncReturn {
  const {
    tables,
    operations,
    projectId,
    userId,
    autoReconnect = true,
    reconnectInterval = 5000,
    onSyncEvent,
    onNotification,
    onConflict,
    onConnectionChange
  } = config;

  // State
  const [connected, setConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [events, setEvents] = useState<SyncEventData[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Build SSE URL
  const buildSSEUrl = useCallback(() => {
    const token = JWTManager.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const params = new URLSearchParams();
    params.append('token', token);
    
    if (tables && tables.length > 0) {
      params.append('tables', tables.join(','));
    }
    
    if (operations && operations.length > 0) {
      params.append('operations', operations.join(','));
    }
    
    if (projectId) {
      params.append('projectId', projectId);
    }
    
    if (userId) {
      params.append('userId', userId);
    }

    return `/api/sync/events?${params.toString()}`;
  }, [tables, operations, projectId, userId]);

  // Connect to SSE
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return; // Already connected
    }

    try {
      const url = buildSSEUrl();
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnected(true);
        onConnectionChange?.(true);
        
        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        logger.info('SSE connection established');
      };

      eventSource.onerror = (error) => {
        logger.error('SSE connection error', { error });
        setConnected(false);
        onConnectionChange?.(false);

        // Auto-reconnect if enabled
        if (autoReconnect && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            disconnect();
            connect();
          }, reconnectInterval);
        }
      };

      // Handle connection confirmation
      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        setConnectionId(data.connectionId);
        logger.info('SSE connection confirmed', { connectionId: data.connectionId });
      });

      // Handle sync events
      eventSource.addEventListener('sync-event', (event) => {
        const syncEvent: SyncEventData = JSON.parse(event.data);
        
        setEvents(prev => {
          const updated = [syncEvent, ...prev].slice(0, 100); // Keep last 100 events
          return updated;
        });

        onSyncEvent?.(syncEvent);
        
        logger.info('Sync event received', {
          eventId: syncEvent.id,
          table: syncEvent.table,
          operation: syncEvent.operation
        });
      });

      // Handle notifications
      eventSource.addEventListener('notification', (event) => {
        const notification: NotificationData = JSON.parse(event.data);
        
        setNotifications(prev => {
          const updated = [notification, ...prev].slice(0, 50); // Keep last 50 notifications
          return updated;
        });

        onNotification?.(notification);
        
        logger.info('Notification received', {
          notificationId: notification.id,
          type: notification.type,
          priority: notification.priority
        });
      });

      // Handle conflicts
      eventSource.addEventListener('conflict', (event) => {
        const conflict: ConflictData = JSON.parse(event.data);
        
        setConflicts(prev => {
          const updated = [conflict, ...prev].slice(0, 20); // Keep last 20 conflicts
          return updated;
        });

        onConflict?.(conflict);
        
        logger.warn('Conflict detected', {
          conflictId: conflict.id,
          table: conflict.table,
          recordId: conflict.recordId
        });
      });

      // Handle heartbeat
      eventSource.addEventListener('heartbeat', (event) => {
        const data = JSON.parse(event.data);
        setStats(data.stats);
      });

    } catch (error) {
      logger.error('Error establishing SSE connection', { error });
      setConnected(false);
      onConnectionChange?.(false);
    }
  }, [buildSSEUrl, autoReconnect, reconnectInterval, onSyncEvent, onNotification, onConflict, onConnectionChange]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnected(false);
    setConnectionId(null);
    setStats(null);
    onConnectionChange?.(false);

    logger.info('SSE connection closed');
  }, [onConnectionChange]);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Broadcast event to other clients
  const broadcastEvent = useCallback(async (event: Omit<SyncEventData, 'id' | 'timestamp' | 'userId' | 'userName'>) => {
    const token = JWTManager.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    try {
      const response = await fetch('/api/sync/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Session-Id': sessionIdRef.current
        },
        body: JSON.stringify({
          ...event,
          sessionId: sessionIdRef.current
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to broadcast event: ${response.statusText}`);
      }

      const result = await response.json();
      logger.info('Event broadcasted successfully', {
        eventId: result.eventId,
        table: event.table,
        operation: event.operation
      });

    } catch (error) {
      logger.error('Error broadcasting event', { error, event });
      throw error;
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connected,
    connectionId,
    stats,
    events,
    notifications,
    conflicts,
    connect,
    disconnect,
    clearEvents,
    clearNotifications,
    broadcastEvent
  };
}