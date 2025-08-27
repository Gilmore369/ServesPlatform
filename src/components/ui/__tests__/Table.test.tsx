import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, userEvent } from '@/test/utils'
import { Table, Column } from '../Table'

interface TestData {
  id: string
  name: string
  status: string
  count: number
}

const mockData: TestData[] = [
  { id: '1', name: 'Proyecto A', status: 'Activo', count: 10 },
  { id: '2', name: 'Proyecto B', status: 'Pausado', count: 5 },
  { id: '3', name: 'Proyecto C', status: 'Activo', count: 15 },
]

const mockColumns: Column<TestData>[] = [
  { key: 'name', title: 'Nombre', sortable: true, filterable: true },
  { key: 'status', title: 'Estado', sortable: true, filterable: true },
  { key: 'count', title: 'Cantidad', sortable: true, align: 'right' },
]

describe('Table', () => {
  it('renders table with data and columns', () => {
    renderWithProviders(
      <Table data={mockData} columns={mockColumns} />
    )

    expect(screen.getByText('Nombre')).toBeInTheDocument()
    expect(screen.getByText('Estado')).toBeInTheDocument()
    expect(screen.getByText('Cantidad')).toBeInTheDocument()
    
    expect(screen.getByText('Proyecto A')).toBeInTheDocument()
    expect(screen.getByText('Proyecto B')).toBeInTheDocument()
    expect(screen.getByText('Proyecto C')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    renderWithProviders(
      <Table data={[]} columns={mockColumns} isLoading />
    )

    expect(screen.getByText('Cargando datos...')).toBeInTheDocument()
  })

  it('shows empty message when no data', () => {
    renderWithProviders(
      <Table data={[]} columns={mockColumns} emptyMessage="Sin proyectos" />
    )

    expect(screen.getByText('Sin proyectos')).toBeInTheDocument()
  })

  it('handles sorting when column is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Table data={mockData} columns={mockColumns} />
    )

    const nameHeader = screen.getByText('Nombre')
    await user.click(nameHeader)

    // Check if data is sorted (first item should be "Proyecto A")
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Proyecto A')
  })

  it('renders search input when searchable', () => {
    renderWithProviders(
      <Table data={mockData} columns={mockColumns} searchable />
    )

    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument()
  })

  it('filters data when searching', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Table data={mockData} columns={mockColumns} searchable />
    )

    const searchInput = screen.getByPlaceholderText('Buscar...')
    await user.type(searchInput, 'Proyecto A')

    expect(screen.getByText('Proyecto A')).toBeInTheDocument()
    expect(screen.queryByText('Proyecto B')).not.toBeInTheDocument()
  })

  it('calls onSearch when provided', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    
    renderWithProviders(
      <Table 
        data={mockData} 
        columns={mockColumns} 
        searchable 
        onSearch={onSearch}
      />
    )

    const searchInput = screen.getByPlaceholderText('Buscar...')
    await user.type(searchInput, 'test')

    expect(onSearch).toHaveBeenCalledWith('test')
  })

  it('renders pagination when provided', () => {
    const pagination = {
      page: 1,
      pageSize: 10,
      total: 25,
      onPageChange: vi.fn()
    }

    renderWithProviders(
      <Table 
        data={mockData} 
        columns={mockColumns} 
        pagination={pagination}
      />
    )

    // Check for pagination buttons
    expect(screen.getByText('Anterior')).toBeInTheDocument()
    expect(screen.getByText('Siguiente')).toBeInTheDocument()
    
    // Check for page numbers
    const pageButtons = screen.getAllByText('1')
    expect(pageButtons.length).toBeGreaterThan(0)
  })

  it('handles pagination clicks', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    const pagination = {
      page: 1,
      pageSize: 10,
      total: 25,
      onPageChange
    }

    renderWithProviders(
      <Table 
        data={mockData} 
        columns={mockColumns} 
        pagination={pagination}
      />
    )

    const nextButton = screen.getByText('Siguiente')
    await user.click(nextButton)

    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('renders custom cell content with render function', () => {
    const columnsWithRender: Column<TestData>[] = [
      {
        key: 'status',
        title: 'Estado',
        render: (value) => (
          <span className={`badge ${value === 'Activo' ? 'badge-green' : 'badge-yellow'}`}>
            {value}
          </span>
        )
      }
    ]

    renderWithProviders(
      <Table data={mockData} columns={columnsWithRender} />
    )

    const activeBadges = screen.getAllByText('Activo')
    const pausedBadge = screen.getByText('Pausado')
    
    expect(activeBadges[0]).toHaveClass('badge-green')
    expect(pausedBadge).toHaveClass('badge-yellow')
  })

  it('has proper accessibility attributes', () => {
    renderWithProviders(
      <Table data={mockData} columns={mockColumns} />
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(3)
    expect(screen.getAllByRole('row')).toHaveLength(4) // 1 header + 3 data rows
  })

  it('supports keyboard navigation for sortable columns', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Table data={mockData} columns={mockColumns} />
    )

    const nameHeader = screen.getByText('Nombre').closest('th')!
    nameHeader.focus()
    await user.keyboard('{Enter}')

    // Should trigger sort
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
  })
})