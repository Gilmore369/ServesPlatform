# Data Validation System

A comprehensive validation system for the ServesPlatform application that provides field validation, business rules validation, and relationship validation for all database tables.

## Features

- **Field Validation**: Type checking, required fields, format validation, range validation
- **Business Rules**: Custom validation logic specific to business requirements
- **Relationship Validation**: Foreign key validation and referential integrity
- **Batch Validation**: Validate multiple records efficiently
- **Caching**: Intelligent caching of related data for performance
- **Async Support**: Full support for asynchronous validation rules
- **Comprehensive Error Reporting**: Detailed error messages with field-level information

## Quick Start

```typescript
import { validateRecord, validateBatch } from '@/lib/validation';

// Validate a single record
const result = await validateRecord('Materiales', materialData, 'create');
if (!result.isValid) {
  console.log('Validation errors:', result.errors);
}

// Validate multiple records
const batchResult = await validateBatch('Materiales', materialsArray, 'create');
console.log(`${batchResult.summary.validRecords}/${batchResult.summary.totalRecords} records are valid`);
```

## Supported Tables

The validation system supports all main database tables:

- **Usuarios** - User accounts and authentication
- **Materiales** - Materials and inventory
- **Proyectos** - Projects and project management
- **Actividades** - Activities and tasks
- **Clientes** - Client information
- **Personal** - Personnel and collaborators
- **BOM** - Bill of Materials
- **RegistroHoras** - Time tracking entries

## Validation Types

### Field Validation

- `required` - Field must have a value
- `string` - Must be a string with optional min/max length
- `number` - Must be a number with optional min/max range
- `email` - Must be a valid email format
- `date` - Must be a valid date
- `boolean` - Must be true or false
- `enum` - Must be one of specified values
- `custom` - Custom validation function

### Business Rules

Business rules are table-specific validation logic:

- **Unique constraints** - Ensure field values are unique
- **Stock validation** - Prevent negative stock levels
- **Date range validation** - Ensure logical date relationships
- **Assignment validation** - Verify user assignments and permissions
- **Budget validation** - Check project budget constraints

### Relationship Validation

- **Foreign key validation** - Ensure referenced records exist
- **Active record validation** - Verify referenced records are active
- **Cross-table validation** - Validate relationships between tables

## Usage Examples

### Basic Field Validation

```typescript
const materialData = {
  sku: 'MAT-001',
  descripcion: 'Tornillo hexagonal',
  categoria: 'Ferretería',
  unidad: 'pcs',
  costo_ref: 0.50,
  stock_actual: 100,
  stock_minimo: 10,
  activo: true
};

const result = await validateRecord('Materiales', materialData);
```

### Project Validation with Relationships

```typescript
const projectData = {
  codigo: 'PRJ-2024-001',
  nombre: 'Nuevo Proyecto',
  cliente_id: 'client-001', // Will validate client exists
  responsable_id: 'user-001', // Will validate user exists and is active
  inicio_plan: '2024-02-01',
  fin_plan: '2024-08-31', // Will validate end > start
  presupuesto_total: 50000,
  moneda: 'PEN',
  estado: 'Planificación'
};

const result = await validateRecord('Proyectos', projectData);
```

### Batch Validation

```typescript
const materials = [
  { sku: 'MAT-001', descripcion: 'Material 1', /* ... */ },
  { sku: 'MAT-002', descripcion: 'Material 2', /* ... */ },
  // ... more materials
];

const batchResult = await validateBatch('Materiales', materials);

// Check summary
console.log(`Valid: ${batchResult.summary.validRecords}`);
console.log(`Invalid: ${batchResult.summary.invalidRecords}`);
console.log(`Total errors: ${batchResult.summary.totalErrors}`);

// Process individual results
batchResult.results.forEach((result, index) => {
  if (!result.isValid) {
    console.log(`Material ${index + 1} errors:`, result.errors);
  }
});
```

### API Integration

```typescript
// In your API route
export async function POST(request: Request) {
  const data = await request.json();
  
  const validationResult = await validateRecord('Materiales', data, 'create');
  
  if (!validationResult.isValid) {
    return NextResponse.json({
      success: false,
      errors: validationResult.errors
    }, { status: 400 });
  }
  
  // Proceed with data processing
  // ...
}
```

## Error Handling

The validation system provides detailed error information:

```typescript
interface ValidationError {
  field: string;        // Field that failed validation
  message: string;      // Human-readable error message
  type: 'validation' | 'business' | 'relationship';
  value?: any;          // The invalid value
}
```

### Error Types

- **validation** - Basic field validation errors (type, format, required)
- **business** - Business rule violations
- **relationship** - Foreign key or referential integrity errors

## Performance Considerations

### Caching

The validation system automatically caches related data to improve performance:

```typescript
// Cache is automatically managed, but you can clear it if needed
dataValidator.clearCache();

// Get cache statistics
const stats = dataValidator.getCacheStats();
console.log('Cached tables:', stats.tables);
```

### Batch Operations

For better performance when validating multiple records:

```typescript
// ✅ Good - uses batch validation
const result = await validateBatch('Materiales', materials);

// ❌ Avoid - validates one by one
const results = await Promise.all(
  materials.map(material => validateRecord('Materiales', material))
);
```

## Configuration

### Adding New Validation Rules

To add validation for a new field:

```typescript
// In schemas.ts
{
  field: 'new_field',
  type: 'string',
  message: 'New field must be a valid string',
  min: 3,
  max: 50
}
```

### Adding Business Rules

```typescript
// In schemas.ts
{
  name: 'custom_business_rule',
  description: 'Custom validation logic',
  validator: async (record, context) => {
    // Your validation logic here
    return true; // or false
  },
  message: 'Custom validation failed'
}
```

### Adding Relationship Rules

```typescript
// In schemas.ts
{
  field: 'foreign_key_field',
  referencedTable: 'ReferencedTable',
  referencedField: 'id',
  required: true,
  message: 'Referenced record does not exist'
}
```

## Testing

The validation system includes comprehensive tests:

```bash
# Run validation tests
npm test -- validation.test.ts
```

## Best Practices

1. **Always validate on create/update operations**
2. **Use batch validation for multiple records**
3. **Handle validation errors gracefully in UI**
4. **Clear cache when underlying data changes**
5. **Use specific error messages for better UX**
6. **Test validation rules thoroughly**

## Troubleshooting

### Common Issues

1. **Async validation not working**: Ensure you're using `await` with validation functions
2. **Cache issues**: Clear cache if you're getting stale validation results
3. **Relationship validation failing**: Check that referenced tables have correct data
4. **Performance issues**: Use batch validation for multiple records

### Debug Mode

Enable detailed logging:

```typescript
// The validation system logs errors to console
// Check browser/server console for detailed error information
```

## API Reference

### Main Functions

- `validateRecord(tableName, data, operation?)` - Validate single record
- `validateBatch(tableName, records, operation?)` - Validate multiple records
- `dataValidator.clearCache()` - Clear validation cache
- `dataValidator.getCacheStats()` - Get cache statistics

### Types

- `ValidationResult` - Single record validation result
- `BatchValidationResult` - Batch validation result
- `ValidationError` - Error information
- `ValidationWarning` - Warning information
- `TableSchema` - Table validation schema
- `BusinessRule` - Business rule definition