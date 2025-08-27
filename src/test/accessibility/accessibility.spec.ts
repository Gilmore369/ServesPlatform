import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@serves.com')
    await page.getByLabel(/contraseña/i).fill('admin123')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await expect(page).toHaveURL('/dashboard')
  })

  test('should not have any automatically detectable accessibility issues on dashboard', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should not have accessibility issues on login page', async ({ page }) => {
    await page.goto('/login')
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should not have accessibility issues on projects page', async ({ page }) => {
    await page.goto('/proyectos')
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should support keyboard navigation', async ({ page }) => {
    // Test tab navigation through main elements
    await page.keyboard.press('Tab')
    
    // Should focus on first interactive element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement)
  })

  test('should have proper heading hierarchy', async ({ page }) => {
    // Check for proper heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    
    expect(headings.length).toBeGreaterThan(0)
    
    // Should have at least one h1
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThanOrEqual(1)
  })

  test('should have proper ARIA labels and roles', async ({ page }) => {
    // Check for navigation landmarks
    await expect(page.locator('[role="navigation"]')).toBeVisible()
    await expect(page.locator('[role="main"]')).toBeVisible()
    
    // Check for proper button labels
    const buttons = await page.locator('button').all()
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label')
      const textContent = await button.textContent()
      
      // Button should have either aria-label or text content
      expect(ariaLabel || textContent?.trim()).toBeTruthy()
    }
  })

  test('should have sufficient color contrast', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    
    // Filter for color contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    )
    
    expect(contrastViolations).toEqual([])
  })

  test('should support screen reader navigation', async ({ page }) => {
    // Check for skip links
    const skipLink = page.locator('a[href="#main-content"], a[href="#content"]').first()
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeVisible()
    }
    
    // Check for proper landmark roles
    await expect(page.locator('[role="banner"], header')).toBeVisible()
    await expect(page.locator('[role="main"], main')).toBeVisible()
    await expect(page.locator('[role="navigation"], nav')).toBeVisible()
  })

  test('should handle focus management in modals', async ({ page }) => {
    // Look for buttons that might open modals
    const modalTriggers = await page.locator('[data-testid*="modal"], [aria-haspopup="dialog"]').all()
    
    if (modalTriggers.length > 0) {
      await modalTriggers[0].click()
      
      // Check if modal is properly focused
      const modal = page.locator('[role="dialog"]')
      if (await modal.isVisible()) {
        // Focus should be trapped within modal
        await page.keyboard.press('Tab')
        const focusedElement = await page.evaluate(() => document.activeElement)
        
        // Focused element should be within modal
        const isWithinModal = await modal.locator('*').filter({ has: page.locator(':focus') }).count()
        expect(isWithinModal).toBeGreaterThan(0)
      }
    }
  })

  test('should provide proper form validation feedback', async ({ page }) => {
    await page.goto('/proyectos/nuevo')
    
    // Try to submit form without required fields
    const submitButton = page.getByRole('button', { name: /crear|guardar/i })
    if (await submitButton.isVisible()) {
      await submitButton.click()
      
      // Should show validation errors
      const errorMessages = await page.locator('[role="alert"], .error, [aria-invalid="true"]').count()
      expect(errorMessages).toBeGreaterThan(0)
    }
  })

  test('should support high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' })
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should be usable with reduced motion', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    // Page should still be functional
    await expect(page.getByText('Dashboard')).toBeVisible()
    
    // Animations should be reduced or disabled
    const animatedElements = await page.locator('.animate-pulse, .transition, .animate-spin').all()
    
    for (const element of animatedElements) {
      const computedStyle = await element.evaluate(el => 
        window.getComputedStyle(el).getPropertyValue('animation-duration')
      )
      
      // Animation duration should be 0 or very short in reduced motion mode
      expect(['0s', '0.01s']).toContain(computedStyle)
    }
  })
})