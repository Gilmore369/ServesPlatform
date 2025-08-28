# Comprehensive Test Suite for Google Sheets Integration

This directory contains a complete test suite for the Google Sheets integration functionality, including unit tests, integration tests, and performance tests.

## 📁 Directory Structure

```
src/test/
├── unit/                           # Unit tests for individual components
│   ├── google-sheets-api-service.test.ts
│   ├── validation.test.ts
│   ├── cache-manager.test.ts
│   ├── error-handler.test.ts
│   └── sync-manager.test.ts
├── integration/                    # End-to-end integration tests
│   └── google-sheets-integration.test.ts
├── performance/                    # Performance and load tests
│   └── api-performance.test.ts
├── mocks/                         # Mock data and handlers
│   ├── data.ts
│   ├── handlers.ts
│   └── server.ts
├── accessibility/                 # Accessibility tests
├── e2e/                          # End-to-end browser tests
├── setup.ts                      # Test environment setup
├── test.config.ts                # Test configuration
├── test-runner.ts                # Comprehensive test runner
├── utils.tsx                     # Test utilities
└── README.md                     # This file
```

## 🧪 Test Types

### Unit Tests
Tests individual components in isolation with mocked dependencies.

**Coverage:**
- Google Sheets API Service
- Data Validation System
- Cache Manager
- Error Handler
- Sync Manager

**Run unit tests:**
```bash
npm run test:unit
```

### Integration Tests
Tests the complete flow from API calls to Google Sheets with real test data.

**Requirements:**
- `TEST_GOOGLE_SHEETS_URL` environment variable
- `TEST_API_TOKEN` environment variable
- Access to test Google Sheets

**Run integration tests:**
```bash
npm run test:integration
```

### Performance Tests
Tests API performance, load handling, and resource usage.

**Metrics tested:**
- Response times for CRUD operations
- Concurrent request handling
- Memory usage patterns
- Batch operation efficiency

**Run performance tests:**
```bash
npm run test:performance
```

## 🚀 Quick Start

### 1. Run All Tests
```bash
# Run comprehensive test suite
npm run test:comprehensive

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:performance
```

### 2. Environment Setup

#### For Unit Tests Only
No additional setup required. Unit tests use mocked dependencies.

#### For Integration and Performance Tests
Set up environment variables:

```bash
# .env.test or .env.local
TEST_GOOGLE_SHEETS_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
TEST_API_TOKEN=your-test-api-token
```

### 3. Watch Mode
```bash
# Run tests in watch mode during development
npm run test:watch
```

### 4. Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/index.html
```

## 📊 Test Configuration

### Environment-Specific Configurations

The test suite supports different configurations for different environments:

- **unit**: Only unit tests, all external dependencies mocked
- **integration**: Includes integration tests with real API calls
- **performance**: Includes performance tests with extended timeouts
- **ci**: Optimized for CI/CD environments

Set the test environment:
```bash
TEST_ENV=integration npm run test:comprehensive
```

### Performance Thresholds

Default performance thresholds (can be customized in `test.config.ts`):

| Operation | Threshold |
|-----------|-----------|
| List      | 3000ms    |
| Get       | 2000ms    |
| Create    | 4000ms    |
| Update    | 3000ms    |
| Delete    | 2000ms    |
| Batch     | 10000ms   |

### Coverage Thresholds

- **Minimum Coverage**: 80%
- **CI Coverage**: 85%

## 🔧 Test Utilities

### Test Data Generators

```typescript
import { testDataGenerators } from './test.config'

// Generate test material
const material = testDataGenerators.material('001')

// Generate test project
const project = testDataGenerators.project('TEST')
```

### Test Utilities

```typescript
import { testUtils } from './test.config'

// Generate unique test ID
const id = testUtils.generateTestId('MAT')

// Retry operation with backoff
const result = await testUtils.retry(() => apiCall(), 3, 1000)

// Wait for specified time
await testUtils.wait(1000)
```

### Cleanup Utilities

```typescript
// Clean up test data after tests
await testUtils.cleanupTestData(apiService, ['Materiales', 'Proyectos'])
```

## 📈 Test Reports

### Automated Reports

The test runner generates comprehensive reports:

```bash
# Reports are saved to:
test-reports/
├── test-report-{timestamp}.json
├── latest-report.json
└── coverage/
    └── index.html
