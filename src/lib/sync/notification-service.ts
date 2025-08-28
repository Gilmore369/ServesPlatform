/**
 * Notification Service
 * Handles business logic for generating notifications based on data changes
 */

import { syncManager, NotificationEvent, SyncEvent } from './sync-manager';
import { logger } from '../logger';

// Notification Rules
export interface NotificationRule {
  id: string;
  name: string;
  description: string;
  table: string;
  operation?: 'create' | 'update' | 'delete';
  condition: (event: SyncEvent) => boolean;
  generateNotification: (event: SyncEvent) => NotificationEvent | null;
  enabled: boolean;
}

/**
 * Notification Service
 * Generates notifications based on business rules and data changes
 */
export class NotificationService {
  private rules: NotificationRule[] = [];

  constructor() {
    this.initializeDefaultRules();
    this.setupEventListeners();
  }

  /**
   * Add a notification rule
   */
  addRule(rule: NotificationRule): void {
    this.rules.push(rule);
    logger.info('Notification rule added', {
      ruleId: rule.id,
      name: rule.name,
      table: rule.table
    });
  }

  /**
   * Remove a notification rule
   */
  removeRule(ruleId: string): void {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index >= 0) {
      const rule = this.rules[index];
      this.rules.splice(index, 1);
      logger.info('Notification rule removed', {
        ruleId,
        name: rule.name
      });
    }
  }

  /**
   * Enable/disable a rule
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      logger.info('Notification rule toggled', {
        ruleId,
        name: rule.name,
        enabled
      });
    }
  }

  /**
   * Get all rules
   */
  getRules(): NotificationRule[] {
    return [...this.rules];
  }

  /**
   * Process a sync event and generate notifications
   */
  private processSyncEvent(event: SyncEvent): void {
    const applicableRules = this.rules.filter(rule => 
      rule.enabled &&
      rule.table === event.table &&
      (!rule.operation || rule.operation === event.operation) &&
      rule.condition(event)
    );

    applicableRules.forEach(rule => {
      try {
        const notification = rule.generateNotification(event);
        if (notification) {
          syncManager.sendNotification(notification);
          logger.info('Notification generated', {
            ruleId: rule.id,
            notificationId: notification.id,
            type: notification.type
          });
        }
      } catch (error) {
        logger.error('Error generating notification', {
          ruleId: rule.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          event: {
            table: event.table,
            operation: event.operation,
            recordId: event.recordId
          }
        });
      }
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    syncManager.on('sync-event', ({ event }) => {
      this.processSyncEvent(event);
    });
  }

  /**
   * Initialize default notification rules
   */
  private initializeDefaultRules(): void {
    // Project status update notifications
    this.addRule({
      id: 'project-status-update',
      name: 'Project Status Update',
      description: 'Notify team members when project status changes',
      table: 'Proyectos',
      operation: 'update',
      condition: (event) => {
        return event.data?.estado !== event.previousData?.estado;
      },
      generateNotification: (event) => {
        if (!event.data?.estado) return null;

        return {
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'project_update',
          title: 'Estado de Proyecto Actualizado',
          message: `El proyecto "${event.data.nombre}" cambió de estado a "${event.data.estado}"`,
          data: {
            projectId: event.recordId,
            projectName: event.data.nombre,
            newStatus: event.data.estado,
            previousStatus: event.previousData?.estado
          },
          targetUsers: this.getProjectTeamMembers(event.recordId),
          timestamp: new Date(),
          priority: event.data.estado === 'Cerrado' ? 'high' : 'medium'
        };
      },
      enabled: true
    });

    // Material stock alert
    this.addRule({
      id: 'material-stock-alert',
      name: 'Material Stock Alert',
      description: 'Alert when material stock reaches minimum level',
      table: 'Materiales',
      operation: 'update',
      condition: (event) => {
        const current = event.data?.stock_actual || 0;
        const minimum = event.data?.stock_minimo || 0;
        const previous = event.previousData?.stock_actual || 0;
        
        // Alert when stock drops to or below minimum (and wasn't already below)
        return current <= minimum && previous > minimum;
      },
      generateNotification: (event) => {
        return {
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'stock_alert',
          title: 'Stock Mínimo Alcanzado',
          message: `El material "${event.data.descripcion}" (${event.data.sku}) ha alcanzado el stock mínimo`,
          data: {
            materialId: event.recordId,
            sku: event.data.sku,
            descripcion: event.data.descripcion,
            stockActual: event.data.stock_actual,
            stockMinimo: event.data.stock_minimo
          },
          targetUsers: this.getAdminUsers(),
          timestamp: new Date(),
          priority: 'high'
        };
      },
      enabled: true
    });

    // Activity completion notification
    this.addRule({
      id: 'activity-completed',
      name: 'Activity Completed',
      description: 'Notify project manager when activity is completed',
      table: 'Actividades',
      operation: 'update',
      condition: (event) => {
        return event.data?.estado === 'Completada' && 
               event.previousData?.estado !== 'Completada';
      },
      generateNotification: (event) => {
        return {
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'activity_complete',
          title: 'Actividad Completada',
          message: `La actividad "${event.data.titulo}" ha sido completada`,
          data: {
            activityId: event.recordId,
            activityTitle: event.data.titulo,
            projectId: event.data.proyecto_id,
            completedBy: event.userId
          },
          targetUsers: this.getProjectManagers(event.data.proyecto_id),
          timestamp: new Date(),
          priority: 'medium'
        };
      },
      enabled: true
    });

    // Assignment change notification
    this.addRule({
      id: 'assignment-change',
      name: 'Assignment Change',
      description: 'Notify users when they are assigned or unassigned from projects',
      table: 'Asignaciones',
      operation: 'create',
      condition: () => true,
      generateNotification: (event) => {
        return {
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'assignment_change',
          title: 'Nueva Asignación',
          message: `Has sido asignado a una nueva actividad`,
          data: {
            assignmentId: event.recordId,
            projectId: event.data.proyecto_id,
            activityId: event.data.actividad_id,
            assignedBy: event.userId
          },
          targetUsers: [event.data.colaborador_id],
          timestamp: new Date(),
          priority: 'medium'
        };
      },
      enabled: true
    });

    // Assignment removal notification
    this.addRule({
      id: 'assignment-removed',
      name: 'Assignment Removed',
      description: 'Notify users when they are removed from assignments',
      table: 'Asignaciones',
      operation: 'delete',
      condition: () => true,
      generateNotification: (event) => {
        if (!event.previousData) return null;

        return {
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'assignment_change',
          title: 'Asignación Removida',
          message: `Has sido removido de una asignación`,
          data: {
            assignmentId: event.recordId,
            projectId: event.previousData.proyecto_id,
            activityId: event.previousData.actividad_id,
            removedBy: event.userId
          },
          targetUsers: [event.previousData.colaborador_id],
          timestamp: new Date(),
          priority: 'low'
        };
      },
      enabled: true
    });

    // Critical material shortage
    this.addRule({
      id: 'critical-material-shortage',
      name: 'Critical Material Shortage',
      description: 'Alert when material stock is critically low (below 50% of minimum)',
      table: 'Materiales',
      operation: 'update',
      condition: (event) => {
        const current = event.data?.stock_actual || 0;
        const minimum = event.data?.stock_minimo || 0;
        const critical = minimum * 0.5;
        const previous = event.previousData?.stock_actual || 0;
        
        return current <= critical && previous > critical;
      },
      generateNotification: (event) => {
        return {
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'stock_alert',
          title: 'Stock Crítico',
          message: `URGENTE: El material "${event.data.descripcion}" tiene stock crítico`,
          data: {
            materialId: event.recordId,
            sku: event.data.sku,
            descripcion: event.data.descripcion,
            stockActual: event.data.stock_actual,
            stockMinimo: event.data.stock_minimo,
            critical: true
          },
          targetUsers: this.getAdminUsers(),
          timestamp: new Date(),
          priority: 'critical'
        };
      },
      enabled: true
    });

    // Project deadline approaching
    this.addRule({
      id: 'project-deadline-approaching',
      name: 'Project Deadline Approaching',
      description: 'Alert when project deadline is approaching (7 days)',
      table: 'Proyectos',
      operation: 'update',
      condition: (event) => {
        if (!event.data?.fin_plan) return false;
        
        const deadline = new Date(event.data.fin_plan);
        const now = new Date();
        const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        return daysUntilDeadline <= 7 && daysUntilDeadline > 0 && event.data.estado !== 'Cerrado';
      },
      generateNotification: (event) => {
        const deadline = new Date(event.data.fin_plan);
        const now = new Date();
        const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'project_update',
          title: 'Fecha Límite Próxima',
          message: `El proyecto "${event.data.nombre}" vence en ${daysUntilDeadline} días`,
          data: {
            projectId: event.recordId,
            projectName: event.data.nombre,
            deadline: event.data.fin_plan,
            daysRemaining: daysUntilDeadline
          },
          targetUsers: this.getProjectTeamMembers(event.recordId),
          timestamp: new Date(),
          priority: daysUntilDeadline <= 3 ? 'high' : 'medium'
        };
      },
      enabled: true
    });
  }

  /**
   * Get project team members (placeholder - would need actual data access)
   */
  private getProjectTeamMembers(projectId: string): string[] {
    // In a real implementation, this would query the database
    // For now, return empty array - this would be populated by actual user IDs
    return [];
  }

  /**
   * Get admin users (placeholder - would need actual data access)
   */
  private getAdminUsers(): string[] {
    // In a real implementation, this would query users with admin roles
    return [];
  }

  /**
   * Get project managers (placeholder - would need actual data access)
   */
  private getProjectManagers(projectId: string): string[] {
    // In a real implementation, this would query project managers
    return [];
  }
}

// Export singleton instance
export const notificationService = new NotificationService();