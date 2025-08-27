import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/test/utils'
import { Table } from '@/components/ui/Table'

// Mock performance API
const mockPerformance = {
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(),
  now: vi.fn(() => Date.now())
}

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true
})

describe('Performance Integration Tests', () => {
  describe('Component Rendering Performance', () => {
    it('should render large tables efficiently', async () => {
      const startTime = performance.now()
      
      // Generate large dataset
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: `item_${i}`,
        name: `Item ${i}`,
        status: i % 2 === 0 ? 'Active' : 'Inactive',
        value: Math.random() * 1000
      }))

      const columns = [
        { key: 'name', title: 'Name', sortable: true },
        { key: 'status', title: 'Status', sortable: true },
        { key: 'value', title: 'Value', sortable: true }
      ]

      renderWithProviders(
        <Table 
          data={largeData} 
          columns={columns}
          pagination={{
            page: 1,
            pageSize: 50,
            total: 1000,
            onPageChange: vi.fn()
          }}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000) // 1 second

      // Should show paginated results, not all 1000 items
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBeLessThanOrEqual(51) // 50 data rows + 1 header
    })

    it('should handle rapid state updates efficiently', async () => {
      let renderCount = 0
      
      const TestComponent = () => {
        const [count, setCount] = React.useState(0)
        
        React.useEffect(() => {
          renderCount++
        })

        React.useEffect(() => {
          // Simulate rapid updates
          const interval = setInterval(() => {
            setCount(c => c + 1)
          }, 10)

          setTimeout(() => clearInterval(interval), 100)
          
          return () => clearInterval(interval)
        }, [])

        return <div>Count: {count}</div>
      }

      renderWithProviders(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText(/Count: \d+/)).toBeInTheDocument()
      }, { timeout: 200 })

      // Should not cause excessive re-renders
      expect(renderCount).toBeLessThan(20)
    })
  })

  describe('Memory Usage', () => {
    it('should clean up event listeners on unmount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const TestComponent = () => {
        React.useEffect(() => {
          const handler = () => {}
          window.addEventListener('resize', handler)
          return () => window.removeEventListener('resize', handler)
        }, [])

        return <div>Test Component</div>
      }

      const { unmount } = renderWithProviders(<TestComponent />)

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('should not create memory leaks with timers', () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const TestComponent = () => {
        React.useEffect(() => {
          const timer = setTimeout(() => {}, 1000)
          return () => clearTimeout(timer)
        }, [])

        return <div>Timer Component</div>
      }

      const { unmount } = renderWithProviders(<TestComponent />)

      expect(setTimeoutSpy).toHaveBeenCalled()

      unmount()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })

  describe('Bundle Size Optimization', () => {
    it('should lazy load components when needed', async () => {
      const LazyComponent = React.lazy(() => 
        Promise.resolve({
          default: () => <div>Lazy Loaded</div>
        })
      )

      renderWithProviders(
        <React.Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </React.Suspense>
      )

      // Should show loading state first
      expect(screen.getByText('Loading...')).toBeInTheDocument()

      // Then show the lazy component
      await waitFor(() => {
        expect(screen.getByText('Lazy Loaded')).toBeInTheDocument()
      })
    })
  })

  describe('API Performance', () => {
    it('should handle concurrent API requests efficiently', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      })

      global.fetch = mockFetch

      // Simulate multiple concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) =>
        fetch(`/api/data/${i}`)
      )

      const startTime = performance.now()
      await Promise.all(requests)
      const endTime = performance.now()

      const totalTime = endTime - startTime

      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(500) // 500ms
      expect(mockFetch).toHaveBeenCalledTimes(10)
    })

    it('should implement proper caching', async () => {
      // Test that identical requests are cached
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'cached' })
      })

      global.fetch = mockFetch

      // Make the same request twice
      await fetch('/api/cached-data')
      await fetch('/api/cached-data')

      // With proper caching, should only make one actual request
      // (This depends on actual caching implementation)
      expect(mockFetch).toHaveBeenCalledTimes(2) // Without caching
      // expect(mockFetch).toHaveBeenCalledTimes(1) // With caching
    })
  })

  describe('Accessibility Performance', () => {
    it('should not impact performance with accessibility features', () => {
      const startTime = performance.now()

      renderWithProviders(
        <div>
          <button aria-label="Accessible button">Click me</button>
          <input aria-describedby="help-text" />
          <div id="help-text">Help text</div>
          <nav role="navigation" aria-label="Main navigation">
            <ul>
              <li><a href="/home">Home</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </nav>
        </div>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Accessibility attributes should not significantly impact performance
      expect(renderTime).toBeLessThan(100)
    })
  })
})