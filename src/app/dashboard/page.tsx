"use client";

import { useAuth } from '@/lib/auth';
import { KPICards, RecentProjects, PendingTasks, TeamAvailability, Schedule } from '@/components/dashboard';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useMobileOptimizations, usePullToRefresh } from '@/hooks/useMobileOptimizations';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { 
    data: { metrics, projects, tasks, teamMembers, events }, 
    loading, 
    errors,
    refetch,
    completeTask: completeTaskService
  } = useDashboardData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Mobile optimizations
  const { 
    isMobile, 
    isTablet, 
    isTouch, 
    orientation, 
    addTouchFeedback, 
    optimizeForMobile 
  } = useMobileOptimizations();
  
  // Pull to refresh functionality
  const { isPulling, pullDistance } = usePullToRefresh(async () => {
    await refetch.all();
  });
  
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    router.push('/login');
    return null;
  }

  // Show loading screen while authentication is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Show loading screen if user is not available yet
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos del usuario...</p>
        </div>
      </div>
    );
  }

  const handleViewProjectDetails = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const handleNewProject = () => {
    router.push('/projects/new');
  };

  const handleCompleteTask = async (taskId: string) => {
    const success = await completeTaskService(taskId);
    if (!success) {
      // Show error message or handle failure
      console.error('Failed to complete task');
    }
  };

  const handleAddTask = () => {
    router.push('/tasks/new');
  };

  const handleViewAllPersonnel = () => {
    router.push('/personnel');
  };

  const handleNavigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  // Apply mobile optimizations to dashboard elements
  useEffect(() => {
    if (dashboardRef.current) {
      optimizeForMobile(dashboardRef.current);
      
      // Add touch feedback to interactive elements
      const buttons = dashboardRef.current.querySelectorAll('button, [role="button"]');
      buttons.forEach((button) => {
        addTouchFeedback(button as HTMLElement);
      });
    }
  }, [optimizeForMobile, addTouchFeedback]);

  // Handle mobile-specific keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Close mobile menus with escape key
      if (event.key === 'Escape' && isMobile) {
        // Close any open mobile menus or modals
        const openMenus = document.querySelectorAll('.mobile-dropdown.open');
        openMenus.forEach((menu) => {
          menu.classList.remove('open');
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobile]);

  return (
    <ErrorBoundary>
      {/* Skip to content link for accessibility */}
      <a 
        href="#main-content" 
        className="skip-to-content sr-only focus:not-sr-only"
        tabIndex={1}
      >
        Ir al contenido principal
      </a>
      
      {/* Pull to refresh indicator */}
      {isPulling && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white text-center py-2 mobile-pull-refresh active"
          style={{ transform: `translateY(${Math.min(pullDistance - 80, 0)}px)` }}
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">Actualizando...</span>
          </div>
        </div>
      )}
      
      <div 
        ref={dashboardRef}
        id="main-content"
        className={`min-h-full dashboard-polish ${isMobile ? 'mobile-optimized performance-optimized' : ''} ${isTablet ? 'tablet-optimized' : ''}`}
      >
      {/* Error Banner */}
      {Object.values(errors).some(Boolean) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error al cargar algunos datos
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {errors.metrics && <li>Métricas: {errors.metrics}</li>}
                  {errors.projects && <li>Proyectos: {errors.projects}</li>}
                  {errors.tasks && <li>Tareas: {errors.tasks}</li>}
                  {errors.teamMembers && <li>Equipo: {errors.teamMembers}</li>}
                  {errors.events && <li>Eventos: {errors.events}</li>}
                </ul>
              </div>
              <div className="mt-4">
                <button
                  onClick={refetch.all}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 transition-colors duration-200"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Welcome Section with mobile optimizations */}
      <div className={`
        bg-gradient-to-r from-white via-blue-50/30 to-white rounded-xl shadow-sm border border-gray-200/60 
        p-4 sm:p-6 mb-6 sm:mb-8 transform transition-all duration-500 ease-out 
        animate-slideInFromTop card-polish
        ${isMobile ? 'mobile-card mobile-shadow mobile-spacing' : 'hover:shadow-lg hover:-translate-y-1 hover-lift'}
        ${isTouch ? 'mobile-touch-feedback' : ''}
      `}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 transition-all duration-300 hover:text-blue-600">
              ¡Bienvenido de vuelta, {user?.nombre}!
            </h2>
            <p className="text-gray-600 transition-colors duration-300 text-sm sm:text-base">
              Aquí tienes un resumen de tus proyectos y actividades.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 transition-all duration-300 hover:bg-green-200 hover:scale-105">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              En línea
            </span>
            <button
              onClick={refetch.all}
              disabled={loading.metrics || loading.projects || loading.tasks || loading.teamMembers || loading.events}
              className={`
                inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium 
                bg-blue-100 text-blue-800 hover:bg-blue-200 transition-all duration-300 
                disabled:opacity-50 disabled:cursor-not-allowed button-polish
                ${isMobile ? 'mobile-button mobile-tap-animation' : 'hover:scale-105'}
                ${isTouch ? 'touch-feedback' : ''}
              `}
            >
              <svg className={`w-3 h-3 mr-2 ${(loading.metrics || loading.projects || loading.tasks || loading.teamMembers || loading.events) ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
            <div className="text-xs sm:text-sm text-gray-500">
              {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Main Dashboard Grid with improved responsive layout */}
      <div className="space-y-6 sm:space-y-8">
        {/* KPI Cards Section with enhanced responsive behavior */}
        <section className="transform transition-all duration-500 ease-out animate-slideInFromLeft">
          <div className="mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 transition-colors duration-300 hover:text-blue-600">
              Métricas Principales
            </h3>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
              Vista general del estado actual de tus proyectos
            </p>
          </div>
          <div className="transform transition-all duration-300 hover:scale-[1.005] hover-lift">
            <KPICards metrics={metrics} isLoading={loading.metrics} />
          </div>
        </section>

        {/* Recent Projects Section with enhanced responsive animation */}
        <section className="transform transition-all duration-500 ease-out animate-slideInFromRight delay-100">
          <div className="transform transition-all duration-300 hover:scale-[1.002] hover-lift">
            <RecentProjects
              projects={projects}
              onViewDetails={handleViewProjectDetails}
              onNewProject={handleNewProject}
              isLoading={loading.projects}
            />
          </div>
        </section>

        {/* Enhanced Bottom Section with mobile optimizations */}
        <section className="transform transition-all duration-500 ease-out animate-slideInFromBottom delay-200">
          <div className="mb-4 sm:mb-6">
            <h3 className={`
              text-lg sm:text-xl font-bold text-gray-900 transition-colors duration-300 
              ${isMobile ? 'responsive-text' : 'hover:text-blue-600'}
            `}>
              Actividades y Equipo
            </h3>
            <p className={`
              text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base
              ${isMobile ? 'responsive-text' : ''}
            `}>
              Gestión de tareas, disponibilidad del equipo y cronograma
            </p>
          </div>
          
          {/* Enhanced responsive grid with mobile optimizations */}
          <div className={`
            grid gap-4 sm:gap-6 transition-all duration-300
            ${isMobile ? 'mobile-grid-single' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}
            ${isTouch ? 'touch-target-spacing' : ''}
          `}>
            {/* Tasks Column with mobile optimizations */}
            <div className={`
              transform transition-all duration-300 ease-out animate-slideInFromLeft delay-300
              ${isMobile ? 'mobile-card mobile-transform' : 'hover:scale-[1.01] hover:-translate-y-1 hover-lift'}
            `}>
              <PendingTasks
                tasks={tasks}
                onCompleteTask={handleCompleteTask}
                onAddTask={handleAddTask}
                isLoading={loading.tasks}
              />
            </div>
            
            {/* Team Availability Column with mobile optimizations */}
            <div className={`
              transform transition-all duration-300 ease-out animate-slideInFromBottom delay-500
              ${isMobile ? 'mobile-card mobile-transform' : 'hover:scale-[1.01] hover:-translate-y-1 hover-lift'}
            `}>
              <TeamAvailability
                teamMembers={teamMembers}
                onViewAllPersonnel={handleViewAllPersonnel}
                isLoading={loading.teamMembers}
              />
            </div>
            
            {/* Schedule Column with mobile optimizations */}
            <div className={`
              ${isMobile ? '' : 'md:col-span-2 xl:col-span-1'} 
              transform transition-all duration-300 ease-out animate-slideInFromRight delay-700
              ${isMobile ? 'mobile-card mobile-transform' : 'hover:scale-[1.01] hover:-translate-y-1 hover-lift'}
            `}>
              <Schedule
                events={events}
                currentMonth={currentMonth}
                onNavigateMonth={handleNavigateMonth}
                isLoading={loading.events}
              />
            </div>
          </div>
        </section>

        {/* Enhanced mobile experience indicator with better responsive design */}
        <div className="block lg:hidden animate-slideInFromBottom delay-1000">
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-3 sm:p-4 border border-blue-200 shadow-sm hover-lift">
            <div className="flex items-center space-x-3 text-blue-800">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Experiencia móvil optimizada</p>
                <p className="text-xs text-blue-600 mt-1">Desliza para explorar más contenido</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced performance and accessibility indicators */}
        <div className="hidden xl:block animate-slideInFromBottom delay-1000">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl p-4 border border-gray-200/60 shadow-sm hover-lift">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <span className="flex items-center transition-colors duration-300 hover:text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  Sistema optimizado
                </span>
                <span className="flex items-center transition-colors duration-300 hover:text-blue-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                  Datos en tiempo real
                </span>
                <span className="flex items-center transition-colors duration-300 hover:text-purple-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>
                  Responsive design
                </span>
              </div>
              <div className="text-xs text-gray-500 transition-colors duration-300 hover:text-gray-700">
                Última actualización: {new Date().toLocaleTimeString('es-ES')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced floating action button with mobile optimizations */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 lg:hidden z-50 animate-slideInFromBottom delay-1000">
        <div className="relative group">
          <button
            onClick={handleNewProject}
            className={`
              bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-xl 
              transform transition-all duration-300 ease-out focus:outline-none 
              focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 button-polish
              ${isMobile ? 'p-4 mobile-button mobile-tap-animation focus-enhanced' : 'p-3 sm:p-4 hover:from-blue-700 hover:to-blue-800 hover:scale-110 hover:-translate-y-1 group-hover:shadow-2xl active:scale-95'}
              ${isTouch ? 'touch-feedback' : ''}
            `}
            aria-label="Crear nuevo proyecto"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          
          {/* Enhanced notification badge with better mobile sizing */}
          {tasks.filter(task => task.status === 'Pendiente').length > 0 && (
            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center animate-pulse shadow-lg">
              {tasks.filter(task => task.status === 'Pendiente').length > 9 
                ? '9+' 
                : tasks.filter(task => task.status === 'Pendiente').length
              }
            </div>
          )}
          
          {/* Enhanced tooltip with better positioning */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap backdrop-blur-sm">
            Crear nuevo proyecto
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/90"></div>
          </div>
        </div>
      </div>

      {/* Enhanced quick actions for desktop with accessibility */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-40">
        <div className="flex flex-col space-y-3 animate-slideInFromBottom delay-1000">
          {/* Quick add task button */}
          <button
            onClick={handleAddTask}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-full p-3 shadow-lg transform transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-green-300 focus:ring-offset-2 group button-polish focus-enhanced"
            aria-label="Agregar nueva tarea"
          >
            <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </button>
          
          {/* Quick new project button */}
          <button
            onClick={handleNewProject}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full p-3 shadow-lg transform transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 group button-polish focus-enhanced"
            aria-label="Crear nuevo proyecto"
          >
            <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile-specific accessibility announcements */}
      {isMobile && (
        <div 
          id="mobile-announcements" 
          className="sr-only" 
          aria-live="polite" 
          aria-atomic="true"
        >
          {isPulling && "Actualizando contenido del dashboard"}
          {orientation === 'landscape' && "Vista horizontal activada"}
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
}