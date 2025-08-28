/**
 * Sync Integration Utilities
 * Integrates real-time sync with existing API operations
 */

import { googleSheetsAPIService, CRUDOperation } from '../google-sheets-api-service';
import { syncManager, SyncEvent } from './sync-manager';
import { JWTManager } from '../jwt';
import { logger } from '../logger';

/**
 * Enhanced API service wrapper that broadcasts sync events
 */
export class SyncIntegratedAPIService {
  private sessionId: string;

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute CRUD operation with sync broadcasting
   */
  async executeOperation<T>(
    operation: CRUDOperation,
    options: any = {}
  ): Promise<any> {
    // Store original data for update/delete operations
    let previousData: any = null;
    if (operation.operation === 'update' || operation.operation === 'delete') {
      try {
        const getOperation: CRUDOperation = {
          table: operation.table,
          operation: 'get',
          id: operation.id || operation.data?.id
        };
        const previousResponse = await googleSheetsAPIService.executeOperation(getOperation);
        if (previousResponse.ok) {
          previousData = previousResponse.data;
        }
      } catch (error) {
        logger.warn('Could not fetch previous data for sync event', {
          table: operation.table,
          operation: operation.operation,
          id: operation.id
        });
      }
    }

    // Execute the operation
    const result = await googleSheetsAPIService.executeOperation<T>(operation, options);

    // Broadcast sync event if operation was successful
    if (result.ok && this.shouldBroadcastOperation(operation)) {
      await this.broadcastSyncEvent(operation, result.data, previousData);
    }

    return result;
  }

  /**
   * Execute batch operations with sync broadcasting
   */
  async batchOperations<T>(
    operations: CRUDOperation[],
    options: any = {}
  ): Promise<any[]> {
    // Execute batch operations
    const results = await googleSheetsAPIService.batchOperations<T>(operations, options);

    // Broadcast sync events for successful operations
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const result = results[i];

      if (result.ok && this.shouldBroadcastOperation(operation)) {
        await this.broadcastSyncEvent(operation, result.data, null);
      }
    }

    return results;
  }

  /**
   * Broadcast sync event for an operation
   */
  private async broadcastSyncEvent(
    operation: CRUDOperation,
    data: any,
    previousData: any = null
  ): Promise<void> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        logger.warn('No user context available for sync event');
        return;
      }

      const syncEvent: SyncEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        table: operation.table,
        operation: operation.operation as 'create' | 'update' | 'delete',
        recordId: operation.id || data?.id || 'unknown',
        data,
        previousData,
        timestamp: new Date(),
        userId: user.id,
        userName: user.nombre,
        sessionId: this.sessionId,
        version: data?.version || 1
      };

      syncManager.broadcastSyncEvent(syncEvent);

      logger.info('Sync event broadcasted', {
        eventId: syncEvent.id,
        table: operation.table,
        operation: operation.operation,
        recordId: syncEvent.recordId
      });

    } catch (error) {
      logger.error('Error broadcasting sync event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: operation.operation,
        table: operation.table
      });
    }
  }

  /**
   * Check if operation should be broadcasted
   */
  private shouldBroadcastOperation(operation: CRUDOperation): boolean {
    // Don't broadcast read operations
    if (operation.operation === 'list' || operation.operation === 'get') {
      return false;
    }

    // Don't broadcast operations on certain system tables
    const excludedTables = ['AuditLog', 'SystemConfig'];
    if (excludedTables.includes(operation.table)) {
      return false;
    }

    return true;
  }

  /**
   * Get current user from JWT token
   */
  private getCurrentUser(): any {
    try {
      const token = JWTManager.getToken();
      if (!token) return null;

      return JWTManager.verifyToken(token);
    } catch (error) {
      logger.error('Error getting current user for sync event', { error });
      return null;
    }
  }

  /**
   * Update session ID (useful for tracking user sessions)
   */
  updateSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

/**
 * Utility functions for sync integration
 */
