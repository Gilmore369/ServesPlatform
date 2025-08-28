import { describe, it, expect, beforeEach } from 'vitest'
import { DataValidator, ValidationResult } from '@/lib/validation/validator'
import { MaterialSchema, ProyectoSchema, ActividadSchema } from '@/lib/validation/schemas'
import { BusinessRulesValidator } from '@/lib/validation/business-rules'

describe('DataValidator', () => {
  let validator: DataValidator

  beforeEach(() => {
    validator = new DataValidator()
  })

  describe('Material Validation', () => {
    it('should validate valid material data', () => {
      const validMaterial = {
        sku: 'MAT-001',
        descripcion: 'Material de prueba',
        categoria: 'Herramientas',
        unidad: 'unidad',
        costo_ref: 100.50,
        stock_actual: 10,
        stock_minimo: 5,
        proveedor_principal: 'Proveedor Test',
        activo: true
      }

      const result = validator.validateRecord('Materiales', validMaterial)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject material with missing required fields', () => {
      const invalidMaterial = {
        descripcion: 'Material sin SKU',
        categoria: 'Herramientas'
        // Missing required fields: sku, unidad, costo_ref, etc.
      }

      const result = validator.validateRecord('Materiales', invalidMaterial)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.field === 'sku')).toBe(true)
      expect(result.errors.some(e => e.field === 'unidad')).toBe(true)
    })

    it('should reject material with invalid data types', () => {
      const invalidMaterial = {
        sku: 'MAT-001',
        descripcion: 'Material de prueba',
        categoria: 'Herramientas',
        unidad: 'unidad',
        costo_ref: 'invalid_number', // Should be number
        stock_actual: -5, // Should be non-negative
        stock_minimo: 5,
        proveedor_principal: 'Proveedor Test',
        activo: 'yes' // Should be boolean
      }

      const result = validator.validateRecord('Materiales', invalidMaterial)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'costo_ref')).toBe(true)
      expect(result.errors.some(e => e.field === 'stock_actual')).toBe(true)
      expect(result.errors.some(e => e.field === 'activo')).toBe(true)
    })

    it('should validate SKU format', () => {
      const invalidSKU = {
        sku: 'invalid-sku-format-too-long-and-invalid',
        descripcion: 'Material de prueba',
        categoria: 'Herramientas',
        unidad: 'unidad',
        costo_ref: 100.50,
        stock_actual: 10,
        stock_minimo: 5,
        proveedor_principal: 'Proveedor Test',
        activo: true
      }

      const result = validator.validateRecord('Materiales', invalidSKU)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'sku' && e.message.includes('formato'))).toBe(true)
    })
  })

  describe('Proyecto Validation', () => {
    it('should validate valid project data', () => {
      const validProject = {
        codigo: 'PROJ-001',
        nombre: 'Proyecto de prueba',
        cliente_id: 'CLI-001',
        responsable_id: 'USR-001',
        ubicacion: 'Lima, Perú',
        descripcion: 'Descripción del proyecto',
        linea_servicio: 'Consultoría',
        sla_objetivo: 30,
        inicio_plan: '2024-01-01',
        fin_plan: '2024-12-31',
        presupuesto_total: 50000.00,
        moneda: 'PEN',
        estado: 'Planificación',
        avance_pct: 0
      }

      const result = validator.validateRecord('Proyectos', validProject)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject project with invalid date range', () => {
      const invalidProject = {
        codigo: 'PROJ-001',
        nombre: 'Proyecto de prueba',
        cliente_id: 'CLI-001',
        responsable_id: 'USR-001',
        ubicacion: 'Lima, Perú',
        descripcion: 'Descripción del proyecto',
        linea_servicio: 'Consultoría',
        sla_objetivo: 30,
        inicio_plan: '2024-12-31', // End date before start date
        fin_plan: '2024-01-01',
        presupuesto_total: 50000.00,
        moneda: 'PEN',
        estado: 'Planificación',
        avance_pct: 0
      }

      const result = validator.validateRecord('Proyectos', invalidProject)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('fecha de fin debe ser posterior'))).toBe(true)
    })

    it('should reject project with invalid currency', () => {
      const invalidProject = {
        codigo: 'PROJ-001',
        nombre: 'Proyecto de prueba',
        cliente_id: 'CLI-001',
        responsable_id: 'USR-001',
        ubicacion: 'Lima, Perú',
        descripcion: 'Descripción del proyecto',
        linea_servicio: 'Consultoría',
        sla_objetivo: 30,
        inicio_plan: '2024-01-01',
        fin_plan: '2024-12-31',
        presupuesto_total: 50000.00,
        moneda: 'EUR', // Invalid currency
        estado: 'Planificación',
        avance_pct: 0
      }

      const result = validator.validateRecord('Proyectos', invalidProject)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'moneda')).toBe(true)
    })

    it('should reject project with invalid progress percentage', () => {
      const invalidProject = {
        codigo: 'PROJ-001',
        nombre: 'Proyecto de prueba',
        cliente_id: 'CLI-001',
        responsable_id: 'USR-001',
        ubicacion: 'Lima, Perú',
        descripcion: 'Descripción del proyecto',
        linea_servicio: 'Consultoría',
        sla_objetivo: 30,
        inicio_plan: '2024-01-01',
        fin_plan: '2024-12-31',
        presupuesto_total: 50000.00,
        moneda: 'PEN',
        estado: 'Planificación',
        avance_pct: 150 // Invalid percentage > 100
      }

      const result = validator.validateRecord('Proyectos', invalidProject)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'avance_pct')).toBe(true)
    })
  })

  describe('Actividad Validation', () => {
    it('should validate valid activity data', () => {
      const validActivity = {
        proyecto_id: 'PROJ-001',
        nombre: 'Actividad de prueba',
        descripcion: 'Descripción de la actividad',
        responsable_id: 'USR-001',
        fecha_inicio: '2024-01-15',
        fecha_fin: '2024-01-30',
        horas_estimadas: 40,
        horas_reales: 0,
        estado: 'Pendiente',
        prioridad: 'Media',
        avance_pct: 0
      }

      const result = validator.validateRecord('Actividades', validActivity)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject activity with negative hours', () => {
      const invalidActivity = {
        proyecto_id: 'PROJ-001',
        nombre: 'Actividad de prueba',
        descripcion: 'Descripción de la actividad',
        responsable_id: 'USR-001',
        fecha_inicio: '2024-01-15',
        fecha_fin: '2024-01-30',
        horas_estimadas: -10, // Invalid negative hours
        horas_reales: -5, // Invalid negative hours
        estado: 'Pendiente',
        prioridad: 'Media',
        avance_pct: 0
      }

      const result = validator.validateRecord('Actividades', invalidActivity)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'horas_estimadas')).toBe(true)
      expect(result.errors.some(e => e.field === 'horas_reales')).toBe(true)
    })

    it('should reject activity with invalid priority', () => {
      const invalidActivity = {
        proyecto_id: 'PROJ-001',
        nombre: 'Actividad de prueba',
        descripcion: 'Descripción de la actividad',
        responsable_id: 'USR-001',
        fecha_inicio: '2024-01-15',
        fecha_fin: '2024-01-30',
        horas_estimadas: 40,
        horas_reales: 0,
        estado: 'Pendiente',
        prioridad: 'Urgentísima', // Invalid priority
        avance_pct: 0
      }

      const result = validator.validateRecord('Actividades', invalidActivity)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'prioridad')).toBe(true)
    })
  })

  describe('Batch Validation', () => {
    it('should validate multiple records', () => {
      const materials = [
        {
          sku: 'MAT-001',
          descripcion: 'Material 1',
          categoria: 'Herramientas',
          unidad: 'unidad',
          costo_ref: 100,
          stock_actual: 10,
          stock_minimo: 5,
          proveedor_principal: 'Proveedor 1',
          activo: true
        },
        {
          sku: 'MAT-002',
          descripcion: 'Material 2',
          categoria: 'Herramientas',
          unidad: 'unidad',
          costo_ref: 200,
          stock_actual: 20,
          stock_minimo: 10,
          proveedor_principal: 'Proveedor 2',
          activo: true
        },
        {
          // Invalid material - missing required fields
          descripcion: 'Material inválido'
        }
      ]

      const results = validator.validateBatch('Materiales', materials)

      expect(results).toHaveLength(3)
      expect(results[0].isValid).toBe(true)
      expect(results[1].isValid).toBe(true)
      expect(results[2].isValid).toBe(false)
    })
  })
})

