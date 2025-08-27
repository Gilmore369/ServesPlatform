import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import KPICards from '../KPICards';
import { DashboardMetrics } from '@/lib/dashboard-types';

const mockMetrics: DashboardMetrics = {
  activeProjects: 12,
  activePersonnel: 24,
  pendingTasks: 48,
  remainingBudget: 125000,
};

describe('KPICards', () => {
  it('renders all KPI cards with correct titles', () => {
    render(<KPICards metrics={mockMetrics} />);
    
    expect(screen.getByText('Proyectos Activos')).toBeInTheDocument();
    expect(screen.getByText('Personal Activo')).toBeInTheDocument();
    expect(screen.getByText('Tareas Pendientes')).toBeInTheDocument();
    expect(screen.getByText('Presupuesto Restante')).toBeInTheDocument();
  });

  it('displays correct metric values', () => {
    render(<KPICards metrics={mockMetrics} />);
    
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
    expect(screen.getByText('S/ 125K')).toBeInTheDocument();
  });

  it('formats budget values correctly', () => {
    const metricsWithLargeBudget: DashboardMetrics = {
      ...mockMetrics,
      remainingBudget: 1500000, // 1.5M
    };
    
    render(<KPICards metrics={metricsWithLargeBudget} />);
    expect(screen.getByText('S/ 1.5M')).toBeInTheDocument();
  });

  it('shows loading skeletons when isLoading is true', () => {
    render(<KPICards metrics={mockMetrics} isLoading={true} />);
    
    // Check for loading skeleton elements
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(4);
  });

  it('displays trend indicators', () => {
    render(<KPICards metrics={mockMetrics} />);
    
    // Check for trend percentages (mocked in component)
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('8%')).toBeInTheDocument();
    expect(screen.getByText('5%')).toBeInTheDocument();
  });

  it('has responsive grid layout classes', () => {
    const { container } = render(<KPICards metrics={mockMetrics} />);
    
    const gridContainer = container.firstChild;
    expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4');
  });

  it('applies hover effects to cards', () => {
    const { container } = render(<KPICards metrics={mockMetrics} />);
    
    const cards = container.querySelectorAll('.hover\\:shadow-lg');
    expect(cards.length).toBeGreaterThan(0);
  });
});