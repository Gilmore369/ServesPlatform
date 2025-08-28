/**
 * Real-time notifications component
 * Displays notifications and sync events to users
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRealTimeSync, NotificationData, SyncEventData, ConflictData } from '@/hooks/useRealTimeSync';
import { Bell, X, AlertTriangle, Info, CheckCircle, Clock, Users } from 'lucide-react';

interface RealTimeNotificationsProps {
  tables?: string[];
  projectId?: string;
  className?: string;
}

export function RealTimeNotifications({ 
  tables, 
  projectId, 
  className = '' 
}: RealTimeNotificationsProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const {
    connected,
    notifications,
    conflicts,
    events,
    clearNotifications
  } = useRealTimeSync({
    tables,
    projectId,
    onNotification: (notification) => {
      setUnreadCount(prev => prev + 1);
      
      // Show browser notification for high priority items
      if (notification.priority === 'high' || notification.priority === 'critical') {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            tag: notification.id
          });
        }
      }
    },
    onConflict: () => {
      setUnreadCount(prev => prev + 1);
    }
  });

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Reset unread count when notifications are viewed
  useEffect(() => {
    if (showNotifications) {
      setUnreadCount(0);
    }
  }, [showNotifications]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'project_update':
        return <Users className="w-4 h-4" />;
      case 'stock_alert':
        return <AlertTriangle className="w-4 h-4" />;
      case 'activity_complete':
        return <CheckCircle className="w-4 h-4" />;
      case 'assignment_change':
        return <Users className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const allItems = [
    ...conflicts.map(conflict => ({
      id: conflict.id,
      type: 'conflict' as const,
      title: 'Conflicto de Datos',
      message: `Conflicto detectado en ${conflict.table} - ${conflict.recordId}`,
      timestamp: conflict.timestamp,
      priority: 'high' as const,
      data: conflict
    })),
    ...notifications.map(notification => ({
      id: notification.id,
      type: 'notification' as const,
      title: notification.title,
      message: notification.message,
      timestamp: notification.timestamp,
      priority: notification.priority,
      data: notification
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className={`relative p-2 rounded-lg transition-colors ${
          connected 
            ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' 
            : 'text-gray-400'
        }`}
        title={connected ? 'Notificaciones en tiempo real' : 'Desconectado'}
      >
        <Bell className="w-5 h-5" />
        
        {/* Connection indicator */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
          connected ? 'bg-green-500' : 'bg-red-500'
        }`} />
        
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">Notificaciones</h3>
              <div className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`} />
            </div>
            <div className="flex items-center space-x-2">
              {allItems.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Limpiar
                </button>
              )}
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {allItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No hay notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {allItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      item.type === 'conflict' ? 'bg-red-50 border-l-4 border-red-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {item.type === 'conflict' ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : (
                          <>
                            {getPriorityIcon(item.priority)}
                            {getNotificationTypeIcon((item.data as NotificationData).type || '')}
                          </>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </p>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimestamp(item.timestamp)}</span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">
                          {item.message}
                        </p>

                        {/* Additional data for specific notification types */}
                        {item.type === 'notification' && (item.data as NotificationData).data && (
                          <div className="mt-2 text-xs text-gray-500">
                            {(item.data as NotificationData).type === 'stock_alert' && (
                              <div>
                                SKU: {(item.data as NotificationData).data.sku} | 
                                Stock: {(item.data as NotificationData).data.stockActual} / {(item.data as NotificationData).data.stockMinimo}
                              </div>
                            )}
                            {(item.data as NotificationData).type === 'project_update' && (
                              <div>
                                Proyecto: {(item.data as NotificationData).data.projectName}
                              </div>
                            )}
                          </div>
                        )}

                        {item.type === 'conflict' && (
                          <div className="mt-2 text-xs text-red-600">
                            Tabla: {(item.data as ConflictData).table} | 
                            Registro: {(item.data as ConflictData).recordId} | 
                            Tipo: {(item.data as ConflictData).conflictType}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {connected && (
            <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
              Conectado - Actualizaciones en tiempo real activas
            </div>
          )}
        </div>
      )}
    </div>
  );
}