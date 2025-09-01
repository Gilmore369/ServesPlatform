'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth, AuthGuard } from '@/lib/simple-auth';

interface SimpleMainLayoutProps {
  children: React.ReactNode;
  requiredPermission?: 'read' | 'write' | 'delete' | 'admin';
}

export function SimpleMainLayout({ children, requiredPermission }: SimpleMainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isLoading } = useAuth();

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when switching to mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthGuard 
      permission={requiredPermission}
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
            <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
          </div>
        </div>
      }
    >
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Topbar */}
          <Topbar onMenuClick={toggleSidebar} />

          {/* Page content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
            <div className="container mx-auto px-4 py-6 max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}