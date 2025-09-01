/**
 * Data Operation Feedback Component
 * Provides immediate visual feedback for CRUD operations
 */

'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2, X, WifiOff, Clock } from 'lucide-react';
import { DataSyncState } from '@/hooks/useDataSync';
import { EnhancedError, ErrorType } from '@/lib/enhanced-error-handler';

interface DataOperationFeedbackProps {
  state: DataSyncState;
  onClearError?: () => void;
  onClearLastOperation?: () => void;
  className?: string;
  autoHideSuccess?: boolean;
  autoHideDelay?: number;
}

export function DataOperationFeedback({
  state,
  onClearError,
  onClearLastOperation,
  className = '',
  autoHideSuccess = true,
  autoHideDelay = 3000
}: DataOperationFeedbackProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  // Show success message when operation completes successfully
  useEffect(() => {
    if (state.lastOperation.success && state.lastOperation.timestamp) {
      setShowSuccess(true);
      
      if (autoHideSuccess) {
        const timer = setTimeout(() => {
          setShowSuccess(false);
          onClearLastOperation?.();
        }, autoHideDelay);
        
        return () => clearTimeout(timer);
      }
    }
  }, [state.lastOperation.success, state.lastOperation.timestamp, autoHideSuccess, autoHideDelay, onClearLastOperation]);

  // Loading states
  const isLoading = state.loading || state.creating || state.updating || state.deleting;
  const loadingMessage = state.creating ? 'Creando...' :
                         state.updating ? 'Actualizando...' :
                         state.deleting ? 'Eliminando...' :
                         state.loading ? 'Cargando...' : '';

  // Success message
  const successMessage = state.lastOperation.message || 
    (state.lastOperation.type === 'create' ? 'Elemento creado exitosamente' :
     state.lastOperation.type === 'update' ? 'Elemento actualizado exitosamente' :
     state.lastOperation.type === 'delete' ? 'Elemento eliminado exitosamente' :
     'Operación completada exitosamente');

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-800">{loadingMessage}</span>
        </div>
      )}

      {/* Error State */}
      {state.error && (
        <div className={`flex items-center justify-between px-4 py-2 rounded-lg ${
          state.error.type === ErrorType.NETWORK || state.error.type === ErrorType.TIMEOUT
            ? 'bg-orange-50 border border-orange-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {state.error.type === ErrorType.NETWORK ? (
              <WifiOff className="w-4 h-4 text-orange-600" />
            ) : state.error.type === ErrorType.TIMEOUT ? (
              <Clock className="w-4 h-4 text-orange-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            <div className="flex-1">
              <span className={`text-sm font-medium ${
                state.error.type === ErrorType.NETWORK || state.error.type === ErrorType.TIMEOUT
                  ? 'text-orange-800'
                  : 'text-red-800'
              }`}>
                {state.error.userMessage}
              </span>
              {state.lastOperation.attempts && state.lastOperation.attempts > 1 && (
                <p className="text-xs text-gray-600 mt-1">
                  Intentos realizados: {state.lastOperation.attempts}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {state.error.retryable && (
              <span className="text-xs text-gray-500">Reintentable</span>
            )}
            {onClearError && (
              <button
                onClick={onClearError}
                className={`hover:opacity-75 ${
                  state.error.type === ErrorType.NETWORK || state.error.type === ErrorType.TIMEOUT
                    ? 'text-orange-600'
                    : 'text-red-600'
                }`}
                title="Cerrar error"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Offline State */}
      {state.isOffline && (
        <div className="flex items-center justify-between px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4 text-yellow-600" />
            <div>
              <span className="text-sm font-medium text-yellow-800">
                Sin conexión a internet
              </span>
              {state.pendingOperations > 0 && (
                <p className="text-xs text-yellow-700 mt-1">
                  {state.pendingOperations} operación(es) en cola
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {showSuccess && state.lastOperation.success && !state.error && !isLoading && (
        <div className="flex items-center justify-between px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800">{successMessage}</span>
          </div>
          {onClearLastOperation && (
            <button
              onClick={() => {
                setShowSuccess(false);
                onClearLastOperation();
              }}
              className="text-green-600 hover:text-green-800"
              title="Cerrar mensaje"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Failed Operation State */}
      {state.lastOperation.type && !state.lastOperation.success && !state.error && !isLoading && (
        <div className="flex items-center justify-between px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <span className="text-sm text-orange-800">
              {state.lastOperation.message || 'La operación no se completó correctamente'}
            </span>
          </div>
          {onClearLastOperation && (
            <button
              onClick={onClearLastOperation}
              className="text-orange-600 hover:text-orange-800"
              title="Cerrar mensaje"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Inline loading indicator for buttons
 */
interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function LoadingButton({
  loading,
  children,
  className = '',
  disabled = false,
  onClick,
  type = 'button'
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      <span>{children}</span>
    </button>
  );
}

/**
 * Operation status indicator
 */
interface OperationStatusProps {
  state: DataSyncState;
  className?: string;
}

export function OperationStatus({ state, className = '' }: OperationStatusProps) {
  if (state.creating || state.updating || state.deleting || state.loading) {
    return (
      <div className={`flex items-center space-x-1 text-blue-600 ${className}`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-xs">
          {state.creating ? 'Creando' :
           state.updating ? 'Actualizando' :
           state.deleting ? 'Eliminando' :
           'Cargando'}
        </span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={`flex items-center space-x-1 text-red-600 ${className}`}>
        <XCircle className="w-3 h-3" />
        <span className="text-xs">Error</span>
      </div>
    );
  }

  if (state.lastOperation.success && state.lastOperation.timestamp) {
    const timeSince = Date.now() - state.lastOperation.timestamp.getTime();
    if (timeSince < 5000) { // Show for 5 seconds
      return (
        <div className={`flex items-center space-x-1 text-green-600 ${className}`}>
          <CheckCircle className="w-3 h-3" />
          <span className="text-xs">Guardado</span>
        </div>
      );
    }
  }

  return null;
}

/**
 * Data refresh indicator
 */
interface RefreshIndicatorProps {
  onRefresh: () => void;
  loading: boolean;
  lastRefresh?: Date;
  className?: string;
}

export function RefreshIndicator({
  onRefresh,
  loading,
  lastRefresh,
  className = ''
}: RefreshIndicatorProps) {
  const formatLastRefresh = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`flex items-center space-x-2 text-sm text-gray-500 ${className}`}>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center space-x-1 hover:text-gray-700 disabled:opacity-50"
        title="Actualizar datos"
      >
        <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        <span>Actualizar</span>
      </button>
      
      {lastRefresh && (
        <span className="text-xs">
          Última actualización: {formatLastRefresh(lastRefresh)}
        </span>
      )}
    </div>
  );
}