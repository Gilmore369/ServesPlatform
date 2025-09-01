/**
 * Dashboard Page - Complete Dashboard with KPIs and Real Data
 * Main dashboard with authentication protection and full functionality
 * Requirements: 4.2
 */

'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import KPICards from '@/components/dashboard/KPICards';
import RecentProjects from '@/components/dashboard/RecentProjects';
import PendingTasks from '@/components/dashboard/PendingTasks';
import TeamAvailability from '@/components/dashboard/TeamAvailability';
import Schedule from '@/components/dashboard/Schedule';
import DevelopmentBanner from '@/components/DevelopmentBanner';
import ConnectionDiagnostic from '@/components/dashboard/ConnectionDiagnostic';
import IntegrationStatus from '@/components/dashboard/IntegrationStatus';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { 
    data, 
    loading, 
    errors, 
    isAnyLoading, 
    refetch,
    completeTask 
  } = useDashboardData();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please log in to access the dashboard.
          </p>
        </div>
      </div>
    );
  }

  const handleViewProjectDetails = (projectId: string) => {
    window.location.href = `/proyectos/${projectId}`;
  };

  const handleNewProject = () => {
    window.location.href = '/proyectos/nuevo';
  };

  const handleAddTask = () => {
    window.location.href = '/tareas/nueva';
  };

  const handleViewAllPersonnel = () => {
    window.location.href = '/personal';
  };

  const handleNavigateMonth = (direction: 'prev' | 'next') => {
    // This would be handled by the Schedule component internally
    console.log(`Navigate month: ${direction}`);
  };

  return (
    <div className="space-y-6">
      {/* Development Banner */}
      <DevelopmentBanner />
      
      {/* Integration Status */}
      <IntegrationStatus metrics={data.metrics} />
      
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              ¡Bienvenido, {user?.name || user?.nombre || 'Usuario'}!
            </h1>
            <p className="text-blue-100">
              Aquí tienes un resumen de tus proyectos y actividades
            </p>
          </div>
          <div className="hidden md:block">
            <div className="text-right">
              <p className="text-sm text-blue-200">
                {new Date().toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-xs text-blue-300 mt-1">
                Rol: {user?.role || user?.rol || 'Usuario'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Métricas Principales</h2>
          <button
            onClick={() => refetch.metrics()}
            disabled={loading.metrics}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 mr-1.5 ${loading.metrics ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>
        
        {errors.metrics && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">Error cargando métricas: {errors.metrics}</p>
          </div>
        )}
        
        <KPICards 
          metrics={data.metrics} 
          isLoading={loading.metrics} 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Projects and Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Projects */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Proyectos Recientes</h2>
              <button
                onClick={() => refetch.projects()}
                disabled={loading.projects}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {loading.projects ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>
            
            {errors.projects && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">Error cargando proyectos: {errors.projects}</p>
              </div>
            )}
            
            <RecentProjects
              projects={data.projects}
              onViewDetails={handleViewProjectDetails}
              onNewProject={handleNewProject}
              isLoading={loading.projects}
            />
          </div>

          {/* Pending Tasks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Tareas Pendientes</h2>
              <button
                onClick={() => refetch.tasks()}
                disabled={loading.tasks}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {loading.tasks ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>
            
            {errors.tasks && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">Error cargando tareas: {errors.tasks}</p>
              </div>
            )}
            
            <PendingTasks
              tasks={data.tasks}
              onCompleteTask={completeTask}
              onAddTask={handleAddTask}
              isLoading={loading.tasks}
            />
          </div>
        </div>

        {/* Right Column - Team and Schedule */}
        <div className="space-y-6">
          {/* Team Availability */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Equipo</h2>
              <button
                onClick={() => refetch.teamMembers()}
                disabled={loading.teamMembers}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {loading.teamMembers ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>
            
            {errors.teamMembers && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">Error cargando equipo: {errors.teamMembers}</p>
              </div>
            )}
            
            <TeamAvailability
              teamMembers={data.teamMembers}
              onViewAllPersonnel={handleViewAllPersonnel}
              isLoading={loading.teamMembers}
            />
          </div>

          {/* Schedule */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Calendario</h2>
              <button
                onClick={() => refetch.events()}
                disabled={loading.events}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {loading.events ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>
            
            {errors.events && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">Error cargando eventos: {errors.events}</p>
              </div>
            )}
            
            <Schedule
              events={data.events}
              currentMonth={new Date()}
              onNavigateMonth={handleNavigateMonth}
              isLoading={loading.events}
            />
          </div>
        </div>
      </div>

      {/* Global Refresh Button */}
      <div className="flex justify-center pt-6">
        <button
          onClick={() => refetch.all()}
          disabled={isAnyLoading}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className={`w-5 h-5 mr-2 ${isAnyLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isAnyLoading ? 'Actualizando...' : 'Actualizar Todo'}
        </button>
      </div>

      {/* Connection Diagnostic Tool */}
      <ConnectionDiagnostic />
    </div>
  );
}