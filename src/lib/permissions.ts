/**
 * Permission system for ServesPlatform
 * Implements role-based access control (RBAC) based on requirements 1.3, 1.4, 1.5
 */

import { User } from './types';

// Define all possible permissions in the system
export enum Permission {
  // User management
  CREATE_USER = 'create_user',
  EDIT_USER = 'edit_user',
  DELETE_USER = 'delete_user',
  VIEW_ALL_USERS = 'view_all_users',
  RESET_PASSWORD = 'reset_password',
  
  // Project management
  CREATE_PROJECT = 'create_project',
  EDIT_ALL_PROJECTS = 'edit_all_projects',
  EDIT_ASSIGNED_PROJECTS = 'edit_assigned_projects',
  VIEW_ALL_PROJECTS = 'view_all_projects',
  VIEW_ASSIGNED_PROJECTS = 'view_assigned_projects',
  DELETE_PROJECT = 'delete_project',
  
  // Activity management
  CREATE_ACTIVITY = 'create_activity',
  EDIT_ACTIVITY = 'edit_activity',
  DELETE_ACTIVITY = 'delete_activity',
  COMPLETE_ACTIVITY = 'complete_activity',
  VIEW_ACTIVITY = 'view_activity',
  
  // Personnel management
  CREATE_PERSONNEL = 'create_personnel',
  EDIT_PERSONNEL = 'edit_personnel',
  DELETE_PERSONNEL = 'delete_personnel',
  VIEW_ALL_PERSONNEL = 'view_all_personnel',
  ASSIGN_PERSONNEL = 'assign_personnel',
  
  // Time tracking
  ENTER_TIME = 'enter_time',
  APPROVE_TIME = 'approve_time',
  VIEW_ALL_TIME_ENTRIES = 'view_all_time_entries',
  VIEW_OWN_TIME_ENTRIES = 'view_own_time_entries',
  
  // Materials and BOM
  CREATE_MATERIAL = 'create_material',
  EDIT_MATERIAL = 'edit_material',
  DELETE_MATERIAL = 'delete_material',
  VIEW_MATERIALS = 'view_materials',
  MANAGE_BOM = 'manage_bom',
  CREATE_PURCHASE_REQUEST = 'create_purchase_request',
  
  // Reports
  VIEW_OPERATIONAL_REPORTS = 'view_operational_reports',
  VIEW_FINANCIAL_REPORTS = 'view_financial_reports',
  VIEW_CAPACITY_REPORTS = 'view_capacity_reports',
  EXPORT_REPORTS = 'export_reports',
  
  // System administration
  MANAGE_SYSTEM_CONFIG = 'manage_system_config',
  MANAGE_CATALOGS = 'manage_catalogs',
  MANAGE_CHECKLISTS = 'manage_checklists',
  VIEW_AUDIT_LOG = 'view_audit_log',
  
  // Documentation
  CREATE_DOCUMENT = 'create_document',
  EDIT_DOCUMENT = 'edit_document',
  DELETE_DOCUMENT = 'delete_document',
  VIEW_DOCUMENTS = 'view_documents',
  APPROVE_DOCUMENT = 'approve_document',
}

// Role definitions with their permissions
export const ROLE_PERMISSIONS: Record<User['rol'], Permission[]> = {
  admin_lider: [
    // Full access to everything
    ...Object.values(Permission)
  ],
  
  admin: [
    // User management (except creating admin_lider)
    Permission.CREATE_USER,
    Permission.EDIT_USER,
    Permission.DELETE_USER,
    Permission.VIEW_ALL_USERS,
    Permission.RESET_PASSWORD,
    
    // Full project management
    Permission.CREATE_PROJECT,
    Permission.EDIT_ALL_PROJECTS,
    Permission.VIEW_ALL_PROJECTS,
    Permission.DELETE_PROJECT,
    
    // Full activity management
    Permission.CREATE_ACTIVITY,
    Permission.EDIT_ACTIVITY,
    Permission.DELETE_ACTIVITY,
    Permission.COMPLETE_ACTIVITY,
    Permission.VIEW_ACTIVITY,
    
    // Full personnel management
    Permission.CREATE_PERSONNEL,
    Permission.EDIT_PERSONNEL,
    Permission.DELETE_PERSONNEL,
    Permission.VIEW_ALL_PERSONNEL,
    Permission.ASSIGN_PERSONNEL,
    
    // Time tracking management
    Permission.ENTER_TIME,
    Permission.APPROVE_TIME,
    Permission.VIEW_ALL_TIME_ENTRIES,
    Permission.VIEW_OWN_TIME_ENTRIES,
    
    // Materials management
    Permission.CREATE_MATERIAL,
    Permission.EDIT_MATERIAL,
    Permission.DELETE_MATERIAL,
    Permission.VIEW_MATERIALS,
    Permission.MANAGE_BOM,
    Permission.CREATE_PURCHASE_REQUEST,
    
    // All reports
    Permission.VIEW_OPERATIONAL_REPORTS,
    Permission.VIEW_FINANCIAL_REPORTS,
    Permission.VIEW_CAPACITY_REPORTS,
    Permission.EXPORT_REPORTS,
    
    // System administration
    Permission.MANAGE_SYSTEM_CONFIG,
    Permission.MANAGE_CATALOGS,
    Permission.MANAGE_CHECKLISTS,
    Permission.VIEW_AUDIT_LOG,
    
    // Documentation management
    Permission.CREATE_DOCUMENT,
    Permission.EDIT_DOCUMENT,
    Permission.DELETE_DOCUMENT,
    Permission.VIEW_DOCUMENTS,
    Permission.APPROVE_DOCUMENT,
  ],
  
  editor: [
    // Limited project management (only assigned projects)
    Permission.EDIT_ASSIGNED_PROJECTS,
    Permission.VIEW_ASSIGNED_PROJECTS,
    
    // Activity management within assigned projects
    Permission.CREATE_ACTIVITY,
    Permission.EDIT_ACTIVITY,
    Permission.COMPLETE_ACTIVITY,
    Permission.VIEW_ACTIVITY,
    
    // Limited personnel view
    Permission.VIEW_ALL_PERSONNEL,
    Permission.ASSIGN_PERSONNEL,
    
    // Time tracking
    Permission.ENTER_TIME,
    Permission.VIEW_OWN_TIME_ENTRIES,
    
    // Materials (view and BOM management)
    Permission.VIEW_MATERIALS,
    Permission.MANAGE_BOM,
    Permission.CREATE_PURCHASE_REQUEST,
    
    // Limited reports
    Permission.VIEW_OPERATIONAL_REPORTS,
    Permission.VIEW_CAPACITY_REPORTS,
    Permission.EXPORT_REPORTS,
    
    // Documentation
    Permission.CREATE_DOCUMENT,
    Permission.EDIT_DOCUMENT,
    Permission.VIEW_DOCUMENTS,
  ],
  
  tecnico: [
    // View only for projects (assigned ones)
    Permission.VIEW_ASSIGNED_PROJECTS,
    
    // Limited activity management (only evidence and time)
    Permission.VIEW_ACTIVITY,
    
    // Time tracking (own entries only)
    Permission.ENTER_TIME,
    Permission.VIEW_OWN_TIME_ENTRIES,
    
    // View materials
    Permission.VIEW_MATERIALS,
    
    // View documentation
    Permission.VIEW_DOCUMENTS,
  ],
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user || !user.activo) {
    return false;
  }
  
  const rolePermissions = ROLE_PERMISSIONS[user.rol];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Check if a user can access a specific route
 */
