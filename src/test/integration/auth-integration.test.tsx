/**
 * Authentication Integration Tests
 * Tests for complete authentication flow from frontend to backend
 * Requirements: 8.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SimpleLoginForm } from '@/components/auth/SimpleLoginForm'
import { AuthProvider } from '@/lib/simple-auth'
import { apiClient } from '@/lib/apiClient'
import { currentTestConfig } from '../test.config'

// Mock router
const mockPush = vi.fn()
const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
})

// Skip integration tests if not configured
const skipIntegrationTests = currentTestConfig.skipIntegrationTests

describe.skipIf(skipIntegrationTests)('Authentication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    cleanup()
  })

  describe('Complete Login Flow', () => {
    it('should complete full login flow with valid credentials', async () => {
      const user = userEvent.setup()
      
      render(
        <AuthProvider>
          <SimpleLoginForm />
        </AuthProvider>
      )
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      // Fill in valid credentials
      await user.type(emailInput, 'admin@servesplatform.com')
      await user.type(passwordInput, 'admin123')
      
      // Submit form
      await user.click(submitButton)
      
      // Should show loading state
      expect(screen.getByText('Iniciando sesión...')).toBeInTheDocument()
      
      // Wait for authentication to complete
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      }, { timeout: currentTestConfig.timeout })
      
      // Verify localStorage was updated
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'auth_user',
        expect.stringContaining('admin@servesplatform.com')
      )
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'auth_token',
        expect.any(String)
      )
    }, currentTestConfig.timeout)

    it('should handle login failure with invalid credentials', async () => {
      const user = userEvent.setup()
      
      render(
        <AuthProvider>
          <SimpleLoginForm />
        </AuthProvider>
      )
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      // Fill in invalid credentials
      await user.type(emailInput, 'invalid@example.com')
      await user.type(passwordInput, 'wrongpassword')
      
      // Submit form
      await user.click(submitButton)
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/Invalid/)).toBeInTheDocument()
      }, { timeout: currentTestConfig.timeout })
      
      // Should not redirect
      expect(mockPush).not.toHaveBeenCalled()
      
      // Should not update localStorage
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    }, currentTestConfig.timeout)

    it('should handle network errors during login', async () => {
      const user = userEvent.setup()
      
      // Mock network error
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      
      render(
        <AuthProvider>
          <SimpleLoginForm />
        </AuthProvider>
      )
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Error de conexión. Intenta nuevamente.')).toBeInTheDocument()
      }, { timeout: currentTestConfig.timeout })
      
      // Restore original fetch
      global.fetch = originalFetch
    }, currentTestConfig.timeout)
  })

  describe('Session Management', () => {
    it('should restore session from localStorage on app start', async () => {
      const mockUser = {
        id: '1',
        email: 'admin@servesplatform.com',
        name: 'Admin User',
        role: 'admin'
      }
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser)
        if (key === 'auth_token') return 'valid-token'
        return null
      })
      
      const TestComponent = () => {
        const { useAuth } = require('@/lib/simple-auth')
        const { isAuthenticated, user } = useAuth()
        
        return (
          <div>
            <div data-testid="auth-status">
              {isAuthenticated ? 'authenticated' : 'not-authenticated'}
            </div>
            <div data-testid="user-email">
              {user?.email || 'no-email'}
            </div>
          </div>
        )
      }
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
        expect(screen.getByTestId('user-email')).toHaveTextContent('admin@servesplatform.com')
      })
    }, currentTestConfig.timeout)

    it('should handle token validation on app start', async () => {
      const mockUser = {
        id: '1',
        email: 'admin@servesplatform.com',
        name: 'Admin User',
        role: 'admin'
      }
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser)
        if (key === 'auth_token') return 'valid-token'
        return null
      })
      
      // Mock successful token validation
      vi.spyOn(apiClient, 'whoami').mockResolvedValue({
        ok: true,
        data: mockUser,
        message: 'Success',
        timestamp: new Date().toISOString()
      })
      
      const TestComponent = () => {
        const { useAuth } = require('@/lib/simple-auth')
        const { isAuthenticated } = useAuth()
        
        return (
          <div data-testid="auth-status">
            {isAuthenticated ? 'authenticated' : 'not-authenticated'}
          </div>
        )
      }
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
      
      await waitFor(() => {
        expect(apiClient.whoami).toHaveBeenCalled()
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
      })
    }, currentTestConfig.timeout)

    it('should handle expired tokens', async () => {
      const mockUser = {
        id: '1',
        email: 'admin@servesplatform.com',
        name: 'Admin User',
        role: 'admin'
      }
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser)
        if (key === 'auth_token') return 'expired-token'
        return null
      })
      
      // Mock token validation failure
      vi.spyOn(apiClient, 'whoami').mockRejectedValue(new Error('Unauthorized'))
      
      const TestComponent = () => {
        const { useAuth } = require('@/lib/simple-auth')
        const { isAuthenticated } = useAuth()
        
        return (
          <div data-testid="auth-status">
            {isAuthenticated ? 'authenticated' : 'not-authenticated'}
          </div>
        )
      }
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user')
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token')
      })
    }, currentTestConfig.timeout)
  })

  describe('Logout Flow', () => {
    it('should complete full logout flow', async () => {
      const user = userEvent.setup()
      const mockUser = {
        id: '1',
        email: 'admin@servesplatform.com',
        name: 'Admin User',
        role: 'admin'
      }
      
      // Start with authenticated state
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser)
        if (key === 'auth_token') return 'valid-token'
        return null
      })
      
      const TestComponent = () => {
        const { useAuth } = require('@/lib/simple-auth')
        const { isAuthenticated, logout } = useAuth()
        
        return (
          <div>
            <div data-testid="auth-status">
              {isAuthenticated ? 'authenticated' : 'not-authenticated'}
            </div>
            <button onClick={logout}>Logout</button>
          </div>
        )
      }
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
      
      // Verify initial authenticated state
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
      
      // Click logout
      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)
      
      // Verify logout completed
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user')
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token')
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    }, currentTestConfig.timeout)
  })

  describe('Permission Integration', () => {
    it('should integrate permissions with API responses', async () => {
      const user = userEvent.setup()
      
      // Mock login response with specific permissions
      vi.spyOn(apiClient, 'login').mockResolvedValue({
        ok: true,
        data: {
          user: {
            id: '1',
            email: 'editor@servesplatform.com',
            name: 'Editor User',
            role: 'editor',
            permissions: ['materials.read', 'materials.write', 'projects.read']
          },
          token: 'editor-token'
        },
        message: 'Success',
        timestamp: new Date().toISOString()
      })
      
      const TestComponent = () => {
        const { useAuth } = require('@/lib/simple-auth')
        const { hasPermission } = useAuth()
        
        return (
          <div>
            <div data-testid="can-read">{hasPermission('read') ? 'yes' : 'no'}</div>
            <div data-testid="can-write">{hasPermission('write') ? 'yes' : 'no'}</div>
            <div data-testid="can-delete">{hasPermission('delete') ? 'yes' : 'no'}</div>
          </div>
        )
      }
      
      render(
        <AuthProvider>
          <SimpleLoginForm />
          <TestComponent />
        </AuthProvider>
      )
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      await user.type(emailInput, 'editor@servesplatform.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('can-read')).toHaveTextContent('yes')
        expect(screen.getByTestId('can-write')).toHaveTextContent('yes')
        expect(screen.getByTestId('can-delete')).toHaveTextContent('no')
      })
    }, currentTestConfig.timeout)
  })

  describe('Error Recovery', () => {
    it('should recover from temporary network issues', async () => {
      const user = userEvent.setup()
      let callCount = 0
      
      // Mock fetch to fail first time, succeed second time
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'))
        }
        return originalFetch.apply(global, arguments)
      })
      
      render(
        <AuthProvider>
          <SimpleLoginForm />
        </AuthProvider>
      )
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      // First attempt - should fail
      await user.type(emailInput, 'admin@servesplatform.com')
      await user.type(passwordInput, 'admin123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Error de conexión. Intenta nuevamente.')).toBeInTheDocument()
      })
      
      // Second attempt - should succeed
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      }, { timeout: currentTestConfig.timeout })
      
      // Restore original fetch
      global.fetch = originalFetch
    }, currentTestConfig.timeout * 2)

    it('should handle API service unavailability', async () => {
      const user = userEvent.setup()
      
      // Mock complete API failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Service unavailable'))
      
      render(
        <AuthProvider>
          <SimpleLoginForm />
        </AuthProvider>
      )
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      await user.type(emailInput, 'admin@servesplatform.com')
      await user.type(passwordInput, 'admin123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Error de conexión. Intenta nuevamente.')).toBeInTheDocument()
      })
      
      // Should not redirect or update localStorage
      expect(mockPush).not.toHaveBeenCalled()
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    }, currentTestConfig.timeout)
  })

  describe('Concurrent Authentication', () => {
    it('should handle multiple simultaneous login attempts', async () => {
      const user = userEvent.setup()
      
      render(
        <AuthProvider>
          <SimpleLoginForm />
        </AuthProvider>
      )
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      await user.type(emailInput, 'admin@servesplatform.com')
      await user.type(passwordInput, 'admin123')
      
      // Click submit multiple times rapidly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)
      
      // Should only make one API call
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledTimes(1)
      }, { timeout: currentTestConfig.timeout })
    }, currentTestConfig.timeout)
  })

  describe('Authentication State Persistence', () => {
    it('should maintain authentication across page reloads', async () => {
      const mockUser = {
        id: '1',
        email: 'admin@servesplatform.com',
        name: 'Admin User',
        role: 'admin'
      }
      
      // Simulate page reload with stored auth data
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser)
        if (key === 'auth_token') return 'valid-token'
        return null
      })
      
      vi.spyOn(apiClient, 'whoami').mockResolvedValue({
        ok: true,
        data: mockUser,
        message: 'Success',
        timestamp: new Date().toISOString()
      })
      
      const TestComponent = () => {
        const { useAuth } = require('@/lib/simple-auth')
        const { isAuthenticated, user } = useAuth()
        
        return (
          <div>
            <div data-testid="auth-status">
              {isAuthenticated ? 'authenticated' : 'not-authenticated'}
            </div>
            <div data-testid="user-email">
              {user?.email || 'no-email'}
            </div>
          </div>
        )
      }
      
      // First render - simulating app start
      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
        expect(screen.getByTestId('user-email')).toHaveTextContent('admin@servesplatform.com')
      })
      
      unmount()
      
      // Second render - simulating page reload
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
        expect(screen.getByTestId('user-email')).toHaveTextContent('admin@servesplatform.com')
      })
    }, currentTestConfig.timeout)
  })
})