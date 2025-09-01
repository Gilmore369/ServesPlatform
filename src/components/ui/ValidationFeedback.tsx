/**
 * Validation Feedback Component
 * Displays validation errors and warnings in a user-friendly format
 */

'use client';

import React from 'react';
import { ValidationResult, ValidationError, ValidationWarning } from '@/lib/validation/types';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Badge } from './badge';

interface ValidationFeedbackProps {
  validationResult?: ValidationResult | null;
  className?: string;
  showWarnings?: boolean;
  compact?: boolean;
}

export function ValidationFeedback({
  validationResult,
  className = '',
  showWarnings = true,
  compact = false
}: ValidationFeedbackProps) {
  if (!validationResult || validationResult.isValid) {
    return null;
  }

  const { errors, warnings = [] } = validationResult;

  if (errors.length === 0 && (!showWarnings || warnings.length === 0)) {
    return null;
  }

  // Group errors by type for better organization
  const errorsByType = errors.reduce((acc, error) => {
    if (!acc[error.type]) {
      acc[error.type] = [];
    }
    acc[error.type].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  const getErrorTypeLabel = (type: string) => {
    switch (type) {
      case 'validation': return 'Validación';
      case 'business': return 'Reglas de Negocio';
      case 'relationship': return 'Relaciones';
      default: return 'Error';
    }
  };

  const getErrorTypeVariant = (type: string) => {
    switch (type) {
      case 'validation': return 'destructive';
      case 'business': return 'warning';
      case 'relationship': return 'default';
      default: return 'destructive';
    }
  };

  if (compact) {
    return (
      <div className={`validation-feedback-compact ${className}`}>
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              {errors.length === 1 
                ? errors[0].message
                : `${errors.length} errores de validación encontrados`
              }
            </AlertDescription>
          </Alert>
        )}
        
        {showWarnings && warnings.length > 0 && (
          <Alert variant="warning" className="mt-2">
            <AlertDescription>
              {warnings.length === 1 
                ? warnings[0].message
                : `${warnings.length} advertencias encontradas`
              }
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className={`validation-feedback ${className}`}>
      {/* Errors by type */}
      {Object.entries(errorsByType).map(([type, typeErrors]) => (
        <Alert key={type} variant={getErrorTypeVariant(type) as any} className="mb-3">
          <AlertTitle className="flex items-center gap-2">
            <Badge variant="outline" size="sm">
              {getErrorTypeLabel(type)}
            </Badge>
            {typeErrors.length > 1 && (
              <span className="text-sm font-normal">
                ({typeErrors.length} errores)
              </span>
            )}
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {typeErrors.map((error, index) => (
                <li key={index} className="text-sm">
                  <span className="font-medium">{error.field}:</span> {error.message}
                  {error.value !== undefined && (
                    <span className="text-xs text-gray-500 ml-2">
                      (Valor: {JSON.stringify(error.value)})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ))}

      {/* Warnings */}
      {showWarnings && warnings.length > 0 && (
        <Alert variant="warning">
          <AlertTitle className="flex items-center gap-2">
            <Badge variant="outline" size="sm">
              Advertencias
            </Badge>
            {warnings.length > 1 && (
              <span className="text-sm font-normal">
                ({warnings.length} advertencias)
              </span>
            )}
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {warnings.map((warning, index) => (
                <li key={index} className="text-sm">
                  <span className="font-medium">{warning.field}:</span> {warning.message}
                  {warning.value !== undefined && (
                    <span className="text-xs text-gray-500 ml-2">
                      (Valor: {JSON.stringify(warning.value)})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Field-specific validation feedback component
 */
interface FieldValidationFeedbackProps {
  fieldName: string;
  validationResult?: ValidationResult | null;
  className?: string;
}

export function FieldValidationFeedback({
  fieldName,
  validationResult,
  className = ''
}: FieldValidationFeedbackProps) {
  if (!validationResult || validationResult.isValid) {
    return null;
  }

  const fieldErrors = validationResult.errors.filter(error => error.field === fieldName);
  const fieldWarnings = validationResult.warnings?.filter(warning => warning.field === fieldName) || [];

  if (fieldErrors.length === 0 && fieldWarnings.length === 0) {
    return null;
  }

  return (
    <div className={`field-validation-feedback ${className}`}>
      {fieldErrors.map((error, index) => (
        <div key={`error-${index}`} className="text-red-600 text-sm mt-1">
          {error.message}
        </div>
      ))}
      
      {fieldWarnings.map((warning, index) => (
        <div key={`warning-${index}`} className="text-yellow-600 text-sm mt-1">
          {warning.message}
        </div>
      ))}
    </div>
  );
}

/**
 * Hook for real-time field validation
 */
export function useFieldValidation(tableName: string, fieldName: string) {
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = React.useState(false);

  const validateField = React.useCallback(async (value: any, fullRecord?: any) => {
    if (!value && value !== 0 && value !== false) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    try {
      const { validateRecord } = await import('@/lib/validation');
      const recordToValidate = fullRecord || { [fieldName]: value };
      const result = await validateRecord(tableName, recordToValidate, 'create');
      
      // Filter to only show errors/warnings for this field
      const fieldResult = {
        isValid: result.errors.filter(e => e.field === fieldName).length === 0,
        errors: result.errors.filter(e => e.field === fieldName),
        warnings: result.warnings?.filter(w => w.field === fieldName) || []
      };
      
      setValidationResult(fieldResult);
    } catch (error) {
      console.error('Field validation error:', error);
      setValidationResult({
        isValid: false,
        errors: [{
          field: fieldName,
          message: 'Error de validación',
          type: 'validation'
        }]
      });
    } finally {
      setIsValidating(false);
    }
  }, [tableName, fieldName]);

  const clearValidation = React.useCallback(() => {
    setValidationResult(null);
  }, []);

  return {
    validationResult,
    isValidating,
    validateField,
    clearValidation,
    hasErrors: validationResult && !validationResult.isValid,
    hasWarnings: validationResult && (validationResult.warnings?.length || 0) > 0
  };
}

/**
 * Enhanced Input component with built-in validation
 */
interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  tableName: string;
  fieldName: string;
  label?: string;
  fullRecord?: any;
  showValidation?: boolean;
  validationDelay?: number;
}

export function ValidatedInput({
  tableName,
  fieldName,
  label,
  fullRecord,
  showValidation = true,
  validationDelay = 500,
  className = '',
  onChange,
  ...props
}: ValidatedInputProps) {
  const [value, setValue] = React.useState(props.value || '');
  const [validationTimer, setValidationTimer] = React.useState<NodeJS.Timeout | null>(null);
  
  const {
    validationResult,
    isValidating,
    validateField,
    hasErrors,
    hasWarnings
  } = useFieldValidation(tableName, fieldName);

  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Call parent onChange
    if (onChange) {
      onChange(e);
    }

    // Clear existing timer
    if (validationTimer) {
      clearTimeout(validationTimer);
    }

    // Set new validation timer
    if (showValidation) {
      const timer = setTimeout(() => {
        validateField(newValue, fullRecord);
      }, validationDelay);
      setValidationTimer(timer);
    }
  }, [onChange, validationTimer, showValidation, validationDelay, validateField, fullRecord]);

  React.useEffect(() => {
    return () => {
      if (validationTimer) {
        clearTimeout(validationTimer);
      }
    };
  }, [validationTimer]);

  const inputClassName = `
    ${className}
    ${hasErrors ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    ${hasWarnings ? 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500' : ''}
    ${isValidating ? 'opacity-75' : ''}
  `.trim();

  return (
    <div className="validated-input-container">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          {...props}
          value={value}
          onChange={handleChange}
          className={inputClassName}
        />
        
        {isValidating && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {showValidation && (
        <FieldValidationFeedback
          fieldName={fieldName}
          validationResult={validationResult}
          className="mt-1"
        />
      )}
    </div>
  );
}

export default ValidationFeedback;