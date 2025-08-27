# Testing Documentation

## Overview

This project uses a comprehensive testing strategy with multiple types of tests to ensure code quality and functionality.

## Test Types

### 1. Unit Tests
- **Location**: `src/**/__tests__/*.test.tsx`
- **Framework**: Vitest + React Testing Library
- **Purpose**: Test individual components and functions in isolation
- **Run**: `npm test`

### 2. Integration Tests
- **Location**: `src/**/__tests__/*.test.tsx`
- **Framework**: Vitest + React Testing Library + MSW
- **Purpose**: Test component interactions and API integration
- **Run**: `npm test`

### 3. End-to-End Tests
- **Location**: `src/test/e2e/*.spec.ts`
- **Framework**: Playwright
- **Purpose**: Test complete user workflows
- **Run**: `npm run test:e2e`

### 4. Accessibility Tests
- **Location**: `src/test/accessibility/*.spec.ts`
- **Framework**: Playwright + axe-core
- **Purpose**: Ensure WCAG compliance
- **Run**: `npm run test:accessibility`

## Test Setup

### Unit/Integration Tests
- **Setup File**: `src/test/setup.ts`
- **Mock Server**: MSW (Mock Service Worker)
- **Test Utilities**: `src/test/utils.tsx`
- **Mock Data**: `src/test/mocks/data.ts`

### E2E Tests
- **Config**: `playwright.config.ts`
- **Base URL**: `http://localhost:3000`
- **Browsers**: Chrome, Firefox, Safari, Mobile

## Running Tests

```bash
# Unit and integration tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui

# Accessibility tests
npm run test:accessibility
```

## Test Patterns

### Component Testing
```typescript
import { renderWithProviders, screen, userEvent } from '@/test/utils'
import { MyComponent } from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent />)
    expect(screen.getByText('Expected text')).toBeInTheDocument()
  })

  it('handles user interactions', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    
    renderWithProviders(<MyComponent onClick={handleClick} />)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })
})
```

### API Testing
```typescript
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

beforeEach(() => {
  server.use(
    http.get('/api/data', () => {
      return HttpResponse.json({ data: 'mock data' })
    })
  )
})
```

### E2E Testing
```typescript
import { test, expect } from '@playwright/test'

test('user can login', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]', 'user@example.com')
  await page.fill('[name="password"]', 'password')
  await page.click('button[type="submit"]')
  
  await expect(page).toHaveURL('/dashboard')
})
```

## Coverage Requirements

- **Minimum Coverage**: 80%
- **Critical Components**: 90%+
- **Utilities/Helpers**: 95%+

## Best Practices

### 1. Test Structure
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Group related tests with `describe` blocks

### 2. Mocking
- Mock external dependencies
- Use MSW for API mocking
- Mock only what's necessary

### 3. Accessibility
- Test with screen readers in mind
- Use semantic queries (getByRole, getByLabelText)
- Test keyboard navigation

### 4. Performance
- Keep tests fast and focused
- Use `beforeEach` for common setup
- Clean up after tests

## Debugging Tests

### Unit Tests
```bash
# Run specific test file
npm test -- CardKpi.test.tsx

# Debug mode
npm run test:watch

# With UI
npm run test:ui
```

### E2E Tests
```bash
# Debug mode
npm run test:e2e -- --debug

# Headed mode
npm run test:e2e -- --headed

# UI mode
npm run test:e2e:ui
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Main branch pushes
- Release builds

### GitHub Actions
```yaml
- name: Run tests
  run: |
    npm test
    npm run test:e2e
    npm run test:accessibility
```

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in config
   - Check for infinite loops
   - Use `waitFor` for async operations

2. **Mock not working**
   - Verify mock setup in `beforeEach`
   - Check import paths
   - Ensure MSW handlers are correct

3. **E2E tests flaky**
   - Add explicit waits
   - Use `page.waitForSelector`
   - Check for race conditions

### Getting Help

- Check test logs for detailed errors
- Use `screen.debug()` to see rendered output
- Use Playwright trace viewer for E2E debugging