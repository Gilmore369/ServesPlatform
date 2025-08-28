#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Google Sheets Integration
 * 
 * This script runs all test suites in the correct order and generates
 * comprehensive reports for unit, integration, and performance tests.
 */

import { execSync } from 'child_process'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

interface TestResult {
  suite: string
  passed: number
  failed: number
  duration: number
  coverage?: number
  errors: string[]
}

interface TestReport {
  timestamp: string
  environment: string
  results: TestResult[]
  summary: {
    totalTests: number
    totalPassed: number
    totalFailed: number
    totalDuration: number
    overallCoverage: number
    success: boolean
  }
}

class TestRunner {
  private results: TestResult[] = []
  private startTime: number = Date.now()

  constructor() {
    this.ensureDirectories()
  }

  private ensureDirectories(): void {
    const dirs = [
      'coverage',
      'test-reports',
      'test-reports/unit',
      'test-reports/integration',
      'test-reports/performance'
    ]

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    })
  }

  private runCommand(command: string, description: string): TestResult {
    console.log(`\n🧪 Running ${description}...`)
    const startTime = Date.now()
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      })
      
      const duration = Date.now() - startTime
      const result = this.parseTestOutput(output, description, duration)
      
      console.log(`✅ ${description} completed: ${result.passed} passed, ${result.failed} failed (${duration}ms)`)
      return result
      
    } catch (error: any) {
      const duration = Date.now() - startTime
      const result: TestResult = {
        suite: description,
        passed: 0,
        failed: 1,
        duration,
        errors: [error.message || 'Unknown error']
      }
      
      console.log(`❌ ${description} failed: ${error.message}`)
      return result
    }
  }

  private parseTestOutput(output: string, suite: string, duration: number): TestResult {
    // Parse vitest output to extract test results
    const lines = output.split('\n')
    let passed = 0
    let failed = 0
    let coverage = 0
    const errors: string[] = []

    for (const line of lines) {
      // Parse test results
      if (line.includes('✓') || line.includes('PASS')) {
        passed++
      } else if (line.includes('✗') || line.includes('FAIL')) {
        failed++
        errors.push(line.trim())
      }
      
      // Parse coverage information
      const coverageMatch = line.match(/All files\s+\|\s+([\d.]+)/)
      if (coverageMatch) {
        coverage = parseFloat(coverageMatch[1])
      }
    }

    // If no specific test counts found, try to parse summary
    const summaryMatch = output.match(/(\d+) passed.*?(\d+) failed/i)
    if (summaryMatch && passed === 0 && failed === 0) {
      passed = parseInt(summaryMatch[1]) || 0
      failed = parseInt(summaryMatch[2]) || 0
    }

    // If still no results, assume success if no error was thrown
    if (passed === 0 && failed === 0) {
      passed = 1 // At least one test must have run
    }

    return {
      suite,
      passed,
      failed,
      duration,
      coverage: coverage > 0 ? coverage : undefined,
      errors
    }
  }

  async runUnitTests(): Promise<void> {
    console.log('\n📋 Running Unit Tests...')
    
    const unitTestSuites = [
      {
        command: 'npm run test:unit -- src/test/unit/google-sheets-api-service.test.ts',
        description: 'Google Sheets API Service Unit Tests'
      },
      {
        command: 'npm run test:unit -- src/test/unit/validation.test.ts',
        description: 'Data Validation Unit Tests'
      },
      {
        command: 'npm run test:unit -- src/test/unit/cache-manager.test.ts',
        description: 'Cache Manager Unit Tests'
      },
      {
        command: 'npm run test:unit -- src/test/unit/error-handler.test.ts',
        description: 'Error Handler Unit Tests'
      },
      {
        command: 'npm run test:unit -- src/test/unit/sync-manager.test.ts',
        description: 'Sync Manager Unit Tests'
      }
    ]

    for (const suite of unitTestSuites) {
      const result = this.runCommand(suite.command, suite.description)
      this.results.push(result)
    }
  }

  async runIntegrationTests(): Promise<void> {
    console.log('\n🔗 Running Integration Tests...')
    
    // Check if integration test environment is configured
    if (!process.env.TEST_GOOGLE_SHEETS_URL) {
      console.log('⚠️  Skipping integration tests - TEST_GOOGLE_SHEETS_URL not configured')
      console.log('   Set TEST_GOOGLE_SHEETS_URL and TEST_API_TOKEN to run integration tests')
      return
    }

    const integrationTestSuites = [
      {
        command: 'npm run test:integration -- src/test/integration/google-sheets-integration.test.ts',
        description: 'Google Sheets Integration Tests'
      }
    ]

    for (const suite of integrationTestSuites) {
      const result = this.runCommand(suite.command, suite.description)
      this.results.push(result)
    }
  }

  async runPerformanceTests(): Promise<void> {
    console.log('\n⚡ Running Performance Tests...')
    
    // Check if performance test environment is configured
    if (!process.env.TEST_GOOGLE_SHEETS_URL) {
      console.log('⚠️  Skipping performance tests - TEST_GOOGLE_SHEETS_URL not configured')
      return
    }

    const performanceTestSuites = [
      {
        command: 'npm run test:performance -- src/test/performance/api-performance.test.ts',
        description: 'API Performance Tests'
      }
    ]

    for (const suite of performanceTestSuites) {
      const result = this.runCommand(suite.command, suite.description)
      this.results.push(result)
    }
  }

  async runCoverageTests(): Promise<void> {
    console.log('\n📊 Running Coverage Analysis...')
    
    const result = this.runCommand(
      'npm run test:coverage -- src/lib/google-sheets-api-service.ts src/lib/validation/ src/lib/cache/ src/lib/error-handler.ts',
      'Code Coverage Analysis'
    )
    
    this.results.push(result)
  }

  private generateReport(): TestReport {
    const totalTests = this.results.reduce((sum, r) => sum + r.passed + r.failed, 0)
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0)
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0)
    const totalDuration = Date.now() - this.startTime
    
    const coverageResults = this.results.filter(r => r.coverage !== undefined)
    const overallCoverage = coverageResults.length > 0 
      ? coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0) / coverageResults.length
      : 0

    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      results: this.results,
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        totalDuration,
        overallCoverage,
        success: totalFailed === 0
      }
    }
  }

  private saveReport(report: TestReport): void {
    const reportPath = join('test-reports', `test-report-${Date.now()}.json`)
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    // Also save as latest report
    const latestReportPath = join('test-reports', 'latest-report.json')
    writeFileSync(latestReportPath, JSON.stringify(report, null, 2))
    
    console.log(`\n📄 Test report saved to: ${reportPath}`)
  }

  private printSummary(report: TestReport): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Tests: ${report.summary.totalTests}`)
    console.log(`Passed: ${report.summary.totalPassed}`)
    console.log(`Failed: ${report.summary.totalFailed}`)
    console.log(`Duration: ${(report.summary.totalDuration / 1000).toFixed(2)}s`)
    
    if (report.summary.overallCoverage > 0) {
      console.log(`Coverage: ${report.summary.overallCoverage.toFixed(1)}%`)
    }
    
    console.log(`Status: ${report.summary.success ? '✅ PASSED' : '❌ FAILED'}`)
    
    if (report.summary.totalFailed > 0) {
      console.log('\n❌ Failed Tests:')
      report.results.forEach(result => {
        if (result.failed > 0) {
          console.log(`  - ${result.suite}: ${result.failed} failed`)
          result.errors.forEach(error => {
            console.log(`    ${error}`)
          })
        }
      })
    }
    
    console.log('='.repeat(60))
  }

  async run(): Promise<boolean> {
    console.log('🚀 Starting Comprehensive Test Suite for Google Sheets Integration')
    console.log(`Environment: ${process.env.NODE_ENV || 'test'}`)
    console.log(`Timestamp: ${new Date().toISOString()}`)

    try {
      // Run all test suites
      await this.runUnitTests()
      await this.runIntegrationTests()
      await this.runPerformanceTests()
      await this.runCoverageTests()

      // Generate and save report
      const report = this.generateReport()
      this.saveReport(report)
      this.printSummary(report)

      return report.summary.success
    } catch (error) {
      console.error('❌ Test runner failed:', error)
      return false
    }
  }
}

// CLI execution
if (require.main === module) {
  const runner = new TestRunner()
  
  runner.run().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { TestRunner }