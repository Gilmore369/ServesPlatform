#!/usr/bin/env node

/**
 * Bundle Optimization Script
 * Analyzes and optimizes the production bundle
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class BundleOptimizer {
  constructor() {
    this.buildDir = path.join(process.cwd(), '.next')
    this.staticDir = path.join(this.buildDir, 'static')
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅'
    console.log(`${prefix} [${timestamp}] ${message}`)
  }

  async analyzeBundleSize() {
    this.log('Analyzing bundle size...')
    
    try {
      // Run bundle analyzer
      this.log('Running bundle analyzer...')
      execSync('npm run build:analyze', { stdio: 'inherit' })
      
      // Check for large chunks
      if (fs.existsSync(this.staticDir)) {
        const chunks = fs.readdirSync(path.join(this.staticDir, 'chunks'))
          .filter(file => file.endsWith('.js'))
          .map(file => {
            const filePath = path.join(this.staticDir, 'chunks', file)
            const stats = fs.statSync(filePath)
            return {
              name: file,
              size: stats.size,
              sizeKB: Math.round(stats.size / 1024)
            }
          })
          .sort((a, b) => b.size - a.size)
        
        this.log('Largest JavaScript chunks:')
        chunks.slice(0, 10).forEach(chunk => {
          const status = chunk.sizeKB > 500 ? 'warning' : 'info'
          this.log(`  ${chunk.name}: ${chunk.sizeKB}KB`, status)
        })
        
        // Check for oversized chunks
        const oversizedChunks = chunks.filter(chunk => chunk.sizeKB > 1000)
        if (oversizedChunks.length > 0) {
          this.log(`Found ${oversizedChunks.length} chunks larger than 1MB`, 'warning')
          oversizedChunks.forEach(chunk => {
            this.log(`  Consider code splitting: ${chunk.name} (${chunk.sizeKB}KB)`, 'warning')
          })
        }
      }
    } catch (error) {
      this.log(`Bundle analysis failed: ${error.message}`, 'error')
    }
  }

  checkDuplicateDependencies() {
    this.log('Checking for duplicate dependencies...')
    
    try {
      const packageLockPath = path.join(process.cwd(), 'package-lock.json')
      if (fs.existsSync(packageLockPath)) {
        const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'))
        
        // Simple check for multiple versions of the same package
        const dependencies = packageLock.dependencies || {}
        const packageVersions = {}
        
        Object.keys(dependencies).forEach(pkg => {
          const baseName = pkg.split('@')[0]
          if (!packageVersions[baseName]) {
            packageVersions[baseName] = []
          }
          packageVersions[baseName].push(dependencies[pkg].version)
        })
        
        Object.keys(packageVersions).forEach(pkg => {
          const versions = [...new Set(packageVersions[pkg])]
          if (versions.length > 1) {
            this.log(`Multiple versions of ${pkg}: ${versions.join(', ')}`, 'warning')
          }
        })
      }
    } catch (error) {
      this.log(`Dependency check failed: ${error.message}`, 'error')
    }
  }

  optimizeImages() {
    this.log('Checking image optimization...')
    
    const publicDir = path.join(process.cwd(), 'public')
    if (fs.existsSync(publicDir)) {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp']
      
      const findImages = (dir) => {
        const files = []
        const items = fs.readdirSync(dir)
        
        items.forEach(item => {
          const fullPath = path.join(dir, item)
          const stat = fs.statSync(fullPath)
          
          if (stat.isDirectory()) {
            files.push(...findImages(fullPath))
          } else if (imageExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
            files.push({
              path: fullPath,
              name: item,
              size: stat.size,
              sizeKB: Math.round(stat.size / 1024)
            })
          }
        })
        
        return files
      }
      
      const images = findImages(publicDir)
      
      if (images.length > 0) {
        this.log(`Found ${images.length} images in public directory`)
        
        const largeImages = images.filter(img => img.sizeKB > 500)
        if (largeImages.length > 0) {
          this.log(`Found ${largeImages.length} large images (>500KB):`, 'warning')
          largeImages.forEach(img => {
            this.log(`  ${img.name}: ${img.sizeKB}KB`, 'warning')
          })
          this.log('Consider optimizing these images or using Next.js Image component', 'warning')
        }
        
        // Check for non-optimized formats
        const nonOptimized = images.filter(img => 
          img.name.toLowerCase().endsWith('.jpg') || 
          img.name.toLowerCase().endsWith('.png')
        )
        
        if (nonOptimized.length > 0) {
          this.log(`Consider converting ${nonOptimized.length} images to WebP format`, 'info')
        }
      }
    }
  }

  checkUnusedDependencies() {
    this.log('Checking for unused dependencies...')
    
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json')
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      
      const dependencies = Object.keys(packageJson.dependencies || {})
      const devDependencies = Object.keys(packageJson.devDependencies || {})
      
      // Simple check - look for imports in source files
      const srcDir = path.join(process.cwd(), 'src')
      if (fs.existsSync(srcDir)) {
        const sourceFiles = this.findSourceFiles(srcDir)
        const sourceContent = sourceFiles
          .map(file => fs.readFileSync(file, 'utf8'))
          .join('\n')
        
        const unusedDeps = dependencies.filter(dep => {
          // Skip Next.js and React core packages
          if (['next', 'react', 'react-dom'].includes(dep)) return false
          
          // Check if dependency is imported
          const importPatterns = [
            `from '${dep}'`,
            `from "${dep}"`,
            `require('${dep}')`,
            `require("${dep}")`,
            `import('${dep}')`,
            `import("${dep}")`
          ]
          
          return !importPatterns.some(pattern => sourceContent.includes(pattern))
        })
        
        if (unusedDeps.length > 0) {
          this.log(`Potentially unused dependencies found:`, 'warning')
          unusedDeps.forEach(dep => {
            this.log(`  ${dep}`, 'warning')
          })
          this.log('Review these dependencies and remove if not needed', 'warning')
        } else {
          this.log('No obviously unused dependencies found')
        }
      }
    } catch (error) {
      this.log(`Unused dependency check failed: ${error.message}`, 'error')
    }
  }

  findSourceFiles(dir) {
    const files = []
    const items = fs.readdirSync(dir)
    
    items.forEach(item => {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory() && !item.startsWith('.')) {
        files.push(...this.findSourceFiles(fullPath))
      } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx')) {
        files.push(fullPath)
      }
    })
    
    return files
  }

  generateOptimizationReport() {
    this.log('Generating optimization recommendations...')
    
    const recommendations = [
      '📦 Bundle Optimization Recommendations:',
      '',
      '1. Code Splitting:',
      '   - Use dynamic imports for heavy components',
      '   - Implement route-based code splitting',
      '   - Split vendor bundles appropriately',
      '',
      '2. Image Optimization:',
      '   - Use Next.js Image component for automatic optimization',
      '   - Convert images to WebP format when possible',
      '   - Implement lazy loading for images',
      '',
      '3. Dependency Management:',
      '   - Remove unused dependencies',
      '   - Use tree-shaking friendly imports',
      '   - Consider lighter alternatives for heavy libraries',
      '',
      '4. Performance Monitoring:',
      '   - Monitor Core Web Vitals in production',
      '   - Set up performance budgets',
      '   - Use performance profiling tools',
      '',
      '5. Caching Strategy:',
      '   - Implement proper cache headers',
      '   - Use CDN for static assets',
      '   - Enable compression (gzip/brotli)',
      ''
    ]
    
    recommendations.forEach(line => this.log(line, 'info'))
  }

  async runOptimization() {
    this.log('Starting bundle optimization analysis...', 'info')
    this.log('='.repeat(60), 'info')
    
    await this.analyzeBundleSize()
    this.checkDuplicateDependencies()
    this.optimizeImages()
    this.checkUnusedDependencies()
    this.generateOptimizationReport()
    
    this.log('='.repeat(60), 'info')
    this.log('Bundle optimization analysis complete!', 'info')
  }
}

// Run optimization if called directly
if (require.main === module) {
  const optimizer = new BundleOptimizer()
  optimizer.runOptimization().catch(error => {
    console.error('Optimization failed:', error)
    process.exit(1)
  })
}

module.exports = BundleOptimizer