describe('BusinessRulesValidator', () => {
  let businessValidator: BusinessRulesValidator

  beforeEach(() => {
    businessValidator = new BusinessRulesValidator()
  })

  describe('Stock Validation', () => {
    it('should validate sufficient stock for material consumption', () => {
      const material = {
        id: 'MAT-001',
        stock_actual: 100,
        stock_minimo: 10
      }

      const isValid = businessValidator.validateStockSufficiency(material, 50)
      expect(isValid).toBe(true)
    })

    it('should reject insufficient stock', () => {
      const material = {
        id: 'MAT-001',
        stock_actual: 5,
        stock_minimo: 10
      }

      const isValid = businessValidator.validateStockSufficiency(material, 50)
      expect(isValid).toBe(false)
    })

    it('should warn when stock falls below minimum', () => {
      const material = {
        id: 'MAT-001',
        stock_actual: 15,
        stock_minimo: 10
      }

      const warning = businessValidator.checkStockWarning(material, 10)
      expect(warning).toBeTruthy()
      expect(warning?.type).toBe('low_stock')
    })
  })

  describe('Project Assignment Validation', () => {
    it('should validate user availability for project assignment', () => {
      const user = {
        id: 'USR-001',
        activo: true,
        disponible: true
      }

      const project = {
        id: 'PROJ-001',
        estado: 'En progreso',
        inicio_plan: '2024-01-01',
        fin_plan: '2024-12-31'
      }

      const isValid = businessValidator.validateUserAssignment(user, project)
      expect(isValid).toBe(true)
    })

    it('should reject assignment to inactive user', () => {
      const user = {
        id: 'USR-001',
        activo: false,
        disponible: true
      }

      const project = {
        id: 'PROJ-001',
        estado: 'En progreso',
        inicio_plan: '2024-01-01',
        fin_plan: '2024-12-31'
      }

      const isValid = businessValidator.validateUserAssignment(user, project)
      expect(isValid).toBe(false)
    })

    it('should reject assignment to unavailable user', () => {
      const user = {
        id: 'USR-001',
        activo: true,
        disponible: false
      }

      const project = {
        id: 'PROJ-001',
        estado: 'En progreso',
        inicio_plan: '2024-01-01',
        fin_plan: '2024-12-31'
      }

      const isValid = businessValidator.validateUserAssignment(user, project)
      expect(isValid).toBe(false)
    })
  })

  describe('Activity Dependencies', () => {
    it('should validate activity dependencies', () => {
      const activity = {
        id: 'ACT-002',
        proyecto_id: 'PROJ-001',
        dependencias: ['ACT-001']
      }

      const completedActivities = ['ACT-001']

      const isValid = businessValidator.validateActivityDependencies(activity, completedActivities)
      expect(isValid).toBe(true)
    })

    it('should reject activity with incomplete dependencies', () => {
      const activity = {
        id: 'ACT-003',
        proyecto_id: 'PROJ-001',
        dependencias: ['ACT-001', 'ACT-002']
      }

      const completedActivities = ['ACT-001'] // ACT-002 not completed

      const isValid = businessValidator.validateActivityDependencies(activity, completedActivities)
      expect(isValid).toBe(false)
    })
  })

  describe('Budget Validation', () => {
    it('should validate project budget allocation', () => {
      const project = {
        id: 'PROJ-001',
        presupuesto_total: 100000,
        presupuesto_usado: 75000
      }

      const newExpense = 20000

      const isValid = businessValidator.validateBudgetAllocation(project, newExpense)
      expect(isValid).toBe(false) // Would exceed budget
    })

    it('should allow expense within budget', () => {
      const project = {
        id: 'PROJ-001',
        presupuesto_total: 100000,
        presupuesto_usado: 75000
      }

      const newExpense = 15000

      const isValid = businessValidator.validateBudgetAllocation(project, newExpense)
      expect(isValid).toBe(true)
    })
  })
})