/**
 * Example component demonstrating real-time sync usage
 * This shows how to integrate sync functionality into existing pages
 */

'use client';

import React, { useState } from 'react';
import { useRealTimeSync } from '@/hooks/useRealTimeSync';
import { RealTimeNotifications } from './RealTimeNotifications';
import { ConflictResolution } from './ConflictResolution';
import { syncManager } from '@/lib/sync';
import { Wifi, WifiOff, Activity, Bell, AlertTriangle } from 'lucide-react';

interface SyncExampleProps {
  projectId?: string;
  className?: string;
}

export function SyncExample({ projectId, className = '' }: SyncExampleProps) {
  const [selectedTables, setSelectedTables] = useState<string[]>(['Proyectos', 'Actividades']);

  const {
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
  } = useRealTimeSync({
    tables: selectedTables,
    projectId,
    onSyncEvent: (event) => {
      console.log('Sync event received:', event);
    },
    onNotification: (notification) => {
      console.log('Notification received:', notification);
    },
    onConflict: (conflict) => {
      console.log('Conflict detected:', conflict);
    },
    onConnectionChange: (isConnected) => {
      console.log('Connection status changed:', isConnected);
    }
  });

  const handleResolveConflict = async (
    conflictId: string, 
    resolution: 'accept_current' | 'accept_incoming' | 'merge'
  ) => {
    try {
      syncManager.resolveConflict(conflictId, resolution);
      console.log('Conflict resolved:', { conflictId, resolution });
    } catch (error) {
      console.error('Error resolving conflict:', error);
    }
  };

  const handleDismissConflict = (conflictId: string) => {
    // In a real implementation, you might want to track dismissed conflicts
    console.log('Conflict dismissed:', conflictId);
  };

  const handleTestBroadcast = async () => {
    try {
      await broadcastEvent({
        table: 'Proyectos',
        operation: 'update',
        recordId: 'test-project-1',
        data: {
          nombre: 'Proyecto de Prueba',
          estado: 'En progreso',
          updated_at: new Date().toISOString()
        }
      });
      console.log('Test event broadcasted');
    } catch (error) {
      console.error('Error broadcasting test event:', error);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Sincronización en Tiempo Real
          </h2>
          
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            connected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {connected ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span>{connected ? 'Conectado' : 'Desconectado'}</span>
          </div>

          {connectionId && (
            <div className="text-xs text-gray-500">
              ID: {connectionId.substring(0, 8)}...
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <RealTimeNotifications 
            tables={selectedTables}
            projectId={projectId}
          />
          
          <button
            onClick={connected ? disconnect : connect}
            className={`px-3 py-1 rounded text-sm ${
              connected
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {connected ? 'Desconectar' : 'Conectar'}
          </button>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">Configuración</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tablas a Sincronizar
            </label>
            <div className="flex flex-wrap gap-2">
              {['Proyectos', 'Actividades', 'Materiales', 'Personal', 'Asignaciones'].map(table => (
                <label key={table} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedTables.includes(table)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTables(prev => [...prev, table]);
                      } else {
                        setSelectedTables(prev => prev.filter(t => t !== table));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{table}</span>
                </label>
              ))}
            </div>
          </div>

          {projectId && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Proyecto ID: {projectId}
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">Estadísticas</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.activeConnections}</div>
              <div className="text-sm text-gray-600">Conexiones Activas</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalEvents}</div>
              <div className="text-sm text-gray-600">Eventos Totales</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.activeConflicts}</div>
              <div className="text-sm text-gray-600">Conflictos Activos</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.pendingNotifications}</div>
              <div className="text-sm text-gray-600">Notificaciones</div>
            </div>
          </div>
        </div>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <ConflictResolution
          conflicts={conflicts}
          onResolveConflict={handleResolveConflict}
          onDismissConflict={handleDismissConflict}
        />
      )}

      {/* Recent Events */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Eventos Recientes</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleTestBroadcast}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Probar Evento
            </button>
            <button
              onClick={clearEvents}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Limpiar
            </button>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No hay eventos recientes</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded border"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    event.operation === 'create' ? 'bg-green-500' :
                    event.operation === 'update' ? 'bg-blue-500' :
                    'bg-red-500'
                  }`} />
                  
                  <div>
                    <div className="font-medium text-sm">
                      {event.operation.toUpperCase()} en {event.table}
                    </div>
                    <div className="text-xs text-gray-600">
                      ID: {event.recordId} | Por: {event.userName}
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Notifications */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Notificaciones Recientes</h3>
          <button
            onClick={clearNotifications}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Limpiar
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No hay notificaciones recientes</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded border"
              >
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  notification.priority === 'critical' ? 'bg-red-500' :
                  notification.priority === 'high' ? 'bg-orange-500' :
                  notification.priority === 'medium' ? 'bg-blue-500' :
                  'bg-green-500'
                }`} />
                
                <div className="flex-1">
                  <div className="font-medium text-sm">{notification.title}</div>
                  <div className="text-sm text-gray-600 mt-1">{notification.message}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {notification.type} | {new Date(notification.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}