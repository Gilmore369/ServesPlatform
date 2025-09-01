/**
 * Offline Detection Hook
 * Detects network connectivity and provides offline/online state management
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
  lastOnlineTime: Date | null;
  connectionType: string | null;
  effectiveType: string | null;
}

export interface OfflineActions {
  checkConnection: () => Promise<boolean>;
  forceOnline: () => void;
  forceOffline: () => void;
}

export interface OfflineDetectionReturn {
  state: OfflineState;
  actions: OfflineActions;
}

/**
 * Hook for detecting and managing offline/online state
 */
export function useOfflineDetection(): OfflineDetectionReturn {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    lastOnlineTime: typeof navigator !== 'undefined' && navigator.onLine ? new Date() : null,
    connectionType: null,
    effectiveType: null
  });

  // Update connection info
  const updateConnectionInfo = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      setState(prev => ({
        ...prev,
        connectionType: connection?.type || null,
        effectiveType: connection?.effectiveType || null
      }));
    }
  }, []);

  // Handle online event
  const handleOnline = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOnline: true,
      isOffline: false,
      lastOnlineTime: new Date()
    }));
    updateConnectionInfo();
    logger.info('Network connection restored');
  }, [updateConnectionInfo]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOnline: false,
      isOffline: true
    }));
    logger.warn('Network connection lost');
  }, []);

  // Check connection by making a test request
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Try to fetch a small resource with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      const isConnected = response.ok;
      
      if (isConnected !== state.isOnline) {
        if (isConnected) {
          handleOnline();
        } else {
          handleOffline();
        }
      }

      return isConnected;
    } catch (error) {
      if (state.isOnline) {
        handleOffline();
      }
      return false;
    }
  }, [state.isOnline, handleOnline, handleOffline]);

  // Force online state (for testing)
  const forceOnline = useCallback(() => {
    handleOnline();
  }, [handleOnline]);

  // Force offline state (for testing)
  const forceOffline = useCallback(() => {
    handleOffline();
  }, [handleOffline]);

  // Set up event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', updateConnectionInfo);
    }

    // Initial connection info update
    updateConnectionInfo();

    // Periodic connection check (every 30 seconds when offline)
    const intervalId = setInterval(() => {
      if (state.isOffline) {
        checkConnection();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection?.removeEventListener('change', updateConnectionInfo);
      }
      
      clearInterval(intervalId);
    };
  }, [handleOnline, handleOffline, updateConnectionInfo, state.isOffline, checkConnection]);

  return {
    state,
    actions: {
      checkConnection,
      forceOnline,
      forceOffline
    }
  };
}

/**
 * Hook for offline-aware data operations
 */
export function useOfflineAwareOperation() {
  const { state: offlineState, actions: offlineActions } = useOfflineDetection();
  const [pendingOperations, setPendingOperations] = useState<Array<{
    id: string;
    operation: () => Promise<any>;
    description: string;
    timestamp: Date;
  }>>([]);

  // Queue operation for when connection is restored
  const queueOperation = useCallback((
    operation: () => Promise<any>,
    description: string
  ) => {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setPendingOperations(prev => [...prev, {
      id: operationId,
      operation,
      description,
      timestamp: new Date()
    }]);

    logger.info(`Operation queued for offline: ${description}`, { operationId });
    return operationId;
  }, []);

  // Execute pending operations when online
  const executePendingOperations = useCallback(async () => {
    if (offlineState.isOffline || pendingOperations.length === 0) {
      return;
    }

    logger.info(`Executing ${pendingOperations.length} pending operations`);
    
    const results = [];
    const failedOperations = [];

    for (const pendingOp of pendingOperations) {
      try {
        const result = await pendingOp.operation();
        results.push({ id: pendingOp.id, result, success: true });
        logger.info(`Pending operation executed successfully: ${pendingOp.description}`);
      } catch (error) {
        failedOperations.push(pendingOp);
        results.push({ id: pendingOp.id, error, success: false });
        logger.error(`Pending operation failed: ${pendingOp.description}`, error);
      }
    }

    // Remove successful operations, keep failed ones for retry
    setPendingOperations(failedOperations);
    
    return results;
  }, [offlineState.isOffline, pendingOperations]);

  // Execute pending operations when connection is restored
  useEffect(() => {
    if (offlineState.isOnline && pendingOperations.length > 0) {
      // Wait a bit for connection to stabilize
      const timeoutId = setTimeout(() => {
        executePendingOperations();
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [offlineState.isOnline, pendingOperations.length, executePendingOperations]);

  // Clear all pending operations
  const clearPendingOperations = useCallback(() => {
    setPendingOperations([]);
  }, []);

  // Remove specific pending operation
  const removePendingOperation = useCallback((operationId: string) => {
    setPendingOperations(prev => prev.filter(op => op.id !== operationId));
  }, []);

  return {
    offlineState,
    offlineActions,
    pendingOperations,
    queueOperation,
    executePendingOperations,
    clearPendingOperations,
    removePendingOperation
  };
}