```

### Report Contents

- Test execution summary
- Performance metrics
- Coverage analysis
- Error details
- Environment information

### CI/CD Integration

The test runner returns appropriate exit codes:
- `0`: All tests passed
- `1`: Tests failed or errors occurred

## 🐛 Debugging Tests

### Debug Individual Tests

```bash
# Run specific test file
npm run test:unit -- src/test/unit/google-sheets-api-service.test.ts

# Run with debug output
DEBUG=true npm run test:unit

# Run with console output
npm run test:unit -- --reporter=verbose
```

### Debug Integration Issues

1. **Check Environment Variables**
   ```bash
   echo $TEST_GOOGLE_SHEETS_URL
   echo $TEST_API_TOKEN
   ```

2. **Validate API Connection**
   ```bash
   curl -X GET "$TEST_GOOGLE_SHEETS_URL?token=$TEST_API_TOKEN&action=test"
   ```

3. **Check Test Data Cleanup**
   - Test data is automatically cleaned up
   - Manual cleanup available via `testUtils.cleanupTestData()`

### Common Issues

#### Integration Tests Failing
- Verify `TEST_GOOGLE_SHEETS_URL` and `TEST_API_TOKEN` are set
- Check Google Apps Script deployment is accessible
- Ensure test Google Sheets has proper permissions

#### Performance Tests Timing Out
- Increase timeout in `test.config.ts`
- Check network connectivity to Google Sheets
- Verify Google Apps Script performance

#### Unit Tests Mocking Issues
- Check mock implementations in `setup.ts`
- Verify mock data in `mocks/` directory
- Ensure proper cleanup between tests

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        env:
          TEST_GOOGLE_SHEETS_URL: ${{ secrets.TEST_GOOGLE_SHEETS_URL }}
          TEST_API_TOKEN: ${{ secrets.TEST_API_TOKEN }}
        run: npm run test:integration
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Test Data Management in CI

- Use separate test Google Sheets for CI
- Implement automatic cleanup after test runs
- Use test data prefixes to avoid conflicts

## 📚 Best Practices

### Writing Tests

1. **Use descriptive test names**
   ```typescript
   it('should create material with valid data and return ID', async () => {
   ```

2. **Follow AAA pattern** (Arrange, Act, Assert)
   ```typescript
   // Arrange
   const material = testDataGenerators.material()
   
   // Act
   const result = await apiService.executeOperation({...})
   
   // Assert
   expect(result.ok).toBe(true)
   ```

3. **Test error conditions**
   ```typescript
   it('should handle validation errors gracefully', async () => {
     const invalidData = { /* missing required fields */ }
     const result = await apiService.executeOperation({...})
     expect(result.ok).toBe(false)
   })
   ```

4. **Use proper cleanup**
   ```typescript
   afterEach(async () => {
     await testUtils.cleanupTestData(apiService)
   })
   ```

### Performance Testing

1. **Set realistic thresholds**
2. **Test under load conditions**
3. **Monitor memory usage**
4. **Test concurrent operations**

### Integration Testing

1. **Use test-specific data**
2. **Clean up after tests**
3. **Handle network failures gracefully**
4. **Test real-world scenarios**

## 🤝 Contributing

When adding new tests:

1. **Follow existing patterns**
2. **Add appropriate documentation**
3. **Update test configuration if needed**
4. **Ensure proper cleanup**
5. **Add to comprehensive test runner**

### Adding New Test Suites

1. Create test file in appropriate directory
2. Add to `test-runner.ts`
3. Update this README
4. Add any new dependencies to `package.json`

## 📞 Support

For issues with the test suite:

1. Check this README for common solutions
2. Review test configuration in `test.config.ts`
3. Check environment variable setup
4. Review test output and error messages

## 🔗 Related Documentation

- [Google Sheets API Service Documentation](../lib/README-GoogleSheetsAPIService.md)
- [Error Handler Documentation](../lib/README-ErrorHandler.md)
- [Monitoring Documentation](../lib/README-Monitoring.md)
- [Validation System Documentation](../lib/validation/README.md)
- [Cache System Documentation](../lib/cache/README.md)