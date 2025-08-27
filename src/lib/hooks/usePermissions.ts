/**
 * React hooks for permission checking
 */

import { useMemo } from 'react';
import { useAuth } from '../auth';
import { 
  Permission, 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions,
  canAccessRoute,
  canPerformAction,
  getUserPermissions,
  canAssignRole,
  getAssignableRoles
} from '../permissions';
import { User } from '../types';

/**
 * Hook to check if current user has a specific permission
 */
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  
  return useMemo(() => {
    return hasPermission(user, permission);
  }, [user, permission]);
}

/**
 * Hook to check if current user has any of the specified permissions
 */
export function useAnyPermission(permissions: Permission[]): boolean {
  const { user } = useAuth();
  
  return useMemo(() => {
    return hasAnyPermission(user, permissions);
  }, [user, permissions]);
}

/**
 * Hook to check if current user has all of the specified permissions
 */
export function useAllPermissions(permissions: Permission[]): boolean {
  const { user } = useAuth();
  
  return useMemo(() => {
    return hasAllPermissions(user, permissions);
  }, [user, permissions]);
}

/**
 * Hook to check if current user can access a specific route
 */
export function useCanAccessRoute(route: string): boolean {
  const { user } = useAuth();
  
  return useMemo(() => {
    return canAccessRoute(user, route);
  }, [user, route]);
}

/**
 * Hook to check if current user can perform an action on a resource
 */
export function useCanPerformAction(
  action: Permission,
  resourceId?: string,
  resourceType?: 'project' | 'activity' | 'user'
): boolean {
  const { user } = useAuth();
  
  return useMemo(() => {
    return canPerformAction(user, action, resourceId, resourceType);
  }, [user, action, resourceId, resourceType]);
}

/**
 * Hook to get all permissions for the current user
 */
export function useUserPermissions(): Permission[] {
  const { user } = useAuth();
  
  return useMemo(() => {
    return getUserPermissions(user);
  }, [user]);
}

/**
 * Hook to check if current user can assign a specific role
 */
export function useCanAssignRole(targetRole: User['rol']): boolean {
  const { user } = useAuth();
  
  return useMemo(() => {
    return canAssignRole(user, targetRole);
  }, [user, targetRole]);
}

/**
 * Hook to get roles that current user can assign
 */
export function useAssignableRoles(): User['rol'][] {
  const { user } = useAuth();
  
  return useMemo(() => {
    return getAssignableRoles(user);
  }, [user]);
}

/**
 * Hook that returns permission checking functions
 */
export function usePermissions() {
  const { user } = useAuth();
  
  return useMemo(() => ({
    hasPermission: (permission: Permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(user, permissions),
    canAccessRoute: (route: string) => canAccessRoute(user, route),
    canPerformAction: (
      action: Permission,
      resourceId?: string,
      resourceType?: 'project' | 'activity' | 'user'
    ) => canPerformAction(user, action, resourceId, resourceType),
    getUserPermissions: () => getUserPermissions(user),
    canAssignRole: (targetRole: User['rol']) => canAssignRole(user, targetRole),
    getAssignableRoles: () => getAssignableRoles(user),
  }), [user]);
}