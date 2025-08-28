/**
 * Server-Sent Events (SSE) API endpoint for real-time synchronization
 */

import { NextRequest } from 'next/server';
import { syncManager, ClientConnection, SubscriptionConfig } from '@/lib/sync/sync-manager';
import { JWTManager } from '@/lib/jwt';
import { logger } from '@/lib/logger';

// SSE Response helper
class SSEResponse {
  private encoder = new TextEncoder();
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;

  constructor(controller: ReadableStreamDefaultController<Uint8Array>) {
    this.controller = controller;
  }

  send(event: string, data: any, id?: string): void {
    if (!this.controller) return;

    let message = '';
    if (id) {
      message += `id: ${id}\n`;
    }
    message += `event: ${event}\n`;
    message += `data: ${JSON.stringify(data)}\n\n`;

    try {
      this.controller.enqueue(this.encoder.encode(message));
    } catch (error) {
      logger.error('Error sending SSE message', { error, event, id });
    }
  }

  close(): void {
    if (this.controller) {
      try {
        this.controller.close();
      } catch (error) {
        logger.error('Error closing SSE stream', { error });
      }
      this.controller = null;
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Extract authentication and subscription parameters
  const token = searchParams.get('token') || request.headers.get('authorization')?.replace('Bearer ', '');
  const tablesParam = searchParams.get('tables');
  const operationsParam = searchParams.get('operations');
  const projectId = searchParams.get('projectId');
  const userId = searchParams.get('userId');

  // Validate authentication
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  let user;
  try {
    user = JWTManager.verifyToken(token);
    if (!user) {
      return new Response('Invalid token', { status: 401 });
    }
  } catch (error) {
    logger.error('JWT verification failed', { error });
    return new Response('Invalid token', { status: 401 });
  }

  // Parse subscription configuration
  const subscriptions: SubscriptionConfig[] = [{
    tables: tablesParam ? tablesParam.split(',') : undefined,
    operations: operationsParam ? operationsParam.split(',') as ('create' | 'update' | 'delete')[] : undefined,
    userId: userId || undefined,
    projectId: projectId || undefined
  }];

  // Create connection ID
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const sessionId = request.headers.get('x-session-id') || connectionId;

  logger.info('SSE connection established', {
    connectionId,
    userId: user.id,
    userName: user.nombre,
    subscriptions: subscriptions.length
  });

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const sseResponse = new SSEResponse(controller);

      // Create client connection
      const connection: ClientConnection = {
        id: connectionId,
        userId: user.id,
        userName: user.nombre,
        sessionId,
        subscriptions,
        lastHeartbeat: new Date(),
        connected: true
      };

      // Add connection to sync manager
      syncManager.addConnection(connection);

      // Send initial connection confirmation
      sseResponse.send('connected', {
        connectionId,
        timestamp: new Date().toISOString(),
        subscriptions
      });

      // Setup event listeners
      const handleSyncEvent = ({ connectionId: targetConnectionId, event }: any) => {
        if (targetConnectionId === connectionId) {
          sseResponse.send('sync-event', {
            id: event.id,
            table: event.table,
            operation: event.operation,
            recordId: event.recordId,
            data: event.data,
            timestamp: event.timestamp,
            userId: event.userId,
            userName: event.userName
          }, event.id);
        }
      };

      const handleNotification = ({ connectionId: targetConnectionId, notification }: any) => {
        if (targetConnectionId === connectionId) {
          sseResponse.send('notification', {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            priority: notification.priority,
            timestamp: notification.timestamp
          }, notification.id);
        }
      };

      const handleConflictDetected = (conflict: any) => {
        // Send conflict notifications to relevant connections
        if (connection.subscriptions.some(sub => 
          !sub.tables || sub.tables.includes(conflict.table)
        )) {
          sseResponse.send('conflict', {
            id: conflict.id,
            table: conflict.table,
            recordId: conflict.recordId,
            field: conflict.field,
            conflictType: conflict.conflictType,
            timestamp: conflict.timestamp
          }, conflict.id);
        }
      };

      // Register event listeners
      syncManager.on('sync-event', handleSyncEvent);
      syncManager.on('notification', handleNotification);
      syncManager.on('conflict-detected', handleConflictDetected);

      // Setup heartbeat
      const heartbeatInterval = setInterval(() => {
        if (connection.connected) {
          sseResponse.send('heartbeat', {
            timestamp: new Date().toISOString(),
            stats: syncManager.getStats()
          });
          syncManager.updateHeartbeat(connectionId);
        }
      }, 30000); // Every 30 seconds

      // Cleanup function
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        syncManager.removeListener('sync-event', handleSyncEvent);
        syncManager.removeListener('notification', handleNotification);
        syncManager.removeListener('conflict-detected', handleConflictDetected);
        syncManager.removeConnection(connectionId);
        sseResponse.close();
        
        logger.info('SSE connection closed', {
          connectionId,
          userId: user.id
        });
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup);

      // Store cleanup function for manual cleanup
      (controller as any).cleanup = cleanup;
    },

    cancel() {
      // Cleanup when stream is cancelled
      if ((this as any).cleanup) {
        (this as any).cleanup();
      }
    }
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    }
  });
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    }
  });
}