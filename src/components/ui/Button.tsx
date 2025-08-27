import React, { forwardRef } from 'react';
import { Tooltip } from './Tooltip';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const getVariantClasses = (variant: ButtonVariant): string => {
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    destructive: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
    ghost: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
    link: 'text-blue-600 underline-offset-4 hover:underline',
  };
  return variants[variant];
};

const getSizeClasses = (size: ButtonSize): string => {
  const sizes = {
    default: 'h-10 py-2 px-4',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-12 px-8',
    icon: 'h-10 w-10',
  };
  return sizes[size];
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  tooltip?: string;
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
  'aria-label'?: string;
  'aria-describedby'?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className = '', 
    variant = 'default', 
    size = 'default', 
    loading = false,
    loadingText = 'Cargando...',
    tooltip,
    tooltipPlacement = 'top',
    children,
    disabled,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;
    
    const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none touch-manipulation relative';
    const variantClasses = getVariantClasses(variant);
    const sizeClasses = getSizeClasses(size);
    
    const buttonClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`.trim();

    // Ensure proper accessibility attributes
    const accessibilityProps = {
      'aria-disabled': isDisabled,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'aria-busy': loading,
    };

    const buttonElement = (
      <button
        className={buttonClasses}
        ref={ref}
        disabled={isDisabled}
        {...accessibilityProps}
        {...props}
      >
        {loading && (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="sr-only">{loadingText}</span>
          </>
        )}
        {loading ? (
          <span aria-live="polite">{loadingText}</span>
        ) : (
          children
        )}
      </button>
    );

    // Wrap with tooltip if provided
    if (tooltip && !isDisabled) {
      return (
        <Tooltip content={tooltip} placement={tooltipPlacement}>
          {buttonElement}
        </Tooltip>
      );
    }

    return buttonElement;
  }
);

Button.displayName = 'Button';

export { Button };