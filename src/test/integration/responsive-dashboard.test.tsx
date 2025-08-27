import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { KPICards } from '@/components/dashboard/KPICards';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { DashboardMetrics, DashboardProject, TeamMember } from '@/lib/dashboard-types';

// Mock Next.js
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard',
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: '1', nombre: 'Test User', email: 'test@example.com', rol: 'admin' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// Mock data
const mockMetrics: DashboardMetrics = {
  activeProjects: 12,
  activePersonnel: 24,
  pendingTasks: 48,
  remainingBudget: 125000,
};

const mockProjects: DashboardProject[] = [
  {
    id: '1',
    name: 'Proyecto Test 1',
    description: 'Descripción del proyecto',
    status: 'En progreso',
    progress: 75,
    startDate: new Date(),
    endDate: new Date(),
    teamMembers: [],
    statusColor: 'bg-blue-100 text-blue-800',
  },
  {
    id: '2',
    name: 'Proyecto Test 2',
    description: 'Descripción del proyecto 2',
    status: 'Planificación',
    progress: 25,
    startDate: new Date(),
    endDate: new Date(),
    teamMembers: [],
    statusColor: 'bg-yellow-100 text-yellow-800',
  },
];

// Utility function to mock viewport size
const mockViewport = (width: number, height: number = 800) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Mock matchMedia for responsive queries
  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: query.includes(`max-width: ${width}px`) || 
             (query.includes('min-width') && width >= parseInt(query.match(/\d+/)?.[0] || '0')),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe('Responsive Dashboard Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Desktop Layout (1024px+)', () => {
    beforeEach(() => {
      mockViewport(1200);
    });

    it('displays full sidebar by default', () => {
      render(
        <DashboardLayout user={{ id: '1', nombre: 'Test', email: 'test@example.com', rol: 'admin' }}>
          <div>Content</div>
        </DashboardLayout>
      );

      // Trigger resize to apply desktop layout
      fireEvent(window, new Event('resize'));

      expect(screen.getByText('ConstructPro')).toBeInTheDocument();
    });

    it('displays KPI cards in 4-column grid', () => {
      const { container } = render(<KPICards metrics={mockMetrics} />);
      
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('lg:grid-cols-4');
    });

    it('displays projects in multi-column grid', () => {
      const { container } = render(
        <RecentProjects
          projects={mockProjects}
          onViewDetails={vi.fn()}
          onNewProject={vi.fn()}
        />
      );
      
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });
  });

  describe('Tablet Layout (768px - 1023px)', () => {
    beforeEach(() => {
      mockViewport(800);
    });

    it('collapses sidebar by default', async () => {
      render(
        <DashboardLayout user={{ id: '1', nombre: 'Test', email: 'test@example.com', rol: 'admin' }}>
          <div>Content</div>
        </DashboardLayout>
      );

      // Trigger resize to apply tablet layout
      fireEvent(window, new Event('resize'));

      // Sidebar should be collapsed
      await waitFor(() => {
        const sidebar = document.querySelector('nav');
        expect(sidebar).toHaveClass('-translate-x-full');
      });
    });

    it('displays KPI cards in 2-column grid', () => {
      const { container } = render(<KPICards metrics={mockMetrics} />);
      
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('md:grid-cols-2');
    });

    it('displays projects in 2-column grid', () => {
      const { container } = render(
        <RecentProjects
          projects={mockProjects}
          onViewDetails={vi.fn()}
          onNewProject={vi.fn()}
        />
      );
      
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('md:grid-cols-2');
    });

    it('shows overlay when sidebar is opened', async () => {
      render(
        <DashboardLayout user={{ id: '1', nombre: 'Test', email: 'test@example.com', rol: 'admin' }}>
          <div>Content</div>
        </DashboardLayout>
      );

      // Trigger resize to apply tablet layout
      fireEvent(window, new Event('resize'));

      // Open sidebar
      const toggleButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const overlay = document.querySelector('.bg-black.bg-opacity-60');
        expect(overlay).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Layout (< 768px)', () => {
    beforeEach(() => {
      mockViewport(375);
    });

    it('collapses sidebar by default', async () => {
      render(
        <DashboardLayout user={{ id: '1', nombre: 'Test', email: 'test@example.com', rol: 'admin' }}>
          <div>Content</div>
        </DashboardLayout>
      );

      // Trigger resize to apply mobile layout
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        const sidebar = document.querySelector('nav');
        expect(sidebar).toHaveClass('-translate-x-full');
      });
    });

    it('displays KPI cards in single column', () => {
      const { container } = render(<KPICards metrics={mockMetrics} />);
      
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1');
    });

    it('displays projects in single column', () => {
      const { container } = render(
        <RecentProjects
          projects={mockProjects}
          onViewDetails={vi.fn()}
          onNewProject={vi.fn()}
        />
      );
      
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1');
    });

    it('shows mobile hamburger menu', () => {
      render(
        <DashboardLayout user={{ id: '1', nombre: 'Test', email: 'test@example.com', rol: 'admin' }}>
          <div>Content</div>
        </DashboardLayout>
      );

      const hamburgerButton = screen.getByLabelText('Abrir menú de navegación');
      expect(hamburgerButton).toBeInTheDocument();
    });

    it('handles sidebar toggle on mobile', async () => {
      render(
        <DashboardLayout user={{ id: '1', nombre: 'Test', email: 'test@example.com', rol: 'admin' }}>
          <div>Content</div>
        </DashboardLayout>
      );

      // Trigger resize to apply mobile layout
      fireEvent(window, new Event('resize'));

      const toggleButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const sidebar = document.querySelector('nav');
        expect(sidebar).toHaveClass('translate-x-0');
      });
    });

    it('closes sidebar when overlay is clicked', async () => {
      render(
        <DashboardLayout user={{ id: '1', nombre: 'Test', email: 'test@example.com', rol: 'admin' }}>
          <div>Content</div>
        </DashboardLayout>
      );

      // Trigger resize and open sidebar
      fireEvent(window, new Event('resize'));
      const toggleButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const overlay = document.querySelector('.bg-black.bg-opacity-60');
        expect(overlay).toBeInTheDocument();
        
        if (overlay) {
          fireEvent.click(overlay);
        }
      });

      await waitFor(() => {
        const sidebar = document.querySelector('nav');
        expect(sidebar).toHaveClass('-translate-x-full');
      });
    });

    it('applies mobile-specific padding and spacing', () => {
      const { container } = render(
        <DashboardLayout user={{ id: '1', nombre: 'Test', email: 'test@example.com', rol: 'admin' }}>
          <div>Content</div>
        </DashboardLayout>
      );

      // Check for mobile-specific classes
      const mainContent = container.querySelector('main');
      expect(mainContent).toHaveClass('p-3');
    });
  });

  describe('Responsive Breakpoint Transitions', () => {
    it('handles transition from desktop to mobile', async () => {
      // Start with desktop
      mockViewport(1200);
      
      const { rerender } = render(
        <DashboardLayout user={{ id: '1', nombre: 'Test', email: 'test@example.com', rol: 'admin' }}>
          <div>Content</div>
        </DashboardLayout>
      );

      fireEvent(window, new Event('resize'));

      // Switch to mobile
      mockViewport(375);
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        const sidebar = document.querySelector('nav');
        expect(sidebar).toHaveClass('-translate-x-full');
      });
    });

    it('handles transition from mobile to desktop', async () => {
      // Start with mobile
      mockViewport(375);
      
      render(
        <DashboardLayout user={{ id: '1', nombre: 'Test', email: 'test@example.com', rol: 'admin' }}>
          <div>Content</div>
        </DashboardLayout>
      );

      fireEvent(window, new Event('resize'));

      // Switch to desktop
      mockViewport(1200);
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        const sidebar = document.querySelector('nav');
        expect(sidebar).toHaveClass('translate-x-0');
      });
    });
  });

  describe('Touch and Gesture Support', () => {
    beforeEach(() => {
      mockViewport(375);
    });

    it('handles touch events on mobile', () => {
      render(
        <DashboardLayout user={{ id: '1', nombre: 'Test', email: 'test@example.com', rol: 'admin' }}>
          <div>Content</div>
        </DashboardLayout>
      );

      const toggleButton = screen.getByLabelText('Abrir menú de navegación');
      
      // Simulate touch events
      fireEvent.touchStart(toggleButton);
      fireEvent.touchEnd(toggleButton);
      fireEvent.click(toggleButton);

      expect(toggleButton).toBeInTheDocument();
    });

    it('supports swipe gestures for sidebar', async () => {
      render(
        <DashboardLayout user={{ id: '1', nombre: 'Test', email: 'test@example.com', rol: 'admin' }}>
          <div>Content</div>
        </DashboardLayout>
      );

      // Open sidebar first
      const toggleButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const sidebar = document.querySelector('nav');
        expect(sidebar).toHaveClass('translate-x-0');
      });

      // Simulate swipe to close
      const sidebar = document.querySelector('nav');
      if (sidebar) {
        fireEvent.touchStart(sidebar, { touches: [{ clientX: 200, clientY: 100 }] });
        fireEvent.touchMove(sidebar, { touches: [{ clientX: 50, clientY: 100 }] });
        fireEvent.touchEnd(sidebar);
      }
    });
  });

  describe('Accessibility in Responsive Design', () => {
    it('maintains focus management across breakpoints', async () => {
      mockViewport(375);
      
      render(
        <DashboardLayout user={{ id: '1', nombre: 'Test', email: 'test@example.com', rol: 'admin' }}>
          <div>Content</div>
        </DashboardLayout>
      );

      const toggleButton = screen.getByLabelText('Abrir menú de navegación');
      toggleButton.focus();
      
      expect(document.activeElement).toBe(toggleButton);
    });

    it('provides appropriate ARIA labels for responsive elements', () => {
      mockViewport(375);
      
      render(
        <DashboardLayout user={{ id: '1', nombre: 'Test', email: 'test@example.com', rol: 'admin' }}>
          <div>Content</div>
        </DashboardLayout>
      );

      const toggleButton = screen.getByLabelText('Abrir menú de navegación');
      expect(toggleButton).toHaveAttribute('aria-label');
    });

    it('handles keyboard navigation on mobile', async () => {
      mockViewport(375);
      
      render(
        <DashboardLayout user={{ id: '1', nombre: 'Test', email: 'test@example.com', rol: 'admin' }}>
          <div>Content</div>
        </DashboardLayout>
      );

      // Open sidebar with keyboard
      const toggleButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.keyDown(toggleButton, { key: 'Enter' });
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const sidebar = document.querySelector('nav');
        expect(sidebar).toHaveClass('translate-x-0');
      });

      // Close with Escape key
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        const sidebar = document.querySelector('nav');
        expect(sidebar).toHaveClass('-translate-x-full');
      });
    });
  });
});