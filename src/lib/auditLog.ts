/**
 * Audit logging system for ServesPlatform
 * Tracks user actions and system events for compliance and security
 */

import { apiClient } from './apiClient';
import { User } from './types';

export interface AuditLogEntry {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  accion: string;
  recurso_tipo: string;
  recurso_id?: string;
  recurso_nombre?: string;
  detalles_json: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
  created_at: Date;
}

export interface AuditLogDetails {
  before?: any;
  after?: any;
  metadata?: Record<string, any>;
}

export enum AuditAction {
  // User management
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_ACTIVATED = 'user_activated',
  USER_DEACTIVATED = 'user_deactivated',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGED = 'password_changed',
  
  // Project management
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_DELETED = 'project_deleted',
  PROJECT_STATUS_CHANGED = 'project_status_changed',
  
  // Activity management
  ACTIVITY_CREATED = 'activity_created',
  ACTIVITY_UPDATED = 'activity_updated',
  ACTIVITY_DELETED = 'activity_deleted',
  ACTIVITY_COMPLETED = 'activity_completed',
  
  // Personnel management
  PERSONNEL_CREATED = 'personnel_created',
  PERSONNEL_UPDATED = 'personnel_updated',
  PERSONNEL_DELETED = 'personnel_deleted',
  ASSIGNMENT_CREATED = 'assignment_created',
  ASSIGNMENT_DELETED = 'assignment_deleted',
  
  // Materials and BOM
  MATERIAL_CREATED = 'material_created',
  MATERIAL_UPDATED = 'material_updated',
  MATERIAL_DELETED = 'material_deleted',
  BOM_CREATED = 'bom_created',
  BOM_UPDATED = 'bom_updated',
  BOM_DELETED = 'bom_deleted',
  
  // System configuration
  CONFIG_UPDATED = 'config_updated',
  CATALOG_UPDATED = 'catalog_updated',
  
  // Security events
  LOGIN_FAILED = 'login_failed',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PERMISSION_DENIED = 'permission_denied',
  
  // Data export
  DATA_EXPORTED = 'data_exported',
  REPORT_GENERATED = 'report_generated',
}

export enum ResourceType {
  USER = 'user',
  PROJECT = 'project',
  ACTIVITY = 'activity',
  PERSONNEL = 'personnel',
  MATERIAL = 'material',
  BOM = 'bom',
  ASSIGNMENT = 'assignment',
  TIME_ENTRY = 'time_entry',
  SYSTEM_CONFIG = 'system_config',
  REPORT = 'report',
}

class AuditLogger {
  private static instance: AuditLogger;
  private currentUser: User | null = null;

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  setCurrentUser(user: User | null) {
    this.currentUser = user;
  }

  /**
   * Log an audit event
   */
  async log(
    action: AuditAction,
    resourceType: ResourceType,
    resourceId?: string,
    resourceName?: string,
    details?: AuditLogDetails
  ): Promise<void> {
    try {
      if (!this.currentUser) {
        console.warn('Audit log: No current user set');
        return;
      }

      const auditEntry: Partial<AuditLogEntry> = {
        usuario_id: this.currentUser.id,
        usuario_nombre: this.currentUser.nombre,
        accion: action,
        recurso_tipo: resourceType,
        recurso_id: resourceId,
        recurso_nombre: resourceName,
        detalles_json: JSON.stringify(details || {}),
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
        timestamp: new Date(),
      };

      // Send to backend
      await apiClient.create('AuditLog', auditEntry);
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log user authentication events
   */
  async logAuth(action: AuditAction.USER_LOGIN | AuditAction.USER_LOGOUT | AuditAction.LOGIN_FAILED, email?: string) {
    try {
      const auditEntry: Partial<AuditLogEntry> = {
        usuario_id: this.currentUser?.id || 'anonymous',
        usuario_nombre: this.currentUser?.nombre || email || 'Unknown',
        accion: action,
        recurso_tipo: ResourceType.USER,
        detalles_json: JSON.stringify({ email }),
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
        timestamp: new Date(),
      };

      await apiClient.create('AuditLog', auditEntry);
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  }

  /**
   * Log security events
   */
  async logSecurity(
    action: AuditAction.UNAUTHORIZED_ACCESS | AuditAction.PERMISSION_DENIED,
    resourceType: ResourceType,
    resourceId?: string,
    details?: any
  ) {
    try {
      const auditEntry: Partial<AuditLogEntry> = {
        usuario_id: this.currentUser?.id || 'anonymous',
        usuario_nombre: this.currentUser?.nombre || 'Unknown',
        accion: action,
        recurso_tipo: resourceType,
        recurso_id: resourceId,
        detalles_json: JSON.stringify(details || {}),
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
        timestamp: new Date(),
      };

      await apiClient.create('AuditLog', auditEntry);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get audit log entries with filtering
   */
  async getAuditLog(params?: {
    usuario_id?: string;
    accion?: string;
    recurso_tipo?: string;
    fecha_inicio?: Date;
    fecha_fin?: Date;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    try {
      let query = '';
      const queryParts: string[] = [];

      if (params?.usuario_id) {
        queryParts.push(`usuario_id:${params.usuario_id}`);
      }
      if (params?.accion) {
        queryParts.push(`accion:${params.accion}`);
      }
      if (params?.recurso_tipo) {
        queryParts.push(`recurso_tipo:${params.recurso_tipo}`);
      }
      if (params?.fecha_inicio) {
        queryParts.push(`timestamp>=${params.fecha_inicio.toISOString()}`);
      }
      if (params?.fecha_fin) {
        queryParts.push(`timestamp<=${params.fecha_fin.toISOString()}`);
      }

      if (queryParts.length > 0) {
        query = queryParts.join(' AND ');
      }

      const response = await apiClient.list<AuditLogEntry>('AuditLog', {
        q: query,
        limit: params?.limit || 100,
      });

      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch audit log:', error);
      return [];
    }
  }

  /**
   * Get client IP address (best effort)
   */
  private async getClientIP(): Promise<string> {
    try {
      // This is a best effort approach for client-side IP detection
      // In production, this should be handled by the server
      return 'client-side';
    } catch {
      return 'unknown';
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Convenience functions for common audit operations
export const logUserAction = (
  action: AuditAction,
  resourceType: ResourceType,
  resourceId?: string,
  resourceName?: string,
  details?: AuditLogDetails
) => auditLogger.log(action, resourceType, resourceId, resourceName, details);

export const logAuthEvent = (
  action: AuditAction.USER_LOGIN | AuditAction.USER_LOGOUT | AuditAction.LOGIN_FAILED,
  email?: string
) => auditLogger.logAuth(action, email);

export const logSecurityEvent = (
  action: AuditAction.UNAUTHORIZED_ACCESS | AuditAction.PERMISSION_DENIED,
  resourceType: ResourceType,
  resourceId?: string,
  details?: any
) => auditLogger.logSecurity(action, resourceType, resourceId, details);