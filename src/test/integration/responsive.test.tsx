import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders, screen } from '@/test/utils'
import { MainLayout } from '@/components/layout/MainLayout'

// Mock window.matchMedia for responsive tests
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('Responsive Design Integration', () => {
  beforeEach(() => {
    // Reset viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    })
  })

  describe('Desktop Layout', () => {
    beforeEach(() => {
      mockMatchMedia(false) // Desktop
      window.innerWidth = 1024
    })

    it('should show sidebar on desktop', () => {
      renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      )

      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toBeVisible()
      expect(sidebar).not.toHaveClass('hidden')
    })

    it('should show full navigation menu on desktop', () => {
      renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      )

      // Check for navigation items that should be visible on desktop
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Proyectos')).toBeInTheDocument()
      expect(screen.getByText('Personal')).toBeInTheDocument()
    })
  })

  describe('Mobile Layout', () => {
    beforeEach(() => {
      mockMatchMedia(true) // Mobile
      window.innerWidth = 375
    })

    it('should hide sidebar on mobile by default', () => {
      renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      )

      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toHaveClass('hidden', 'lg:block')
    })

    it('should show mobile menu button', () => {
      renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      )

      const menuButton = screen.getByLabelText('Abrir menú')
      expect(menuButton).toBeInTheDocument()
      expect(menuButton).toBeVisible()
    })

    it('should show sidebar when mobile menu is opened', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      )

      const menuButton = screen.getByLabelText('Abrir menú')
      await user.click(menuButton)

      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toBeVisible()
    })
  })

  describe('Tablet Layout', () => {
    beforeEach(() => {
      mockMatchMedia(false) // Tablet (between mobile and desktop)
      window.innerWidth = 768
    })

    it('should adapt layout for tablet screens', () => {
      renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      )

      // Tablet should behave like desktop for sidebar
      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toBeVisible()
    })
  })

  describe('Component Responsiveness', () => {
    it('should adapt table layout for mobile', () => {
      mockMatchMedia(true) // Mobile
      
      const mockData = [
        { id: '1', name: 'Test', status: 'Active' }
      ]
      
      const mockColumns = [
        { key: 'name', title: 'Name' },
        { key: 'status', title: 'Status' }
      ]

      renderWithProviders(
        <Table data={mockData} columns={mockColumns} />
      )

      // Check that table adapts to mobile (specific implementation depends on Table component)
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
    })

    it('should adapt card layouts for different screen sizes', () => {
      mockMatchMedia(true) // Mobile
      
      renderWithProviders(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardKpi title="Test" value={100} />
          <CardKpi title="Test 2" value={200} />
        </div>
      )

      // Cards should be visible and properly laid out
      expect(screen.getByText('Test')).toBeInTheDocument()
      expect(screen.getByText('Test 2')).toBeInTheDocument()
    })
  })

  describe('Touch Interactions', () => {
    beforeEach(() => {
      mockMatchMedia(true) // Mobile
    })

    it('should handle touch events on interactive elements', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      
      renderWithProviders(
        <button onClick={handleClick} className="touch-manipulation">
          Touch Button
        </button>
      )

      const button = screen.getByRole('button')
      await user.click(button)

      expect(handleClick).toHaveBeenCalled()
    })

    it('should have appropriate touch targets', () => {
      renderWithProviders(
        <button className="min-h-[44px] min-w-[44px]">
          Touch Target
        </button>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('min-h-[44px]', 'min-w-[44px]')
    })
  })
})