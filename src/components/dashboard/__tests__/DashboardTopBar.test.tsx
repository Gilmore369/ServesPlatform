import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DashboardTopBar } from '../DashboardTopBar';
import { User, Notification } from '@/lib/dashboard-types';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock JWT Manager
vi.mock('@/lib/jwt', () => ({
  JWTManager: {
    logout: vi.fn(),
  },
}));

const mockUser: User = {
  id: '1',
  nombre: 'Juan Pérez',
  email: 'juan@example.com',
  rol: 'admin',
};

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Nueva tarea asignada',
    message: 'Se te ha asignado una nueva tarea',
    type: 'info',
    timestamp: new Date(),
    read: false,
  },
  {
    id: '2',
    title: 'Reunión programada',
    message: 'Reunión mañana a las 10:00 AM',
    type: 'warning',
    timestamp: new Date(Date.now() - 3600000),
    read: false,
  },
  {
    id: '3',
    title: 'Proyecto completado',
    message: 'El proyecto ha sido completado',
    type: 'success',
    timestamp: new Date(Date.now() - 7200000),
    read: true,
  },
];

describe('DashboardTopBar', () => {
  const mockOnToggleSidebar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders topbar with title and user info', () => {
    render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={mockNotifications}
      />
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('displays mobile menu button', () => {
    render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={mockNotifications}
      />
    );

    const menuButton = screen.getByLabelText('Abrir menú de navegación');
    expect(menuButton).toBeInTheDocument();
  });

  it('calls onToggleSidebar when menu button is clicked', () => {
    render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={mockNotifications}
      />
    );

    const menuButton = screen.getByLabelText('Abrir menú de navegación');
    fireEvent.click(menuButton);

    expect(mockOnToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it('displays notification count badge', () => {
    render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={mockNotifications}
      />
    );

    // Should show count of unread notifications (2)
    const notificationBadge = screen.getByText('2');
    expect(notificationBadge).toBeInTheDocument();
  });

  it('displays message count badge', () => {
    render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={mockNotifications}
      />
    );

    // Should show message count (3)
    const messageBadge = screen.getByText('3');
    expect(messageBadge).toBeInTheDocument();
  });

  it('opens notification dropdown when notification button is clicked', async () => {
    render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={mockNotifications}
      />
    );

    const notificationButton = screen.getByLabelText(/Notificaciones/);
    fireEvent.click(notificationButton);

    await waitFor(() => {
      expect(screen.getByText('Notificaciones')).toBeInTheDocument();
      expect(screen.getByText('Nueva tarea asignada')).toBeInTheDocument();
      expect(screen.getByText('Reunión programada')).toBeInTheDocument();
    });
  });

  it('opens user menu when user button is clicked', async () => {
    render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={mockNotifications}
      />
    );

    const userButton = screen.getByLabelText(/Menú de usuario/);
    fireEvent.click(userButton);

    await waitFor(() => {
      expect(screen.getByText('Mi Perfil')).toBeInTheDocument();
      expect(screen.getByText('Configuración')).toBeInTheDocument();
      expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
    });
  });

  it('navigates to profile when profile option is clicked', async () => {
    render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={mockNotifications}
      />
    );

    const userButton = screen.getByLabelText(/Menú de usuario/);
    fireEvent.click(userButton);

    await waitFor(() => {
      const profileButton = screen.getByText('Mi Perfil');
      fireEvent.click(profileButton);
      expect(mockPush).toHaveBeenCalledWith('/perfil');
    });
  });

  it('navigates to settings when settings option is clicked', async () => {
    render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={mockNotifications}
      />
    );

    const userButton = screen.getByLabelText(/Menú de usuario/);
    fireEvent.click(userButton);

    await waitFor(() => {
      const settingsButton = screen.getByText('Configuración');
      fireEvent.click(settingsButton);
      expect(mockPush).toHaveBeenCalledWith('/configuracion');
    });
  });

  it('handles logout when logout option is clicked', async () => {
    const { JWTManager } = await import('@/lib/jwt');
    
    render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={mockNotifications}
      />
    );

    const userButton = screen.getByLabelText(/Menú de usuario/);
    fireEvent.click(userButton);

    await waitFor(() => {
      const logoutButton = screen.getByText('Cerrar Sesión');
      fireEvent.click(logoutButton);
      expect(JWTManager.logout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('closes dropdowns when clicking outside', async () => {
    render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={mockNotifications}
      />
    );

    // Open notification dropdown
    const notificationButton = screen.getByLabelText(/Notificaciones/);
    fireEvent.click(notificationButton);

    await waitFor(() => {
      expect(screen.getByText('Notificaciones')).toBeInTheDocument();
    });

    // Click outside
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Notificaciones')).not.toBeInTheDocument();
    });
  });

  it('formats notification timestamps correctly', async () => {
    render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={mockNotifications}
      />
    );

    const notificationButton = screen.getByLabelText(/Notificaciones/);
    fireEvent.click(notificationButton);

    await waitFor(() => {
      // Should show relative time for recent notifications
      expect(screen.getByText('Ahora')).toBeInTheDocument();
      expect(screen.getByText('1h')).toBeInTheDocument();
      expect(screen.getByText('2h')).toBeInTheDocument();
    });
  });

  it('shows empty state when no notifications', async () => {
    render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={[]}
      />
    );

    const notificationButton = screen.getByLabelText(/Notificaciones/);
    fireEvent.click(notificationButton);

    await waitFor(() => {
      expect(screen.getByText('No hay notificaciones')).toBeInTheDocument();
    });
  });

  it('displays user avatar with initials', () => {
    render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={mockNotifications}
      />
    );

    // Should show first letter of user name
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={mockNotifications}
      />
    );

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();

    const menuButton = screen.getByLabelText('Abrir menú de navegación');
    expect(menuButton).toHaveAttribute('aria-label');

    const userButton = screen.getByLabelText(/Menú de usuario/);
    expect(userButton).toHaveAttribute('aria-label');
  });

  it('applies responsive classes correctly', () => {
    const { container } = render(
      <DashboardTopBar
        title="Dashboard"
        onToggleSidebar={mockOnToggleSidebar}
        user={mockUser}
        notifications={mockNotifications}
      />
    );

    const header = container.querySelector('header');
    expect(header).toHaveClass('bg-white', 'shadow-sm', 'border-b');

    const titleElement = screen.getByText('Dashboard');
    expect(titleElement).toHaveClass('text-xl', 'sm:text-2xl');
  });
});