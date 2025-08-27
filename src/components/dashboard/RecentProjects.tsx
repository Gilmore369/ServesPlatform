'use client';

import React from 'react';
import { DashboardProject, RecentProjectsProps, STATUS_COLORS } from '@/lib/dashboard-types';
import { PlusIcon } from '@heroicons/react/24/outline';

interface ProjectCardProps {
  project: DashboardProject;
  onViewDetails: (projectId: string) => void;
}

function ProjectCard({ project, onViewDetails }: ProjectCardProps) {
  const handleViewDetails = () => {
    onViewDetails(project.id);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 hover:border-gray-300 group card-hover card-polish">
      <div className="p-4 sm:p-6">
        {/* Header with title and status */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {project.name}
          </h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[project.status]} ml-2 flex-shrink-0`}>
            {project.status}
          </span>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {project.description}
        </p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Progreso</span>
            <span>{project.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`${getProgressColor(project.progress)} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(project.progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-gray-500 text-xs mb-1">Inicio</p>
            <p className="font-medium text-gray-900">{formatDate(project.startDate)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Fin</p>
            <p className="font-medium text-gray-900">{formatDate(project.endDate)}</p>
          </div>
        </div>

        {/* Team Avatars */}
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {project.teamMembers.slice(0, 4).map((member, index) => (
              <div
                key={member.id}
                className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium shadow-sm"
                title={member.name}
              >
                {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            ))}
            {project.teamMembers.length > 4 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 shadow-sm">
                +{project.teamMembers.length - 4}
              </div>
            )}
            {project.teamMembers.length === 0 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs text-gray-400 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>

          {/* View Details Button */}
          <button
            onClick={handleViewDetails}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            Ver detalles
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-5 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
        <div className="mb-4">
          <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="w-full bg-gray-200 rounded-full h-2"></div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="h-3 bg-gray-200 rounded w-12 mb-1"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
          <div>
            <div className="h-3 bg-gray-200 rounded w-8 mb-1"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  );
}

export function RecentProjects({ 
  projects, 
  onViewDetails, 
  onNewProject, 
  isLoading = false 
}: RecentProjectsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-300 ease-in-out hover:shadow-md">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 transition-colors duration-200">Proyectos Recientes</h3>
            <p className="text-sm text-gray-600 mt-1">Gestiona y monitorea tus proyectos activos</p>
          </div>
          <button
            onClick={onNewProject}
            className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out transform hover:scale-105 shadow-sm hover:shadow-md button-polish focus-enhanced"
          >
            <PlusIcon className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:rotate-90" />
            Nuevo Proyecto
          </button>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 grid-animate">
            {Array.from({ length: 6 }).map((_, index) => (
              <LoadingCard key={index} />
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 grid-animate">
            {projects.map((project, index) => (
              <div 
                key={project.id}
                className="animate-fadeIn"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <ProjectCard
                  project={project}
                  onViewDetails={onViewDetails}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay proyectos</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comienza creando tu primer proyecto.
            </p>
            <div className="mt-6">
              <button
                onClick={onNewProject}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Nuevo Proyecto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecentProjects;