/**
 * Error Handling and User Feedback Example
 * Demonstrates comprehensive error handling, retry mechanisms, and offline support
 */

'use client';

import React, { useState } from 'react';
import { 
  NotificationProvider, 
  useNotifications, 
  useErrorFeedback,
  ConnectionStatusIndicator,
  ErrorDisplay,
  LoadingState,
  RetryButton
} from '@/components/ui/UserFeedbackSystem';
import { useProjectsSync } from '@/hooks/useDataSync';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { enhancedErrorHandler, EnhancedError, ErrorType } from '@/lib/enhanced-error-handler';
import { DataOperationFeedback } from '@/components/ui/DataOperationFeedback';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Zap,
  Clock,
  Shield
} from 'lucide-react';

function ErrorHandlingExampleContent() {
  const [simulatedError, setSimulatedError] = useState<EnhancedError | null>(null);
  const [isSimulatingOperation, setIsSimulatingOperation] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);

  // Hooks
  const projectsSync = useProjectsSync({ limit: 5 });
  const { state: offlineState, actions: offlineActions } = useOfflineDetection();
  const { addNotification } = useNotifications();
  const { showError, showSuccess, showWarning, showInfo } = useErrorFeedback();

  // Simulate different types of errors
  const simulateError = (errorType: ErrorType) => {
    const context = {
      operation: 'simulate_error',
      table: 'test',
      timestamp: new Date()
    };

    let error: Error;
    switch (errorType) {
      case ErrorType.NETWORK:
        error = new TypeError('Failed to fetch');
        break;
      case ErrorType.TIMEOUT:
        error = new Error('Request timeout');
        error.name = 'AbortError';
        break;
      case ErrorType.AUTHENTICATION:
        error = new Error('Authentication failed');
        (error as any).status = 401;
        break;
      case ErrorType.VALIDATION:
        error = new Error('Validation failed: Invalid data');
        (error as any).status = 422;
        break;
      case ErrorType.GOOGLE_SHEETS:
        error = new Error('Google Sheets permission denied');
        break;
      case ErrorType.RATE_LIMIT:
        error = new Error('Too many requests');
        (error as any).status = 429;
        break;
      default:
        error = new Error('Unknown error occurred');
    }

    const enhancedError = enhancedErrorHandler.classifyError(error, context);
    setSimulatedError(enhancedError);
    showError(enhancedError, 'simulación');
  };

  // Simulate a long-running operation with progress
  const simulateLongOperation = async () => {
    setIsSimulatingOperation(true);
    
    try {
      // Simulate progress updates
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        // In a real app, you'd update progress state here
      }
      
      showSuccess('Operación completada exitosamente', 'Simulación');
    } catch (error) {
      showError(error as EnhancedError, 'simulación');
    } finally {
      setIsSimulatingOperation(false);
    }
  };

  // Simulate retry operation
  const simulateRetry = async () => {
    setRetryAttempts(prev => prev + 1);
    
    // Simulate success after 3 attempts
    if (retryAttempts >= 2) {
      setSimulatedError(null);
      setRetryAttempts(0);
      showSuccess('Operación exitosa después de reintentos', 'Reintento');
    } else {
      showWarning(`Reintento ${retryAttempts + 1} fallido`, 'Reintento');
    }
  };

  // Test notifications
  const testNotifications = () => {
    addNotification({
      type: 'info',
      title: 'Información',
      message: 'Esta es una notificación de información.',
      duration: 3000
    });

    setTimeout(() => {
      addNotification({
        type: 'warning',
        title: 'Advertencia',
        message: 'Esta es una notificación de advertencia con acciones.',
        actions: [
          {
            label: 'Entendido',
            action: () => console.log('Warning acknowledged'),
            variant: 'primary'
          },
          {
            label: 'Más info',
            action: () => console.log('More info requested'),
            variant: 'secondary'
          }
        ]
      });
    }, 1000);

    setTimeout(() => {
      addNotification({
        type: 'success',
        title: 'Éxito',
        message: 'Operación completada exitosamente.',
        duration: 4000
      });
    }, 2000);
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Sistema de Manejo de Errores y Feedback
          </h2>
          <p className="text-gray-600 mt-1">
            Demostración de manejo avanzado de errores, reintentos y feedback del usuario
          </p>
        </div>
        
        <ConnectionStatusIndicator />
      </div>

      {/* Connection Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Wifi className="w-5 h-5 mr-2" />
          Control de Conexión
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
              offlineState.isOnline ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {offlineState.isOnline ? (
                <Wifi className="w-8 h-8 text-green-600" />
              ) : (
                <WifiOff className="w-8 h-8 text-red-600" />
              )}
            </div>
            <p className="text-sm font-medium">
              Estado: {offlineState.isOnline ? 'Conectado' : 'Desconectado'}
            </p>
            {offlineState.lastOnlineTime && (
              <p className="text-xs text-gray-500 mt-1">
                Última conexión: {offlineState.lastOnlineTime.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={offlineActions.forceOffline}
              disabled={offlineState.isOffline}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Simular Desconexión
            </button>
            <button
              onClick={offlineActions.forceOnline}
              disabled={offlineState.isOnline}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Restaurar Conexión
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={offlineActions.checkConnection}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Verificar Conexión
            </button>
            <p className="text-xs text-gray-500 text-center">
              Tipo: {offlineState.connectionType || 'Desconocido'}
            </p>
          </div>
        </div>
      </div>

      {/* Error Simulation */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Simulación de Errores
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => simulateError(ErrorType.NETWORK)}
            className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
          >
            Error de Red
          </button>
          <button
            onClick={() => simulateError(ErrorType.TIMEOUT)}
            className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
          >
            Timeout
          </button>
          <button
            onClick={() => simulateError(ErrorType.AUTHENTICATION)}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Auth Error
          </button>
          <button
            onClick={() => simulateError(ErrorType.VALIDATION)}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            Validación
          </button>
          <button
            onClick={() => simulateError(ErrorType.GOOGLE_SHEETS)}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
          >
            Google Sheets
          </button>
          <button
            onClick={() => simulateError(ErrorType.RATE_LIMIT)}
            className="px-3 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm"
          >
            Rate Limit
          </button>
          <button
            onClick={() => setSimulatedError(null)}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
          >
            Limpiar Error
          </button>
          <button
            onClick={testNotifications}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Test Notificaciones
          </button>
        </div>

        {/* Error Display */}
        {simulatedError && (
          <ErrorDisplay
            error={simulatedError}
            onRetry={simulateRetry}
            onDismiss={() => setSimulatedError(null)}
            context="simulación"
            className="mb-4"
          />
        )}
      </div>

      {/* Operation Simulation */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2" />
          Simulación de Operaciones
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Operación de Larga Duración</p>
              <p className="text-sm text-gray-600">Simula una operación con progreso y estados de carga</p>
            </div>
            <button
              onClick={simulateLongOperation}
              disabled={isSimulatingOperation}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSimulatingOperation ? 'Ejecutando...' : 'Iniciar Operación'}
            </button>
          </div>

          {isSimulatingOperation && (
            <LoadingState
              message="Procesando operación..."
              progress={undefined} // In a real app, you'd track actual progress
              cancellable={true}
              onCancel={() => setIsSimulatingOperation(false)}
            />
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Operación con Reintentos</p>
              <p className="text-sm text-gray-600">
                Simula una operación que falla y requiere reintentos
              </p>
            </div>
            <RetryButton
              onRetry={simulateRetry}
              attempts={retryAttempts}
              maxAttempts={3}
              disabled={!simulatedError || !simulatedError.retryable}
            />
          </div>
        </div>
      </div>

      {/* Real Data Operations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Operaciones con Datos Reales
        </h3>
        
        <DataOperationFeedback
          state={projectsSync.state}
          onClearError={projectsSync.actions.clearError}
          onClearLastOperation={projectsSync.actions.clearLastOperation}
          className="mb-4"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm font-medium">Datos Cargados</p>
            <p className="text-2xl font-bold text-blue-600">{projectsSync.data.length}</p>
          </div>

          <div className="text-center">
            <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
              projectsSync.state.error ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {projectsSync.state.error ? (
                <XCircle className="w-8 h-8 text-red-600" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-600" />
              )}
            </div>
            <p className="text-sm font-medium">Estado</p>
            <p className={`text-sm font-bold ${
              projectsSync.state.error ? 'text-red-600' : 'text-green-600'
            }`}>
              {projectsSync.state.error ? 'Error' : 'OK'}
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
              <Clock className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-sm font-medium">Última Operación</p>
            <p className="text-sm text-gray-600">
              {projectsSync.state.lastOperation.type || 'Ninguna'}
            </p>
            {projectsSync.state.lastOperation.attempts && (
              <p className="text-xs text-gray-500">
                {projectsSync.state.lastOperation.attempts} intentos
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-center space-x-4">
          <button
            onClick={projectsSync.actions.refresh}
            disabled={projectsSync.state.loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${projectsSync.state.loading ? 'animate-spin' : ''}`} />
            <span>Refrescar Datos</span>
          </button>
        </div>
      </div>

      {/* Error Statistics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Estadísticas de Errores</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Errores de Red</p>
            <p className="text-2xl font-bold text-orange-600">0</p>
          </div>
          <div>
            <p className="text-gray-600">Timeouts</p>
            <p className="text-2xl font-bold text-yellow-600">0</p>
          </div>
          <div>
            <p className="text-gray-600">Errores de Auth</p>
            <p className="text-2xl font-bold text-red-600">0</p>
          </div>
          <div>
            <p className="text-gray-600">Reintentos Exitosos</p>
            <p className="text-2xl font-bold text-green-600">{retryAttempts}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ErrorHandlingExample() {
  return (
    <NotificationProvider>
      <ErrorHandlingExampleContent />
    </NotificationProvider>
  );
}