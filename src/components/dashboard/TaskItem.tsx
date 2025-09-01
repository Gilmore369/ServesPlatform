'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity } from '@/lib/types';

interface TaskItemProps {
  task: Activity;
  projectName?: string;
  onComplete?: (task: Activity) => void;
  onEdit?: (task: Activity) => void;
  onClick?: (task: Activity) => void;
  showProject?: boolean;
  isLoading?: boolean;
}

const priorityColors = {
  'Baja': 'success',
  'Media': 'warning', 
  'Alta': 'danger',
  'Crítica': 'danger'
} as const;

const statusColors = {
  'Pendiente': 'secondary',
  'En progreso': 'info',
  'En revisión': 'warning',
  'Completada': 'success'
} as const;

const priorityBorderColors = {
  'Baja': 'border-green-500',
  'Media': 'border-yellow-500',
  'Alta': 'border-orange-500',
  'Crítica': 'border-red-500'
};

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const diffTime = dateObj.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays === -1) return 'Ayer';
  if (diffDays < 0) return `Hace ${Math.abs(diffDays)} días`;
  if (diffDays <= 7) return `En ${diffDays} días`;
  
  return dateObj.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit'
  });
}

function isOverdue(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj < new Date() && dateObj.toDateString() !== new Date().toDateString();
}

function getDaysUntilDue(date: Date | string): number {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return Math.ceil((dateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Icons
const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

export function TaskItem({
  task,
  projectName,
  onComplete,
  onEdit,
  onClick,
  showProject = true,
  isLoading = false
}: TaskItemProps) {
  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onComplete && task.estado !== 'Completada') {
      onComplete(task);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(task);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(task);
    }
  };

  const isTaskOverdue = isOverdue(task.fin_plan);
  const daysUntilDue = getDaysUntilDue(task.fin_plan);
  const isClickable = !!onClick;
  const canComplete = task.estado !== 'Completada' && !!onComplete;
  const canEdit = !!onEdit;

  if (isLoading) {
    return (
      <div className="animate-pulse border-l-4 border-gray-200 pl-3 py-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="h-5 bg-gray-200 rounded w-12 ml-2"></div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="h-3 bg-gray-200 rounded w-20"></div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    );
  }

  const content = (
    <div className={`border-l-4 ${priorityBorderColors[task.prioridad]} pl-3 py-3 ${isClickable ? 'cursor-pointer' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 line-clamp-1">
            {task.titulo}
          </h3>
          {showProject && projectName && (
            <p className="text-sm text-gray-600 line-clamp-1">
              {projectName}
            </p>
          )}
          {task.descripcion && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {task.descripcion}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
          <Badge 
            variant={priorityColors[task.prioridad]} 
            size="sm"
          >
            {task.prioridad}
          </Badge>
          <Badge 
            variant={statusColors[task.estado]} 
            size="sm"
          >
            {task.estado}
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center text-xs text-gray-500">
          <ClockIcon className="w-4 h-4 mr-1" />
          <span className={isTaskOverdue ? 'text-red-600 font-medium' : ''}>
            Vence: {formatDate(task.fin_plan)}
            {isTaskOverdue && ' (Vencida)'}
          </span>
          {task.porcentaje_avance > 0 && (
            <span className="ml-3 text-blue-600">
              {task.porcentaje_avance}% completado
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {canEdit && (
            <button
              onClick={handleEdit}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Editar tarea"
            >
              <EditIcon className="w-4 h-4" />
            </button>
          )}
          
          {canComplete && (
            <button
              onClick={handleComplete}
              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              title="Marcar como completada"
            >
              <CheckIcon className="w-4 h-4 inline mr-1" />
              Completar
            </button>
          )}
        </div>
      </div>

      {/* Progress bar for tasks in progress */}
      {task.porcentaje_avance > 0 && task.estado !== 'Completada' && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(task.porcentaje_avance, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Overdue warning */}
      {isTaskOverdue && task.estado !== 'Completada' && (
        <div className="mt-2 flex items-center text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Tarea vencida hace {Math.abs(daysUntilDue)} día{Math.abs(daysUntilDue) !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );

  if (isClickable) {
    return (
      <div 
        onClick={handleClick}
        className="hover:bg-gray-50 rounded transition-colors"
      >
        {content}
      </div>
    );
  }

  return content;
}