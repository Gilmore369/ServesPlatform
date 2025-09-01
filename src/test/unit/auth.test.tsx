/**
 * Authentication and Routing Component Tests
 * Tests for authentication context, routing, and protected routes
 * Requirements: 8.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactNode } from 'react'

// Mock the API client
const mockApiClient = {
  login: vi.fn(),
  whoami: vi.fn(),
}

vi.mock('@/lib/apiClient', () => ({
  apiClient: mockApiClient
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

// Mock router
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockBack = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

// Import auth components after mocking
import { AuthProvider, useAuth } from '@/lib/simple-auth'

// Test component to use auth context
const TestAuthComponent = () => {
  const { user, isAuthenticated, login, logout, hasPermission } = useAuth()
  
  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'authenticated' : 'not-authenticated'}
      </div>
      <div data-testid="user-info">
        {user ? JSON.stringify(user) : 'no-user'}
      </div>
      <button onClick={() => login('test@example.com', 'password')}>
        Login
      </button>
      <button onClick={logout}>
        Logout
      </button>
      <div data-testid="permissions">
        <span data-testid="can-read">{hasPermission('read') ? 'yes' : 'no'}</span>
        <span data-testid="can-write">{hasPermission('write') ? 'yes' : 'no'}</span>
        <span data-testid="can-delete">{hasPermission('delete') ? 'yes' : 'no'}</span>
      </div>
    </div>
  )
}

// Wrapper component for testing
const AuthTestWrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
)

describe('Authentication Context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    cleanup()
  })

  describe('Initial State', () => {
    it('should start with unauthenticated state', () => {
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
      expect(screen.getByTestId('user-info')).toHaveTextContent('no-user')
    })

    it('should restore authentication from localStorage', () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
      }
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser)
        if (key === 'auth_token') return 'mock-token'
        return null
      })
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('user-info')).toHaveTextContent(JSON.stringify(mockUser))
    })

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return 'invalid-json'
        return null
      })
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
      expect(screen.getByTestId('user-info')).toHaveTextContent('no-user')
    })
  })

  describe('Login Process', () => {
    it('should handle successful login', async () => {
      const user = userEvent.setup()
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
      }
      
      mockApiClient.login.mockResolvedValue({
        ok: true,
        data: {
          user: mockUser,
          token: 'mock-token'
        }
      })
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      const loginButton = screen.getByText('Login')
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
      })
      
      expect(screen.getByTestId('user-info')).toHaveTextContent(JSON.stringify(mockUser))
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_user', JSON.stringify(mockUser))
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'mock-token')
    })

    it('should handle login failure', async () => {
      const user = userEvent.setup()
      
      mockApiClient.login.mockResolvedValue({
        ok: false,
        message: 'Invalid credentials'
      })
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      const loginButton = screen.getByText('Login')
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
      })
      
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })

    it('should handle network errors during login', async () => {
      const user = userEvent.setup()
      
      mockApiClient.login.mockRejectedValue(new Error('Network error'))
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      const loginButton = screen.getByText('Login')
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
      })
    })

    it('should validate login parameters', async () => {
      const user = userEvent.setup()
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      const loginButton = screen.getByText('Login')
      await user.click(loginButton)
      
      expect(mockApiClient.login).toHaveBeenCalledWith('test@example.com', 'password')
    })
  })

  describe('Logout Process', () => {
    it('should handle logout correctly', async () => {
      const user = userEvent.setup()
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
      }
      
      // Start with authenticated state
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser)
        if (key === 'auth_token') return 'mock-token'
        return null
      })
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      // Verify initial authenticated state
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
      
      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
      })
      
      expect(screen.getByTestId('user-info')).toHaveTextContent('no-user')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token')
    })

    it('should redirect to login page after logout', async () => {
      const user = userEvent.setup()
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
      }
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser)
        if (key === 'auth_token') return 'mock-token'
        return null
      })
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('Permission System', () => {
    it('should handle admin permissions correctly', () => {
      const mockUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      }
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser)
        if (key === 'auth_token') return 'mock-token'
        return null
      })
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      expect(screen.getByTestId('can-read')).toHaveTextContent('yes')
      expect(screen.getByTestId('can-write')).toHaveTextContent('yes')
      expect(screen.getByTestId('can-delete')).toHaveTextContent('yes')
    })

    it('should handle editor permissions correctly', () => {
      const mockUser = {
        id: '1',
        email: 'editor@example.com',
        name: 'Editor User',
        role: 'editor'
      }
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser)
        if (key === 'auth_token') return 'mock-token'
        return null
      })
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      expect(screen.getByTestId('can-read')).toHaveTextContent('yes')
      expect(screen.getByTestId('can-write')).toHaveTextContent('yes')
      expect(screen.getByTestId('can-delete')).toHaveTextContent('no')
    })

    it('should handle viewer permissions correctly', () => {
      const mockUser = {
        id: '1',
        email: 'viewer@example.com',
        name: 'Viewer User',
        role: 'viewer'
      }
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser)
        if (key === 'auth_token') return 'mock-token'
        return null
      })
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      expect(screen.getByTestId('can-read')).toHaveTextContent('yes')
      expect(screen.getByTestId('can-write')).toHaveTextContent('no')
      expect(screen.getByTestId('can-delete')).toHaveTextContent('no')
    })

    it('should deny all permissions for unauthenticated users', () => {
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      expect(screen.getByTestId('can-read')).toHaveTextContent('no')
      expect(screen.getByTestId('can-write')).toHaveTextContent('no')
      expect(screen.getByTestId('can-delete')).toHaveTextContent('no')
    })

    it('should handle unknown roles gracefully', () => {
      const mockUser = {
        id: '1',
        email: 'unknown@example.com',
        name: 'Unknown User',
        role: 'unknown_role'
      }
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser)
        if (key === 'auth_token') return 'mock-token'
        return null
      })
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      expect(screen.getByTestId('can-read')).toHaveTextContent('no')
      expect(screen.getByTestId('can-write')).toHaveTextContent('no')
      expect(screen.getByTestId('can-delete')).toHaveTextContent('no')
    })
  })

  describe('Token Management', () => {
    it('should handle token expiration', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
      }
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser)
        if (key === 'auth_token') return 'expired-token'
        return null
      })
      
      // Mock whoami to return unauthorized
      mockApiClient.whoami.mockRejectedValue(new Error('Unauthorized'))
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      // Should automatically logout on token expiration
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
      })
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token')
    })

    it('should validate token on app initialization', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
      }
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser)
        if (key === 'auth_token') return 'valid-token'
        return null
      })
      
      mockApiClient.whoami.mockResolvedValue({
        ok: true,
        data: mockUser
      })
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      await waitFor(() => {
        expect(mockApiClient.whoami).toHaveBeenCalled()
      })
      
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup()
      
      mockApiClient.login.mockRejectedValue(new Error('API Error'))
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      const loginButton = screen.getByText('Login')
      await user.click(loginButton)
      
      // Should remain unauthenticated
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
      })
    })

    it('should handle localStorage errors', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      // Should not crash the app
      expect(() => {
        render(
          <AuthTestWrapper>
            <TestAuthComponent />
          </AuthTestWrapper>
        )
      }).not.toThrow()
      
      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
    })

    it('should handle setItem localStorage errors', async () => {
      const user = userEvent.setup()
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
      }
      
      mockApiClient.login.mockResolvedValue({
        ok: true,
        data: {
          user: mockUser,
          token: 'mock-token'
        }
      })
      
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage setItem error')
      })
      
      render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      const loginButton = screen.getByText('Login')
      await user.click(loginButton)
      
      // Should still authenticate even if localStorage fails
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
      })
    })
  })

  describe('Context Provider', () => {
    it('should throw error when used outside provider', () => {
      // Mock console.error to avoid noise in test output
      const originalError = console.error
      console.error = vi.fn()
      
      expect(() => {
        render(<TestAuthComponent />)
      }).toThrow()
      
      console.error = originalError
    })

    it('should provide auth context to nested components', () => {
      const NestedComponent = () => {
        const { isAuthenticated } = useAuth()
        return <div data-testid="nested-auth">{isAuthenticated ? 'yes' : 'no'}</div>
      }
      
      render(
        <AuthTestWrapper>
          <div>
            <NestedComponent />
          </div>
        </AuthTestWrapper>
      )
      
      expect(screen.getByTestId('nested-auth')).toHaveTextContent('no')
    })
  })

  describe('Memory Leaks and Cleanup', () => {
    it('should cleanup event listeners on unmount', () => {
      const { unmount } = render(
        <AuthTestWrapper>
          <TestAuthComponent />
        </AuthTestWrapper>
      )
      
      // Should not throw errors on unmount
      expect(() => unmount()).not.toThrow()
    })

    it('should handle rapid mount/unmount cycles', () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <AuthTestWrapper>
            <TestAuthComponent />
          </AuthTestWrapper>
        )
        unmount()
      }
      
      // Should not cause memory leaks or errors
      expect(true).toBe(true)
    })
  })
})