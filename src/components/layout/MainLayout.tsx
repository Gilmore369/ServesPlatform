'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ProtectedRoute } from './ProtectedRoute';
import { SkipLinks } from '../ui/SkipLinks';
import { GlobalLiveRegion } from '../ui/LiveRegion';
import { useKeyboardShortcuts } from '@/lib/hooks/useAccessibility';
import { AccessibilityProvider } from '@/lib/contexts/AccessibilityContext';

interface MainLayoutProps {
  children: React.ReactNode;
  requiredRoles?: Array<'admin_lider' | 'admin' | 'editor' | 'tecnico'>;
}

export function MainLayout({ children, requiredRoles }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'ctrl+m': toggleSidebar,
    'ctrl+/': () => {
      // Focus search if available
      const searchInput = document.getElementById('search');
      if (searchInput) {
        searchInput.focus();
      }
    },
    'alt+1': () => {
      // Focus main content
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.focus();
      }
    },
    'alt+2': () => {
      // Focus navigation
      const navigation = document.getElementById('main-navigation');
      if (navigation) {
        navigation.focus();
      }
    },
  });

  return (
    <ProtectedRoute requiredRoles={requiredRoles}>
      <AccessibilityProvider>
        {/* Skip Links */}
        <SkipLinks />
        
        {/* Global Live Region for announcements */}
        <GlobalLiveRegion />

        <div className="flex h-screen bg-gray-100 overflow-hidden">
          {/* Sidebar */}
          <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Topbar */}
            <Topbar onMenuClick={toggleSidebar} />

            {/* Page content */}
            <main 
              id="main-content"
              className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 focus:outline-none"
              role="main"
              aria-label="Contenido principal"
              tabIndex={-1}
            >
              <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-full readable-text">
                {children}
              </div>
            </main>
          </div>
        </div>

        {/* Keyboard shortcuts help - hidden by default, shown on focus */}
        <div 
          className="sr-only focus:not-sr-only fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm"
          tabIndex={0}
          role="dialog"
          aria-label="Atajos de teclado disponibles"
        >
          <h3 className="font-semibold mb-2">Atajos de teclado:</h3>
          <ul className="text-sm space-y-1">
            <li><kbd className="bg-gray-700 px-1 rounded">Ctrl+M</kbd> - Alternar menú</li>
            <li><kbd className="bg-gray-700 px-1 rounded">Ctrl+/</kbd> - Buscar</li>
            <li><kbd className="bg-gray-700 px-1 rounded">Alt+1</kbd> - Ir al contenido</li>
            <li><kbd className="bg-gray-700 px-1 rounded">Alt+2</kbd> - Ir a navegación</li>
          </ul>
        </div>
      </AccessibilityProvider>
    </ProtectedRoute>
  );
}