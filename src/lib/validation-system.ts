/**
 * Comprehensive Validation System for ServesPlatform
 * 
 * This file provides a standardized validation system with proper error handling,
 * business rule validation, and comprehensive type safety. All data validation
 * throughout the application should use this system.
 * 
 * Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3
 * @fileoverview Comprehensive validation system for ServesPlatform
 * @author ServesPlatform Development Team
 * @version 2.1.0
 */

import { AppError, ErrorFactory, ErrorType } from './error-types';
import { logger, LogCategory } from './logger-types';
import { User, Project, Activity, Material, UserRole, ProjectStatus, ServiceLine, Currency } from './types';

// =============================================================================
// VALIDATION TYPES AND INTERFACES
// =============================================================================

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Array of validation errors */
  errors: ValidationError[];
  /** Validated and sanitized data */
  data?: any;
}

/**
 * Individual validation error
 */
export interface ValidationError {
  /** Field that failed validation */
  field: string;
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code: string;
  /** Current value that failed validation */
  value?: any;
  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Validation rule interface
 */
export interface ValidationRule<T = any> {
  /** Rule name */
  name: string;
  /** Validation function */
  validate: (value: T, context?: any) => boolean | Promise<boolean>;
  /** Error message template */
  message: string;
  /** Error code */
  code: string;
  /** Whether this rule is required */
  required?: boolean;
}

/**
 * Field validation schema
 */
export interface FieldSchema {
  /** Field name */
  field: string;
  /** Whether field is required */
  required?: boolean;
  /** Field type */
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'array' | 'object';
  /** Minimum length/value */
  min?: number;
  /** Maximum length/value */
  max?: number;
  /** Regular expression pattern */
  pattern?: RegExp;
  /** Allowed values */
  enum?: any[];
  /** Custom validation rules */
  rules?: ValidationRule[];
  /** Custom sanitization function */
  sanitize?: (value: any) => any;
}

/**
 * Entity validation schema
 */
export interface EntitySchema {
  /** Entity name */
  name: string;
  /** Field schemas */
  fields: FieldSchema[];
  /** Cross-field validation rules */
  crossFieldRules?: ValidationRule[];
  /** Business rule validations */
  businessRules?: ValidationRule[];
}

// =============================================================================
// VALIDATION RULES
// =============================================================================

/**
 * Common validation rules
 */
export class ValidationRules {
  /**
   * Required field validation
   */
  static required(): ValidationRule {
    return {
      name: 'required',
      validate: (value) => value !== null && value !== undefined && value !== '',
      message: 'Este campo es requerido',
      code: 'REQUIRED'
    };
  }

