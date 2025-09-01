/**
 * Standardized Validation System for ServesPlatform
 * Requirements: 6.1, 6.2, 6.3
 */

import { ValidationError, ErrorFactory } from './error-types';

/**
 * Validation rule types
 */
export enum ValidationRuleType {
  REQUIRED = 'REQUIRED',
  MIN_LENGTH = 'MIN_LENGTH',
  MAX_LENGTH = 'MAX_LENGTH',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  MIN_VALUE = 'MIN_VALUE',
  MAX_VALUE = 'MAX_VALUE',
  PATTERN = 'PATTERN',
  ENUM = 'ENUM',
  DATE = 'DATE',
  FUTURE_DATE = 'FUTURE_DATE',
  PAST_DATE = 'PAST_DATE',
  CUSTOM = 'CUSTOM'
}

/**
 * Base validation rule interface
 */
export interface ValidationRule {
  type: ValidationRuleType;
  message?: string;
  value?: any;
  validator?: (value: any, context?: any) => boolean;
}

/**
 * Field validation schema
 */
export interface FieldSchema {
  /** Field name */
  name: string;
  /** Human-readable field label */
  label: string;
  /** Validation rules for this field */
  rules: ValidationRule[];
  /** Whether this field is optional */
  optional?: boolean;
  /** Default value if not provided */
  defaultValue?: any;
  /** Field description for documentation */
  description?: string;
}

/**
 * Entity validation schema
 */
export interface EntitySchema {
  /** Entity name */
  name: string;
  /** Entity description */
  description?: string;
  /** Field schemas */
  fields: FieldSchema[];
  /** Custom entity-level validation rules */
  customRules?: Array<{
    name: string;
    validator: (data: any) => ValidationError | null;
  }>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** List of validation errors */
  errors: ValidationError[];
  /** Sanitized/normalized data */
  data?: any;
}

/**
 * Validation context for business rules
 */
export interface ValidationContext {
  /** Operation type (create, update, delete) */
  operation: 'create' | 'update' | 'delete';
  /** Current user information */
  user?: {
    id: string;
    role: string;
  };
  /** Existing data for updates */
  existingData?: any;
  /** Additional context data */
  metadata?: Record<string, any>;
}

/**
 * Standard validation utility class
 */
