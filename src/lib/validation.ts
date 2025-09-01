/**
 * Data Validation System
 * Provides validation for CRUD operations and business rules
 * Requirements: 4.3
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Common validation patterns
const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  sku: /^[A-Z0-9]{3,20}$/,
  currency: /^\d+(\.\d{1,2})?$/,
  percentage: /^(100|[1-9]?\d)(\.\d{1,2})?$/
};

// Table-specific validation schemas
const VALIDATION_SCHEMAS: Record<string, any> = {
  Materiales: {
    required: ['sku', 'descripcion', 'categoria', 'unidad'],
    fields: {
      sku: { type: 'string', pattern: PATTERNS.sku, maxLength: 20 },
      descripcion: { type: 'string', minLength: 3, maxLength: 200 },
      categoria: { type: 'string', minLength: 2, maxLength: 50 },
      unidad: { type: 'string', minLength: 1, maxLength: 20 },
      costo_ref: { type: 'number', min: 0 },
      stock_actual: { type: 'number', min: 0, integer: true },
      stock_minimo: { type: 'number', min: 0, integer: true },
      proveedor_principal: { type: 'string', maxLength: 100 },
      activo: { type: 'boolean' }
    }
  },
  
  Usuarios: {
    required: ['email', 'nombre', 'rol'],
    fields: {
      email: { type: 'string', pattern: PATTERNS.email, maxLength: 100 },
      nombre: { type: 'string', minLength: 2, maxLength: 100 },
      rol: { type: 'string', enum: ['admin_lider', 'admin', 'editor', 'tecnico'] },
      activo: { type: 'boolean' }
    }
  },
  
  Proyectos: {
    required: ['codigo', 'nombre', 'cliente_id', 'responsable_id'],
    fields: {
      codigo: { type: 'string', minLength: 3, maxLength: 20 },
      nombre: { type: 'string', minLength: 3, maxLength: 200 },
      cliente_id: { type: 'string', minLength: 1 },
      responsable_id: { type: 'string', minLength: 1 },
      ubicacion: { type: 'string', maxLength: 200 },
      descripcion: { type: 'string', maxLength: 1000 },
      linea_servicio: { type: 'string', maxLength: 100 },
      estado: { type: 'string', enum: ['Planificación', 'En progreso', 'Pausado', 'Cerrado'] },
      avance_pct: { type: 'number', min: 0, max: 100 },
      presupuesto_total: { type: 'number', min: 0 },
      moneda: { type: 'string', enum: ['PEN', 'USD'] }
    }
  },
  
  Colaboradores: {
    required: ['nombre', 'email', 'cargo'],
    fields: {
      nombre: { type: 'string', minLength: 2, maxLength: 100 },
      email: { type: 'string', pattern: PATTERNS.email, maxLength: 100 },
      cargo: { type: 'string', minLength: 2, maxLength: 100 },
      telefono: { type: 'string', pattern: PATTERNS.phone, maxLength: 20 },
      activo: { type: 'boolean' }
    }
  },
  
  Clientes: {
    required: ['nombre', 'tipo'],
    fields: {
      nombre: { type: 'string', minLength: 2, maxLength: 200 },
      tipo: { type: 'string', enum: ['Empresa', 'Persona Natural'] },
      ruc_dni: { type: 'string', minLength: 8, maxLength: 11 },
      email: { type: 'string', pattern: PATTERNS.email, maxLength: 100 },
      telefono: { type: 'string', pattern: PATTERNS.phone, maxLength: 20 },
      direccion: { type: 'string', maxLength: 300 },
      activo: { type: 'boolean' }
    }
  }
};

/**
 * Validate a single field value
 */
function validateField(fieldName: string, value: any, fieldSchema: any): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check if field is required and missing
  if (fieldSchema.required && (value === null || value === undefined || value === '')) {
    errors.push({
      field: fieldName,
      message: `${fieldName} is required`,
      code: 'REQUIRED'
    });
    return errors; // Don't validate further if required field is missing
  }
  
  // Skip validation if value is empty and field is not required
  if (value === null || value === undefined || value === '') {
    return errors;
  }
  
  // Type validation
  if (fieldSchema.type) {
    const expectedType = fieldSchema.type;
    const actualType = typeof value;
    
    if (expectedType === 'number' && actualType !== 'number') {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a number`,
        code: 'INVALID_TYPE'
      });
      return errors;
    }
    
    if (expectedType === 'string' && actualType !== 'string') {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a string`,
        code: 'INVALID_TYPE'
      });
      return errors;
    }
    
    if (expectedType === 'boolean' && actualType !== 'boolean') {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a boolean`,
        code: 'INVALID_TYPE'
      });
      return errors;
    }
  }
  
  // String validations
  if (typeof value === 'string') {
    if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${fieldSchema.minLength} characters long`,
        code: 'MIN_LENGTH'
      });
    }
    
    if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be no more than ${fieldSchema.maxLength} characters long`,
        code: 'MAX_LENGTH'
      });
    }
    
    if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} has invalid format`,
        code: 'INVALID_FORMAT'
      });
    }
    
    if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be one of: ${fieldSchema.enum.join(', ')}`,
        code: 'INVALID_ENUM'
      });
    }
  }
  
  // Number validations
  if (typeof value === 'number') {
    if (fieldSchema.min !== undefined && value < fieldSchema.min) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${fieldSchema.min}`,
        code: 'MIN_VALUE'
      });
    }
    
    if (fieldSchema.max !== undefined && value > fieldSchema.max) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be no more than ${fieldSchema.max}`,
        code: 'MAX_VALUE'
      });
    }
    
    if (fieldSchema.integer && !Number.isInteger(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be an integer`,
        code: 'INVALID_INTEGER'
      });
    }
  }
  
  return errors;
}

