// Validation system types and interfaces

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'number' | 'date' | 'string' | 'boolean' | 'enum' | 'custom';
  message: string;
  customValidator?: (value: any, record?: any) => boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enumValues?: string[];
}

export interface RelationshipRule {
  field: string;
  referencedTable: string;
  referencedField: string;
  required: boolean;
  message: string;
}

export interface TableSchema {
  tableName: string;
  fields: ValidationRule[];
  relationships?: RelationshipRule[];
  businessRules?: BusinessRule[];
}

export interface BusinessRule {
  name: string;
  description: string;
  validator: (record: any, context?: ValidationContext) => boolean | Promise<boolean>;
  message: string;
}

export interface ValidationContext {
  operation: 'create' | 'update' | 'delete';
  existingRecord?: any;
  relatedData?: Record<string, any[]>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  type: 'validation' | 'business' | 'relationship';
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  value?: any;
}

export interface BatchValidationResult {
  isValid: boolean;
  results: ValidationResult[];
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    totalErrors: number;
  };
}