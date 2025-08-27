/**
 * Utility components for conditional rendering based on permissions and roles
 */

import React from 'react';
import { useAuth } from '@/lib/auth';
import { Permission } from '@/lib/permissions';
import { usePermission, useAnyPermission, useAllPermissions } from '@/lib/hooks/usePermissions';
import { User } from '@/lib/types';

interface ConditionalRenderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface PermissionRenderProps extends ConditionalRenderProps {
  permission: Permission;
}

interface MultiPermissionRenderProps extends ConditionalRenderProps {
  permissions: Permission[];
  requireAll?: boolean;
}

interface RoleRenderProps extends ConditionalRenderProps {
  roles: User['rol'][];
}

interface UserStatusRenderProps extends ConditionalRenderProps {
  requireActive?: boolean;
}

/**
 * Renders children only if user has the specified permission
 */
export function IfPermission({ permission, children, fallback = null }: PermissionRenderProps) {
  const hasAccess = usePermission(permission);
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders children only if user has any/all of the specified permissions
 */
export function IfPermissions({ 
  permissions, 
  requireAll = false, 
  children, 
  fallback = null 
}: MultiPermissionRenderProps) {
  const hasAnyAccess = useAnyPermission(permissions);
  const hasAllAccess = useAllPermissions(permissions);
  
  const hasAccess = requireAll ? hasAllAccess : hasAnyAccess;
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders children only if user has one of the specified roles
 */
export function IfRole({ roles, children, fallback = null }: RoleRenderProps) {
  const { user } = useAuth();
  
  if (!user) {
    return <>{fallback}</>;
  }
  
  const hasAccess = roles.includes(user.rol);
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders children only if user is authenticated
 */
export function IfAuthenticated({ children, fallback = null }: ConditionalRenderProps) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders children only if user is not authenticated
 */
export function IfNotAuthenticated({ children, fallback = null }: ConditionalRenderProps) {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders children based on user status (active/inactive)
 */
export function IfUserStatus({ 
  requireActive = true, 
  children, 
  fallback = null 
}: UserStatusRenderProps) {
  const { user } = useAuth();
  
  if (!user) {
    return <>{fallback}</>;
  }
  
  const hasAccess = requireActive ? user.activo : !user.activo;
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders different content based on user role
 */
interface RoleSwitchProps {
  admin_lider?: React.ReactNode;
  admin?: React.ReactNode;
  editor?: React.ReactNode;
  tecnico?: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleSwitch({ 
  admin_lider, 
  admin, 
  editor, 
  tecnico, 
  fallback = null 
}: RoleSwitchProps) {
  const { user } = useAuth();
  
  if (!user) {
    return <>{fallback}</>;
  }
  
  switch (user.rol) {
    case 'admin_lider':
      return <>{admin_lider || fallback}</>;
    case 'admin':
      return <>{admin || fallback}</>;
    case 'editor':
      return <>{editor || fallback}</>;
    case 'tecnico':
      return <>{tecnico || fallback}</>;
    default:
      return <>{fallback}</>;
  }
}

/**
 * Renders children only if user can access the current route
 */
export function IfCanAccessRoute({ children, fallback = null }: ConditionalRenderProps) {
  const { user } = useAuth();
  
  if (!user) {
    return <>{fallback}</>;
  }
  
  // This would need to be enhanced to check the actual current route
  // For now, we'll assume access is granted if user is authenticated and active
  const hasAccess = user.activo;
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Utility component for debugging permissions (only in development)
 */
export function PermissionDebug() {
  const { user } = useAuth();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  if (!user) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-xs">
        No user authenticated
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded text-xs max-w-xs">
      <div><strong>User:</strong> {user.nombre}</div>
      <div><strong>Role:</strong> {user.rol}</div>
      <div><strong>Active:</strong> {user.activo ? 'Yes' : 'No'}</div>
    </div>
  );
}