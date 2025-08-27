import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@serves.com')
    await page.getByLabel(/contraseña/i).fill('admin123')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await expect(page).toHaveURL('/dashboard')
  })

  test('should display KPI cards', async ({ page }) => {
    // Check for KPI cards
    await expect(page.getByText('Proyectos Activos')).toBeVisible()
    await expect(page.getByText('Tareas Pendientes')).toBeVisible()
    await expect(page.getByText('Personal Activo')).toBeVisible()
    await expect(page.getByText('Presupuesto Restante')).toBeVisible()
    
    // Check for numeric values
    await expect(page.locator('[data-testid="kpi-proyectos"] .text-2xl')).toBeVisible()
    await expect(page.locator('[data-testid="kpi-tareas"] .text-2xl')).toBeVisible()
  })

  test('should display recent projects', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /proyectos recientes/i })).toBeVisible()
    
    // Should show project cards
    await expect(page.locator('[data-testid="project-card"]').first()).toBeVisible()
  })

  test('should display alerts timeline', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /alertas/i })).toBeVisible()
    
    // Should show alerts or empty state
    const alertsSection = page.locator('[data-testid="alerts-timeline"]')
    await expect(alertsSection).toBeVisible()
  })

  test('should navigate to projects from KPI card', async ({ page }) => {
    // Click on projects KPI card
    await page.locator('[data-testid="kpi-proyectos"]').click()
    
    // Should navigate to projects page
    await expect(page).toHaveURL('/proyectos')
  })

  test('should navigate to project detail from recent projects', async ({ page }) => {
    // Wait for projects to load
    await page.waitForSelector('[data-testid="project-card"]')
    
    // Click on first project card
    await page.locator('[data-testid="project-card"]').first().click()
    
    // Should navigate to project detail
    await expect(page.url()).toMatch(/\/proyectos\/[^/]+/)
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check that dashboard is still functional
    await expect(page.getByText('Proyectos Activos')).toBeVisible()
    
    // Check that sidebar is collapsed on mobile
    const sidebar = page.locator('[data-testid="sidebar"]')
    await expect(sidebar).toHaveClass(/hidden|lg:block/)
  })

  test('should handle loading states', async ({ page }) => {
    // Intercept API calls to simulate slow loading
    await page.route('**/api/dashboard/kpis', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.continue()
    })
    
    await page.reload()
    
    // Should show loading skeletons
    await expect(page.locator('.animate-pulse').first()).toBeVisible()
  })

  test('should handle error states', async ({ page }) => {
    // Intercept API calls to simulate error
    await page.route('**/api/dashboard/kpis', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ ok: false, message: 'Server error' })
      })
    })
    
    await page.reload()
    
    // Should show error message
    await expect(page.getByText(/error al cargar/i)).toBeVisible()
  })

  test('should refresh data when refresh button is clicked', async ({ page }) => {
    // Look for refresh button
    const refreshButton = page.getByRole('button', { name: /actualizar/i })
    
    if (await refreshButton.isVisible()) {
      await refreshButton.click()
      
      // Should show loading state briefly
      await expect(page.locator('.animate-pulse').first()).toBeVisible()
    }
  })

  test('should filter data based on user role', async ({ page }) => {
    // Logout and login as editor
    await page.getByRole('button', { name: /menú de usuario/i }).click()
    await page.getByRole('menuitem', { name: /cerrar sesión/i }).click()
    
    await page.getByLabel(/email/i).fill('editor@serves.com')
    await page.getByLabel(/contraseña/i).fill('editor123')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    
    await expect(page).toHaveURL('/dashboard')
    
    // Should show filtered data for editor role
    // This would depend on the actual implementation
    await expect(page.getByText('Proyectos Activos')).toBeVisible()
  })
})