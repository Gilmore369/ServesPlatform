import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DashboardLayout } from '../DashboardLayout';
import { User } from '@/lib/dashboard-types';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/dashboard',
}));

// Mock auth hook
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockUser: User = {
  id: '1',
  nombre: 'Juan Pérez',
  email: 'juan@example.com',
  rol: 'admin',
};

// Mock child components
vi.mock('../DashboardSidebar', () => ({
  DashboardSidebar: ({ isOpen, onClose, user }: any) => (
    <div data-testid="dashboard-sidebar" data-open={isOpen}>
      <button onClick={onClose}>Close Sidebar</button>
      <span>{user.nombre}</span>
    </div>
  ),
}));

vi.mock('../DashboardTopBar', () => ({
  DashboardTopBar: ({ title, onToggleSidebar, user, notifications }: any) => (
    <div data-testid="dashboard-topbar">
      <button onClick={onToggleSidebar}>Toggle Sidebar</button>
      <h1>{title}</h1>
      <span>{user.nombre}</span>
      <span data-testid="notification-count">{notifications.length}</span>
    </div>
  ),
}));

// Mock window.innerWidth for responsive tests
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

describe('DashboardLayout', () => {
  const mockChildren = <div data-testid="dashboard-content">Dashboard Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window width
    window.innerWidth = 1024;
  });

  it('renders layout with sidebar, topbar, and content', () => {
    render(
      <DashboardLayout user={mockUser}>
        {mockChildren}
      </DashboardLayout>
    );

    expect(screen.getByTestId('dashboard-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-topbar')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
  });

  it('passes user data to sidebar and topbar', () => {
    render(
      <DashboardLayout user={mockUser}>
        {mockChildren}
      </DashboardLayout>
    );

    // Check that user name appears in both sidebar and topbar
    const userNames = screen.getAllByText('Juan Pérez');
    expect(userNames).toHaveLength(2); // One in sidebar, one in topbar
  });

  it('toggles sidebar when toggle button is clicked', async () => {
    render(
      <DashboardLayout user={mockUser}>
        {mockChildren}
      </DashboardLayout>
    );

    const toggleButton = screen.getByText('Toggle Sidebar');
    const sidebar = screen.getByTestId('dashboard-sidebar');

    // Initially open on desktop
    expect(sidebar).toHaveAttribute('data-open', 'true');

    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });
  });

  it('closes sidebar when close button is clicked', async () => {
    render(
      <DashboardLayout user={mockUser}>
        {mockChildren}
      </DashboardLayout>
    );

    const closeButton = screen.getByText('Close Sidebar');
    const sidebar = screen.getByTestId('dashboard-sidebar');

    fireEvent.click(closeButton);
    await waitFor(() => {
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });
  });

  it('handles mobile responsive behavior', async () => {
    // Mock mobile width
    window.innerWidth = 600;
    
    render(
      <DashboardLayout user={mockUser}>
        {mockChildren}
      </DashboardLayout>
    );

    // Trigger resize event
    fireEvent(window, new Event('resize'));

    await waitFor(() => {
      const sidebar = screen.getByTestId('dashboard-sidebar');
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });
  });

  it('handles tablet responsive behavior', async () => {
    // Mock tablet width
    window.innerWidth = 800;
    
    render(
      <DashboardLayout user={mockUser}>
        {mockChildren}
      </DashboardLayout>
    );

    // Trigger resize event
    fireEvent(window, new Event('resize'));

    await waitFor(() => {
      const sidebar = screen.getByTestId('dashboard-sidebar');
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });
  });

  it('handles keyboard shortcuts', async () => {
    render(
      <DashboardLayout user={mockUser}>
        {mockChildren}
      </DashboardLayout>
    );

    const sidebar = screen.getByTestId('dashboard-sidebar');

    // Test Ctrl+B shortcut
    fireEvent.keyDown(document, { key: 'b', ctrlKey: true });
    
    await waitFor(() => {
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });
  });

  it('handles escape key to close sidebar on mobile', async () => {
    // Mock mobile width
    window.innerWidth = 600;
    
    render(
      <DashboardLayout user={mockUser}>
        {mockChildren}
      </DashboardLayout>
    );

    // Trigger resize event
    fireEvent(window, new Event('resize'));

    // Open sidebar first
    const toggleButton = screen.getByText('Toggle Sidebar');
    fireEvent.click(toggleButton);

    // Press escape
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      const sidebar = screen.getByTestId('dashboard-sidebar');
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });
  });

  it('displays notifications in topbar', () => {
    render(
      <DashboardLayout user={mockUser}>
        {mockChildren}
      </DashboardLayout>
    );

    // Check that notifications are passed to topbar
    const notificationCount = screen.getByTestId('notification-count');
    expect(notificationCount).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <DashboardLayout user={mockUser}>
        {mockChildren}
      </DashboardLayout>
    );

    // Check for main content area
    const mainContent = screen.getByRole('main');
    expect(mainContent).toBeInTheDocument();
    expect(mainContent).toHaveAttribute('aria-label', 'Contenido principal del dashboard');
  });

  it('applies correct CSS classes for responsive design', () => {
    const { container } = render(
      <DashboardLayout user={mockUser}>
        {mockChildren}
      </DashboardLayout>
    );

    // Check for responsive classes
    const mainContainer = container.querySelector('.flex.h-screen');
    expect(mainContainer).toBeInTheDocument();
    
    const contentArea = container.querySelector('.flex-1.flex.flex-col');
    expect(contentArea).toBeInTheDocument();
  });

  it('handles loading state properly', () => {
    render(
      <DashboardLayout user={mockUser}>
        {mockChildren}
      </DashboardLayout>
    );

    // Check for loading overlay element
    const loadingOverlay = document.getElementById('loading-overlay');
    expect(loadingOverlay).toBeInTheDocument();
  });
});