  /**
   * Email format validation
   */
  static email(): ValidationRule {
    return {
      name: 'email',
      validate: (value: string) => {
        if (!value) return true; // Allow empty if not required
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
      message: 'Formato de email inválido',
      code: 'INVALID_EMAIL'
    };
  }

  /**
   * Minimum length validation
   */
  static minLength(min: number): ValidationRule {
    return {
      name: 'minLength',
      validate: (value: string) => {
        if (!value) return true; // Allow empty if not required
        return value.length >= min;
      },
      message: `Debe tener al menos ${min} caracteres`,
      code: 'MIN_LENGTH'
    };
  }

  /**
   * Maximum length validation
   */
  static maxLength(max: number): ValidationRule {
    return {
      name: 'maxLength',
      validate: (value: string) => {
        if (!value) return true; // Allow empty if not required
        return value.length <= max;
      },
      message: `No debe exceder ${max} caracteres`,
      code: 'MAX_LENGTH'
    };
  }

  /**
   * Numeric range validation
   */
  static range(min: number, max: number): ValidationRule {
    return {
      name: 'range',
      validate: (value: number) => {
        if (value === null || value === undefined) return true;
        return value >= min && value <= max;
      },
      message: `Debe estar entre ${min} y ${max}`,
      code: 'OUT_OF_RANGE'
    };
  }

  /**
   * Pattern validation
   */
  static pattern(regex: RegExp, message: string): ValidationRule {
    return {
      name: 'pattern',
      validate: (value: string) => {
        if (!value) return true; // Allow empty if not required
        return regex.test(value);
      },
      message,
      code: 'PATTERN_MISMATCH'
    };
  }

  /**
   * Enum validation
   */
  static enum<T>(allowedValues: T[], fieldName: string): ValidationRule {
    return {
      name: 'enum',
      validate: (value: T) => {
        if (value === null || value === undefined) return true;
        return allowedValues.includes(value);
      },
      message: `${fieldName} debe ser uno de: ${allowedValues.join(', ')}`,
      code: 'INVALID_ENUM'
    };
  }

  /**
   * Date validation
   */
  static date(): ValidationRule {
    return {
      name: 'date',
      validate: (value: any) => {
        if (!value) return true; // Allow empty if not required
        const date = new Date(value);
        return !isNaN(date.getTime());
      },
      message: 'Formato de fecha inválido',
      code: 'INVALID_DATE'
    };
  }

  /**
   * Future date validation
   */
  static futureDate(): ValidationRule {
    return {
      name: 'futureDate',
      validate: (value: any) => {
        if (!value) return true; // Allow empty if not required
        const date = new Date(value);
        return date > new Date();
      },
      message: 'La fecha debe ser futura',
      code: 'DATE_NOT_FUTURE'
    };
  }

  /**
   * Unique field validation (requires async check)
   */
  static unique(checkFunction: (value: any) => Promise<boolean>): ValidationRule {
    return {
      name: 'unique',
      validate: checkFunction,
      message: 'Este valor ya existe',
      code: 'NOT_UNIQUE'
    };
  }
}

// =============================================================================
// ENTITY SCHEMAS
// =============================================================================

/**
 * User validation schema
 */
export const UserSchema: EntitySchema = {
  name: 'User',
  fields: [
    {
      field: 'email',
      required: true,
      type: 'email',
      max: 255,
      rules: [
        ValidationRules.required(),
        ValidationRules.email(),
        ValidationRules.maxLength(255)
      ]
    },
    {
      field: 'nombre',
      required: true,
      type: 'string',
      min: 2,
      max: 100,
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(2),
        ValidationRules.maxLength(100)
      ]
    },
    {
      field: 'rol',
      required: true,
      type: 'string',
      enum: ['admin_lider', 'admin', 'editor', 'tecnico'],
      rules: [
        ValidationRules.required(),
        ValidationRules.enum(['admin_lider', 'admin', 'editor', 'tecnico'], 'Rol')
      ]
    },
    {
      field: 'activo',
      required: true,
      type: 'boolean',
      rules: [ValidationRules.required()]
    }
  ]
};

/**
 * Project validation schema
 */
export const ProjectSchema: EntitySchema = {
  name: 'Project',
  fields: [
    {
      field: 'codigo',
      required: true,
      type: 'string',
      min: 3,
      max: 50,
      pattern: /^[A-Z]{2,4}-\d{4}-\d{3}$/,
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(3),
        ValidationRules.maxLength(50),
        ValidationRules.pattern(/^[A-Z]{2,4}-\d{4}-\d{3}$/, 'Formato de código inválido (ej: ELEC-2024-001)')
      ]
    },
    {
      field: 'nombre',
      required: true,
      type: 'string',
      min: 5,
      max: 200,
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(5),
        ValidationRules.maxLength(200)
      ]
    },
    {
      field: 'cliente_id',
      required: true,
      type: 'string',
      rules: [ValidationRules.required()]
    },
    {
      field: 'responsable_id',
      required: true,
      type: 'string',
      rules: [ValidationRules.required()]
    },
    {
      field: 'linea_servicio',
      required: true,
      type: 'string',
      enum: ['Eléctrico', 'Civil', 'CCTV', 'Mantenimiento', 'Telecomunicaciones'],
      rules: [
        ValidationRules.required(),
        ValidationRules.enum(['Eléctrico', 'Civil', 'CCTV', 'Mantenimiento', 'Telecomunicaciones'], 'Línea de servicio')
      ]
    },
    {
      field: 'estado',
      required: true,
      type: 'string',
      enum: ['Planificación', 'En progreso', 'Pausado', 'Cerrado'],
      rules: [
        ValidationRules.required(),
        ValidationRules.enum(['Planificación', 'En progreso', 'Pausado', 'Cerrado'], 'Estado')
      ]
    },
    {
      field: 'moneda',
      required: true,
      type: 'string',
      enum: ['PEN', 'USD'],
      rules: [
        ValidationRules.required(),
        ValidationRules.enum(['PEN', 'USD'], 'Moneda')
      ]
    },
    {
      field: 'presupuesto_total',
      required: true,
      type: 'number',
      min: 0,
      rules: [
        ValidationRules.required(),
        ValidationRules.range(0, Number.MAX_SAFE_INTEGER)
      ]
    },
    {
      field: 'avance_pct',
      required: true,
      type: 'number',
      min: 0,
      max: 100,
      rules: [
        ValidationRules.required(),
        ValidationRules.range(0, 100)
      ]
    },
    {
      field: 'inicio_plan',
      required: true,
      type: 'date',
      rules: [
        ValidationRules.required(),
        ValidationRules.date()
      ]
    },
    {
      field: 'fin_plan',
      required: true,
      type: 'date',
      rules: [
        ValidationRules.required(),
        ValidationRules.date()
      ]
    }
  ],
  crossFieldRules: [
    {
      name: 'dateRange',
      validate: (data: any) => {
        if (!data.inicio_plan || !data.fin_plan) return true;
        const start = new Date(data.inicio_plan);
        const end = new Date(data.fin_plan);
        return start < end;
      },
      message: 'La fecha de fin debe ser posterior a la fecha de inicio',
      code: 'INVALID_DATE_RANGE'
    }
  ]
};

