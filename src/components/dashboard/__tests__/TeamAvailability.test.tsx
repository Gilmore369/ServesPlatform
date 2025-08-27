import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { TeamAvailability } from '../TeamAvailability';
import { TeamMember } from '@/lib/dashboard-types';

// Mock team members data for testing
const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Carlos Mendoza',
    role: 'Arquitecto Senior',
    avatar: '',
    status: 'Disponible',
    availableFrom: '09:00',
    statusColor: 'bg-green-500'
  },
  {
    id: '2',
    name: 'Ana García',
    role: 'Ingeniera Civil',
    avatar: '',
    status: 'En obra',
    statusColor: 'bg-blue-500'
  },
  {
    id: '3',
    name: 'Luis Torres',
    role: 'Supervisor de Obra',
    avatar: '',
    status: 'En reunión',
    statusColor: 'bg-yellow-500'
  },
  {
    id: '4',
    name: 'Roberto Silva',
    role: 'Ingeniero Estructural',
    avatar: '',
    status: 'No disponible',
    statusColor: 'bg-red-500'
  }
];

describe('TeamAvailability', () => {
  const mockOnViewAllPersonnel = vi.fn();

  beforeEach(() => {
    mockOnViewAllPersonnel.mockClear();
  });

  it('renders the component title', () => {
    render(
      <TeamAvailability
        teamMembers={mockTeamMembers}
        onViewAllPersonnel={mockOnViewAllPersonnel}
      />
    );

    expect(screen.getByText('Disponibilidad del Equipo')).toBeInTheDocument();
  });

  it('renders team members with correct information', () => {
    render(
      <TeamAvailability
        teamMembers={mockTeamMembers}
        onViewAllPersonnel={mockOnViewAllPersonnel}
      />
    );

    expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument();
    expect(screen.getByText('Arquitecto Senior')).toBeInTheDocument();
    expect(screen.getByText('Ana García')).toBeInTheDocument();
    expect(screen.getByText('Ingeniera Civil')).toBeInTheDocument();
    expect(screen.getByText('Luis Torres')).toBeInTheDocument();
    expect(screen.getByText('Supervisor de Obra')).toBeInTheDocument();
  });

  it('displays status badges with correct styling', () => {
    render(
      <TeamAvailability
        teamMembers={mockTeamMembers}
        onViewAllPersonnel={mockOnViewAllPersonnel}
      />
    );

    expect(screen.getByText('Disponible desde 09:00')).toBeInTheDocument();
    expect(screen.getByText('En obra')).toBeInTheDocument();
    expect(screen.getByText('En reunión')).toBeInTheDocument();
    expect(screen.getByText('No disponible')).toBeInTheDocument();
  });

  it('shows member count in header', () => {
    render(
      <TeamAvailability
        teamMembers={mockTeamMembers}
        onViewAllPersonnel={mockOnViewAllPersonnel}
      />
    );

    expect(screen.getByText('4 miembros')).toBeInTheDocument();
  });

  it('calls onViewAllPersonnel when "Ver Todo el Personal" button is clicked', () => {
    render(
      <TeamAvailability
        teamMembers={mockTeamMembers}
        onViewAllPersonnel={mockOnViewAllPersonnel}
      />
    );

    const viewAllButton = screen.getByText('Ver Todo el Personal');
    fireEvent.click(viewAllButton);

    expect(mockOnViewAllPersonnel).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when isLoading is true', () => {
    render(
      <TeamAvailability
        teamMembers={[]}
        onViewAllPersonnel={mockOnViewAllPersonnel}
        isLoading={true}
      />
    );

    // Check for loading skeleton elements
    const loadingSkeletons = screen.getAllByText('Disponibilidad del Equipo');
    expect(loadingSkeletons.length).toBeGreaterThan(0);
    
    // Check for animate-pulse class in loading state
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no team members are available', () => {
    render(
      <TeamAvailability
        teamMembers={[]}
        onViewAllPersonnel={mockOnViewAllPersonnel}
      />
    );

    expect(screen.getByText('No hay miembros del equipo disponibles')).toBeInTheDocument();
  });

  it('displays avatar initials when no avatar image is provided', () => {
    render(
      <TeamAvailability
        teamMembers={mockTeamMembers}
        onViewAllPersonnel={mockOnViewAllPersonnel}
      />
    );

    expect(screen.getByText('CM')).toBeInTheDocument(); // Carlos Mendoza
    expect(screen.getByText('AG')).toBeInTheDocument(); // Ana García
    expect(screen.getByText('LT')).toBeInTheDocument(); // Luis Torres
    expect(screen.getByText('RS')).toBeInTheDocument(); // Roberto Silva
  });

  it('shows availability time for available members', () => {
    render(
      <TeamAvailability
        teamMembers={mockTeamMembers}
        onViewAllPersonnel={mockOnViewAllPersonnel}
      />
    );

    expect(screen.getByText('desde 09:00')).toBeInTheDocument();
  });

  it('has responsive design classes', () => {
    render(
      <TeamAvailability
        teamMembers={mockTeamMembers}
        onViewAllPersonnel={mockOnViewAllPersonnel}
      />
    );

    const mainContainer = document.querySelector('.bg-white.rounded-lg.shadow.p-6');
    expect(mainContainer).toBeInTheDocument();
    
    const membersList = document.querySelector('.space-y-4');
    expect(membersList).toBeInTheDocument();
  });
});