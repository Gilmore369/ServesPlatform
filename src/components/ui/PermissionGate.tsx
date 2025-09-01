/**
 * Permission-based rendering components
 * Implements role-based component rendering as per requirements 1.3, 1.4, 1.5
 */

import React from 'react';
import { Permission } from '@/lib/permissions';
import { usePermission, useAnyPermission, useAllPermissions, useCanPerformAction } from '@/lib/hooks/usePermissions';
import { User } from '@/lib/types';

interface PermissionGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface SinglePermissionGateProps extends PermissionGateProps {
  permission: Permission;
  resourceId?: string;
  resourceType?: 'project' | 'activity' | 'user';
}

interface MultiplePermissionGateProps extends PermissionGateProps {
  permissions: Permission[];
  requireAll?: boolean; // If true, requires all permissions; if false, requires any permission
}

interface RoleGateProps extends PermissionGateProps {
  roles: User['rol'][];
  requireAll?: boolean; // If true, requires all roles; if false, requires any role
}

/**
 * Component that renders children only if user has the specified permission
 */
export function PermissionGate({ 
  permission, 
  resourceId, 
  resourceType, 
  children, 
  fallback = null 
}: SinglePermissionGateProps) {
  const hasAccess = useCanPerformAction(permission, resourceId, resourceType);
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component that renders children only if user has the specified permissions
 */
export function MultiPermissionGate({ 
  permissions, 
  requireAll = false, 
  children, 
  fallback = null 
}: MultiplePermissionGateProps) {
  const hasAnyAccess = useAnyPermission(permissions);
  const hasAllAccess = useAllPermissions(permissions);
  
  const hasAccess = requireAll ? hasAllAccess : hasAnyAccess;
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component that renders children only if user has one of the specified roles
 */
export function RoleGate({ 
  roles, 
  requireAll = false, 
  children, 
  fallback = null 
}: RoleGateProps) {
  const { user } = useAuth();
  
  if (!user) {
    return <>{fallback}</>;
  }
  
  const hasAccess = requireAll 
    ? roles.every(role => user.rol === role) // This doesn't make practical sense but included for completeness
    : roles.includes(user.rol);
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Higher-order component that wraps a component with permission checking
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission,
  fallback?: React.ComponentType<P> | React.ReactNode
) {
  return function PermissionWrappedComponent(props: P) {
    const hasAccess = usePermission(permission);
    
    if (!hasAccess) {
      if (React.isValidElement(fallback)) {
        return fallback;
      }
      if (typeof fallback === 'function') {
        const FallbackComponent = fallback as React.ComponentType<P>;
        return <FallbackComponent {...props} />;
      }
      return null;
    }
    
    return <Component {...props} />;
  };
}

/**
 * Higher-order component that wraps a component with role checking
 */
export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  roles: User['rol'][],
  fallback?: React.ComponentType<P> | React.ReactNode
) {
  return function RoleWrappedComponent(props: P) {
    return (
      <RoleGate roles={roles} fallback={fallback}>
        <Component {...props} />
      </RoleGate>
    );
  };
}

// Import useAuth for RoleGate
import { useAuth } from '@/contexts/AuthContext';