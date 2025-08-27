#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * Monitors application performance metrics
 */

const https = require('https')
const http = require('http')

class PerformanceMonitor {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl
    this.metrics = []
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅'
    console.log(`${prefix} [${timestamp}] ${message}`)
  }

  async measureEndpoint(path, expectedStatus = 200) {
    return new Promise((resolve) => {
      const startTime = Date.now()
      const url = `${this.baseUrl}${path}`
      
      const client = url.startsWith('https') ? https : http
      
      const req = client.get(url, (res) => {
        const endTime = Date.now()
        const duration = endTime - startTime
        
        const metric = {
          path,
          status: res.statusCode,
          duration,
          timestamp: new Date().toISOString(),
          success: res.statusCode === expectedStatus
        }
        
        this.metrics.push(metric)
        
        if (metric.success) {
          this.log(`${path}: ${duration}ms (${res.statusCode})`)
        } else {
          this.log(`${path}: ${duration}ms (${res.statusCode}) - Expected ${expectedStatus}`, 'warning')
        }
        
        resolve(metric)
      })
      
      req.on('error', (error) => {
        const endTime = Date.now()
        const duration = endTime - startTime
        
        const metric = {
          path,
          status: 0,
          duration,
          timestamp: new Date().toISOString(),
          success: false,
          error: error.message
        }
        
        this.metrics.push(metric)
        this.log(`${path}: ERROR - ${error.message}`, 'error')
        resolve(metric)
      })
      
      req.setTimeout(10000, () => {
        req.destroy()
        const metric = {
          path,
          status: 0,
          duration: 10000,
          timestamp: new Date().toISOString(),
          success: false,
          error: 'Timeout'
        }
        this.metrics.push(metric)
        this.log(`${path}: TIMEOUT`, 'error')
        resolve(metric)
      })
    })
  }

  async runHealthCheck() {
    this.log('Running health check...')
    await this.measureEndpoint('/api/health')
  }

  async runPerformanceTests() {
    this.log('Running performance tests...')
    
    const endpoints = [
      '/',
      '/dashboard',
      '/api/health'
    ]
    
    for (const endpoint of endpoints) {
      await this.measureEndpoint(endpoint)
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  generateReport() {
    this.log('Performance Report:')
    this.log('='.repeat(50))
    
    const successfulRequests = this.metrics.filter(m => m.success)
    const failedRequests = this.metrics.filter(m => !m.success)
    
    if (successfulRequests.length > 0) {
      const avgDuration = successfulRequests.reduce((sum, m) => sum + m.duration, 0) / successfulRequests.length
      const maxDuration = Math.max(...successfulRequests.map(m => m.duration))
      const minDuration = Math.min(...successfulRequests.map(m => m.duration))
      
      this.log(`Successful requests: ${successfulRequests.length}`)
      this.log(`Average response time: ${Math.round(avgDuration)}ms`)
      this.log(`Min response time: ${minDuration}ms`)
      this.log(`Max response time: ${maxDuration}ms`)
    }
    
    if (failedRequests.length > 0) {
      this.log(`Failed requests: ${failedRequests.length}`, 'error')
      failedRequests.forEach(req => {
        this.log(`  ${req.path}: ${req.error || `Status ${req.status}`}`, 'error')
      })
    }
    
    // Performance thresholds
    const slowRequests = successfulRequests.filter(m => m.duration > 2000)
    if (slowRequests.length > 0) {
      this.log(`Slow requests (>2s): ${slowRequests.length}`, 'warning')
      slowRequests.forEach(req => {
        this.log(`  ${req.path}: ${req.duration}ms`, 'warning')
      })
    }
  }

  async monitor() {
    this.log('Starting performance monitoring...')
    
    await this.runHealthCheck()
    await this.runPerformanceTests()
    this.generateReport()
    
    this.log('Performance monitoring complete!')
  }
}

// Run monitoring if called directly
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3000'
  const monitor = new PerformanceMonitor(baseUrl)
  
  monitor.monitor().catch(error => {
    console.error('Performance monitoring failed:', error)
    process.exit(1)
  })
}

module.exports = PerformanceMonitor