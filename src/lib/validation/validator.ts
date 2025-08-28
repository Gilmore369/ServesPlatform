// Main data validator implementation
import { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning,
  ValidationContext,
  BatchValidationResult,
  TableSchema,
  ValidationRule,
  RelationshipRule,
  BusinessRule
} from './types';
import { validationSchemas, getSchemaByTable } from './schemas';
import { googleSheetsAPIService } from '../google-sheets-api-service';

export class DataValidator {
  private relatedDataCache: Map<string, any[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Validate a single record against its table schema
   */
  async validateRecord(
    tableName: string, 
    data: any, 
    context: ValidationContext = { operation: 'create' }
  ): Promise<ValidationResult> {
    const schema = getSchemaByTable(tableName);
    if (!schema) {
      return {
        isValid: false,
        errors: [{
          field: 'table',
          message: `No validation schema found for table: ${tableName}`,
          type: 'validation'
        }]
      };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // 1. Field validation
      const fieldErrors = await this.validateFields(schema.fields, data);
      errors.push(...fieldErrors);

      // 2. Relationship validation
      if (schema.relationships) {
        const relationshipErrors = await this.validateRelationships(
          schema.relationships, 
          data, 
          context
        );
        errors.push(...relationshipErrors);
      }

      // 3. Business rules validation
      if (schema.businessRules) {
        const businessErrors = await this.validateBusinessRules(
          schema.businessRules, 
          data, 
          context
        );
        errors.push(...businessErrors);
      }

      // 4. Generate warnings for potential issues
      const validationWarnings = this.generateWarnings(schema, data);
      warnings.push(...validationWarnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'system',
          message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'validation'
        }]
      };
    }
  }

  /**
   * Validate multiple records in batch
   */
  async validateBatch(
    tableName: string, 
    records: any[], 
    context: ValidationContext = { operation: 'create' }
  ): Promise<BatchValidationResult> {
    const results: ValidationResult[] = [];
    let validRecords = 0;
    let totalErrors = 0;

    // Pre-load related data for efficiency
    const schema = getSchemaByTable(tableName);
    if (schema?.relationships) {
      await this.preloadRelatedData(schema.relationships);
    }

    // Validate each record
    for (const record of records) {
      const result = await this.validateRecord(tableName, record, context);
      results.push(result);
      
      if (result.isValid) {
        validRecords++;
      }
      totalErrors += result.errors.length;
    }

    return {
      isValid: validRecords === records.length,
      results,
      summary: {
        totalRecords: records.length,
        validRecords,
        invalidRecords: records.length - validRecords,
        totalErrors
      }
    };
  }

  /**
   * Validate individual fields against their rules
   */
  private async validateFields(rules: ValidationRule[], data: any): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const value = data[rule.field];
      const error = this.validateField(rule, value, data);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  /**
   * Validate a single field against its rule
   */
  private validateField(rule: ValidationRule, value: any, record: any): ValidationError | null {
    // Handle required fields
    if (rule.type === 'required' && (value === undefined || value === null || value === '')) {
      return {
        field: rule.field,
        message: rule.message,
        type: 'validation',
        value
      };
    }

    // Skip validation for empty optional fields
    if (value === undefined || value === null || value === '') {
      return null;
    }

    // Type-specific validation
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field: rule.field,
            message: rule.message,
            type: 'validation',
            value
          };
        }
        break;

      case 'number':
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue)) {
          return {
            field: rule.field,
            message: rule.message,
            type: 'validation',
            value
          };
        }
        
        // Check min/max constraints
        if (rule.min !== undefined && numValue < rule.min) {
          return {
            field: rule.field,
            message: `${rule.message} (mínimo: ${rule.min})`,
            type: 'validation',
            value
          };
        }
        if (rule.max !== undefined && numValue > rule.max) {
          return {
            field: rule.field,
            message: `${rule.message} (máximo: ${rule.max})`,
            type: 'validation',
            value
          };
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return {
            field: rule.field,
            message: rule.message,
            type: 'validation',
            value
          };
        }
        break;

      case 'date':
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return {
            field: rule.field,
            message: rule.message,
            type: 'validation',
            value
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field: rule.field,
            message: rule.message,
            type: 'validation',
            value
          };
        }
        break;

      case 'enum':
        if (rule.enumValues && !rule.enumValues.includes(value)) {
          return {
            field: rule.field,
            message: `${rule.message} (valores válidos: ${rule.enumValues.join(', ')})`,
            type: 'validation',
            value
          };
        }
        break;

      case 'custom':
        if (rule.customValidator && !rule.customValidator(value, record)) {
          return {
            field: rule.field,
            message: rule.message,
            type: 'validation',
            value
          };
        }
        break;
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return {
        field: rule.field,
        message: `${rule.message} (formato inválido)`,
        type: 'validation',
        value
      };
    }

    // String length validation
    if (typeof value === 'string') {
      if (rule.min !== undefined && value.length < rule.min) {
        return {
          field: rule.field,
          message: `${rule.message} (mínimo ${rule.min} caracteres)`,
          type: 'validation',
          value
        };
      }
      if (rule.max !== undefined && value.length > rule.max) {
        return {
          field: rule.field,
          message: `${rule.message} (máximo ${rule.max} caracteres)`,
          type: 'validation',
          value
        };
      }
    }

    return null;
  }

  /**
   * Validate foreign key relationships
   */
  private async validateRelationships(
    relationships: RelationshipRule[], 
    data: any, 
    context: ValidationContext
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const relationship of relationships) {
      const foreignKeyValue = data[relationship.field];
      
      // Skip validation for optional relationships with null/undefined values
      if (!relationship.required && (foreignKeyValue === null || foreignKeyValue === undefined)) {
        continue;
      }

      // Required relationship must have a value
      if (relationship.required && (foreignKeyValue === null || foreignKeyValue === undefined || foreignKeyValue === '')) {
        errors.push({
          field: relationship.field,
          message: `${relationship.message} (campo requerido)`,
          type: 'relationship',
          value: foreignKeyValue
        });
        continue;
      }

      // Check if referenced record exists
      const relatedRecords = await this.getRelatedData(relationship.referencedTable);
      const referencedRecord = relatedRecords.find(
        record => record[relationship.referencedField] === foreignKeyValue
      );

      if (!referencedRecord) {
        errors.push({
          field: relationship.field,
          message: relationship.message,
          type: 'relationship',
          value: foreignKeyValue
        });
      } else {
        // Additional checks for active records
        if (referencedRecord.activo === false) {
          errors.push({
            field: relationship.field,
            message: `${relationship.message} (registro inactivo)`,
            type: 'relationship',
            value: foreignKeyValue
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(
    businessRules: BusinessRule[], 
    data: any, 
    context: ValidationContext
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const rule of businessRules) {
      try {
        // Prepare context with related data if needed
        const enrichedContext = await this.enrichValidationContext(context, data);
        
        // Handle both sync and async validators
        let isValid: boolean;
        const validatorResult = rule.validator(data, enrichedContext);
        
        if (validatorResult instanceof Promise) {
          isValid = await validatorResult;
        } else {
          isValid = validatorResult;
        }
        
        if (!isValid) {
          errors.push({
            field: 'business_rule',
            message: rule.message,
            type: 'business'
          });
        }
      } catch (error) {
        errors.push({
          field: 'business_rule',
          message: `Error validating business rule '${rule.name}': ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'business'
        });
      }
    }

    return errors;
  }

  /**
   * Generate warnings for potential issues
   */
  private generateWarnings(schema: TableSchema, data: any): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Example: Stock level warnings for materials
    if (schema.tableName === 'Materiales') {
      if (data.stock_actual <= data.stock_minimo) {
        warnings.push({
          field: 'stock_actual',
          message: 'Stock actual está en el nivel mínimo o por debajo',
          value: data.stock_actual
        });
      }
    }

    // Example: Project deadline warnings
    if (schema.tableName === 'Proyectos') {
      const finPlan = new Date(data.fin_plan);
      const today = new Date();
      const daysUntilDeadline = Math.ceil((finPlan.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
        warnings.push({
          field: 'fin_plan',
          message: `Proyecto vence en ${daysUntilDeadline} días`,
          value: data.fin_plan
        });
      }
    }

    return warnings;
  }

  /**
   * Get related data with caching
   */
  private async getRelatedData(tableName: string): Promise<any[]> {
    const cacheKey = tableName;
    const now = Date.now();
    
    // Check if we have valid cached data
    if (this.relatedDataCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (now < expiry) {
        return this.relatedDataCache.get(cacheKey) || [];
      }
    }

    try {
      // Fetch fresh data
      const response = await googleSheetsAPIService.executeOperation({
        table: tableName,
        operation: 'list'
      });

      if (response.ok && response.data) {
        const data = Array.isArray(response.data) ? response.data : [response.data];
        this.relatedDataCache.set(cacheKey, data);
        this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);
        return data;
      }
    } catch (error) {
      console.warn(`Failed to fetch related data for ${tableName}:`, error);
    }

    return [];
  }

  /**
   * Preload related data for batch operations
   */
  private async preloadRelatedData(relationships: RelationshipRule[]): Promise<void> {
    const tablesToLoad = [...new Set(relationships.map(r => r.referencedTable))];
    
    const loadPromises = tablesToLoad.map(tableName => 
      this.getRelatedData(tableName).catch(error => {
        console.warn(`Failed to preload data for ${tableName}:`, error);
        return [];
      })
    );

    await Promise.all(loadPromises);
  }

  /**
   * Enrich validation context with related data
   */
  private async enrichValidationContext(
    context: ValidationContext, 
    data: any
  ): Promise<ValidationContext> {
    const enrichedContext = { ...context };
    
    // Add related data to context if not already present
    if (!enrichedContext.relatedData) {
      enrichedContext.relatedData = {};
    }

    return enrichedContext;
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.relatedDataCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get validation statistics
   */
  getCacheStats(): { size: number; tables: string[] } {
    return {
      size: this.relatedDataCache.size,
      tables: Array.from(this.relatedDataCache.keys())
    };
  }
}

// Export singleton instance
export const dataValidator = new DataValidator();