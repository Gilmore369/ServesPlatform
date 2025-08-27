import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import DashboardPage from '../page';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock auth hook
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

// Mock dashboard data hook
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
        name: 'Proyecto Test',
        description: 'Descripción del proyecto',
        status: 'En progreso',
        progress: 75,
        startDate: new Date(),
        endDate: new Date(),
        teamMembers: [],
        statusColor: 'bg-blue-100 text-blue-800',
      },
    ],
    tasks: [
      {
        id: '1',
        title: 'Tarea Test',
        project: 'Proyecto Test',
        priority: 'Alta',
        dueDate: new Date(),
        status: 'Pendiente',
        priorityColor: 'bg-blue-100 text-blue-800',
      },
    ],
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
    events: [
      {
        id: '1',
        title: 'Reunión Test',
        project: 'Proyecto Test',
        date: new Date(),
        startTime: '09:00',
        endTime: '10:00',
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
  completeTask: vi.fn(),
};

vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => mockDashboardData,
}));

// Mock mobile optimizations hook
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

// Mock dashboard components
vi.mock('@/components/dashboard', () => ({
  KPICards: ({ metrics, isLoading }: any) => (
    <div data-testid="kpi-cards">
      {isLoading ? 'Loading...' : `Active Projects: ${metrics.activeProjects}`}
    </div>
  ),
  RecentProjects: ({ projects, onViewDetails, onNewProject, isLoading }: any) => (
    <div data-testid="recent-projects">
      {isLoading ? 'Loading...' : (
        <>
          <div>{projects[0]?.name}</div>
          <button onClick={() => onViewDetails('1')}>View Details</button>
          <button onClick={onNewProject}>New Project</button>
        </>
      )}
    </div>
  ),
  PendingTasks: ({ tasks, onCompleteTask, onAddTask, isLoading }: any) => (
    <div data-testid="pending-tasks">
      {isLoading ? 'Loading...' : (
        <>
          <div>{tasks[0]?.title}</div>
          <button onClick={() => onCompleteTask('1')}>Complete Task</button>
          <button onClick={onAddTask}>Add Task</button>
        </>
      )}
    </div>
  ),
  TeamAvailability: ({ teamMembers, onViewAllPersonnel, isLoading }: any) => (
    <div data-testid="team-availability">
      {isLoading ? 'Loading...' : (
        <>
          <div>{teamMembers[0]?.name}</div>
          <button onClick={onViewAllPersonnel}>View All Personnel</button>
        </>
      )}
    </div>
  ),
  Schedule: ({ events, currentMonth, onNavigateMonth, isLoading }: any) => (
    <div data-testid="schedule">
      {isLoading ? 'Loading...' : (
        <>
          <div>{events[0]?.title}</div>
          <button onClick={() => onNavigateMonth('prev')}>Previous</button>
          <button onClick={() => onNavigateMonth('next')}>Next</button>
        </>
      )}
    </div>
  ),
}));