/**
 * Validate a record against its table schema
 */
export function validateRecord(
  table: string, 
  data: Record<string, any>, 
  operation: 'create' | 'update' = 'create'
): ValidationResult {
  const schema = VALIDATION_SCHEMAS[table];
  
  if (!schema) {
    // If no schema defined, allow all data (backward compatibility)
    return { isValid: true, errors: [] };
  }
  
  const errors: ValidationError[] = [];
  
  // Check required fields (only for create operations)
  if (operation === 'create' && schema.required) {
    for (const requiredField of schema.required) {
      if (!(requiredField in data) || data[requiredField] === null || data[requiredField] === undefined || data[requiredField] === '') {
        errors.push({
          field: requiredField,
          message: `${requiredField} is required`,
          code: 'REQUIRED'
        });
      }
    }
  }
  
  // Validate each field in the data
  for (const [fieldName, value] of Object.entries(data)) {
    const fieldSchema = schema.fields?.[fieldName];
    
    if (fieldSchema) {
      const fieldErrors = validateField(fieldName, value, fieldSchema);
      errors.push(...fieldErrors);
    }
    // Note: We don't reject unknown fields to allow flexibility
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate business rules for specific operations
 */
export function validateBusinessRules(
  table: string,
  data: Record<string, any>,
  operation: 'create' | 'update' | 'delete',
  existingRecord?: Record<string, any>
): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Table-specific business rules
  switch (table) {
    case 'Materiales':
      // Stock minimum should not be greater than current stock
      if (data.stock_minimo && data.stock_actual && data.stock_minimo > data.stock_actual) {
        errors.push({
          field: 'stock_minimo',
          message: 'Minimum stock cannot be greater than current stock',
          code: 'BUSINESS_RULE_VIOLATION'
        });
      }
      
      // Cost should be positive
      if (data.costo_ref && data.costo_ref <= 0) {
        errors.push({
          field: 'costo_ref',
          message: 'Cost must be greater than zero',
          code: 'BUSINESS_RULE_VIOLATION'
        });
      }
      break;
      
    case 'Proyectos':
      // End date should be after start date
      if (data.inicio_plan && data.fin_plan) {
        const startDate = new Date(data.inicio_plan);
        const endDate = new Date(data.fin_plan);
        
        if (endDate <= startDate) {
          errors.push({
            field: 'fin_plan',
            message: 'End date must be after start date',
            code: 'BUSINESS_RULE_VIOLATION'
          });
        }
      }
      
      // Progress percentage validation
      if (data.avance_pct !== undefined) {
        if (data.avance_pct < 0 || data.avance_pct > 100) {
          errors.push({
            field: 'avance_pct',
            message: 'Progress percentage must be between 0 and 100',
            code: 'BUSINESS_RULE_VIOLATION'
          });
        }
      }
      break;
      
    case 'Usuarios':
      // Email uniqueness would be checked at database level
      // Role-based validation could be added here
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Comprehensive validation combining schema and business rules
 */
export function validateCRUDOperation(
  table: string,
  data: Record<string, any>,
  operation: 'create' | 'update' | 'delete',
  existingRecord?: Record<string, any>
): ValidationResult {
  // Schema validation
  const schemaValidation = validateRecord(table, data, operation);
  
  // Business rules validation
  const businessValidation = validateBusinessRules(table, data, operation, existingRecord);
  
  // Combine errors
  const allErrors = [...schemaValidation.errors, ...businessValidation.errors];
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';
  
  return errors.map(error => `${error.field}: ${error.message}`).join('; ');
}

/**
 * Get validation schema for a table (for UI generation)
 */
export function getTableSchema(table: string) {
  return VALIDATION_SCHEMAS[table] || null;
}

/**
 * Check if a field is required for a table
 */
export function isFieldRequired(table: string, field: string): boolean {
  const schema = VALIDATION_SCHEMAS[table];
  return schema?.required?.includes(field) || false;
}

/**
 * Get field validation rules for a table
 */
export function getFieldRules(table: string, field: string) {
  const schema = VALIDATION_SCHEMAS[table];
  return schema?.fields?.[field] || null;
}