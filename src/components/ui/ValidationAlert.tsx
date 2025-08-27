/**
 * Validation alert component for displaying business rule validation results
 */

import React from 'react';
import { ValidationResult } from '@/lib/businessRules';
import { 
  ExclamationTriangleIcon, 
  XCircleIcon, 
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface ValidationAlertProps {
  validation: ValidationResult;
  showSuccess?: boolean;
  className?: string;
}

export function ValidationAlert({ 
  validation, 
  showSuccess = false, 
  className = '' 
}: ValidationAlertProps) {
  const { isValid, errors, warnings } = validation;

  // Don't render anything if valid and not showing success
  if (isValid && !showSuccess && (!warnings || warnings.length === 0)) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Success message */}
      {isValid && showSuccess && (
        <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-md">
          <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-green-700">
            Validación exitosa
          </div>
        </div>
      )}

      {/* Error messages */}
      {errors && errors.length > 0 && (
        <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-md">
          <XCircleIcon className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">
              {errors.length === 1 ? 'Error de validación' : 'Errores de validación'}
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warning messages */}
      {warnings && warnings.length > 0 && (
        <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              {warnings.length === 1 ? 'Advertencia' : 'Advertencias'}
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline validation message component
 */
interface ValidationMessageProps {
  validation: ValidationResult;
  type?: 'error' | 'warning' | 'info';
  className?: string;
}

export function ValidationMessage({ 
  validation, 
  type = 'error', 
  className = '' 
}: ValidationMessageProps) {
  const { isValid, errors, warnings } = validation;

  const messages = type === 'warning' ? warnings : errors;
  
  if (!messages || messages.length === 0) {
    return null;
  }

  const styles = {
    error: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200'
  };

  const icons = {
    error: XCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`flex items-center space-x-2 p-2 border rounded text-sm ${styles[type]} ${className}`}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>
        {messages.length === 1 ? messages[0] : `${messages.length} ${type === 'error' ? 'errores' : 'advertencias'} encontradas`}
      </span>
    </div>
  );
}

/**
 * Validation summary component for forms
 */
interface ValidationSummaryProps {
  validations: ValidationResult[];
  title?: string;
  className?: string;
}

export function ValidationSummary({ 
  validations, 
  title = 'Resumen de validación',
  className = '' 
}: ValidationSummaryProps) {
  const allErrors = validations.flatMap(v => v.errors || []);
  const allWarnings = validations.flatMap(v => v.warnings || []);
  const isAllValid = validations.every(v => v.isValid);

  if (isAllValid && allWarnings.length === 0) {
    return null;
  }

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-3">{title}</h3>
      
      <ValidationAlert 
        validation={{
          isValid: isAllValid,
          errors: allErrors,
          warnings: allWarnings
        }}
        showSuccess={isAllValid}
      />
    </div>
  );
}

/**
 * Hook to manage validation state
 */
export function useValidationState(initialValidation?: ValidationResult) {
  const [validation, setValidation] = React.useState<ValidationResult>(
    initialValidation || { isValid: true, errors: [] }
  );

  const addError = React.useCallback((error: string) => {
    setValidation(prev => ({
      ...prev,
      isValid: false,
      errors: [...(prev.errors || []), error]
    }));
  }, []);

  const addWarning = React.useCallback((warning: string) => {
    setValidation(prev => ({
      ...prev,
      warnings: [...(prev.warnings || []), warning]
    }));
  }, []);

  const clearValidation = React.useCallback(() => {
    setValidation({ isValid: true, errors: [] });
  }, []);

  const setValidationResult = React.useCallback((result: ValidationResult) => {
    setValidation(result);
  }, []);

  return {
    validation,
    addError,
    addWarning,
    clearValidation,
    setValidationResult
  };
}