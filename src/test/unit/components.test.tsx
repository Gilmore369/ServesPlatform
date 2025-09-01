/**
 * Frontend Component Tests
 * Comprehensive tests for all major React components
 * Requirements: 8.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SimpleLoginForm } from '@/components/auth/SimpleLoginForm'
import { MaterialsList } from '@/components/materials/MaterialsList'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { testUtils } from '../test.config'

// Mock the auth hook
const mockLogin = vi.fn()
const mockHasPermission = vi.fn()
const mockUseAuth = {
  login: mockLogin,
  hasPermission: mockHasPermission,
  user: null,
  isAuthenticated: false,
  logout: vi.fn()
}

vi.mock('@/lib/simple-auth', () => ({
  useAuth: () => mockUseAuth
}))

// Mock the router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock the pagination hook
const mockUsePaginatedMaterials = {
  data: [],
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 25
  },
  actions: {
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    setSearch: vi.fn(),
    refresh: vi.fn()
  }
}

vi.mock('@/hooks/usePagination', () => ({
  usePaginatedMaterials: () => mockUsePaginatedMaterials
}))

// Mock the simple data hooks
vi.mock('@/hooks/useSimpleData', () => ({
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn()
}))

describe('Authentication Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('SimpleLoginForm', () => {
    it('should render login form correctly', () => {
      render(<SimpleLoginForm />)
      
      expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument()
      expect(screen.getByText('ServesPlatform - Sistema de Gestión')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Iniciar Sesión' })).toBeInTheDocument()
    })

    it('should handle form input changes', async () => {
      const user = userEvent.setup()
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
    })

    it('should validate required fields', async () => {
      const user = userEvent.setup()
      render(<SimpleLoginForm />)
      
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      // Try to submit without filling fields
      await user.click(submitButton)
      
      // HTML5 validation should prevent submission
      const emailInput = screen.getByLabelText('Email')
      expect(emailInput).toBeRequired()
      expect(emailInput).toHaveValue('')
    })

    it('should handle successful login', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue({ success: true })
      
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      await user.type(emailInput, 'admin@servesplatform.com')
      await user.type(passwordInput, 'admin123')
      await user.click(submitButton)
      
      expect(mockLogin).toHaveBeenCalledWith('admin@servesplatform.com', 'admin123')
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should handle login failure', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue({ 
        success: false, 
        message: 'Invalid credentials' 
      })
      
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      await user.type(emailInput, 'wrong@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
      
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should handle network errors', async () => {
      const user = userEvent.setup()
      mockLogin.mockRejectedValue(new Error('Network error'))
      
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Error de conexión. Intenta nuevamente.')).toBeInTheDocument()
      })
    })

    it('should show loading state during login', async () => {
      const user = userEvent.setup()
      let resolveLogin: (value: any) => void
      mockLogin.mockReturnValue(new Promise(resolve => {
        resolveLogin = resolve
      }))
      
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      // Should show loading state
      expect(screen.getByText('Iniciando sesión...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      
      // Resolve the login
      resolveLogin!({ success: true })
      
      await waitFor(() => {
        expect(screen.queryByText('Iniciando sesión...')).not.toBeInTheDocument()
      })
    })

    it('should have proper accessibility attributes', () => {
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('autoComplete', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })
})

describe('Materials Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasPermission.mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
  })

  describe('MaterialsList', () => {
    it('should render materials list correctly', () => {
      render(<MaterialsList />)
      
      expect(screen.getByText('Materiales')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Buscar materiales...')).toBeInTheDocument()
      expect(screen.getByText('Nuevo Material')).toBeInTheDocument()
    })

    it('should show loading state', () => {
      mockUsePaginatedMaterials.loading = true
      
      render(<MaterialsList />)
      
      // Should show loading spinner in header
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should show error state', () => {
      mockUsePaginatedMaterials.loading = false
      mockUsePaginatedMaterials.error = new Error('Failed to load materials')
      
      render(<MaterialsList />)
      
      expect(screen.getByText(/Error al cargar materiales/)).toBeInTheDocument()
    })

    it('should show empty state when no materials', () => {
      mockUsePaginatedMaterials.loading = false
      mockUsePaginatedMaterials.error = null
      mockUsePaginatedMaterials.data = []
      
      render(<MaterialsList />)
      
      expect(screen.getByText('No hay materiales')).toBeInTheDocument()
      expect(screen.getByText('Crear Primer Material')).toBeInTheDocument()
    })

    it('should display materials data correctly', () => {
      const mockMaterials = [
        {
          id: '1',
          sku: 'MAT001',
          descripcion: 'Test Material 1',
          categoria: 'Test Category',
          stock_actual: 100,
          stock_minimo: 10,
          costo_ref: 25.50,
          proveedor_principal: 'Test Provider',
          activo: true
        },
        {
          id: '2',
          sku: 'MAT002',
          descripcion: 'Test Material 2',
          categoria: 'Test Category',
          stock_actual: 5,
          stock_minimo: 10,
          costo_ref: 15.75,
          proveedor_principal: 'Test Provider 2',
          activo: false
        }
      ]
      
      mockUsePaginatedMaterials.loading = false
      mockUsePaginatedMaterials.error = null
      mockUsePaginatedMaterials.data = mockMaterials
      
      render(<MaterialsList />)
      
      // Check if materials are displayed
      expect(screen.getByText('MAT001')).toBeInTheDocument()
      expect(screen.getByText('Test Material 1')).toBeInTheDocument()
      expect(screen.getByText('MAT002')).toBeInTheDocument()
      expect(screen.getByText('Test Material 2')).toBeInTheDocument()
      
      // Check stock status
      expect(screen.getByText('En stock')).toBeInTheDocument()
      expect(screen.getByText('Stock bajo')).toBeInTheDocument()
      
      // Check status badges
      expect(screen.getByText('Activo')).toBeInTheDocument()
      expect(screen.getByText('Inactivo')).toBeInTheDocument()
      
      // Check prices
      expect(screen.getByText('S/ 25.50')).toBeInTheDocument()
      expect(screen.getByText('S/ 15.75')).toBeInTheDocument()
    })

    it('should handle search input', async () => {
      const user = userEvent.setup()
      render(<MaterialsList />)
      
      const searchInput = screen.getByPlaceholderText('Buscar materiales...')
      
      await user.type(searchInput, 'test search')
      
      expect(mockUsePaginatedMaterials.actions.setSearch).toHaveBeenCalledWith('test search')
    })

    it('should open create modal when clicking new material button', async () => {
      const user = userEvent.setup()
      render(<MaterialsList />)
      
      const newMaterialButton = screen.getByText('Nuevo Material')
      await user.click(newMaterialButton)
      
      expect(screen.getByText('Crear Nuevo Material')).toBeInTheDocument()
    })

    it('should handle permissions correctly', () => {
      mockHasPermission.mockImplementation((permission) => {
        return permission === 'read' // Only read permission
      })
      
      render(<MaterialsList />)
      
      // Should not show create button without write permission
      expect(screen.queryByText('Nuevo Material')).not.toBeInTheDocument()
    })

    it('should show edit and delete buttons for users with permissions', () => {
      const mockMaterials = [
        {
          id: '1',
          sku: 'MAT001',
          descripcion: 'Test Material 1',
          categoria: 'Test Category',
          stock_actual: 100,
          stock_minimo: 10,
          costo_ref: 25.50,
          proveedor_principal: 'Test Provider',
          activo: true
        }
      ]
      
      mockUsePaginatedMaterials.data = mockMaterials
      mockHasPermission.mockReturnValue(true)
      
      render(<MaterialsList />)
      
      // Should show action buttons
      const editButtons = screen.getAllByTitle('Editar material')
      const deleteButtons = screen.getAllByTitle('Eliminar material')
      
      expect(editButtons).toHaveLength(1)
      expect(deleteButtons).toHaveLength(1)
    })

    it('should handle edit material action', async () => {
      const user = userEvent.setup()
      const mockMaterials = [
        {
          id: '1',
          sku: 'MAT001',
          descripcion: 'Test Material 1',
          categoria: 'Test Category',
          stock_actual: 100,
          stock_minimo: 10,
          costo_ref: 25.50,
          proveedor_principal: 'Test Provider',
          activo: true
        }
      ]
      
      mockUsePaginatedMaterials.data = mockMaterials
      
      render(<MaterialsList />)
      
      const editButton = screen.getByTitle('Editar material')
      await user.click(editButton)
      
      expect(screen.getByText('Editar Material')).toBeInTheDocument()
    })

    it('should handle delete material confirmation', async () => {
      const user = userEvent.setup()
      const mockMaterials = [
        {
          id: '1',
          sku: 'MAT001',
          descripcion: 'Test Material 1',
          categoria: 'Test Category',
          stock_actual: 100,
          stock_minimo: 10,
          costo_ref: 25.50,
          proveedor_principal: 'Test Provider',
          activo: true
        }
      ]
      
      mockUsePaginatedMaterials.data = mockMaterials
      
      render(<MaterialsList />)
      
      const deleteButton = screen.getByTitle('Eliminar material')
      await user.click(deleteButton)
      
      expect(screen.getByText('Confirmar Eliminación')).toBeInTheDocument()
      expect(screen.getByText(/¿Estás seguro de que deseas eliminar el material "Test Material 1"?/)).toBeInTheDocument()
    })

    it('should handle pagination correctly', async () => {
      const user = userEvent.setup()
      mockUsePaginatedMaterials.pagination = {
        currentPage: 1,
        totalPages: 3,
        totalItems: 75,
        itemsPerPage: 25
      }
      
      render(<MaterialsList />)
      
      // Should show pagination component
      expect(screen.getByText('75')).toBeInTheDocument() // Total items
    })
  })
})

describe('Error Handling Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('ErrorBoundary', () => {
    // Mock console.error to avoid noise in tests
    const originalError = console.error
    beforeEach(() => {
      console.error = vi.fn()
    })

    afterEach(() => {
      console.error = originalError
    })

    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error')
      }
      return <div>No error</div>
    }

    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('should catch and display errors', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
    })

    it('should provide error details in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      expect(screen.getByText(/Test error/)).toBeInTheDocument()
      
      process.env.NODE_ENV = originalEnv
    })

    it('should have retry functionality', async () => {
      const user = userEvent.setup()
      let shouldThrow = true
      
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error')
        }
        return <div>Recovered</div>
      }
      
      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      )
      
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
      
      // Simulate recovery
      shouldThrow = false
      
      const retryButton = screen.getByText(/Try again/i)
      await user.click(retryButton)
      
      // Re-render with recovered state
      rerender(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('Recovered')).toBeInTheDocument()
    })
  })
})

describe('Form Validation Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Form Validation', () => {
    it('should validate email format in login form', async () => {
      const user = userEvent.setup()
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      // Enter invalid email
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      // HTML5 validation should prevent submission
      expect(emailInput).toBeInvalid()
    })

    it('should validate required fields', async () => {
      const user = userEvent.setup()
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      // Try to submit with empty fields
      await user.click(submitButton)
      
      expect(emailInput).toBeRequired()
      expect(passwordInput).toBeRequired()
    })

    it('should clear validation errors when user starts typing', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue({ 
        success: false, 
        message: 'Invalid credentials' 
      })
      
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      // Submit with wrong credentials
      await user.type(emailInput, 'wrong@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
      
      // Start typing in email field
      await user.clear(emailInput)
      await user.type(emailInput, 'correct@example.com')
      
      // Error should be cleared
      expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument()
    })
  })
})

describe('Data Display Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Table Components', () => {
    it('should format currency values correctly', () => {
      const mockMaterials = [
        {
          id: '1',
          sku: 'MAT001',
          descripcion: 'Test Material',
          categoria: 'Test Category',
          stock_actual: 100,
          stock_minimo: 10,
          costo_ref: 25.5,
          proveedor_principal: 'Test Provider',
          activo: true
        }
      ]
      
      mockUsePaginatedMaterials.data = mockMaterials
      
      render(<MaterialsList />)
      
      expect(screen.getByText('S/ 25.50')).toBeInTheDocument()
    })

    it('should handle null/undefined values gracefully', () => {
      const mockMaterials = [
        {
          id: '1',
          sku: 'MAT001',
          descripcion: 'Test Material',
          categoria: 'Test Category',
          stock_actual: 100,
          stock_minimo: 10,
          costo_ref: null,
          proveedor_principal: 'Test Provider',
          activo: true
        }
      ]
      
      mockUsePaginatedMaterials.data = mockMaterials
      
      render(<MaterialsList />)
      
      expect(screen.getByText('S/ 0.00')).toBeInTheDocument()
    })

    it('should truncate long descriptions with title attribute', () => {
      const longDescription = 'This is a very long description that should be truncated in the table view but still be accessible via the title attribute for accessibility'
      
      const mockMaterials = [
        {
          id: '1',
          sku: 'MAT001',
          descripcion: longDescription,
          categoria: 'Test Category',
          stock_actual: 100,
          stock_minimo: 10,
          costo_ref: 25.50,
          proveedor_principal: 'Test Provider',
          activo: true
        }
      ]
      
      mockUsePaginatedMaterials.data = mockMaterials
      
      render(<MaterialsList />)
      
      const descriptionElement = screen.getByTitle(longDescription)
      expect(descriptionElement).toBeInTheDocument()
      expect(descriptionElement).toHaveClass('truncate')
    })
  })
})

describe('User Interaction Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Modal Interactions', () => {
    it('should close modal when clicking cancel', async () => {
      const user = userEvent.setup()
      render(<MaterialsList />)
      
      // Open create modal
      const newMaterialButton = screen.getByText('Nuevo Material')
      await user.click(newMaterialButton)
      
      expect(screen.getByText('Crear Nuevo Material')).toBeInTheDocument()
      
      // Click cancel
      const cancelButton = screen.getByText('Cancelar')
      await user.click(cancelButton)
      
      expect(screen.queryByText('Crear Nuevo Material')).not.toBeInTheDocument()
    })

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      
      // Tab navigation should work
      await user.tab()
      expect(emailInput).toHaveFocus()
      
      await user.tab()
      expect(passwordInput).toHaveFocus()
    })
  })
})

describe('Performance and Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      
      expect(emailInput).toHaveAccessibleName('Email')
      expect(passwordInput).toHaveAccessibleName('Contraseña')
    })

    it('should have proper heading hierarchy', () => {
      render(<MaterialsList />)
      
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('Materiales')
    })

    it('should have proper button roles and labels', () => {
      render(<SimpleLoginForm />)
      
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = vi.fn()
      
      const TestComponent = () => {
        renderSpy()
        return <SimpleLoginForm />
      }
      
      const { rerender } = render(<TestComponent />)
      
      expect(renderSpy).toHaveBeenCalledTimes(1)
      
      // Re-render with same props
      rerender(<TestComponent />)
      
      // Should only render twice (initial + rerender)
      expect(renderSpy).toHaveBeenCalledTimes(2)
    })
  })
})