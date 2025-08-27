'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Project } from '@/lib/types';

interface ProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
  showTeamMembers?: boolean;
  teamMembers?: Array<{
    id: string;
    nombre: string;
    initials: string;
    color: string;
  }>;
  isLoading?: boolean;
}

const statusColors = {
  'Planificación': 'warning',
  'En progreso': 'success',
  'Pausado': 'danger',
  'Cerrado': 'secondary'
} as const;

const progressColors = {
  low: 'bg-red-500',
  medium: 'bg-yellow-500',
  high: 'bg-blue-500',
  complete: 'bg-green-500'
};

function getProgressColor(percentage: number): keyof typeof progressColors {
  if (percentage >= 100) return 'complete';
  if (percentage >= 70) return 'high';
  if (percentage >= 40) return 'medium';
  return 'low';
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === 'USD' ? '$' : 'S/';
  return `${symbol} ${amount.toLocaleString()}`;
}

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function ProjectCard({
  project,
  onClick,
  showTeamMembers = true,
  teamMembers = [],
  isLoading = false
}: ProjectCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(project);
    }
  };

  const isClickable = !!onClick;
  const progressColor = getProgressColor(project.avance_pct);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-5 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
          <div className="mb-3">
            <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
            <div className="w-full bg-gray-200 rounded-full h-2"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    );
  }

  const content = (
    <>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">
            {project.nombre}
          </h3>
          <Badge 
            variant={statusColors[project.estado]} 
            size="sm"
            className="ml-2 flex-shrink-0"
          >
            {project.estado}
          </Badge>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {project.descripcion}
        </p>

        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progreso</span>
            <span>{project.avance_pct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`${progressColors[progressColor]} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${Math.min(project.avance_pct, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Inicio</p>
            <p className="font-medium">{formatDate(project.inicio_plan)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Fin</p>
            <p className="font-medium">{formatDate(project.fin_plan)}</p>
          </div>
        </div>

        {project.presupuesto_total > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Presupuesto</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(project.presupuesto_total, project.moneda)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
        {showTeamMembers && (
          <div className="flex -space-x-2">
            {teamMembers.slice(0, 3).map((member, index) => (
              <div
                key={member.id}
                className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium ${member.color}`}
                title={member.nombre}
              >
                {member.initials}
              </div>
            ))}
            {teamMembers.length > 3 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                +{teamMembers.length - 3}
              </div>
            )}
            {teamMembers.length === 0 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
        )}
        
        {isClickable && (
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
            Ver detalles
          </button>
        )}
      </div>
    </>
  );

  if (isClickable) {
    return (
      <button
        onClick={handleClick}
        className="bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full text-left"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      {content}
    </div>
  );
}