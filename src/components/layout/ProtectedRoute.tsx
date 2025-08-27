'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Permission, canAccessRoute } from '@/lib/permissions';
import { User } from '@/lib/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: Array<'admin_lider' | 'admin' | 'editor' | 'tecnico'>;
  requiredPermissions?: Permission[];
  fallbackPath?: string;
  requireAll?: boolean; // For permissions: if true, requires all permissions; if false, requires any
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  requiredPermissions = [],
  fallbackPath = '/login',
  requireAll = false
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(fallbackPath);
        return;
      }

      // Check route-level access using the permission system
      if (!canAccessRoute(user, pathname)) {
        router.push('/dashboard');
        return;
      }

      // Legacy role-based check (for backward compatibility)
      if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.rol)) {
        router.push('/dashboard');
        return;
      }

      // Permission-based check
      if (requiredPermissions.length > 0 && user) {
        const hasAccess = requireAll
          ? requiredPermissions.every(permission => 
              user && hasPermission(user, permission)
            )
          : requiredPermissions.some(permission => 
              user && hasPermission(user, permission)
            );

        if (!hasAccess) {
          router.push('/dashboard');
          return;
        }
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRoles, requiredPermissions, requireAll, router, fallbackPath, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  // Check access again for rendering (in case of race conditions)
  if (!canAccessRoute(user, pathname)) {
    return null;
  }

  if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.rol)) {
    return null;
  }

  if (requiredPermissions.length > 0 && user) {
    const hasAccess = requireAll
      ? requiredPermissions.every(permission => hasPermission(user, permission))
      : requiredPermissions.some(permission => hasPermission(user, permission));

    if (!hasAccess) {
      return null;
    }
  }

  return <>{children}</>;
}

// Import hasPermission function
import { hasPermission } from '@/lib/permissions';

// Higher-order component for page-level protection with roles
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: Array<'admin_lider' | 'admin' | 'editor' | 'tecnico'>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute requiredRoles={requiredRoles}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Higher-order component for page-level protection with permissions
export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: Permission[],
  requireAll: boolean = false
) {
  return function PermissionProtectedComponent(props: P) {
    return (
      <ProtectedRoute 
        requiredPermissions={requiredPermissions} 
        requireAll={requireAll}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Higher-order component for page-level protection with both roles and permissions
export function withRoleAndPermissions<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: Array<'admin_lider' | 'admin' | 'editor' | 'tecnico'>,
  requiredPermissions?: Permission[],
  requireAll: boolean = false
) {
  return function RoleAndPermissionProtectedComponent(props: P) {
    return (
      <ProtectedRoute 
        requiredRoles={requiredRoles}
        requiredPermissions={requiredPermissions} 
        requireAll={requireAll}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

