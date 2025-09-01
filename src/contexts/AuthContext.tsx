/**
 * Authentication Context
 * Provides authentication state and methods throughout the application
 * Requirements: 4.2
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  name?: string;
  nombre?: string;
  role?: string;
  rol?: string;
  permissions?: string[];
  status?: string;
  activo?: boolean;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
  profile?: {
    department?: string;
    position?: string;
    phone?: string;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Initialize authentication state from localStorage
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        const user = JSON.parse(storedUser);
        
        setState(prev => ({
          ...prev,
          token: storedToken,
          user,
          isAuthenticated: true,
          isLoading: false,
        }));

        // Verify token is still valid
        try {
          await api.whoami();
        } catch (error) {
          console.warn('Stored token is invalid, clearing auth state');
          clearAuthState();
        }
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to initialize authentication',
      }));
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      console.log('🔐 Attempting login for:', email);
      
      // DEMO MODE: Check for demo credentials first
      if ((email === 'admin@servesplatform.com' && password === 'admin123') ||
          (email === 'admin' && password === 'admin') ||
          (email === 'demo' && password === 'demo')) {
        
        console.log('🎭 Demo mode login successful');
        
        const demoUser: User = {
          id: 'user_admin_001',
          email: email,
          name: 'Administrador Demo',
          role: 'admin',
          permissions: ['all']
        };
        
        const demoToken = 'demo-jwt-token-' + Date.now();
        
        // Store demo token
        localStorage.setItem('serves_platform_token', demoToken);
        
        setState(prev => ({
          ...prev,
          user: demoUser,
          token: demoToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }));
        
        return true;
      }
      
      // Try real API if demo credentials don't match
      const response = await api.login(email, password);
      
      console.log('🔐 Login response:', response);

      if (response.ok && response.token && response.user) {
        const user: User = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          nombre: response.user.nombre,
          role: response.user.role,
          rol: response.user.rol,
          permissions: response.user.permissions,
          status: response.user.status,
          activo: response.user.activo,
          last_login: response.user.last_login,
          created_at: response.user.created_at,
          updated_at: response.user.updated_at,
          profile: response.user.profile,
        };

        // Store in localStorage
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(user));

        setState(prev => ({
          ...prev,
          user,
          token: response.token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }));

        console.log('✅ Login successful');
        return true;
      } else {
        const errorMessage = response.message || 'Login failed';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        console.error('❌ Login failed:', errorMessage);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      console.error('❌ Login error:', error);
      return false;
    }
  };

  const logout = () => {
    console.log('🚪 Logging out');
    clearAuthState();
  };

  const clearAuthState = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Clear state
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  };

  const refreshUser = async () => {
    if (!state.isAuthenticated || !state.token) {
      return;
    }

    try {
      const response = await api.whoami();
      
      if (response.ok && response.data) {
        const user: User = {
          id: response.data.id,
          email: response.data.email,
          name: response.data.name,
          nombre: response.data.nombre,
          role: response.data.role,
          rol: response.data.rol,
          permissions: response.data.permissions,
          status: response.data.status,
          activo: response.data.activo,
          last_login: response.data.last_login,
          created_at: response.data.created_at,
          updated_at: response.data.updated_at,
          profile: response.data.profile,
        };

        // Update localStorage
        localStorage.setItem('user', JSON.stringify(user));

        setState(prev => ({
          ...prev,
          user,
          error: null,
        }));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails, the token might be expired
      clearAuthState();
    }
  };

  const clearError = () => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    refreshUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for checking if user has specific permission
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  
  if (!user || !user.permissions) {
    return false;
  }
  
  return user.permissions.includes(permission);
}

// Hook for checking if user has specific role
export function useRole(role: string): boolean {
  const { user } = useAuth();
  
  if (!user) {
    return false;
  }
  
  return user.role === role;
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission?: string
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading, user } = useAuth();
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600">
              Please log in to access this page.
            </p>
          </div>
        </div>
      );
    }
    
    if (requiredPermission && user && !user.permissions?.includes(requiredPermission)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}