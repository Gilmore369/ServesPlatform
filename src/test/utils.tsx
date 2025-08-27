import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AccessibilityProvider } from '@/lib/contexts/AccessibilityContext'
import type { User } from '@/lib/types'
import { vi } from 'vitest'

// Mock user for testing
const mockUser: User = {
  id: 'user_1',
  email: 'admin@serves.com',
  nombre: 'Admin Principal',
  rol: 'admin_lider',
  activo: true,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01')
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: User | null
  initialEntries?: string[]
}

// Create a mock auth context
const AuthContext = React.createContext<any>(null)

// Test-specific AuthProvider that accepts initialUser
function TestAuthProvider({ children, initialUser }: { children: React.ReactNode; initialUser?: User | null }) {
  const [user, setUser] = React.useState<User | null>(initialUser || null)
  
  const authValue = {
    user,
    isLoading: false,
    isAuthenticated: !!user,
    login: vi.fn().mockResolvedValue({ success: true }),
    logout: vi.fn().mockImplementation(() => setUser(null)),
    checkAuth: vi.fn()
  }

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom render function with providers
export function renderWithProviders(
  ui: React.ReactElement,
  {
    user = mockUser,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AccessibilityProvider>
        <TestAuthProvider initialUser={user}>
          {children}
        </TestAuthProvider>
      </AccessibilityProvider>
    )
  }

  return {
    user: user || mockUser,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  }
}

// Helper to create mock API responses
export function createMockResponse<T>(data: T, ok = true) {
  return {
    ok,
    data,
    message: ok ? 'Success' : 'Error'
  }
}

// Helper to simulate user interactions
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    ...mockUser,
    ...overrides
  }
}

// Helper for testing role-based access
export function createUserWithRole(rol: User['rol']): User {
  return createMockUser({ rol })
}

// Helper for testing form submissions
export async function fillForm(
  getByLabelText: (text: string) => HTMLElement,
  formData: Record<string, string>
) {
  const user = userEvent.setup()
  for (const [label, value] of Object.entries(formData)) {
    const input = getByLabelText(label)
    await user.clear(input)
    await user.type(input, value)
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'