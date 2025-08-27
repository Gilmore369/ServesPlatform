import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { RecentProjects } from '../RecentProjects';
import { DashboardProject, TeamMember } from '@/lib/dashboard-types';

// Mock data for testing
const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Carlos Mendoza',
    role: 'Arquitecto',
    avatar: '',
    status: 'Disponible',
    statusColor: 'bg-green-500'
  },
  {
    id: '2',
    name: 'Ana García',
    role: 'Ingeniera Civil',
    avatar: '',
    status: 'En obra',
    statusColor: 'bg-blue-500'
  }
];

const mockProjects: DashboardProject[] = [
  {
    id: '1',
    name: 'Edificio Residencial Los Pinos',
    description: 'Construcción de edificio residencial de 8 pisos con 32 departamentos en San Isidro.',
    status: 'En progreso',
    progress: 75,
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-12-30'),
    teamMembers: mockTeamMembers,
    statusColor: 'bg-blue-100 text-blue-800'
  },
  {
    id: '2',
    name: 'Centro Comercial Plaza Norte',
    description: 'Desarrollo de centro comercial con 120 locales comerciales y área de entretenimiento.',
    status: 'Planificación',
    progress: 25,
    startDate: new Date('2024-03-01'),
    endDate: new Date('2025-06-15'),
    teamMembers: mockTeamMembers.slice(0, 1),
    statusColor: 'bg-yellow-100 text-yellow-800'
  }
];

describe('RecentProjects', () => {
  const mockOnViewDetails = vi.fn();
  const mockOnNewProject = vi.fn();

  beforeEach(() => {
    mockOnViewDetails.mockClear();
    mockOnNewProject.mockClear();
  });

  it('renders the component title', () => {
    render(
      <RecentProjects
        projects={mockProjects}
        onViewDetails={mockOnViewDetails}
        onNewProject={mockOnNewProject}
      />
    );

    expect(screen.getByText('Proyectos Recientes')).toBeInTheDocument();
  });

  it('renders project cards with correct information', () => {
    render(
      <RecentProjects
        projects={mockProjects}
        onViewDetails={mockOnViewDetails}
        onNewProject={mockOnNewProject}
      />
    );

    expect(screen.getByText('Edificio Residencial Los Pinos')).toBeInTheDocument();
    expect(screen.getByText('Centro Comercial Plaza Norte')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('calls onViewDetails when "Ver detalles" button is clicked', () => {
    render(
      <RecentProjects
        projects={mockProjects}
        onViewDetails={mockOnViewDetails}
        onNewProject={mockOnNewProject}
      />
    );

    const viewDetailsButtons = screen.getAllByText('Ver detalles');
    fireEvent.click(viewDetailsButtons[0]);

    expect(mockOnViewDetails).toHaveBeenCalledWith('1');
  });

  it('calls onNewProject when "Nuevo Proyecto" button is clicked', () => {
    render(
      <RecentProjects
        projects={mockProjects}
        onViewDetails={mockOnViewDetails}
        onNewProject={mockOnNewProject}
      />
    );

    const newProjectButton = screen.getByText('Nuevo Proyecto');
    fireEvent.click(newProjectButton);

    expect(mockOnNewProject).toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', () => {
    render(
      <RecentProjects
        projects={[]}
        onViewDetails={mockOnViewDetails}
        onNewProject={mockOnNewProject}
        isLoading={true}
      />
    );

    const loadingCards = screen.getAllByRole('generic').filter(el => 
      el.className.includes('animate-pulse')
    );
    expect(loadingCards.length).toBeGreaterThan(0);
  });

  it('shows empty state when no projects are available', () => {
    render(
      <RecentProjects
        projects={[]}
        onViewDetails={mockOnViewDetails}
        onNewProject={mockOnNewProject}
        isLoading={false}
      />
    );

    expect(screen.getByText('No hay proyectos')).toBeInTheDocument();
    expect(screen.getByText('Comienza creando tu primer proyecto.')).toBeInTheDocument();
  });

  it('displays project status badges with correct styling', () => {
    render(
      <RecentProjects
        projects={mockProjects}
        onViewDetails={mockOnViewDetails}
        onNewProject={mockOnNewProject}
      />
    );

    expect(screen.getByText('En progreso')).toBeInTheDocument();
    expect(screen.getByText('Planificación')).toBeInTheDocument();
  });

  it('shows team member avatars', () => {
    render(
      <RecentProjects
        projects={mockProjects}
        onViewDetails={mockOnViewDetails}
        onNewProject={mockOnNewProject}
      />
    );

    // Check for team member initials in avatars
    expect(screen.getAllByText('CM')).toHaveLength(2); // Carlos Mendoza appears in both projects
    expect(screen.getByText('AG')).toBeInTheDocument(); // Ana García
  });

  it('has responsive grid layout classes', () => {
    const { container } = render(
      <RecentProjects
        projects={mockProjects}
        onViewDetails={mockOnViewDetails}
        onNewProject={mockOnNewProject}
      />
    );

    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3');
  });
});