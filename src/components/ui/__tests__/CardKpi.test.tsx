import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/utils'
import { CardKpi } from '../CardKpi'
import { ChartBarIcon } from '@heroicons/react/24/outline'

describe('CardKpi', () => {
  it('renders KPI card with title and value', () => {
    renderWithProviders(
      <CardKpi
        title="Proyectos Activos"
        value={12}
        icon={ChartBarIcon}
        color="blue"
      />
    )

    expect(screen.getByText('Proyectos Activos')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('formats large numbers correctly with locale', () => {
    renderWithProviders(
      <CardKpi
        title="Presupuesto"
        value={1500000}
        icon={ChartBarIcon}
        color="green"
      />
    )

    // The component uses toLocaleString() which may format differently based on locale
    expect(screen.getByText(/1[.,]500[.,]000/)).toBeInTheDocument()
  })

  it('displays string values as-is', () => {
    renderWithProviders(
      <CardKpi
        title="Estado"
        value="En Progreso"
        icon={ChartBarIcon}
        color="blue"
      />
    )

    expect(screen.getByText('En Progreso')).toBeInTheDocument()
  })

  it('shows trend information when provided', () => {
    renderWithProviders(
      <CardKpi
        title="Ventas"
        value={100}
        icon={ChartBarIcon}
        color="green"
        trend={{
          value: 12.5,
          isPositive: true,
          label: 'vs mes anterior'
        }}
      />
    )

    expect(screen.getByText('+12.5%')).toBeInTheDocument()
    expect(screen.getByText('vs mes anterior')).toBeInTheDocument()
  })

  it('shows negative trend correctly', () => {
    renderWithProviders(
      <CardKpi
        title="Gastos"
        value={50}
        icon={ChartBarIcon}
        color="red"
        trend={{
          value: -8.2,
          isPositive: false
        }}
      />
    )

    expect(screen.getByText('-8.2%')).toBeInTheDocument()
  })

  it('handles loading state', () => {
    renderWithProviders(
      <CardKpi
        title="Loading KPI"
        value={0}
        icon={ChartBarIcon}
        color="gray"
        isLoading
      />
    )

    expect(screen.getByText('Loading KPI')).toBeInTheDocument()
    // Check for loading skeleton
    const skeleton = document.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders as clickable button when onClick is provided', () => {
    const handleClick = vi.fn()
    renderWithProviders(
      <CardKpi
        title="Clickable KPI"
        value={42}
        icon={ChartBarIcon}
        color="blue"
        onClick={handleClick}
      />
    )

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    
    button.click()
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('renders subtitle when provided', () => {
    renderWithProviders(
      <CardKpi
        title="Proyectos"
        value={12}
        subtitle="Activos este mes"
        icon={ChartBarIcon}
        color="blue"
      />
    )

    expect(screen.getByText('Activos este mes')).toBeInTheDocument()
  })

  it('applies correct color classes', () => {
    const { container } = renderWithProviders(
      <CardKpi
        title="Test"
        value={100}
        icon={ChartBarIcon}
        color="red"
      />
    )

    // Check for red color classes in the icon container
    const iconContainer = container.querySelector('.bg-red-50')
    expect(iconContainer).toBeInTheDocument()
  })
})