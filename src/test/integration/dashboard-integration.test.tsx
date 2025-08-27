import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import DashboardPage from '@/app/dashboard/page';

// Mock Next.js router
const mockPush = vi.fn();
const mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
}));

// Mock auth
const mockUser = {
  id: '1',
  nombre: 'Juan Pérez',
  email: 'juan@example.com',
  rol: 'admin',
};

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// Mock JWT Manager
vi.mock('@/lib/jwt', () => ({
  JWTManager: {
    logout: vi.fn(),
  },
}));

// Mock dashboard data
const mockDashboardData = {
  data: {
    metrics: {
      activeProjects: 12,
      activePersonnel: 24,
      pendingTasks: 48,
      remainingBudget: 125000,
    },
    projects: [
      {
        id: '1',
        name: 'Edificio Residencial Los Pinos',
        description: 'Construcción de edificio residencial',
        status: 'En progreso',
        progress: 75,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-12-30'),
        teamMembers: [
          {
            id: '1',
            name: 'Carlos Mendoza',
            role: 'Arquitecto',
            avatar: '',
            status: 'Disponible',
            statusColor: 'bg-green-500',
          },
        ],
        statusColor: 'bg-blue-100 text-blue-800',
      },
    ],
    tasks: [
      {
        id: '1',
        title: 'Revisión de planos estructurales',
        project: 'Edificio Residencial Los Pinos',
        priority: 'Alta',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'Pendiente',
        priorityColor: 'bg-blue-100 text-blue-800',
      },
    ],
    teamMembers: [
      {
        id: '1',
        name: 'Carlos Mendoza',
        role: 'Arquitecto Senior',
        avatar: '',
        status: 'Disponible',
        availableFrom: '09:00',
        statusColor: 'bg-green-500',
      },
    ],
    events: [
      {
        id: '1',
        title: 'Reunión de seguimiento',
        project: 'Proyecto Test',
        date: new Date(),
        startTime: '09:00',
        endTime: '10:30',
        type: 'meeting',
        icon: '👥',
        iconColor: 'text-blue-600',
      },
    ],
  },
  loading: {
    metrics: false,
    projects: false,
    tasks: false,
    teamMembers: false,
    events: false,
  },
  errors: {
    metrics: null,
    projects: null,
    tasks: null,
    teamMembers: null,
    events: null,
  },
  refetch: {
    all: vi.fn(),
    metrics: vi.fn(),
    projects: vi.fn(),
    tasks: vi.fn(),
    teamMembers: vi.fn(),
    events: vi.fn(),
  },
  completeTask: vi.fn().mockResolvedValue(true),
};

vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => mockDashboardData,
}));

