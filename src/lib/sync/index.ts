/**
 * Real-time Synchronization Module
 * Exports all sync-related functionality
 */

// Core sync manager
export {
  syncManager,
  SyncManager,
  type SyncEvent,
  type NotificationEvent,
  type DataConflict,
  type SubscriptionConfig,
  type ClientConnection
} from './sync-manager';

// Notification service
export {
  notificationService,
  NotificationService,
  type NotificationRule
} from './notification-service';

// Sync integration utilities
export {
  syncIntegratedAPIService,
  SyncIntegratedAPIService,
  SyncUtils
} from './sync-integration';

// Re-export hook types for convenience
export type {
  SyncEventData,
  NotificationData,
  ConflictData,
  ConnectionStats,
  RealTimeSyncConfig,
  RealTimeSyncReturn
} from '../../hooks/useRealTimeSync';