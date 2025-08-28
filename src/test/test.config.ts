/**
 * Test Configuration for Google Sheets Integration Tests
 * 
 * This file contains configuration for different test environments
 * and test data setup utilities.
 */

export interface TestConfig {
  // API Configuration
  apiBaseUrl: string
  apiToken: string
  timeout: number
  retryAttempts: number
  
  // Test Data Configuration
  testDataPrefix: string
  cleanupAfterTests: boolean
  
  // Performance Test Configuration
  performanceThresholds: {
    listOperation: number
    getOperation: number
    createOperation: number
    updateOperation: number
    deleteOperation: number
    batchOperation: number
  }
  
  // Integration Test Configuration
  skipIntegrationTests: boolean
  skipPerformanceTests: boolean
  
  // Coverage Configuration
  coverageThreshold: number
}

// Default test configuration
export const defaultTestConfig: TestConfig = {
  apiBaseUrl: process.env.TEST_GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/test/exec',
  apiToken: process.env.TEST_API_TOKEN || 'test-token',
  timeout: 10000,
  retryAttempts: 2,
  
  testDataPrefix: 'TEST_AUTO_',
  cleanupAfterTests: true,
  
  performanceThresholds: {
    listOperation: 3000,
    getOperation: 2000,
    createOperation: 4000,
    updateOperation: 3000,
    deleteOperation: 2000,
    batchOperation: 10000
  },
  
  skipIntegrationTests: !process.env.TEST_GOOGLE_SHEETS_URL,
  skipPerformanceTests: !process.env.TEST_GOOGLE_SHEETS_URL,
  
  coverageThreshold: 80
}

// Test environment configurations
export const testConfigs = {
  unit: {
    ...defaultTestConfig,
    skipIntegrationTests: true,
    skipPerformanceTests: true
  },
  
  integration: {
    ...defaultTestConfig,
    skipPerformanceTests: true
  },
  
  performance: {
    ...defaultTestConfig,
    timeout: 30000,
    performanceThresholds: {
      listOperation: 5000,
      getOperation: 3000,
      createOperation: 6000,
      updateOperation: 4000,
      deleteOperation: 3000,
      batchOperation: 15000
    }
  },
  
  ci: {
    ...defaultTestConfig,
    timeout: 15000,
    retryAttempts: 3,
    coverageThreshold: 85,
    skipIntegrationTests: !process.env.CI_INTEGRATION_TESTS,
    skipPerformanceTests: true // Usually skip performance tests in CI
  }
}

// Get configuration based on environment
export function getTestConfig(environment?: string): TestConfig {
  const env = environment || process.env.TEST_ENV || 'unit'
  return testConfigs[env as keyof typeof testConfigs] || defaultTestConfig
}

// Test data generators
export const testDataGenerators = {
  material: (suffix: string = '') => ({
    sku: `${defaultTestConfig.testDataPrefix}MAT_${Date.now()}${suffix}`,
    descripcion: `Material de prueba ${suffix}`,
    categoria: 'Herramientas',
    unidad: 'unidad',
    costo_ref: Math.round(Math.random() * 1000 * 100) / 100,
    stock_actual: Math.floor(Math.random() * 100),
    stock_minimo: Math.floor(Math.random() * 10),
    proveedor_principal: `Proveedor Test ${suffix}`,
    ubicacion_almacen: `Almacén ${suffix}`,
    activo: true
  }),
  
  project: (suffix: string = '') => ({
    codigo: `${defaultTestConfig.testDataPrefix}PROJ_${Date.now()}${suffix}`,
    nombre: `Proyecto de prueba ${suffix}`,
    cliente_id: `CLI_TEST_${suffix}`,
    responsable_id: `USR_TEST_${suffix}`,
    ubicacion: 'Lima, Perú',
    descripcion: `Descripción del proyecto de prueba ${suffix}`,
    linea_servicio: 'Consultoría',
    sla_objetivo: 30 + Math.floor(Math.random() * 60),
    inicio_plan: '2024-02-01',
    fin_plan: '2024-12-31',
    presupuesto_total: Math.round(Math.random() * 100000 * 100) / 100,
    moneda: 'PEN',
    estado: 'Planificación',
    avance_pct: 0
  }),
  
  activity: (projectId: string, suffix: string = '') => ({
    proyecto_id: projectId,
    nombre: `Actividad de prueba ${suffix}`,
    descripcion: `Descripción de la actividad ${suffix}`,
    responsable_id: `USR_TEST_${suffix}`,
    fecha_inicio: '2024-02-15',
    fecha_fin: '2024-03-15',
    horas_estimadas: 20 + Math.floor(Math.random() * 80),
    horas_reales: 0,
    estado: 'Pendiente',
    prioridad: ['Baja', 'Media', 'Alta'][Math.floor(Math.random() * 3)],
    avance_pct: 0
  }),
  
  user: (suffix: string = '') => ({
    codigo: `${defaultTestConfig.testDataPrefix}USR_${Date.now()}${suffix}`,
    nombre: `Usuario Test ${suffix}`,
    email: `test${suffix}@example.com`,
    rol: 'Técnico',
    activo: true,
    disponible: true,
    telefono: `+51${Math.floor(Math.random() * 900000000) + 100000000}`,
    especialidad: 'General'
  })
}

// Test utilities
export const testUtils = {
  // Generate unique test identifier
  generateTestId: (prefix: string = 'TEST') => 
    `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  // Wait for a specified time
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Retry a function with exponential backoff
  retry: async <T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxAttempts) {
          throw lastError
        }
        
        await testUtils.wait(delay * Math.pow(2, attempt - 1))
      }
    }
    
    throw lastError!
  },
  
  // Validate test environment
  validateTestEnvironment: (): { valid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (!process.env.TEST_GOOGLE_SHEETS_URL && !defaultTestConfig.skipIntegrationTests) {
      errors.push('TEST_GOOGLE_SHEETS_URL is required for integration tests')
    }
    
    if (!process.env.TEST_API_TOKEN && !defaultTestConfig.skipIntegrationTests) {
      errors.push('TEST_API_TOKEN is required for integration tests')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  },
  
  // Clean up test data by prefix
  cleanupTestData: async (apiService: any, tables: string[] = ['Materiales', 'Proyectos', 'Actividades', 'Usuarios']) => {
    const cleanupPromises = tables.map(async (table) => {
      try {
        // List all records
        const response = await apiService.executeOperation({
          table,
          operation: 'list',
          pagination: { page: 1, limit: 1000 }
        })
        
        if (response.ok && Array.isArray(response.data)) {
          // Filter test records by prefix
          const testRecords = response.data.filter((record: any) => 
            record.sku?.startsWith?.(defaultTestConfig.testDataPrefix) ||
            record.codigo?.startsWith?.(defaultTestConfig.testDataPrefix) ||
            record.nombre?.includes?.('prueba') ||
            record.descripcion?.includes?.('prueba')
          )
          
          // Delete test records
          const deletePromises = testRecords.map((record: any) =>
            apiService.executeOperation({
              table,
              operation: 'delete',
              id: record.id
            }).catch((error: any) => {
              console.warn(`Failed to cleanup test record ${record.id}:`, error)
            })
          )
          
          await Promise.all(deletePromises)
          console.log(`Cleaned up ${testRecords.length} test records from ${table}`)
        }
      } catch (error) {
        console.warn(`Failed to cleanup test data from ${table}:`, error)
      }
    })
    
    await Promise.all(cleanupPromises)
  }
}

// Export test configuration based on current environment
export const currentTestConfig = getTestConfig()