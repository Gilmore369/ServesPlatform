import React, { forwardRef } from 'react';

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

const Form = forwardRef<HTMLFormElement, FormProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <form
        ref={ref}
        className={`space-y-4 ${className}`.trim()}
        noValidate // We'll handle validation ourselves for better accessibility
        {...props}
      >
        {children}
      </form>
    );
  }
);

Form.displayName = 'Form';

// Form Field wrapper for consistent spacing and layout
export interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({ children, className = '' }) => {
  return (
    <div className={`space-y-1 ${className}`.trim()}>
      {children}
    </div>
  );
};

// Form Group for related fields
export interface FormGroupProps {
  children: React.ReactNode;
  legend?: string;
  className?: string;
}

const FormGroup: React.FC<FormGroupProps> = ({ children, legend, className = '' }) => {
  if (legend) {
    return (
      <fieldset className={`space-y-4 ${className}`.trim()}>
        <legend className="text-base font-medium text-gray-900 mb-4">
          {legend}
        </legend>
        {children}
      </fieldset>
    );
  }

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {children}
    </div>
  );
};

// Form Actions for buttons
export interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

const FormActions: React.FC<FormActionsProps> = ({ 
  children, 
  className = '', 
  align = 'right' 
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div className={`flex gap-3 pt-4 ${alignClasses[align]} ${className}`.trim()}>
      {children}
    </div>
  );
};

export { Form, FormField, FormGroup, FormActions };