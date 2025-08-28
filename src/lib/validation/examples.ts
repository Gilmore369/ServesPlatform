// Examples of how to use the validation system
import { validateRecord, validateBatch, dataValidator } from './index';

/**
 * Example 1: Validate a single material record
 */
export async function validateMaterialExample() {
  const materialData = {
    id: 'mat-001',
    sku: 'MAT-001',
    descripcion: 'Tornillo hexagonal M8x20',
    categoria: 'Ferretería',
    unidad: 'pcs',
    costo_ref: 0.50,
    stock_actual: 1000,
    stock_minimo: 100,
    proveedor_principal: 'Proveedor ABC',
    ubicacion_almacen: 'A-01-05',
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const result = await validateRecord('Materiales', materialData, 'create');
  
  if (result.isValid) {
    console.log('✅ Material is valid');
  } else {
    console.log('❌ Material validation failed:');
    result.errors.forEach(error => {
      console.log(`  - ${error.field}: ${error.message}`);
    });
  }

  return result;
}

/**
 * Example 2: Validate a project with relationships
 */
export async function validateProjectExample() {
  const projectData = {
    id: 'proj-001',
    codigo: 'PRJ-2024-001',
    nombre: 'Implementación Sistema ERP',
    cliente_id: 'client-001',
    responsable_id: 'user-001',
    ubicacion: 'Lima, Perú',
    descripcion: 'Implementación completa del sistema ERP para gestión empresarial',
    linea_servicio: 'Consultoría TI',
    sla_objetivo: 720, // 30 days * 24 hours
    inicio_plan: '2024-02-01',
    fin_plan: '2024-08-31',
    presupuesto_total: 50000,
    moneda: 'PEN',
    estado: 'Planificación',
    avance_pct: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const result = await validateRecord('Proyectos', projectData, 'create');
  
  if (result.isValid) {
    console.log('✅ Project is valid');
    if (result.warnings && result.warnings.length > 0) {
      console.log('⚠️ Warnings:');
      result.warnings.forEach(warning => {
        console.log(`  - ${warning.field}: ${warning.message}`);
      });
    }
  } else {
    console.log('❌ Project validation failed:');
    result.errors.forEach(error => {
      console.log(`  - ${error.field}: ${error.message} (${error.type})`);
    });
  }

  return result;
}

/**
 * Example 3: Batch validation of multiple records
 */
export async function validateBatchExample() {
  const materials = [
    {
      id: 'mat-001',
      sku: 'MAT-001',
      descripcion: 'Material válido',
      categoria: 'Categoría A',
      unidad: 'pcs',
      costo_ref: 10,
      stock_actual: 100,
      stock_minimo: 10,
      activo: true
    },
    {
      id: 'mat-002',
      // Missing required SKU - will fail validation
      descripcion: 'Material inválido',
      categoria: 'Categoría B',
      unidad: 'pcs',
      costo_ref: 20,
      stock_actual: 50,
      stock_minimo: 5,
      activo: true
    },
    {
      id: 'mat-003',
      sku: 'MAT-003',
      descripcion: 'Otro material válido',
      categoria: 'Categoría C',
      unidad: 'kg',
      costo_ref: 15,
      stock_actual: 75,
      stock_minimo: 15,
      activo: true
    }
  ];

  const result = await validateBatch('Materiales', materials, 'create');
  
  console.log('📊 Batch Validation Results:');
  console.log(`  Total records: ${result.summary.totalRecords}`);
  console.log(`  Valid records: ${result.summary.validRecords}`);
  console.log(`  Invalid records: ${result.summary.invalidRecords}`);
  console.log(`  Total errors: ${result.summary.totalErrors}`);
  
  if (!result.isValid) {
    console.log('\n❌ Invalid records:');
    result.results.forEach((recordResult, index) => {
      if (!recordResult.isValid) {
        console.log(`  Record ${index + 1}:`);
        recordResult.errors.forEach(error => {
          console.log(`    - ${error.field}: ${error.message}`);
        });
      }
    });
  }

  return result;
}

/**
 * Example 4: Validate time entry with business rules
 */
export async function validateTimeEntryExample() {
  const timeEntryData = {
    id: 'time-001',
    colaborador_id: 'person-001',
    proyecto_id: 'proj-001',
    actividad_id: 'act-001',
    fecha: new Date().toISOString().split('T')[0], // Today
    horas_trabajadas: 8,
    descripcion: 'Desarrollo de módulo de usuarios',
    aprobado: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const result = await validateRecord('RegistroHoras', timeEntryData, 'create');
  
  if (result.isValid) {
    console.log('✅ Time entry is valid');
  } else {
    console.log('❌ Time entry validation failed:');
    result.errors.forEach(error => {
      console.log(`  - ${error.field}: ${error.message} (${error.type})`);
    });
  }

  return result;
}

/**
 * Example 5: Handle validation errors in API endpoints
 */
export async function apiValidationExample(requestData: any, tableName: string) {
  try {
    const validationResult = await dataValidator.validateRecord(
      tableName, 
      requestData, 
      { operation: 'create' }
    );

    if (!validationResult.isValid) {
      // Return validation errors to client
      return {
        success: false,
        errors: validationResult.errors.map(error => ({
          field: error.field,
          message: error.message,
          type: error.type
        })),
        warnings: validationResult.warnings
      };
    }

    // Proceed with data processing
    console.log('✅ Data is valid, proceeding with operation...');
    
    return {
      success: true,
      data: requestData,
      warnings: validationResult.warnings
    };

  } catch (error) {
    console.error('Validation system error:', error);
    return {
      success: false,
      errors: [{
        field: 'system',
        message: 'Internal validation error',
        type: 'validation'
      }]
    };
  }
}

/**
 * Example 6: Clear validation cache when needed
 */
export function clearValidationCacheExample() {
  // Clear cache when data might have changed
  dataValidator.clearCache();
  
  // Get cache statistics
  const stats = dataValidator.getCacheStats();
  console.log('Cache cleared. Current stats:', stats);
}