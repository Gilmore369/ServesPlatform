// Validation system exports
export * from './types';
export * from './schemas';
export * from './validator';
export * from './business-rules';

// Main exports for easy importing
export { DataValidator, dataValidator } from './validator';
export { validationSchemas, getSchemaByTable, getAllTableNames } from './schemas';
export { businessRules } from './business-rules';

// Convenience function for quick validation
export async function validateRecord(tableName: string, data: any, operation: 'create' | 'update' | 'delete' = 'create') {
  const { dataValidator } = await import('./validator');
  return dataValidator.validateRecord(tableName, data, { operation });
}

// Convenience function for batch validation
export async function validateBatch(tableName: string, records: any[], operation: 'create' | 'update' | 'delete' = 'create') {
  const { dataValidator } = await import('./validator');
  return dataValidator.validateBatch(tableName, records, { operation });
}