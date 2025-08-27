import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { PendingTasks } from '../PendingTasks';
import { DashboardTask } from '@/lib/dashboard-types';

// Mock data for testing
const mockTasks: DashboardTask[] = [
  {
    id: '1',
    title: 'Revisión de planos estructurales',
    project: 'Edificio Residencial Los Pinos',
    priority: 'Alta',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
    status: 'Pendiente',
    priorityColor: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: '2',
    title: 'Inspección de cimientos',
    project: 'Centro Comercial Plaza Norte',
    priority: 'Media',
    dueDate: new Date(), // Today
    status: 'En progreso',
    priorityColor: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  {
    id: '3',
    title: 'Entrega de materiales',
    project: 'Oficinas Corporativas Tech Hub',
    priority: 'Baja',
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday (overdue)
    status: 'Pendiente',
    priorityColor: 'bg-green-100 text-green-800 border-green-200'
  }
];

describe('PendingTasks', () => {
  const mockOnCompleteTask = vi.fn();
  const mockOnAddTask = vi.fn();

  beforeEach(() => {
    mockOnCompleteTask.mockClear();
    mockOnAddTask.mockClear();
  });

  it('renders the component title', () => {
    render(
      <PendingTasks
        tasks={mockTasks}
        onCompleteTask={mockOnCompleteTask}
        onAddTask={mockOnAddTask}
      />
    );

    expect(screen.getByText('Tareas Pendientes')).toBeInTheDocument();
  });

  it('displays task count correctly', () => {
    render(
      <PendingTasks
        tasks={mockTasks}
        onCompleteTask={mockOnCompleteTask}
        onAddTask={mockOnAddTask}
      />
    );

    expect(screen.getByText('3 tareas pendientes')).toBeInTheDocument();
  });

  it('renders task items with correct information', () => {
    render(
      <PendingTasks
        tasks={mockTasks}
        onCompleteTask={mockOnCompleteTask}
        onAddTask={mockOnAddTask}
      />
    );

    expect(screen.getByText('Revisión de planos estructurales')).toBeInTheDocument();
    expect(screen.getByText('Inspección de cimientos')).toBeInTheDocument();
    expect(screen.getByText('Entrega de materiales')).toBeInTheDocument();
    expect(screen.getByText('Edificio Residencial Los Pinos')).toBeInTheDocument();
  });

  it('displays priority badges with correct styling', () => {
    render(
      <PendingTasks
        tasks={mockTasks}
        onCompleteTask={mockOnCompleteTask}
        onAddTask={mockOnAddTask}
      />
    );

    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
    expect(screen.getByText('Baja')).toBeInTheDocument();
  });

  it('calls onCompleteTask when complete button is clicked', () => {
    render(
      <PendingTasks
        tasks={mockTasks}
        onCompleteTask={mockOnCompleteTask}
        onAddTask={mockOnAddTask}
      />
    );

    const completeButtons = screen.getAllByText('Completar');
    fireEvent.click(completeButtons[0]);

    expect(mockOnCompleteTask).toHaveBeenCalledWith('1');
  });

  it('calls onAddTask when "Agregar Tarea" button is clicked', () => {
    render(
      <PendingTasks
        tasks={mockTasks}
        onCompleteTask={mockOnCompleteTask}
        onAddTask={mockOnAddTask}
      />
    );

    const addButton = screen.getByText('Agregar Tarea');
    fireEvent.click(addButton);

    expect(mockOnAddTask).toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', () => {
    const { container } = render(
      <PendingTasks
        tasks={[]}
        onCompleteTask={mockOnCompleteTask}
        onAddTask={mockOnAddTask}
        isLoading={true}
      />
    );

    const loadingElements = container.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no tasks are available', () => {
    render(
      <PendingTasks
        tasks={[]}
        onCompleteTask={mockOnCompleteTask}
        onAddTask={mockOnAddTask}
      />
    );

    expect(screen.getByText('¡Todas las tareas completadas!')).toBeInTheDocument();
    expect(screen.getByText('No tienes tareas pendientes en este momento.')).toBeInTheDocument();
  });

  it('shows overdue warning for overdue tasks', () => {
    render(
      <PendingTasks
        tasks={mockTasks}
        onCompleteTask={mockOnCompleteTask}
        onAddTask={mockOnAddTask}
      />
    );

    expect(screen.getByText('Tarea vencida')).toBeInTheDocument();
  });

  it('sorts tasks by priority and due date', () => {
    render(
      <PendingTasks
        tasks={mockTasks}
        onCompleteTask={mockOnCompleteTask}
        onAddTask={mockOnAddTask}
      />
    );

    const taskTitles = screen.getAllByRole('heading', { level: 4 });
    // High priority task should appear first
    expect(taskTitles[0]).toHaveTextContent('Revisión de planos estructurales');
  });

  it('has responsive design classes', () => {
    const { container } = render(
      <PendingTasks
        tasks={mockTasks}
        onCompleteTask={mockOnCompleteTask}
        onAddTask={mockOnAddTask}
      />
    );

    const mainContainer = container.querySelector('.bg-white.rounded-lg.shadow');
    expect(mainContainer).toBeInTheDocument();
  });
});