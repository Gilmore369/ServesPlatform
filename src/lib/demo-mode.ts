/**
 * Demo Mode for ServesPlatform
 * Provides mock authentication and data for testing
 */

export const DEMO_CREDENTIALS = {
  email: 'admin@servesplatform.com',
  password: 'admin123'
};

export const DEMO_USER = {
  id: 'user_admin_001',
  email: 'admin@servesplatform.com',
  nombre: 'Administrador Demo',
  rol: 'admin',
  status: 'active',
  permissions: ['all']
};

export const DEMO_TOKEN = 'demo-jwt-token-12345';

/**
 * Check if demo mode should be enabled
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || 
         process.env.NODE_ENV === 'development';
}

/**
 * Validate demo credentials
 */
export function validateDemoCredentials(email: string, password: string): boolean {
  return (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) ||
         (email === 'admin' && password === 'admin') ||
         (email === 'demo' && password === 'demo');
}