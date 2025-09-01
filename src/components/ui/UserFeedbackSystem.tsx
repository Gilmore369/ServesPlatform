/**
 * User Feedback System
 * Comprehensive feedback system for errors, loading states, and user notifications
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Clock,
  X,
  Loader2
} from 'lucide-react';
import { EnhancedError, ErrorType } from '@/lib/enhanced-error-handler';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

// Notification types
export interface UserNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  timestamp: Date;
}

// Global notification context
interface NotificationContextType {
  notifications: UserNotification[];
  addNotification: (notification: Omit<UserNotification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = React.createContext<NotificationContextType | null>(null);

/**
 * Notification Provider Component
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  const addNotification = useCallback((notification: Omit<UserNotification, 'id' | 'timestamp'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: UserNotification = {
      ...notification,
      id,
      timestamp: new Date()
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-remove non-persistent notifications
    if (!notification.persistent) {
      const duration = notification.duration || 5000;
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAllNotifications
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

/**
 * Hook to use notifications
 */
export function useNotifications() {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

/**
 * Notification Container Component
 */
function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map(notification => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

/**
 * Individual Notification Card
 */
function NotificationCard({ 
  notification, 
  onClose 
}: { 
  notification: UserNotification;
  onClose: () => void;
}) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`${getBackgroundColor()} border rounded-lg p-4 shadow-lg animate-slide-in-right`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900">
            {notification.title}
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            {notification.message}
          </p>
          
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex space-x-2 mt-3">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`text-xs px-3 py-1 rounded ${
                    action.variant === 'primary'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Connection Status Indicator
 */
export function ConnectionStatusIndicator() {
  const { state: offlineState } = useOfflineDetection();
  const { addNotification } = useNotifications();
  const [lastNotificationTime, setLastNotificationTime] = useState<Date | null>(null);

  // Show notification when connection changes
  useEffect(() => {
    const now = new Date();
    
    // Avoid showing notification on initial load
    if (!lastNotificationTime) {
      setLastNotificationTime(now);
      return;
    }

    // Only show notification if enough time has passed since last one
    if (now.getTime() - lastNotificationTime.getTime() < 2000) {
      return;
    }

    if (offlineState.isOffline) {
      addNotification({
        type: 'warning',
        title: 'Sin conexión',
        message: 'No hay conexión a internet. Los cambios se guardarán cuando se restaure la conexión.',
        persistent: true
      });
    } else if (offlineState.lastOnlineTime && 
               offlineState.lastOnlineTime.getTime() > lastNotificationTime.getTime()) {
      addNotification({
        type: 'success',
        title: 'Conexión restaurada',
        message: 'La conexión a internet se ha restaurado.',
        duration: 3000
      });
    }

    setLastNotificationTime(now);
  }, [offlineState.isOffline, offlineState.lastOnlineTime, addNotification, lastNotificationTime]);

  if (offlineState.isOnline) {
    return (
      <div className="flex items-center space-x-1 text-green-600" title="Conectado">
        <Wifi className="w-4 h-4" />
        <span className="text-xs">Online</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 text-red-600" title="Sin conexión">
      <WifiOff className="w-4 h-4" />
      <span className="text-xs">Offline</span>
    </div>
  );
}

/**
 * Error Display Component
 */
interface ErrorDisplayProps {
  error: EnhancedError;
  onRetry?: () => void;
  onDismiss?: () => void;
  context?: string;
  className?: string;
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  context,
  className = '' 
}: ErrorDisplayProps) {
  const getSeverityColor = () => {
    switch (error.type) {
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        return 'border-red-500 bg-red-50';
      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
        return 'border-orange-500 bg-orange-50';
      case ErrorType.VALIDATION:
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-red-500 bg-red-50';
    }
  };

  const getIcon = () => {
    switch (error.type) {
      case ErrorType.NETWORK:
        return <WifiOff className="w-5 h-5 text-orange-600" />;
      case ErrorType.TIMEOUT:
        return <Clock className="w-5 h-5 text-orange-600" />;
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
    }
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 ${getSeverityColor()} ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900">
            Error en {context || error.context.operation}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {error.userMessage}
          </p>
          
          {/* Technical details (collapsible) */}
          <details className="mt-2">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              Detalles técnicos
            </summary>
            <div className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded">
              <p><strong>Código:</strong> {error.code}</p>
              <p><strong>Tipo:</strong> {error.type}</p>
              <p><strong>Hora:</strong> {error.timestamp.toLocaleString()}</p>
              {error.context.table && <p><strong>Tabla:</strong> {error.context.table}</p>}
              {error.context.id && <p><strong>ID:</strong> {error.context.id}</p>}
            </div>
          </details>
        </div>
        
        <div className="flex-shrink-0 flex space-x-2">
          {onRetry && error.retryable && (
            <button
              onClick={onRetry}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reintentar
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading State Component
 */
interface LoadingStateProps {
  message?: string;
  progress?: number;
  cancellable?: boolean;
  onCancel?: () => void;
  className?: string;
}

export function LoadingState({ 
  message = 'Cargando...', 
  progress,
  cancellable = false,
  onCancel,
  className = '' 
}: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-sm text-gray-600 mt-2">{message}</p>
        
        {progress !== undefined && (
          <div className="w-48 bg-gray-200 rounded-full h-2 mt-3">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        )}
        
        {cancellable && onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 mt-3"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Retry Button Component
 */
interface RetryButtonProps {
  onRetry: () => void;
  loading?: boolean;
  disabled?: boolean;
  attempts?: number;
  maxAttempts?: number;
  className?: string;
}

export function RetryButton({ 
  onRetry, 
  loading = false, 
  disabled = false,
  attempts = 0,
  maxAttempts,
  className = '' 
}: RetryButtonProps) {
  const isDisabled = disabled || loading || (maxAttempts && attempts >= maxAttempts);

  return (
    <button
      onClick={onRetry}
      disabled={isDisabled}
      className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      <span>
        {loading ? 'Reintentando...' : 'Reintentar'}
        {attempts > 0 && maxAttempts && ` (${attempts}/${maxAttempts})`}
      </span>
    </button>
  );
}

/**
 * Hook for enhanced error handling with user feedback
 */
export function useErrorFeedback() {
  const { addNotification } = useNotifications();

  const showError = useCallback((error: EnhancedError, context?: string) => {
    addNotification({
      type: 'error',
      title: `Error en ${context || error.context.operation}`,
      message: error.userMessage,
      persistent: !error.retryable,
      actions: error.retryable ? [{
        label: 'Reintentar',
        action: () => {
          // This would trigger a retry - implementation depends on context
          console.log('Retry requested for error:', error.code);
        },
        variant: 'primary'
      }] : undefined
    });
  }, [addNotification]);

  const showSuccess = useCallback((message: string, title: string = 'Éxito') => {
    addNotification({
      type: 'success',
      title,
      message,
      duration: 3000
    });
  }, [addNotification]);

  const showWarning = useCallback((message: string, title: string = 'Advertencia') => {
    addNotification({
      type: 'warning',
      title,
      message,
      duration: 5000
    });
  }, [addNotification]);

  const showInfo = useCallback((message: string, title: string = 'Información') => {
    addNotification({
      type: 'info',
      title,
      message,
      duration: 4000
    });
  }, [addNotification]);

  return {
    showError,
    showSuccess,
    showWarning,
    showInfo
  };
}