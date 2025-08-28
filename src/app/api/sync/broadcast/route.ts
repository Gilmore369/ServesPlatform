/**
 * API endpoint for broadcasting sync events
 * Used by CRUD operations to notify connected clients of data changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncManager, SyncEvent } from '@/lib/sync/sync-manager';
import { JWTManager } from '@/lib/jwt';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { ok: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let user;
    try {
      user = JWTManager.verifyToken(token);
      if (!user) {
        return NextResponse.json(
          { ok: false, message: 'Invalid token' },
          { status: 401 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { ok: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      table,
      operation,
      recordId,
      data,
      previousData,
      version,
      sessionId
    } = body;

    // Validate required fields
    if (!table || !operation || !recordId) {
      return NextResponse.json(
        { ok: false, message: 'Missing required fields: table, operation, recordId' },
        { status: 400 }
      );
    }

    // Validate operation type
    if (!['create', 'update', 'delete'].includes(operation)) {
      return NextResponse.json(
        { ok: false, message: 'Invalid operation type' },
        { status: 400 }
      );
    }

    // Create sync event
    const syncEvent: SyncEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      table,
      operation,
      recordId,
      data,
      previousData,
      timestamp: new Date(),
      userId: user.id,
      userName: user.nombre,
      sessionId: sessionId || `session_${user.id}_${Date.now()}`,
      version
    };

    // Broadcast the event
    syncManager.broadcastSyncEvent(syncEvent);

    logger.info('Sync event broadcasted via API', {
      eventId: syncEvent.id,
      table,
      operation,
      recordId,
      userId: user.id
    });

    return NextResponse.json({
      ok: true,
      message: 'Sync event broadcasted successfully',
      eventId: syncEvent.id,
      timestamp: syncEvent.timestamp
    });

  } catch (error) {
    logger.error('Error broadcasting sync event', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { ok: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
  });
}