export class SyncUtils {
  /**
   * Send notification based on business rules
   */
  static async sendBusinessNotification(
    type: 'project_update' | 'stock_alert' | 'activity_complete' | 'assignment_change',
    data: any,
    targetUsers: string[]
  ): Promise<void> {
    try {
      const notification = {
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title: this.getNotificationTitle(type, data),
        message: this.getNotificationMessage(type, data),
        data,
        targetUsers,
        timestamp: new Date(),
        priority: this.getNotificationPriority(type, data)
      };

      syncManager.sendNotification(notification);

      logger.info('Business notification sent', {
        notificationId: notification.id,
        type,
        targetUsers: targetUsers.length
      });

    } catch (error) {
      logger.error('Error sending business notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type,
        data
      });
    }
  }

  /**
   * Get notification title based on type and data
   */
  private static getNotificationTitle(type: string, data: any): string {
    switch (type) {
      case 'project_update':
        return 'Proyecto Actualizado';
      case 'stock_alert':
        return 'Alerta de Stock';
      case 'activity_complete':
        return 'Actividad Completada';
      case 'assignment_change':
        return 'Asignación Modificada';
      default:
        return 'Notificación';
    }
  }

  /**
   * Get notification message based on type and data
   */
  private static getNotificationMessage(type: string, data: any): string {
    switch (type) {
      case 'project_update':
        return `El proyecto "${data.nombre}" ha sido actualizado`;
      case 'stock_alert':
        return `Stock bajo para ${data.descripcion} (${data.sku})`;
      case 'activity_complete':
        return `La actividad "${data.titulo}" ha sido completada`;
      case 'assignment_change':
        return 'Tu asignación ha sido modificada';
      default:
        return 'Nueva notificación disponible';
    }
  }

  /**
   * Get notification priority based on type and data
   */
  private static getNotificationPriority(type: string, data: any): 'low' | 'medium' | 'high' | 'critical' {
    switch (type) {
      case 'stock_alert':
        return data.critical ? 'critical' : 'high';
      case 'project_update':
        return data.estado === 'Cerrado' ? 'high' : 'medium';
      case 'activity_complete':
        return 'medium';
      case 'assignment_change':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Check if user should receive notification
   */
  static shouldUserReceiveNotification(
    userId: string,
    notificationType: string,
    data: any
  ): boolean {
    // Implement business logic for notification filtering
    // This could check user preferences, project assignments, etc.
    
    switch (notificationType) {
      case 'project_update':
        // Check if user is assigned to the project
        return data.assignedUsers?.includes(userId) || false;
      
      case 'stock_alert':
        // Check if user has admin or inventory management role
        return data.adminUsers?.includes(userId) || false;
      
      case 'activity_complete':
        // Check if user is project manager or assigned to activity
        return data.projectManagers?.includes(userId) || 
               data.assignedUsers?.includes(userId) || false;
      
      case 'assignment_change':
        // Check if user is directly affected
        return data.affectedUsers?.includes(userId) || false;
      
      default:
        return false;
    }
  }

  /**
   * Get users for notification based on context
   */
  static async getNotificationTargets(
    notificationType: string,
    data: any
  ): Promise<string[]> {
    // In a real implementation, this would query the database
    // For now, return empty array - this would be populated by actual user queries
    
    const targets: string[] = [];

    switch (notificationType) {
      case 'project_update':
        // Get project team members
        if (data.proyecto_id) {
          // Query project assignments
          // targets = await getProjectTeamMembers(data.proyecto_id);
        }
        break;
      
      case 'stock_alert':
        // Get admin users and inventory managers
        // targets = await getAdminUsers();
        break;
      
      case 'activity_complete':
        // Get project managers
        if (data.proyecto_id) {
          // targets = await getProjectManagers(data.proyecto_id);
        }
        break;
      
      case 'assignment_change':
        // Get affected user
        if (data.colaborador_id) {
          targets.push(data.colaborador_id);
        }
        break;
    }

    return targets;
  }
}

// Export singleton instance
export const syncIntegratedAPIService = new SyncIntegratedAPIService();