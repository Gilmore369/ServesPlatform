'use client';

import React from 'react';
import { DashboardTask, PendingTasksProps, PRIORITY_COLORS } from '@/lib/dashboard-types';

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

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ExclamationIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

// Utility functions
function formatDueDate(date: Date): string {
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays === -1) return 'Ayer';
  if (diffDays < 0) return `Hace ${Math.abs(diffDays)} día${Math.abs(diffDays) !== 1 ? 's' : ''}`;
  if (diffDays <= 7) return `En ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
  
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit'
  });
}

function isOverdue(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);
  return taskDate < today;
}

function isDueToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// Priority border colors mapping
const PRIORITY_BORDER_COLORS = {
  'Alta': 'border-l-blue-500',
  'Media': 'border-l-yellow-500',
  'Baja': 'border-l-green-500',
};

// Loading skeleton component
const TaskSkeleton = () => (
  <div className="animate-pulse border-l-4 border-gray-200 pl-4 py-3">
    <div className="flex justify-between items-start mb-2">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="h-5 bg-gray-200 rounded w-16 ml-2"></div>
    </div>
    <div className="flex items-center justify-between mt-2">
      <div className="h-3 bg-gray-200 rounded w-24"></div>
      <div className="h-6 bg-gray-200 rounded w-20"></div>
    </div>
  </div>
);

// Individual task item component
interface TaskItemProps {
  task: DashboardTask;
  onComplete: (taskId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onComplete }) => {
  const handleComplete = () => {
    if (task.status !== 'Completada') {
      onComplete(task.id);
    }
  };

  const overdue = isOverdue(task.dueDate);
  const dueToday = isDueToday(task.dueDate);

  return (
    <div className={`border-l-4 ${PRIORITY_BORDER_COLORS[task.priority]} pl-4 py-3 hover:bg-gray-50 transition-colors`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
            {task.title}
          </h4>
          <p className="text-xs text-gray-600 mt-1">
            {task.project}
          </p>
        </div>
        
        <div className="flex items-center ml-3 flex-shrink-0">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center text-xs">
          <ClockIcon className="w-3 h-3 mr-1 text-gray-400" />
          <span className={`${overdue ? 'text-red-600 font-medium' : dueToday ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
            {formatDueDate(task.dueDate)}
          </span>
          {overdue && (
            <ExclamationIcon className="w-3 h-3 ml-1 text-red-500" />
          )}
        </div>

        {task.status !== 'Completada' && (
          <button
            onClick={handleComplete}
            className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            title="Marcar como completada"
          >
            <CheckIcon className="w-3 h-3 mr-1" />
            Completar
          </button>
        )}
      </div>

      {/* Overdue warning */}
      {overdue && task.status !== 'Completada' && (
        <div className="mt-2 flex items-center text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
          <ExclamationIcon className="w-3 h-3 mr-1" />
          Tarea vencida
        </div>
      )}
    </div>
  );
};

// Main PendingTasks component
export const PendingTasks: React.FC<PendingTasksProps> = ({
  tasks,
  onCompleteTask,
  onAddTask,
  isLoading = false
}) => {
  // Sort tasks by priority and due date
  const sortedTasks = [...tasks].sort((a, b) => {
    // First sort by priority (Alta > Media > Baja)
    const priorityOrder = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then sort by due date (earliest first)
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  // Filter out completed tasks for the main view
  const pendingTasks = sortedTasks.filter(task => task.status !== 'Completada');

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tareas Pendientes</h3>
            <p className="text-sm text-gray-600 mt-1">
              {pendingTasks.length} tarea{pendingTasks.length !== 1 ? 's' : ''} pendiente{pendingTasks.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onAddTask}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Agregar Tarea
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <TaskSkeleton key={index} />
            ))}
          </div>
        ) : pendingTasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
              <CheckIcon className="w-full h-full" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">¡Todas las tareas completadas!</h4>
            <p className="text-gray-600 mb-4">No tienes tareas pendientes en este momento.</p>
            <button
              onClick={onAddTask}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Crear Nueva Tarea
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {pendingTasks.slice(0, 8).map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={onCompleteTask}
              />
            ))}
            
            {pendingTasks.length > 8 && (
              <div className="pt-4 border-t border-gray-100 mt-4">
                <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-2 hover:bg-blue-50 rounded transition-colors">
                  Ver todas las tareas ({pendingTasks.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingTasks;