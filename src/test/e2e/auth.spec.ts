import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should redirect to login when not authenticated', async ({ page }) => {
    await expect(page).toHaveURL(/.*login/)
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible()
  })

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Fill login form
    await page.getByLabel(/email/i).fill('admin@serves.com')
    await page.getByLabel(/contraseña/i).fill('admin123')
    
    // Submit form
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Fill login form with invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com')
    await page.getByLabel(/contraseña/i).fill('wrongpassword')
    
    // Submit form
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    
    // Should show error message
    await expect(page.getByText(/credenciales inválidas/i)).toBeVisible()
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*login/)
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@serves.com')
    await page.getByLabel(/contraseña/i).fill('admin123')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    
    await expect(page).toHaveURL('/dashboard')
    
    // Click user menu
    await page.getByRole('button', { name: /menú de usuario/i }).click()
    
    // Click logout
    await page.getByRole('menuitem', { name: /cerrar sesión/i }).click()
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/)
  })

  test('should maintain session on page refresh', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@serves.com')
    await page.getByLabel(/contraseña/i).fill('admin123')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    
    await expect(page).toHaveURL('/dashboard')
    
    // Refresh page
    await page.reload()
    
    // Should still be on dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })

  test('should handle expired token', async ({ page }) => {
    // Mock expired token scenario
    await page.addInitScript(() => {
      localStorage.setItem('jwt_token', 'expired.token.here')
      localStorage.setItem('user_data', JSON.stringify({
        id: 'user_1',
        email: 'admin@serves.com',
        nombre: 'Admin',
        rol: 'admin_lider'
      }))
    })

    await page.goto('/dashboard')
    
    // Should redirect to login due to expired token
    await expect(page).toHaveURL(/.*login/)
  })
})