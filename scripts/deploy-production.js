#!/usr/bin/env node

/**
 * Production Deployment Script
 * Comprehensive deployment process with validation and optimization
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

class ProductionDeployer {
  constructor() {
    this.startTime = Date.now()
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅'
    console.log(`${prefix} [${timestamp}] ${message}`)
  }

  async runCommand(command, description) {
    this.log(`${description}...`)
    try {
      execSync(command, { stdio: 'inherit' })
      this.log(`${description} completed successfully`)
      return true
    } catch (error) {
      this.log(`${description} failed: ${error.message}`, 'error')
      return false
    }
  }

  async preDeploymentChecks() {
    this.log('Running pre-deployment checks...')
    
    // Check if we're in the right directory
    if (!fs.existsSync('package.json')) {
      this.log('package.json not found. Please run from project root.', 'error')
      return false
    }
    
    // Check if required files exist
    const requiredFiles = [
      'next.config.ts',
      'src/app/layout.tsx',
      '.env.production'
    ]
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        this.log(`Required file missing: ${file}`, 'error')
        return false
      }
    }
    
    // Check environment variables
    const envFile = fs.readFileSync('.env.production', 'utf8')
    if (envFile.includes('YOUR_SCRIPT_ID') || envFile.includes('your-production-api-token')) {
      this.log('Please update .env.production with actual production values', 'error')
      return false
    }
    
    this.log('Pre-deployment checks passed')
    return true
  }

  async runTests() {
    this.log('Running test suite...')
    
    const testCommands = [
      { cmd: 'npm run lint', desc: 'Linting' },
      { cmd: 'npm run type-check', desc: 'Type checking' },
      { cmd: 'npm run test:unit', desc: 'Unit tests' }
    ]
    
    for (const { cmd, desc } of testCommands) {
      const success = await this.runCommand(cmd, desc)
      if (!success) {
        this.log('Tests failed. Deployment aborted.', 'error')
        return false
      }
    }
    
    return true
  }

  async validateSystem() {
    this.log('Validating system configuration...')
    return await this.runCommand('npm run validate', 'System validation')
  }

  async buildApplication() {
    this.log('Building application for production...')
    
    // Clean previous build
    await this.runCommand('npm run clean', 'Cleaning previous build')
    
    // Build application
    const success = await this.runCommand('npm run build', 'Building application')
    if (!success) {
      this.log('Build failed. Deployment aborted.', 'error')
      return false
    }
    
    return true
  }

  async optimizeBundle() {
    this.log('Optimizing bundle...')
    return await this.runCommand('npm run optimize', 'Bundle optimization')
  }

  async runE2ETests() {
    this.log('Running E2E tests...')
    
    // Start the application in background
    this.log('Starting application for E2E testing...')
    
    try {
      // Run E2E tests
      const success = await this.runCommand('npm run test:e2e', 'E2E tests')
      return success
    } catch (error) {
      this.log('E2E tests failed', 'warning')
      return false
    }
  }

  async deployToVercel() {
    this.log('Deploying to Vercel...')
    
    try {
      // Check if Vercel CLI is installed
      execSync('vercel --version', { stdio: 'pipe' })
    } catch (error) {
      this.log('Vercel CLI not found. Installing...', 'warning')
      await this.runCommand('npm install -g vercel', 'Installing Vercel CLI')
    }
    
    // Deploy to production
    const success = await this.runCommand('vercel --prod --yes', 'Deploying to Vercel')
    if (!success) {
      this.log('Deployment to Vercel failed', 'error')
      return false
    }
    
    return true
  }

  async postDeploymentValidation() {
    this.log('Running post-deployment validation...')
    
    // Wait a bit for deployment to be ready
    this.log('Waiting for deployment to be ready...')
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    // You would typically get the deployment URL from Vercel CLI output
    // For now, we'll just log that manual validation is needed
    this.log('Please manually validate the deployment:', 'warning')
    this.log('1. Check that the application loads correctly', 'warning')
    this.log('2. Test authentication functionality', 'warning')
    this.log('3. Verify API endpoints are working', 'warning')
    this.log('4. Check performance metrics', 'warning')
    
    return true
  }

  async createDeploymentReport() {
    const endTime = Date.now()
    const duration = Math.round((endTime - this.startTime) / 1000)
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: 'production',
      steps: [
        'Pre-deployment checks',
        'Test suite',
        'System validation',
        'Application build',
        'Bundle optimization',
        'Vercel deployment',
        'Post-deployment validation'
      ]
    }
    
    const reportPath = path.join(process.cwd(), 'deployment-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    this.log(`Deployment report saved to: ${reportPath}`)
    this.log(`Total deployment time: ${duration}s`)
  }

  async deploy() {
    this.log('Starting production deployment process...')
    this.log('='.repeat(60))
    
    try {
      // Pre-deployment checks
      const checksPass = await this.preDeploymentChecks()
      if (!checksPass) {
        process.exit(1)
      }
      
      // Run tests
      const testsPass = await this.runTests()
      if (!testsPass) {
        process.exit(1)
      }
      
      // Validate system
      const validationPass = await this.validateSystem()
      if (!validationPass) {
        this.log('System validation failed. Continuing with warnings...', 'warning')
      }
      
      // Build application
      const buildPass = await this.buildApplication()
      if (!buildPass) {
        process.exit(1)
      }
      
      // Optimize bundle
      const optimizePass = await this.optimizeBundle()
      if (!optimizePass) {
        this.log('Bundle optimization failed. Continuing...', 'warning')
      }
      
      // Deploy to Vercel
      const deployPass = await this.deployToVercel()
      if (!deployPass) {
        process.exit(1)
      }
      
      // Post-deployment validation
      await this.postDeploymentValidation()
      
      // Create deployment report
      await this.createDeploymentReport()
      
      this.log('='.repeat(60))
      this.log('🎉 Production deployment completed successfully!')
      this.log('Next steps:')
      this.log('1. Monitor application performance')
      this.log('2. Check error logs')
      this.log('3. Validate all features are working')
      this.log('4. Update documentation if needed')
      
    } catch (error) {
      this.log(`Deployment failed: ${error.message}`, 'error')
      process.exit(1)
    }
  }
}

// Run deployment if called directly
if (require.main === module) {
  const deployer = new ProductionDeployer()
  deployer.deploy()
}

module.exports = ProductionDeployer