export class Validator {
  /**
   * Validate a single field value against its schema
   */
  static validateField(
    value: any, 
    schema: FieldSchema, 
    context?: ValidationContext
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const fieldName = schema.name;
    const fieldLabel = schema.label || fieldName;

    // Handle optional fields
    if ((value === undefined || value === null || value === '') && schema.optional) {
      return errors;
    }

    // Apply validation rules
    for (const rule of schema.rules) {
      const error = this.applyRule(value, rule, fieldName, fieldLabel, context);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  /**
   * Validate an entire entity against its schema
   */
  static validateEntity(
    data: any, 
    schema: EntitySchema, 
    context?: ValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const normalizedData: any = {};

    // Validate each field
    for (const fieldSchema of schema.fields) {
      const fieldValue = data[fieldSchema.name];
      const fieldErrors = this.validateField(fieldValue, fieldSchema, context);
      errors.push(...fieldErrors);

      // Set normalized value
      if (fieldValue !== undefined) {
        normalizedData[fieldSchema.name] = this.normalizeValue(fieldValue, fieldSchema);
      } else if (fieldSchema.defaultValue !== undefined) {
        normalizedData[fieldSchema.name] = fieldSchema.defaultValue;
      }
    }

    // Apply custom entity-level rules
    if (schema.customRules) {
      for (const customRule of schema.customRules) {
        const error = customRule.validator(normalizedData);
        if (error) {
          errors.push(error);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: normalizedData
    };
  }

  /**
   * Apply a single validation rule
   */
  private static applyRule(
    value: any,
    rule: ValidationRule,
    fieldName: string,
    fieldLabel: string,
    context?: ValidationContext
  ): ValidationError | null {
    const defaultMessage = this.getDefaultMessage(rule, fieldLabel);
    const message = rule.message || defaultMessage;

    switch (rule.type) {
      case ValidationRuleType.REQUIRED:
        if (value === undefined || value === null || value === '') {
          return { field: fieldName, message, value, rule: 'required' };
        }
        break;

      case ValidationRuleType.MIN_LENGTH:
        if (typeof value === 'string' && value.length < rule.value) {
          return { field: fieldName, message, value, rule: 'minLength' };
        }
        break;

      case ValidationRuleType.MAX_LENGTH:
        if (typeof value === 'string' && value.length > rule.value) {
          return { field: fieldName, message, value, rule: 'maxLength' };
        }
        break;

      case ValidationRuleType.EMAIL:
        if (typeof value === 'string' && !this.isValidEmail(value)) {
          return { field: fieldName, message, value, rule: 'email' };
        }
        break;

      case ValidationRuleType.PHONE:
        if (typeof value === 'string' && !this.isValidPhone(value)) {
          return { field: fieldName, message, value, rule: 'phone' };
        }
        break;

      case ValidationRuleType.URL:
        if (typeof value === 'string' && !this.isValidUrl(value)) {
          return { field: fieldName, message, value, rule: 'url' };
        }
        break;

      case ValidationRuleType.NUMBER:
        if (isNaN(Number(value))) {
          return { field: fieldName, message, value, rule: 'number' };
        }
        break;

      case ValidationRuleType.INTEGER:
        if (!Number.isInteger(Number(value))) {
          return { field: fieldName, message, value, rule: 'integer' };
        }
        break;

      case ValidationRuleType.MIN_VALUE:
        if (Number(value) < rule.value) {
          return { field: fieldName, message, value, rule: 'minValue' };
        }
        break;

      case ValidationRuleType.MAX_VALUE:
        if (Number(value) > rule.value) {
          return { field: fieldName, message, value, rule: 'maxValue' };
        }
        break;

      case ValidationRuleType.PATTERN:
        if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
          return { field: fieldName, message, value, rule: 'pattern' };
        }
        break;

      case ValidationRuleType.ENUM:
        if (!Array.isArray(rule.value) || !rule.value.includes(value)) {
          return { field: fieldName, message, value, rule: 'enum' };
        }
        break;

      case ValidationRuleType.DATE:
        if (!this.isValidDate(value)) {
          return { field: fieldName, message, value, rule: 'date' };
        }
        break;

      case ValidationRuleType.FUTURE_DATE:
        if (!this.isValidDate(value) || new Date(value) <= new Date()) {
          return { field: fieldName, message, value, rule: 'futureDate' };
        }
        break;

      case ValidationRuleType.PAST_DATE:
        if (!this.isValidDate(value) || new Date(value) >= new Date()) {
          return { field: fieldName, message, value, rule: 'pastDate' };
        }
        break;

      case ValidationRuleType.CUSTOM:
        if (rule.validator && !rule.validator(value, context)) {
          return { field: fieldName, message, value, rule: 'custom' };
        }
        break;
    }

    return null;
  }

  /**
   * Normalize field value based on its schema
   */
  private static normalizeValue(value: any, schema: FieldSchema): any {
    // Basic normalization based on field type
    for (const rule of schema.rules) {
      switch (rule.type) {
        case ValidationRuleType.EMAIL:
          if (typeof value === 'string') {
            return value.toLowerCase().trim();
          }
          break;
        case ValidationRuleType.NUMBER:
        case ValidationRuleType.INTEGER:
          return Number(value);
        case ValidationRuleType.DATE:
          if (typeof value === 'string') {
            return new Date(value).toISOString();
          }
          break;
      }
    }

    // Default: trim strings
    if (typeof value === 'string') {
      return value.trim();
    }

    return value;
  }

  /**
   * Get default error message for a rule
   */
  private static getDefaultMessage(rule: ValidationRule, fieldLabel: string): string {
    switch (rule.type) {
      case ValidationRuleType.REQUIRED:
        return `${fieldLabel} es requerido`;
      case ValidationRuleType.MIN_LENGTH:
        return `${fieldLabel} debe tener al menos ${rule.value} caracteres`;
      case ValidationRuleType.MAX_LENGTH:
        return `${fieldLabel} no puede tener más de ${rule.value} caracteres`;
      case ValidationRuleType.EMAIL:
        return `${fieldLabel} debe ser un email válido`;
      case ValidationRuleType.PHONE:
        return `${fieldLabel} debe ser un teléfono válido`;
      case ValidationRuleType.URL:
        return `${fieldLabel} debe ser una URL válida`;
      case ValidationRuleType.NUMBER:
        return `${fieldLabel} debe ser un número`;
      case ValidationRuleType.INTEGER:
        return `${fieldLabel} debe ser un número entero`;
      case ValidationRuleType.MIN_VALUE:
        return `${fieldLabel} debe ser mayor o igual a ${rule.value}`;
      case ValidationRuleType.MAX_VALUE:
        return `${fieldLabel} debe ser menor o igual a ${rule.value}`;
      case ValidationRuleType.PATTERN:
        return `${fieldLabel} tiene un formato inválido`;
      case ValidationRuleType.ENUM:
        return `${fieldLabel} debe ser uno de: ${rule.value?.join(', ')}`;
      case ValidationRuleType.DATE:
        return `${fieldLabel} debe ser una fecha válida`;
      case ValidationRuleType.FUTURE_DATE:
        return `${fieldLabel} debe ser una fecha futura`;
      case ValidationRuleType.PAST_DATE:
        return `${fieldLabel} debe ser una fecha pasada`;
      default:
        return `${fieldLabel} es inválido`;
    }
  }

  /**
   * Validation helper methods
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidPhone(phone: string): boolean {
    // Basic phone validation - can be enhanced based on requirements
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static isValidDate(date: any): boolean {
    if (!date) return false;
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  }
}

/**
 * Common validation rule builders
 */
export const ValidationRules = {
  required(message?: string): ValidationRule {
    return { type: ValidationRuleType.REQUIRED, message };
  },

  minLength(length: number, message?: string): ValidationRule {
    return { type: ValidationRuleType.MIN_LENGTH, value: length, message };
  },

  maxLength(length: number, message?: string): ValidationRule {
    return { type: ValidationRuleType.MAX_LENGTH, value: length, message };
  },

  email(message?: string): ValidationRule {
    return { type: ValidationRuleType.EMAIL, message };
  },

  phone(message?: string): ValidationRule {
    return { type: ValidationRuleType.PHONE, message };
  },

  url(message?: string): ValidationRule {
    return { type: ValidationRuleType.URL, message };
  },

  number(message?: string): ValidationRule {
    return { type: ValidationRuleType.NUMBER, message };
  },

  integer(message?: string): ValidationRule {
    return { type: ValidationRuleType.INTEGER, message };
  },

  minValue(min: number, message?: string): ValidationRule {
    return { type: ValidationRuleType.MIN_VALUE, value: min, message };
  },

  maxValue(max: number, message?: string): ValidationRule {
    return { type: ValidationRuleType.MAX_VALUE, value: max, message };
  },

  pattern(regex: string, message?: string): ValidationRule {
    return { type: ValidationRuleType.PATTERN, value: regex, message };
  },

  enum(values: any[], message?: string): ValidationRule {
    return { type: ValidationRuleType.ENUM, value: values, message };
  },

  date(message?: string): ValidationRule {
    return { type: ValidationRuleType.DATE, message };
  },

  futureDate(message?: string): ValidationRule {
    return { type: ValidationRuleType.FUTURE_DATE, message };
  },

  pastDate(message?: string): ValidationRule {
    return { type: ValidationRuleType.PAST_DATE, message };
  },

  custom(validator: (value: any, context?: any) => boolean, message?: string): ValidationRule {
    return { type: ValidationRuleType.CUSTOM, validator, message };
  }
};