// =============================================================================
// VALIDATOR CLASS
// =============================================================================

/**
 * Main validator class for entity validation
 */
export class Validator {
  private schema: EntitySchema;

  constructor(schema: EntitySchema) {
    this.schema = schema;
  }

  /**
   * Validate entity data against schema
   */
  async validate(data: any, context?: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const sanitizedData: any = {};

    try {
      // Field-level validation
      for (const fieldSchema of this.schema.fields) {
        const fieldErrors = await this.validateField(data, fieldSchema, context);
        errors.push(...fieldErrors);

        // Sanitize data if no errors
        if (fieldErrors.length === 0) {
          let value = data[fieldSchema.field];
          if (fieldSchema.sanitize) {
            value = fieldSchema.sanitize(value);
          }
          sanitizedData[fieldSchema.field] = value;
        }
      }

      // Cross-field validation
      if (this.schema.crossFieldRules && errors.length === 0) {
        for (const rule of this.schema.crossFieldRules) {
          const isValid = await rule.validate(sanitizedData, context);
          if (!isValid) {
            errors.push({
              field: 'cross-field',
              message: rule.message,
              code: rule.code,
              value: sanitizedData
            });
          }
        }
      }

      // Business rules validation
      if (this.schema.businessRules && errors.length === 0) {
        for (const rule of this.schema.businessRules) {
          const isValid = await rule.validate(sanitizedData, context);
          if (!isValid) {
            errors.push({
              field: 'business-rule',
              message: rule.message,
              code: rule.code,
              value: sanitizedData
            });
          }
        }
      }

      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        data: errors.length === 0 ? sanitizedData : undefined
      };

      // Log validation results
      if (errors.length > 0) {
        logger.warn(`Validation failed for ${this.schema.name}`, undefined, {
          entity: this.schema.name,
          errors: errors.map(e => ({ field: e.field, code: e.code }))
        }, LogCategory.VALIDATION);
      } else {
        logger.debug(`Validation passed for ${this.schema.name}`, {
          entity: this.schema.name,
          fieldCount: this.schema.fields.length
        }, LogCategory.VALIDATION);
      }

      return result;

    } catch (error) {
      logger.error(`Validation error for ${this.schema.name}`, error, {
        entity: this.schema.name,
        data
      }, LogCategory.VALIDATION);

      throw ErrorFactory.validation(`Validation failed for ${this.schema.name}`, {
        entity: this.schema.name,
        originalError: error
      });
    }
  }

  /**
   * Validate individual field
   */
  private async validateField(
    data: any,
    fieldSchema: FieldSchema,
    context?: any
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const value = data[fieldSchema.field];

    // Check if field is required
    if (fieldSchema.required && (value === null || value === undefined || value === '')) {
      errors.push({
        field: fieldSchema.field,
        message: 'Este campo es requerido',
        code: 'REQUIRED',
        value
      });
      return errors; // Don't continue validation if required field is missing
    }

    // Skip further validation if field is empty and not required
    if (!fieldSchema.required && (value === null || value === undefined || value === '')) {
      return errors;
    }

    // Type validation
    if (fieldSchema.type && !this.validateType(value, fieldSchema.type)) {
      errors.push({
        field: fieldSchema.field,
        message: `Tipo de dato inválido, se esperaba ${fieldSchema.type}`,
        code: 'INVALID_TYPE',
        value
      });
      return errors; // Don't continue if type is wrong
    }

    // Run custom validation rules
    if (fieldSchema.rules) {
      for (const rule of fieldSchema.rules) {
        try {
          const isValid = await rule.validate(value, context);
          if (!isValid) {
            errors.push({
              field: fieldSchema.field,
              message: rule.message,
              code: rule.code,
              value
            });
          }
        } catch (error) {
          logger.error(`Validation rule error`, error, {
            field: fieldSchema.field,
            rule: rule.name,
            value
          }, LogCategory.VALIDATION);
          
          errors.push({
            field: fieldSchema.field,
            message: 'Error en validación',
            code: 'VALIDATION_ERROR',
            value
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate data type
   */
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || !isNaN(new Date(value).getTime());
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Validate and throw error if validation fails
   */
  async validateOrThrow(data: any, context?: any): Promise<any> {
    const result = await this.validate(data, context);
    
    if (!result.isValid) {
      const errorMessage = `Validation failed for ${this.schema.name}`;
      const validationError = ErrorFactory.validation(errorMessage, {
        entity: this.schema.name,
        errors: result.errors
      });
      
      throw validationError;
    }

    return result.data;
  }
}

// =============================================================================
// VALIDATOR INSTANCES
// =============================================================================

/**
 * Pre-configured validators for common entities
 */
export const validators = {
  user: new Validator(UserSchema),
  project: new Validator(ProjectSchema)
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Quick validation function for common use cases
 */
export async function validateEntity<T>(
  entityType: 'user' | 'project',
  data: any,
  context?: any
): Promise<ValidationResult> {
  const validator = validators[entityType];
  if (!validator) {
    throw ErrorFactory.validation(`Unknown entity type: ${entityType}`);
  }
  
  return validator.validate(data, context);
}

/**
 * Quick validation with error throwing
 */
export async function validateEntityOrThrow<T>(
  entityType: 'user' | 'project',
  data: any,
  context?: any
): Promise<T> {
  const validator = validators[entityType];
  if (!validator) {
    throw ErrorFactory.validation(`Unknown entity type: ${entityType}`);
  }
  
  return validator.validateOrThrow(data, context);
}

/**
 * Create custom validator
 */
export function createValidator(schema: EntitySchema): Validator {
  return new Validator(schema);
}

/**
 * Sanitize string input
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;
  
  return value
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[<>]/g, ''); // Remove potential HTML characters
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(value: string): string {
  if (typeof value !== 'string') return value;
  
  return value.trim().toLowerCase();
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  const num = Number(value);
  return isNaN(num) ? null : num;
}