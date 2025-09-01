'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, AuthResponse } from './api';

// Simple user interface
export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin_lider' | 'admin' | 'editor' | 'tecnico';
}

// Simple permission levels
export const PERMISSIONS = {
  admin_lider: ['read', 'write', 'delete', 'admin'],
  admin: ['read', 'write', 'delete'],
  editor: ['read', 'write'],
  tecnico: ['read']
} as const;

export type Permission = 'read' | 'write' | 'delete' | 'admin';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        
        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error checking stored auth:', error);
        // Clear invalid stored data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      setIsLoading(true);
      
      const response: AuthResponse = await api.login(email, password);
      
      if (response.ok && response.user && response.token) {
        // Store user and token
        const userData: User = {
          id: response.user.id,
          email: response.user.email,
          nombre: response.user.nombre,
          rol: response.user.rol as User['rol']
        };
        
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', response.token);
        
        return { success: true };
      } else {
        return { 
          success: false, 
          message: response.message || 'Login failed' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Login failed' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    
    const userPermissions = PERMISSIONS[user.rol] || [];
    return userPermissions.includes(permission);
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated,
      login,
      logout,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SimpleAuthProvider');
  }
  return context;
}

// Simple permission checking hook
export function usePermission(permission: Permission) {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

// Simple authentication guard component
export function AuthGuard({ 
  children, 
  permission,
  fallback = <div>Access denied</div> 
}: { 
  children: ReactNode;
  permission?: Permission;
  fallback?: ReactNode;
}) {
  const { isAuthenticated, hasPermission } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}