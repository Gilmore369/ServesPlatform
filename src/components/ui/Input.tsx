import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  showRequiredIndicator?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className = '', 
    label,
    error,
    helperText,
    required = false,
    fullWidth = false,
    showRequiredIndicator = true,
    id,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    
    // Combine all describedby IDs
    const describedByIds = [
      ariaDescribedBy,
      errorId,
      helperId,
    ].filter(Boolean).join(' ') || undefined;
    
    const baseClasses = 'block px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors';
    const errorClasses = error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : '';
    const widthClasses = fullWidth ? 'w-full' : '';
    
    const inputClasses = `${baseClasses} ${errorClasses} ${widthClasses} ${className}`.trim();

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && showRequiredIndicator && (
              <span 
                className="text-red-500 ml-1" 
                aria-label="campo requerido"
                title="Campo requerido"
              >
                *
              </span>
            )}
          </label>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedByIds}
          aria-required={required}
          aria-label={!label ? ariaLabel : undefined}
          {...props}
        />
        
        {error && (
          <div 
            id={errorId}
            className="mt-1 flex items-start"
            role="alert"
            aria-live="polite"
          >
            <svg
              className="h-4 w-4 text-red-500 mt-0.5 mr-1 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}
        
        {helperText && !error && (
          <p 
            id={helperId}
            className="mt-1 text-sm text-gray-500 flex items-start"
          >
            <svg
              className="h-4 w-4 text-gray-400 mt-0.5 mr-1 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };