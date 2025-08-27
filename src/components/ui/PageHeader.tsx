'use client';

import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  subtitle, 
  breadcrumbs = [], 
  actions,
  className = '' 
}: PageHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      {breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} className="mb-2" />
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="mt-4 flex sm:mt-0 sm:ml-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}