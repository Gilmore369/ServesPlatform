import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { Schedule } from '../Schedule';
import { CalendarEvent } from '@/lib/dashboard-types';

// Mock data for testing
const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Reunión de seguimiento',
    project: 'Proyecto Test',
    date: new Date(2024, 7, 28), // August 28, 2024
    startTime: '09:00',
    endTime: '10:30',
    type: 'meeting',
    icon: '👥',
    iconColor: 'text-blue-600'
  },
  {
    id: '2',
    title: 'Entrega de materiales',
    project: 'Proyecto Test 2',
    date: new Date(2024, 7, 29), // August 29, 2024
    startTime: '08:00',
    endTime: '12:00',
    type: 'delivery',
    icon: '📦',
    iconColor: 'text-green-600'
  }
];

const mockProps = {
  events: mockEvents,
  currentMonth: new Date(2024, 7, 1), // August 2024
  onNavigateMonth: vi.fn(),
  isLoading: false
};

describe('Schedule Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders schedule component with title', () => {
    render(<Schedule {...mockProps} />);
    expect(screen.getByText('Cronograma')).toBeInTheDocument();
  });

  it('displays current month and year', () => {
    render(<Schedule {...mockProps} />);
    expect(screen.getByText('Agosto 2024')).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(<Schedule {...mockProps} />);
    expect(screen.getByLabelText('Mes anterior')).toBeInTheDocument();
    expect(screen.getByLabelText('Mes siguiente')).toBeInTheDocument();
  });

  it('calls onNavigateMonth when navigation buttons are clicked', () => {
    render(<Schedule {...mockProps} />);
    
    fireEvent.click(screen.getByLabelText('Mes anterior'));
    expect(mockProps.onNavigateMonth).toHaveBeenCalledWith('prev');
    
    fireEvent.click(screen.getByLabelText('Mes siguiente'));
    expect(mockProps.onNavigateMonth).toHaveBeenCalledWith('next');
  });

  it('displays events for current month', () => {
    render(<Schedule {...mockProps} />);
    expect(screen.getByText('Reunión de seguimiento')).toBeInTheDocument();
    expect(screen.getByText('Entrega de materiales')).toBeInTheDocument();
    expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
    expect(screen.getByText('Proyecto Test 2')).toBeInTheDocument();
  });

  it('displays event types correctly', () => {
    render(<Schedule {...mockProps} />);
    expect(screen.getByText('Reunión')).toBeInTheDocument();
    expect(screen.getByText('Entrega')).toBeInTheDocument();
  });

  it('displays time ranges correctly', () => {
    render(<Schedule {...mockProps} />);
    expect(screen.getByText('09:00 - 10:30')).toBeInTheDocument();
    expect(screen.getByText('08:00 - 12:00')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(<Schedule {...mockProps} isLoading={true} />);
    // Check for loading skeleton elements
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    // Check that we have at least some loading skeleton elements
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows empty state when no events for current month', () => {
    const emptyProps = {
      ...mockProps,
      events: [],
    };
    render(<Schedule {...emptyProps} />);
    expect(screen.getByText(/No hay eventos programados para agosto/)).toBeInTheDocument();
  });

  it('filters events by current month correctly', () => {
    const eventsWithDifferentMonths: CalendarEvent[] = [
      ...mockEvents,
      {
        id: '3',
        title: 'Evento de septiembre',
        project: 'Proyecto Septiembre',
        date: new Date(2024, 8, 15), // September 15, 2024
        startTime: '10:00',
        endTime: '11:00',
        type: 'meeting',
        icon: '👥',
        iconColor: 'text-blue-600'
      }
    ];

    render(<Schedule {...mockProps} events={eventsWithDifferentMonths} />);
    
    // Should only show August events
    expect(screen.getByText('Reunión de seguimiento')).toBeInTheDocument();
    expect(screen.getByText('Entrega de materiales')).toBeInTheDocument();
    expect(screen.queryByText('Evento de septiembre')).not.toBeInTheDocument();
  });

  it('sorts events by date and time', () => {
    const unsortedEvents: CalendarEvent[] = [
      {
        id: '2',
        title: 'Segundo evento',
        project: 'Proyecto 2',
        date: new Date(2024, 7, 29),
        startTime: '14:00',
        endTime: '15:00',
        type: 'meeting',
        icon: '👥',
        iconColor: 'text-blue-600'
      },
      {
        id: '1',
        title: 'Primer evento',
        project: 'Proyecto 1',
        date: new Date(2024, 7, 28),
        startTime: '09:00',
        endTime: '10:00',
        type: 'meeting',
        icon: '👥',
        iconColor: 'text-blue-600'
      }
    ];

    render(<Schedule {...mockProps} events={unsortedEvents} />);
    
    const eventTitles = screen.getAllByText(/evento/);
    expect(eventTitles[0]).toHaveTextContent('Primer evento');
    expect(eventTitles[1]).toHaveTextContent('Segundo evento');
  });
});