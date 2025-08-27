#!/usr/bin/env node

/**
 * System Validation Script for Production Deployment
 * Validates that all required components are properly configured
 */

const fs = require('fs')
const path = require('path')

class SystemValidator {
  constructor() {
    this.errors = []
    this.warnings = []
    this.checks = []
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅'
    console.log(`${prefix} [${timestamp}] ${message}`)
  }

  error(message) {
    this.errors.push(message)
    this.log(message, 'error')
  }

  warning(message) {
    this.warnings.push(message)
    this.log(message, 'warning')
  }

  success(message) {
    this.log(message, 'success')
  }

  checkFileExists(filePath, required = true) {
    const fullPath = path.join(process.cwd(), filePath)
    const exists = fs.existsSync(fullPath)
    
    if (!exists && required) {
      this.error(`Required file missing: ${filePath}`)
    } else if (!exists) {
      this.warning(`Optional file missing: ${filePath}`)
    } else {
      this.success(`File exists: ${filePath}`)
    }
    
    return exists
  }

  checkEnvironmentVariables() {
    this.log('Checking environment variables...')
    
    const requiredEnvVars = [
      'NEXT_PUBLIC_API_BASE_URL',
      'NEXT_PUBLIC_API_TOKEN',
      'NEXT_PUBLIC_APP_NAME'
    ]
    
    const optionalEnvVars = [
      'NEXT_PUBLIC_APP_VERSION',
      'NEXT_PUBLIC_ENVIRONMENT',
      'NEXT_PUBLIC_ENABLE_ANALYTICS',
      'NEXT_PUBLIC_ENABLE_ERROR_MONITORING',
      'NEXT_PUBLIC_LOG_LEVEL'
    ]
    
    // Check required variables
    requiredEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        this.error(`Required environment variable missing: ${varName}`)
      } else {
        this.success(`Environment variable set: ${varName}`)
      }
    })
    
    // Check optional variables
    optionalEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        this.warning(`Optional environment variable not set: ${varName}`)
      } else {
        this.success(`Environment variable set: ${varName}`)
      }
    })
  }

  checkRequiredFiles() {
    this.log('Checking required files...')
    
    const requiredFiles = [
      'package.json',
      'next.config.ts',
      'tailwind.config.js',
      'tsconfig.json',
      'src/app/layout.tsx',
      'src/app/dashboard/page.tsx',
      'src/lib/apiClient.ts',
      'src/lib/auth.tsx',
      'src/lib/logger.ts',
      'src/lib/monitoring.ts',
      'src/app/api/health/route.ts'
    ]
    
    requiredFiles.forEach(file => {
      this.checkFileExists(file, true)
    })
  }

  checkOptionalFiles() {
    this.log('Checking optional files...')
    
    const optionalFiles = [
      '.env.production',
      '.env.local',
      'PRODUCTION_DEPLOYMENT.md',
      'PRODUCTION_CHECKLIST.md',
      'README.md'
    ]
    
    optionalFiles.forEach(file => {
      this.checkFileExists(file, false)
    })
  }

  checkPackageJson() {
    this.log('Validating package.json...')
    
    try {
      const packagePath = path.join(process.cwd(), 'package.json')
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
      
      // Check required scripts
      const requiredScripts = [
        'build',
        'start',
        'test',
        'lint',
        'type-check'
      ]
      
      requiredScripts.forEach(script => {
        if (!packageJson.scripts || !packageJson.scripts[script]) {
          this.error(`Required npm script missing: ${script}`)
        } else {
          this.success(`npm script exists: ${script}`)
        }
      })
      
      // Check for production dependencies
      const requiredDeps = ['next', 'react', 'react-dom']
      requiredDeps.forEach(dep => {
        if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
          this.error(`Required dependency missing: ${dep}`)
        } else {
          this.success(`Dependency exists: ${dep}`)
        }
      })
      
    } catch (error) {
      this.error(`Failed to read package.json: ${error.message}`)
    }
  }

  checkNextConfig() {
    this.log('Validating Next.js configuration...')
    
    try {
      const configPath = path.join(process.cwd(), 'next.config.ts')
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8')
        
        // Check for production optimizations
        const optimizations = [
          'compress: true',
          'poweredByHeader: false',
          'headers()',
          'experimental'
        ]
        
        optimizations.forEach(opt => {
          if (configContent.includes(opt)) {
            this.success(`Next.js optimization enabled: ${opt}`)
          } else {
            this.warning(`Next.js optimization not found: ${opt}`)
          }
        })
      }
    } catch (error) {
      this.error(`Failed to read next.config.ts: ${error.message}`)
    }
  }

  checkTypeScriptConfig() {
    this.log('Validating TypeScript configuration...')
    
    try {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json')
      if (fs.existsSync(tsconfigPath)) {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
        
        // Check for strict mode
        if (tsconfig.compilerOptions && tsconfig.compilerOptions.strict) {
          this.success('TypeScript strict mode enabled')
        } else {
          this.warning('TypeScript strict mode not enabled')
        }
        
        // Check for proper module resolution
        if (tsconfig.compilerOptions && tsconfig.compilerOptions.moduleResolution === 'node') {
          this.success('TypeScript module resolution configured')
        } else {
          this.warning('TypeScript module resolution not optimally configured')
        }
      }
    } catch (error) {
      this.error(`Failed to read tsconfig.json: ${error.message}`)
    }
  }

  checkSecurityConfiguration() {
    this.log('Checking security configuration...')
    
    // Check for .env files in .gitignore
    const gitignorePath = path.join(process.cwd(), '.gitignore')
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8')
      
      if (gitignoreContent.includes('.env')) {
        this.success('Environment files properly ignored in git')
      } else {
        this.error('Environment files not properly ignored in git')
      }
    } else {
      this.warning('.gitignore file not found')
    }
    
    // Check for sensitive data in environment variables
    const sensitivePatterns = ['password', 'secret', 'key', 'token']
    Object.keys(process.env).forEach(key => {
      if (sensitivePatterns.some(pattern => key.toLowerCase().includes(pattern))) {
        if (process.env[key] && process.env[key].length > 0) {
          this.success(`Sensitive environment variable configured: ${key}`)
        } else {
          this.warning(`Sensitive environment variable empty: ${key}`)
        }
      }
    })
  }

  checkBuildOutput() {
    this.log('Checking build output...')
    
    const buildDir = path.join(process.cwd(), '.next')
    if (fs.existsSync(buildDir)) {
      this.success('Build output directory exists')
      
      // Check for static files
      const staticDir = path.join(buildDir, 'static')
      if (fs.existsSync(staticDir)) {
        this.success('Static assets generated')
      } else {
        this.warning('Static assets directory not found')
      }
    } else {
      this.warning('Build output not found - run npm run build first')
    }
  }

  async runAllChecks() {
    this.log('Starting system validation...', 'info')
    this.log('='.repeat(50), 'info')
    
    this.checkEnvironmentVariables()
    this.checkRequiredFiles()
    this.checkOptionalFiles()
    this.checkPackageJson()
    this.checkNextConfig()
    this.checkTypeScriptConfig()
    this.checkSecurityConfiguration()
    this.checkBuildOutput()
    
    this.log('='.repeat(50), 'info')
    this.log('Validation complete!', 'info')
    
    // Summary
    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('✅ All checks passed! System is ready for production.', 'success')
      return true
    } else {
      if (this.errors.length > 0) {
        this.log(`❌ ${this.errors.length} error(s) found:`, 'error')
        this.errors.forEach(error => this.log(`  - ${error}`, 'error'))
      }
      
      if (this.warnings.length > 0) {
        this.log(`⚠️  ${this.warnings.length} warning(s) found:`, 'warning')
        this.warnings.forEach(warning => this.log(`  - ${warning}`, 'warning'))
      }
      
      if (this.errors.length > 0) {
        this.log('❌ System validation failed. Please fix errors before deploying.', 'error')
        return false
      } else {
        this.log('⚠️  System validation passed with warnings. Review before deploying.', 'warning')
        return true
      }
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new SystemValidator()
  validator.runAllChecks().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('Validation failed:', error)
    process.exit(1)
  })
}

module.exports = SystemValidator