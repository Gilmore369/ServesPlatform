'use client';

import React from 'react';
import { Loading } from './Loading';

// Skeleton loader for table rows
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-gray-200 py-4">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="flex-1 h-4 bg-gray-200 rounded"
                style={{ width: colIndex === 0 ? '25%' : '20%' }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton loader for cards
export function CardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded mb-2" style={{ width: '70%' }} />
              <div className="h-4 bg-gray-200 rounded" style={{ width: '40%' }} />
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-200 rounded" style={{ width: '60%' }} />
            <div className="h-4 bg-gray-200 rounded" style={{ width: '80%' }} />
            <div className="h-4 bg-gray-200 rounded" style={{ width: '50%' }} />
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4" />
          
          <div className="flex justify-end gap-2">
            <div className="h-8 w-8 bg-gray-200 rounded" />
            <div className="h-8 w-8 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Loading overlay for forms and modals
export function LoadingOverlay({ message = 'Cargando...', transparent = false }: { 
  message?: string; 
  transparent?: boolean; 
}) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center z-50 ${
      transparent ? 'bg-white bg-opacity-75' : 'bg-white'
    }`}>
      <div className="flex flex-col items-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600" />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// Loading state for buttons
export function ButtonLoading({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-white border-t-transparent ${sizeClasses[size]}`} />
  );
}

// Loading state for lists
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-3 bg-white rounded-lg border animate-pulse">
          <div className="h-10 w-10 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded" style={{ width: '60%' }} />
            <div className="h-3 bg-gray-200 rounded" style={{ width: '40%' }} />
          </div>
          <div className="h-6 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

// Loading state for dashboard widgets
export function WidgetSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-200 rounded" style={{ width: '40%' }} />
        <div className="h-4 w-4 bg-gray-200 rounded" />
      </div>
      <div className="h-8 bg-gray-200 rounded mb-2" style={{ width: '30%' }} />
      <div className="h-3 bg-gray-200 rounded" style={{ width: '60%' }} />
    </div>
  );
}

// Error state component
export function ErrorState({ 
  message = 'Ha ocurrido un error', 
  onRetry, 
  showRetry = true 
}: { 
  message?: string; 
  onRetry?: () => void; 
  showRetry?: boolean; 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 text-red-400 mb-4">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}

// Empty state component
export function EmptyState({ 
  title = 'No hay datos', 
  description, 
  action, 
  icon 
}: { 
  title?: string; 
  description?: string; 
  action?: React.ReactNode; 
  icon?: React.ReactNode; 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-center">
        {icon && (
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        {description && (
          <p className="text-gray-600 mb-4 max-w-sm">{description}</p>
        )}
        {action}
      </div>
    </div>
  );
}

// Progress indicator for multi-step processes
export function ProgressIndicator({ 
  current, 
  total, 
  label 
}: { 
  current: number; 
  total: number; 
  label?: string; 
}) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>{label || 'Progreso'}</span>
        <span>{current} de {total} ({percentage}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default {
  TableSkeleton,
  CardSkeleton,
  LoadingOverlay,
  ButtonLoading,
  ListSkeleton,
  WidgetSkeleton,
  ErrorState,
  EmptyState,
  ProgressIndicator,
};