'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTopBar } from './DashboardTopBar';
import { useAuth } from '@/lib/auth';
import { DashboardLayoutProps, Notification } from '@/lib/dashboard-types';

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Enhanced responsive detection with tablet support
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768); // Mobile breakpoint
      setIsTablet(width >= 768 && width < 1024); // Tablet breakpoint
      
      // Auto-open sidebar on desktop, close on mobile/tablet
      if (width >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Enhanced notifications with real-time updates
  useEffect(() => {
    const fetchNotifications = async () => {
      // Simulate API call
      setNotifications([
        {
          id: '1',
          title: 'Nueva tarea asignada',
          message: 'Se te ha asignado una nueva tarea en el proyecto Villa Los Olivos',
          type: 'info',
          timestamp: new Date(),
          read: false,
        },
        {
          id: '2',
          title: 'Reunión programada',
          message: 'Reunión de seguimiento mañana a las 10:00 AM',
          type: 'warning',
          timestamp: new Date(Date.now() - 3600000),
          read: false,
        },
        {
          id: '3',
          title: 'Proyecto completado',
          message: 'El proyecto "Complejo Deportivo Municipal" ha sido completado exitosamente',
          type: 'success',
          timestamp: new Date(Date.now() - 7200000),
          read: true,
        },
      ]);
    };

    fetchNotifications();
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle sidebar with Ctrl/Cmd + B
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
      
      // Close sidebar with Escape
      if (event.key === 'Escape' && isSidebarOpen && (isMobile || isTablet)) {
        closeSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, closeSidebar, isSidebarOpen, isMobile, isTablet]);

  // Loading state management
  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 overflow-hidden">
      {/* Enhanced Sidebar with improved responsive behavior */}
      <div className={`
        relative z-30 transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : isMobile || isTablet ? '-translate-x-full' : 'translate-x-0'}
      `}>
        <DashboardSidebar 
          isOpen={isSidebarOpen} 
          onClose={closeSidebar} 
          user={user} 
        />
      </div>

      {/* Enhanced overlay for mobile/tablet sidebar with smooth transitions */}
      {isSidebarOpen && (isMobile || isTablet) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 z-20 transition-all duration-300 ease-in-out animate-fadeIn backdrop-blur-sm"
          onClick={closeSidebar}
          onKeyDown={(e) => e.key === 'Enter' && closeSidebar()}
          role="button"
          tabIndex={0}
          aria-label="Cerrar menú lateral"
        />
      )}

      {/* Main content area with enhanced responsive layout */}
      <div className={`
        flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out
        ${isSidebarOpen && !isMobile && !isTablet ? 'ml-0' : ''}
      `}>
        {/* Enhanced TopBar with better shadow and positioning */}
        <div className="relative z-10 shadow-lg bg-white/95 backdrop-blur-sm border-b border-gray-200/50">
          <DashboardTopBar 
            title="Dashboard"
            onToggleSidebar={toggleSidebar}
            user={user}
            notifications={notifications}
          />
        </div>

        {/* Enhanced main content with improved responsive behavior */}
        <main 
          className={`
            flex-1 overflow-x-hidden overflow-y-auto 
            bg-gradient-to-br from-gray-50 via-white to-blue-50/30
            transition-all duration-500 ease-in-out
            ${isMobile ? 'p-3' : isTablet ? 'p-4 sm:p-6' : 'p-6 lg:p-8 xl:p-10'}
            scrollbar-hide relative
          `}
          role="main"
          aria-label="Contenido principal del dashboard"
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Enhanced content wrapper with better responsive constraints */}
          <div className={`
            mx-auto animate-fadeIn transition-all duration-300
            ${isMobile ? 'max-w-full' : isTablet ? 'max-w-6xl' : 'max-w-7xl'}
          `}>
            <div className="min-h-full relative">
              {/* Content with enhanced animations */}
              <div className="animate-slideInFromTop">
                {children}
              </div>
            </div>
          </div>

          {/* Enhanced scroll indicator for mobile */}
          {isMobile && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
              <div className="bg-gray-900/80 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm opacity-0 transition-opacity duration-300" id="scroll-indicator">
                Desliza para ver más
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Enhanced loading overlay with better animations */}
      <div 
        className={`
          fixed inset-0 bg-white/95 backdrop-blur-sm z-50 
          flex items-center justify-center transition-all duration-500 ease-in-out
          ${isLoading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        id="loading-overlay"
      >
        <div className="flex flex-col items-center space-y-6 animate-scaleIn">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <div className="text-center">
            <p className="text-gray-700 font-semibold text-lg mb-1">Actualizando dashboard</p>
            <p className="text-gray-500 text-sm animate-pulse">Cargando datos en tiempo real...</p>
          </div>
        </div>
      </div>

      {/* Enhanced accessibility announcements */}
      <div 
        id="dashboard-announcements" 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
      />

      {/* Enhanced keyboard shortcuts indicator */}
      <div className="fixed bottom-4 right-4 z-30 hidden lg:block">
        <div className="bg-gray-900/90 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="flex items-center space-x-2">
            <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">Ctrl+B</kbd>
            <span>Toggle Menu</span>
          </div>
        </div>
      </div>

      {/* Enhanced mobile navigation hint */}
      {isMobile && !isSidebarOpen && (
        <div className="fixed top-20 left-4 z-20 animate-slideInFromLeft">
          <div className="bg-blue-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg opacity-90 animate-pulse">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Toca para abrir menú</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}