export function canAccessRoute(user: User | null, route: string): boolean {
  if (!user || !user.activo) {
    return false;
  }

  // Route-based access control
  const routePermissions: Record<string, Permission[]> = {
    '/dashboard': [], // All authenticated users can access dashboard
    
    // Projects
    '/proyectos': [Permission.VIEW_ALL_PROJECTS, Permission.VIEW_ASSIGNED_PROJECTS],
    '/proyectos/nuevo': [Permission.CREATE_PROJECT],
    
    // Personnel
    '/personal': [Permission.VIEW_ALL_PERSONNEL],
    
    // Materials
    '/materiales': [Permission.VIEW_MATERIALS],
    
    // Reports
    '/reportes': [Permission.VIEW_OPERATIONAL_REPORTS, Permission.VIEW_FINANCIAL_REPORTS, Permission.VIEW_CAPACITY_REPORTS],
    
    // Administration
    '/admin': [Permission.MANAGE_SYSTEM_CONFIG, Permission.MANAGE_CATALOGS],
    '/admin/usuarios': [Permission.VIEW_ALL_USERS],
    '/admin/checklists': [Permission.MANAGE_CHECKLISTS],
    '/admin/clientes': [Permission.MANAGE_CATALOGS],
    '/admin/materiales-catalogo': [Permission.MANAGE_CATALOGS],
    '/admin/lineas-servicio': [Permission.MANAGE_CATALOGS],
    '/admin/config': [Permission.MANAGE_SYSTEM_CONFIG],
    
    // Documentation
    '/docs': [Permission.VIEW_DOCUMENTS],
  };

  // Find matching route (check for exact match first, then prefix match)
  const requiredPermissions = routePermissions[route] || 
    Object.entries(routePermissions).find(([path]) => route.startsWith(path))?.[1];

  if (!requiredPermissions) {
    // If no specific permissions defined, allow access for authenticated users
    return true;
  }

  // User needs at least one of the required permissions
  return hasAnyPermission(user, requiredPermissions);
}

/**
 * Check if a user can perform an action on a specific resource
 */
export function canPerformAction(
  user: User | null, 
  action: Permission, 
  resourceId?: string,
  resourceType?: 'project' | 'activity' | 'user'
): boolean {
  if (!hasPermission(user, action)) {
    return false;
  }

  // Additional resource-level checks
  if (resourceType === 'project' && resourceId) {
    // For editors and technicians, check if they're assigned to the project
    if (user?.rol === 'editor' || user?.rol === 'tecnico') {
      // This would need to be implemented with actual project assignment data
      // For now, we'll assume the check is done at the component level
      return true;
    }
  }

  if (resourceType === 'user' && resourceId) {
    // Users can only edit their own profile (except admins)
    if (user?.rol === 'editor' || user?.rol === 'tecnico') {
      return user.id === resourceId;
    }
  }

  return true;
}

/**
 * Get all permissions for a user's role
 */
export function getUserPermissions(user: User | null): Permission[] {
  if (!user || !user.activo) {
    return [];
  }
  
  return ROLE_PERMISSIONS[user.rol] || [];
}

/**
 * Check if a role can be assigned by the current user
 */
export function canAssignRole(currentUser: User | null, targetRole: User['rol']): boolean {
  if (!currentUser || !currentUser.activo) {
    return false;
  }

  // Only admin_lider can assign admin_lider role
  if (targetRole === 'admin_lider') {
    return currentUser.rol === 'admin_lider';
  }

  // admin_lider and admin can assign other roles
  return currentUser.rol === 'admin_lider' || currentUser.rol === 'admin';
}

/**
 * Get available roles that the current user can assign
 */
export function getAssignableRoles(currentUser: User | null): User['rol'][] {
  if (!currentUser || !currentUser.activo) {
    return [];
  }

  const allRoles: User['rol'][] = ['admin_lider', 'admin', 'editor', 'tecnico'];
  
  return allRoles.filter(role => canAssignRole(currentUser, role));
}