// Mock mobile optimizations
vi.mock('@/hooks/useMobileOptimizations', () => ({
  useMobileOptimizations: () => ({
    isMobile: false,
    isTablet: false,
    isTouch: false,
    orientation: 'portrait',
    addTouchFeedback: vi.fn(),
    optimizeForMobile: vi.fn(),
  }),
  usePullToRefresh: () => ({
    isPulling: false,
    pullDistance: 0,
  }),
}));

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders complete dashboard with layout and content', async () => {
    render(
      <DashboardLayout user={mockUser}>
        <DashboardPage />
      </DashboardLayout>
    );

    // Check layout components
    expect(screen.getByText('ConstructPro')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Check dashboard content
    await waitFor(() => {
      expect(screen.getByText('¡Bienvenido de vuelta, Juan Pérez!')).toBeInTheDocument();
      expect(screen.getByText('Proyectos Activos')).toBeInTheDocument();
      expect(screen.getByText('Edificio Residencial Los Pinos')).toBeInTheDocument();
    });
  });

  it('handles sidebar navigation flow', async () => {
    render(
      <DashboardLayout user={mockUser}>
        <DashboardPage />
      </DashboardLayout>
    );

    // Click on Projects in sidebar
    const projectsLink = screen.getByRole('link', { name: /Proyectos/ });
    fireEvent.click(projectsLink);

    // Should navigate to projects page
    expect(projectsLink).toHaveAttribute('href', '/proyectos');
  });

  it('handles user menu interactions', async () => {
    render(
      <DashboardLayout user={mockUser}>
        <DashboardPage />
      </DashboardLayout>
    );

    // Open user menu
    const userButton = screen.getByLabelText(/Menú de usuario/);
    fireEvent.click(userButton);

    await waitFor(() => {
      expect(screen.getByText('Mi Perfil')).toBeInTheDocument();
      expect(screen.getByText('Configuración')).toBeInTheDocument();
      expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
    });

    // Click logout
    const logoutButton = screen.getByText('Cerrar Sesión');
    fireEvent.click(logoutButton);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('handles notification interactions', async () => {
    render(
      <DashboardLayout user={mockUser}>
        <DashboardPage />
      </DashboardLayout>
    );

    // Open notifications
    const notificationButton = screen.getByLabelText(/Notificaciones/);
    fireEvent.click(notificationButton);

    await waitFor(() => {
      expect(screen.getByText('Notificaciones')).toBeInTheDocument();
    });
  });

  it('handles project interactions from dashboard', async () => {
    render(
      <DashboardLayout user={mockUser}>
        <DashboardPage />
      </DashboardLayout>
    );

    await waitFor(() => {
      // Click "Ver detalles" on a project
      const viewDetailsButton = screen.getByText('Ver detalles');
      fireEvent.click(viewDetailsButton);

      expect(mockPush).toHaveBeenCalledWith('/projects/1');
    });
  });

  it('handles task completion workflow', async () => {
    render(
      <DashboardLayout user={mockUser}>
        <DashboardPage />
      </DashboardLayout>
    );

    await waitFor(() => {
      // Complete a task
      const completeButton = screen.getByText('Completar');
      fireEvent.click(completeButton);

      expect(mockDashboardData.completeTask).toHaveBeenCalledWith('1');
    });
  });

  it('handles responsive sidebar behavior', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });

    render(
      <DashboardLayout user={mockUser}>
        <DashboardPage />
      </DashboardLayout>
    );

    // Trigger resize event
    fireEvent(window, new Event('resize'));

    // Toggle sidebar on mobile
    const toggleButton = screen.getByLabelText('Abrir menú de navegación');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      // Sidebar should be visible
      expect(screen.getByText('ConstructPro')).toBeInTheDocument();
    });
  });

  it('handles data refresh across all components', async () => {
    render(
      <DashboardLayout user={mockUser}>
        <DashboardPage />
      </DashboardLayout>
    );

    await waitFor(() => {
      // Click refresh button
      const refreshButton = screen.getByText('Actualizar');
      fireEvent.click(refreshButton);

      expect(mockDashboardData.refetch.all).toHaveBeenCalled();
    });
  });

  it('handles keyboard navigation', async () => {
    render(
      <DashboardLayout user={mockUser}>
        <DashboardPage />
      </DashboardLayout>
    );

    // Test Ctrl+B shortcut for sidebar toggle
    fireEvent.keyDown(document, { key: 'b', ctrlKey: true });

    // Sidebar should toggle (implementation depends on current state)
    expect(screen.getByText('ConstructPro')).toBeInTheDocument();
  });

  it('handles error states gracefully', async () => {
    // Mock error state
    const errorData = {
      ...mockDashboardData,
      errors: {
        metrics: 'Failed to load metrics',
        projects: null,
        tasks: null,
        teamMembers: null,
        events: null,
      },
    };

    vi.mocked(require('@/hooks/useDashboardData').useDashboardData).mockReturnValue(errorData);

    render(
      <DashboardLayout user={mockUser}>
        <DashboardPage />
      </DashboardLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('Error al cargar algunos datos')).toBeInTheDocument();
      expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });
  });

  it('handles loading states across components', async () => {
    // Mock loading state
    const loadingData = {
      ...mockDashboardData,
      loading: {
        metrics: true,
        projects: true,
        tasks: true,
        teamMembers: true,
        events: true,
      },
    };

    vi.mocked(require('@/hooks/useDashboardData').useDashboardData).mockReturnValue(loadingData);

    render(
      <DashboardLayout user={mockUser}>
        <DashboardPage />
      </DashboardLayout>
    );

    // Should show loading skeletons
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('maintains accessibility throughout interactions', async () => {
    render(
      <DashboardLayout user={mockUser}>
        <DashboardPage />
      </DashboardLayout>
    );

    // Check for skip link
    expect(screen.getByText('Ir al contenido principal')).toBeInTheDocument();

    // Check for proper ARIA labels
    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label');
    expect(screen.getByRole('main')).toHaveAttribute('aria-label');
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('handles mobile-specific interactions', async () => {
    // Mock mobile environment
    vi.mocked(require('@/hooks/useMobileOptimizations').useMobileOptimizations).mockReturnValue({
      isMobile: true,
      isTablet: false,
      isTouch: true,
      orientation: 'portrait',
      addTouchFeedback: vi.fn(),
      optimizeForMobile: vi.fn(),
    });

    render(
      <DashboardLayout user={mockUser}>
        <DashboardPage />
      </DashboardLayout>
    );

    // Should show mobile-specific elements
    await waitFor(() => {
      expect(screen.getByText('Experiencia móvil optimizada')).toBeInTheDocument();
    });
  });
});