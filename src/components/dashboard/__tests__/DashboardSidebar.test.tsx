import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { DashboardSidebar } from '../DashboardSidebar';
import { User } from '@/lib/dashboard-types';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Next.js Link component
vi.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ children, href, onClick, className }: any) => (
      <a href={href} onClick={onClick} className={className}>
        {children}
      </a>
    ),
  };
});

const mockUser: User = {
  id: '1',
  nombre: 'Juan Pérez',
  email: 'juan@example.com',
  rol: 'admin',
};

describe('DashboardSidebar', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sidebar with logo and user info', () => {
    render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    expect(screen.getByText('ConstructPro')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('juan@example.com')).toBeInTheDocument();
  });

  it('displays user avatar with initials', () => {
    render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    // Should show first letter of user name
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders all navigation menu items', () => {
    render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    // Principal section items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Proyectos')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Reportes')).toBeInTheDocument();

    // Administración section items
    expect(screen.getByText('Materiales')).toBeInTheDocument();
    expect(screen.getByText('Gestión de Usuarios')).toBeInTheDocument();
    expect(screen.getByText('Configuración')).toBeInTheDocument();
    expect(screen.getByText('Documentación')).toBeInTheDocument();
  });

  it('displays section headers', () => {
    render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    expect(screen.getByText('Principal')).toBeInTheDocument();
    expect(screen.getByText('Administración')).toBeInTheDocument();
  });

  it('highlights active menu item', () => {
    render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('bg-blue-700', 'text-white');
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    const closeButton = screen.getByLabelText('Cerrar menú');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when menu item is clicked', () => {
    render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    const projectsLink = screen.getByText('Proyectos');
    fireEvent.click(projectsLink);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('applies correct href to menu items', () => {
    render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');

    const projectsLink = screen.getByText('Proyectos').closest('a');
    expect(projectsLink).toHaveAttribute('href', '/proyectos');

    const personnelLink = screen.getByText('Personal').closest('a');
    expect(personnelLink).toHaveAttribute('href', '/personal');

    const materialsLink = screen.getByText('Materiales').closest('a');
    expect(materialsLink).toHaveAttribute('href', '/materiales');
  });

  it('shows mobile overlay when open', () => {
    const { container } = render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    const overlay = container.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
    expect(overlay).toBeInTheDocument();
  });

  it('handles overlay click to close sidebar', () => {
    const { container } = render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    const overlay = container.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
    if (overlay) {
      fireEvent.click(overlay);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('applies correct CSS classes when open', () => {
    const { container } = render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    const sidebar = container.querySelector('nav');
    expect(sidebar).toHaveClass('translate-x-0');
  });

  it('applies correct CSS classes when closed', () => {
    const { container } = render(
      <DashboardSidebar
        isOpen={false}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    const sidebar = container.querySelector('nav');
    expect(sidebar).toHaveClass('-translate-x-full');
  });

  it('has proper accessibility attributes', () => {
    render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    const navs = screen.getAllByRole('navigation');
    expect(navs[0]).toHaveAttribute('aria-label', 'Navegación principal');

    const closeButton = screen.getByLabelText('Cerrar menú');
    expect(closeButton).toHaveAttribute('aria-label');
  });

  it('displays icons for menu items', () => {
    const { container } = render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    // Check that SVG icons are present
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('handles focus management correctly', () => {
    render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('focus:outline-none', 'focus:ring-2');
  });

  it('truncates long user names and emails', () => {
    const longNameUser: User = {
      id: '1',
      nombre: 'Juan Carlos Pérez González de la Torre',
      email: 'juan.carlos.perez.gonzalez@example.com',
      rol: 'admin',
    };

    render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={longNameUser}
      />
    );

    const userName = screen.getByText(longNameUser.nombre);
    expect(userName).toHaveClass('truncate');

    const userEmail = screen.getByText(longNameUser.email);
    expect(userEmail).toHaveClass('truncate');
  });

  it('applies hover effects to menu items', () => {
    render(
      <DashboardSidebar
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
      />
    );

    const projectsLink = screen.getByText('Proyectos').closest('a');
    expect(projectsLink).toHaveClass('hover:bg-blue-700', 'hover:text-white');
  });
});