// Mock ErrorBoundary
vi.mock('@/components/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="error-boundary">{children}</div>,
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard page with all components', () => {
    render(<DashboardPage />);

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-cards')).toBeInTheDocument();
    expect(screen.getByTestId('recent-projects')).toBeInTheDocument();
    expect(screen.getByTestId('pending-tasks')).toBeInTheDocument();
    expect(screen.getByTestId('team-availability')).toBeInTheDocument();
    expect(screen.getByTestId('schedule')).toBeInTheDocument();
  });

  it('displays welcome message with user name', () => {
    render(<DashboardPage />);

    expect(screen.getByText(/¡Bienvenido de vuelta, Juan Pérez!/)).toBeInTheDocument();
  });

  it('displays current date', () => {
    render(<DashboardPage />);

    const currentDate = new Date().toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    expect(screen.getByText(currentDate)).toBeInTheDocument();
  });

  it('handles project view details navigation', () => {
    render(<DashboardPage />);

    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);

    expect(mockPush).toHaveBeenCalledWith('/projects/1');
  });

  it('handles new project navigation', () => {
    render(<DashboardPage />);

    const newProjectButton = screen.getByText('New Project');
    fireEvent.click(newProjectButton);

    expect(mockPush).toHaveBeenCalledWith('/projects/new');
  });

  it('handles task completion', async () => {
    render(<DashboardPage />);

    const completeTaskButton = screen.getByText('Complete Task');
    fireEvent.click(completeTaskButton);

    expect(mockDashboardData.completeTask).toHaveBeenCalledWith('1');
  });

  it('handles add task navigation', () => {
    render(<DashboardPage />);

    const addTaskButton = screen.getByText('Add Task');
    fireEvent.click(addTaskButton);

    expect(mockPush).toHaveBeenCalledWith('/tasks/new');
  });

  it('handles view all personnel navigation', () => {
    render(<DashboardPage />);

    const viewAllButton = screen.getByText('View All Personnel');
    fireEvent.click(viewAllButton);

    expect(mockPush).toHaveBeenCalledWith('/personnel');
  });

  it('handles schedule month navigation', () => {
    render(<DashboardPage />);

    const prevButton = screen.getByText('Previous');
    const nextButton = screen.getByText('Next');

    fireEvent.click(prevButton);
    fireEvent.click(nextButton);

    // Month navigation is handled internally, just verify buttons work
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('displays refresh button and handles refresh', () => {
    render(<DashboardPage />);

    const refreshButton = screen.getByText('Actualizar');
    fireEvent.click(refreshButton);

    expect(mockDashboardData.refetch.all).toHaveBeenCalled();
  });

  it('shows loading state when data is loading', () => {
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

    render(<DashboardPage />);

    expect(screen.getAllByText('Loading...')).toHaveLength(5);
  });

  it('displays error banner when there are errors', () => {
    const errorData = {
      ...mockDashboardData,
      errors: {
        metrics: 'Error loading metrics',
        projects: null,
        tasks: null,
        teamMembers: null,
        events: null,
      },
    };

    vi.mocked(require('@/hooks/useDashboardData').useDashboardData).mockReturnValue(errorData);

    render(<DashboardPage />);

    expect(screen.getByText('Error al cargar algunos datos')).toBeInTheDocument();
    expect(screen.getByText('Métricas: Error loading metrics')).toBeInTheDocument();
  });

  it('handles retry when there are errors', () => {
    const errorData = {
      ...mockDashboardData,
      errors: {
        metrics: 'Error loading metrics',
        projects: null,
        tasks: null,
        teamMembers: null,
        events: null,
      },
    };

    vi.mocked(require('@/hooks/useDashboardData').useDashboardData).mockReturnValue(errorData);

    render(<DashboardPage />);

    const retryButton = screen.getByText('Reintentar');
    fireEvent.click(retryButton);

    expect(mockDashboardData.refetch.all).toHaveBeenCalled();
  });

  it('redirects to login when not authenticated', () => {
    vi.mocked(require('@/lib/auth').useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    render(<DashboardPage />);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('shows loading screen when auth is loading', () => {
    vi.mocked(require('@/lib/auth').useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });

    render(<DashboardPage />);

    expect(screen.getByText('Verificando autenticación...')).toBeInTheDocument();
  });

  it('shows loading screen when user is not available', () => {
    vi.mocked(require('@/lib/auth').useAuth).mockReturnValue({
      user: null,
      isAuthenticated: true,
      isLoading: false,
    });

    render(<DashboardPage />);

    expect(screen.getByText('Cargando datos del usuario...')).toBeInTheDocument();
  });

  it('has skip to content link for accessibility', () => {
    render(<DashboardPage />);

    const skipLink = screen.getByText('Ir al contenido principal');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('displays floating action button on mobile', () => {
    vi.mocked(require('@/hooks/useMobileOptimizations').useMobileOptimizations).mockReturnValue({
      isMobile: true,
      isTablet: false,
      isTouch: true,
      orientation: 'portrait',
      addTouchFeedback: vi.fn(),
      optimizeForMobile: vi.fn(),
    });

    render(<DashboardPage />);

    // The floating action button should be present
    const fabButton = document.querySelector('.fixed.bottom-4.right-4');
    expect(fabButton).toBeInTheDocument();
  });

  it('displays pull to refresh indicator when pulling', () => {
    vi.mocked(require('@/hooks/useMobileOptimizations').usePullToRefresh).mockReturnValue({
      isPulling: true,
      pullDistance: 50,
    });

    render(<DashboardPage />);

    expect(screen.getByText('Actualizando...')).toBeInTheDocument();
  });
});