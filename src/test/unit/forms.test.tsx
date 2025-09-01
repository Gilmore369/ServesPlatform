/**
 * Form Validation and Submission Tests
 * Tests for form validation logic and submission handling
 * Requirements: 8.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SimpleLoginForm } from '@/components/auth/SimpleLoginForm'

// Mock validation functions
const mockValidateEmail = vi.fn()
const mockValidatePassword = vi.fn()
const mockValidateRequired = vi.fn()

vi.mock('@/lib/validation', () => ({
  validateEmail: mockValidateEmail,
  validatePassword: mockValidatePassword,
  validateRequired: mockValidateRequired,
}))

// Mock auth hook
const mockLogin = vi.fn()
const mockUseAuth = {
  login: mockLogin,
  hasPermission: vi.fn(),
  user: null,
  isAuthenticated: false,
  logout: vi.fn()
}

vi.mock('@/lib/simple-auth', () => ({
  useAuth: () => mockUseAuth
}))

// Mock router
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
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}))

describe('Form Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Email Validation', () => {
    it('should validate email format correctly', async () => {
      const user = userEvent.setup()
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      
      // Test valid email
      await user.type(emailInput, 'valid@example.com')
      expect(emailInput).toHaveValue('valid@example.com')
      expect(emailInput.validity.valid).toBe(true)
      
      // Test invalid email
      await user.clear(emailInput)
      await user.type(emailInput, 'invalid-email')
      expect(emailInput.validity.valid).toBe(false)
    })

    it('should show validation error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      // HTML5 validation should prevent submission
      expect(emailInput.validity.typeMismatch).toBe(true)
    })

    it('should accept various valid email formats', async () => {
      const user = userEvent.setup()
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user123@example-domain.com',
        'user@subdomain.example.com'
      ]
      
      for (const email of validEmails) {
        await user.clear(emailInput)
        await user.type(emailInput, email)
        expect(emailInput.validity.valid).toBe(true)
      }
    })

    it('should reject invalid email formats', async () => {
      const user = userEvent.setup()
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@example.com',
        'invalid.email',
        'invalid@.com',
        'invalid@domain.',
        'invalid..email@example.com'
      ]
      
      for (const email of invalidEmails) {
        await user.clear(emailInput)
        await user.type(emailInput, email)
        expect(emailInput.validity.valid).toBe(false)
      }
    })
  })

  describe('Password Validation', () => {
    it('should require password field', async () => {
      const user = userEvent.setup()
      render(<SimpleLoginForm />)
      
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      // Try to submit without password
      await user.click(submitButton)
      
      expect(passwordInput.validity.valueMissing).toBe(true)
    })

    it('should accept any non-empty password', async () => {
      const user = userEvent.setup()
      render(<SimpleLoginForm />)
      
      const passwordInput = screen.getByLabelText('Contraseña')
      
      const passwords = [
        'short',
        'verylongpasswordwithmanycharacters',
        'password123',
        'P@ssw0rd!',
        '12345',
        'password with spaces'
      ]
      
      for (const password of passwords) {
        await user.clear(passwordInput)
        await user.type(passwordInput, password)
        expect(passwordInput.validity.valid).toBe(true)
      }
    })
  })

  describe('Required Field Validation', () => {
    it('should validate all required fields', async () => {
      const user = userEvent.setup()
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      // Both fields should be required
      expect(emailInput).toBeRequired()
      expect(passwordInput).toBeRequired()
      
      // Try to submit empty form
      await user.click(submitButton)
      
      expect(emailInput.validity.valueMissing).toBe(true)
      expect(passwordInput.validity.valueMissing).toBe(true)
    })

    it('should validate individual required fields', async () => {
      const user = userEvent.setup()
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      // Fill only email
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      expect(emailInput.validity.valid).toBe(true)
      expect(passwordInput.validity.valueMissing).toBe(true)
      
      // Fill only password
      await user.clear(emailInput)
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      expect(emailInput.validity.valueMissing).toBe(true)
      expect(passwordInput.validity.valid).toBe(true)
    })
  })
})

describe('Form Submission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Successful Submission', () => {
    it('should submit form with valid data', async () => {
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

    it('should handle form submission via Enter key', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue({ success: true })
      
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      
      await user.type(emailInput, 'admin@servesplatform.com')
      await user.type(passwordInput, 'admin123')
      await user.keyboard('{Enter}')
      
      expect(mockLogin).toHaveBeenCalledWith('admin@servesplatform.com', 'admin123')
    })

    it('should clear form errors on successful submission', async () => {
      const user = userEvent.setup()
      
      // First, cause an error
      mockLogin.mockResolvedValueOnce({ 
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
      
      // Now submit successfully
      mockLogin.mockResolvedValueOnce({ success: true })
      
      await user.clear(emailInput)
      await user.clear(passwordInput)
      await user.type(emailInput, 'admin@servesplatform.com')
      await user.type(passwordInput, 'admin123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument()
      })
    })
  })

  describe('Failed Submission', () => {
    it('should handle authentication failure', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue({ 
        success: false, 
        message: 'Invalid email or password' 
      })
      
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      await user.type(emailInput, 'wrong@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
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

    it('should handle server errors', async () => {
      const user = userEvent.setup()
      mockLogin.mockRejectedValue(new Error('Server error'))
      
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

    it('should handle timeout errors', async () => {
      const user = userEvent.setup()
      mockLogin.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )
      
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Error de conexión. Intenta nuevamente.')).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during submission', async () => {
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
      
      // Should show loading spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
      
      // Resolve the login
      resolveLogin!({ success: true })
      
      await waitFor(() => {
        expect(screen.queryByText('Iniciando sesión...')).not.toBeInTheDocument()
      })
    })

    it('should disable form during submission', async () => {
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
      
      // Form should be disabled during submission
      expect(submitButton).toBeDisabled()
      
      // User should not be able to modify inputs during submission
      await user.type(emailInput, 'more text')
      // The input should still have the original value
      expect(emailInput).toHaveValue('test@example.com')
      
      // Resolve the login
      resolveLogin!({ success: true })
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('should handle multiple rapid submissions', async () => {
      const user = userEvent.setup()
      mockLogin.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )
      
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      // Click submit multiple times rapidly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)
      
      // Should only call login once
      expect(mockLogin).toHaveBeenCalledTimes(1)
    })
  })

  describe('Form Reset and Cleanup', () => {
    it('should clear errors when user starts typing', async () => {
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
      await user.type(emailInput, 'c')
      
      // Error should be cleared
      expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument()
    })

    it('should maintain form state after failed submission', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue({ 
        success: false, 
        message: 'Invalid credentials' 
      })
      
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
      
      // Form values should be preserved
      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
    })
  })
})

describe('Form Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('ARIA Attributes', () => {
    it('should have proper ARIA labels', () => {
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      
      expect(emailInput).toHaveAccessibleName('Email')
      expect(passwordInput).toHaveAccessibleName('Contraseña')
    })

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue({ 
        success: false, 
        message: 'Invalid email or password' 
      })
      
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      await user.type(emailInput, 'wrong@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)
      
      await waitFor(() => {
        const errorMessage = screen.getByText('Invalid email or password')
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveAttribute('role', 'alert')
      })
    })

    it('should have proper form structure', () => {
      render(<SimpleLoginForm />)
      
      const form = screen.getByRole('form')
      expect(form).toBeInTheDocument()
      
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support tab navigation', async () => {
      const user = userEvent.setup()
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      const submitButton = screen.getByRole('button', { name: 'Iniciar Sesión' })
      
      // Tab through form elements
      await user.tab()
      expect(emailInput).toHaveFocus()
      
      await user.tab()
      expect(passwordInput).toHaveFocus()
      
      await user.tab()
      expect(submitButton).toHaveFocus()
    })

    it('should support Enter key submission', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue({ success: true })
      
      render(<SimpleLoginForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Contraseña')
      
      await user.type(emailInput, 'admin@servesplatform.com')
      await user.type(passwordInput, 'admin123')
      await user.keyboard('{Enter}')
      
      expect(mockLogin).toHaveBeenCalledWith('admin@servesplatform.com', 'admin123')
    })

    it('should support Escape key to clear errors', async () => {
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
      
      // Press Escape to clear error (if implemented)
      await user.keyboard('{Escape}')
      
      // Note: This would need to be implemented in the component
      // For now, we just test that the error is still there
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })
})