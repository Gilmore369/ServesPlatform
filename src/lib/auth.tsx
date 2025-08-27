'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from './types';
import { JWTManager } from './jwt';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && JWTManager.isAuthenticated();

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('🔑 AuthContext: Iniciando proceso de login...');
      setIsLoading(true);
      
      const { apiClient } = await import('./apiClient');
      const { auditLogger, AuditAction } = await import('./auditLog');
      
      console.log('📡 AuthContext: Llamando a apiClient.login...');
      const response = await apiClient.login(email, password);
      
      console.log('📨 AuthContext: Respuesta de API:', response);

      // The API returns data in the format: { ok: true, data: { token, user } }
      if (response && response.token && response.user) {
        console.log('✅ AuthContext: Login exitoso, guardando datos...');
        JWTManager.setToken(response.token);
        JWTManager.setUser(response.user);
        setUser(response.user);
        
        // Set user for audit logging and log successful login
        auditLogger.setCurrentUser(response.user as User);
        await auditLogger.logAuth(AuditAction.USER_LOGIN, email);
        
        console.log('🎉 AuthContext: Login completado exitosamente');
        return { success: true };
      } else {
        console.log('❌ AuthContext: Login falló - respuesta inválida:', response);
        // Log failed login attempt
        await auditLogger.logAuth(AuditAction.LOGIN_FAILED, email);
        return { success: false, message: 'Login failed - Invalid credentials' };
      }
    } catch (error) {
      console.error('🚨 AuthContext: Error en login:', error);
      
      // Log failed login attempt
      try {
        const { auditLogger, AuditAction } = await import('./auditLog');
        await auditLogger.logAuth(AuditAction.LOGIN_FAILED, email);
      } catch (auditError) {
        console.error('Failed to log audit event:', auditError);
      }
      
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'Network error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Log logout event before clearing user data
      const { auditLogger, AuditAction } = await import('./auditLog');
      if (user) {
        await auditLogger.logAuth(AuditAction.USER_LOGOUT);
      }
    } catch (error) {
      console.error('Failed to log logout event:', error);
    }
    
    JWTManager.logout();
    setUser(null);
  };

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      
      const token = JWTManager.getToken();
      const storedUser = JWTManager.getUser();

      if (!token || !storedUser || JWTManager.isTokenExpired(token)) {
        logout();
        return;
      }

      // Verify token with server
      try {
        const { apiClient } = await import('./apiClient');
        const response = await apiClient.whoami();
        
        if (response && response.user) {
          setUser(response.user as User);
        } else {
          logout();
        }
      } catch {
        // If server verification fails, trust stored user for now
        // This allows offline functionality
        setUser(storedUser);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}