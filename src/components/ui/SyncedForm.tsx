/**
 * Synced Form Component
 * Form wrapper that integrates with data synchronization and provides immediate feedback
 */

'use client';

import React, { useState, useCallback } from 'react';
import { DataOperationFeedback, LoadingButton } from './DataOperationFeedback';
import { DataSyncState, DataSyncActions } from '@/hooks/useDataSync';

interface SyncedFormProps<T> {
  children: React.ReactNode;
  syncState: DataSyncState;
  syncActions: DataSyncActions<T>;
  onSubmit: (data: Partial<T>) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  className?: string;
  showFeedback?: boolean;
  disabled?: boolean;
}

export function SyncedForm<T extends { id: string }>({
  children,
  syncState,
  syncActions,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  className = '',
  showFeedback = true,
  disabled = false
}: SyncedFormProps<T>) {
  const [formData, setFormData] = useState<Partial<T>>({});

  const isSubmitting = syncState.creating || syncState.updating;
  const isDisabled = disabled || isSubmitting;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDisabled) return;
    
    try {
      await onSubmit(formData);
    } catch (error) {
      // Error is handled by the sync hook
      console.error('Form submission error:', error);
    }
  }, [formData, onSubmit, isDisabled]);

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Feedback Messages */}
      {showFeedback && (
        <DataOperationFeedback
          state={syncState}
          onClearError={syncActions.clearError}
          onClearLastOperation={syncActions.clearLastOperation}
        />
      )}

      {/* Form Content */}
      <div className={isSubmitting ? 'opacity-75 pointer-events-none' : ''}>
        {children}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isDisabled}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
        )}
        
        <LoadingButton
          type="submit"
          loading={isSubmitting}
          disabled={isDisabled}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {submitLabel}
        </LoadingButton>
      </div>
    </form>
  );
}

/**
 * Quick action buttons with sync feedback
 */
interface SyncedActionButtonProps<T> {
  syncState: DataSyncState;
  action: () => Promise<T | void>;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  showStatus?: boolean;
}

export function SyncedActionButton<T>({
  syncState,
  action,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  showStatus = false
}: SyncedActionButtonProps<T>) {
  const [isExecuting, setIsExecuting] = useState(false);

  const isLoading = isExecuting || syncState.creating || syncState.updating || syncState.deleting;
  const isDisabled = disabled || isLoading;

  const handleClick = useCallback(async () => {
    if (isDisabled) return;
    
    setIsExecuting(true);
    try {
      await action();
    } catch (error) {
      console.error('Action execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [action, isDisabled]);

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700';
      case 'secondary':
        return 'bg-gray-600 text-white hover:bg-gray-700';
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700';
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-sm';
      case 'md':
        return 'px-4 py-2';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <LoadingButton
        loading={isLoading}
        disabled={isDisabled}
        onClick={handleClick}
        className={`${getVariantClasses()} ${getSizeClasses()} rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {children}
      </LoadingButton>
      
      {showStatus && (
        <div className="flex items-center">
          {syncState.error && (
            <span className="text-xs text-red-600">Error</span>
          )}
          {syncState.lastOperation.success && !syncState.error && (
            <span className="text-xs text-green-600">✓</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Data table with sync actions
 */
interface SyncedDataTableProps<T> {
  data: T[];
  syncState: DataSyncState;
  syncActions: DataSyncActions<T>;
  columns: Array<{
    key: keyof T;
    label: string;
    render?: (value: any, item: T) => React.ReactNode;
  }>;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  className?: string;
  showActions?: boolean;
}

export function SyncedDataTable<T extends { id: string }>({
  data,
  syncState,
  syncActions,
  columns,
  onEdit,
  onDelete,
  className = '',
  showActions = true
}: SyncedDataTableProps<T>) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(async (item: T) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este elemento?')) {
      setDeletingId(item.id);
      try {
        await syncActions.delete(item.id);
        if (onDelete) {
          onDelete(item);
        }
      } catch (error) {
        console.error('Delete error:', error);
      } finally {
        setDeletingId(null);
      }
    }
  }, [syncActions, onDelete]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Feedback */}
      <DataOperationFeedback
        state={syncState}
        onClearError={syncActions.clearError}
        onClearLastOperation={syncActions.clearLastOperation}
      />

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
              {showActions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render 
                      ? column.render(item[column.key], item)
                      : String(item[column.key] || '')
                    }
                  </td>
                ))}
                {showActions && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(item)}
                        disabled={syncState.updating}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                      >
                        Editar
                      </button>
                    )}
                    {onDelete && (
                      <LoadingButton
                        loading={deletingId === item.id}
                        onClick={() => handleDelete(item)}
                        disabled={syncState.deleting}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        Eliminar
                      </LoadingButton>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {data.length === 0 && !syncState.loading && (
        <div className="text-center py-8 text-gray-500">
          No hay datos disponibles
        </div>
      )}

      {/* Loading State */}
      {syncState.loading && data.length === 0 && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Cargando datos...</p>
        </div>
      )}
    </div>
  );
}