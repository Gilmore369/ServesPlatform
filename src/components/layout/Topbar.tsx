'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  CogIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { useAccessibilitySettings } from '../ui/AccessibilitySettings';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { open: openAccessibilitySettings, AccessibilitySettingsModal } = useAccessibilitySettings();

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Search query:', searchQuery);
    setShowMobileSearch(false);
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  return (
    <header 
      className="bg-white shadow-sm border-b border-gray-200"
      role="banner"
    >
      <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Left side - Menu button and search */}
        <div className="flex items-center flex-1 min-w-0">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
            aria-label="Abrir menú de navegación"
            aria-expanded={false}
            aria-controls="main-navigation"
          >
            <Bars3Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </button>

          {/* Desktop Search */}
          <div className="hidden sm:block ml-4 flex-1 max-w-lg">
            <form onSubmit={handleSearch} className="relative" role="search">
              <label htmlFor="desktop-search" className="sr-only">
                Buscar proyectos, actividades, personal
              </label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon 
                  className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" 
                  aria-hidden="true"
                />
              </div>
              <input
                id="desktop-search"
                type="search"
                placeholder="Buscar proyectos, actividades, personal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 sm:pl-10 pr-3 py-1.5 sm:py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                aria-describedby="search-description"
              />
              <div id="search-description" className="sr-only">
                Busque por nombre de proyecto, actividad, colaborador o cliente
              </div>
            </form>
          </div>

          {/* Mobile Search Button */}
          <button
            onClick={() => setShowMobileSearch(true)}
            className="sm:hidden ml-2 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
            aria-label="Abrir búsqueda"
          >
            <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Right side - Notifications and user menu */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Accessibility Settings */}
          <button
            onClick={openAccessibilitySettings}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
            aria-label="Configuración de accesibilidad"
            title="Configuración de accesibilidad"
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </button>

          {/* Notifications */}
          <button 
            className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
            aria-label="Notificaciones (1 nueva)"
            aria-describedby="notification-count"
          >
            <BellIcon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            {/* Notification badge */}
            <span 
              className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 block h-2 w-2 rounded-full bg-red-400"
              aria-hidden="true"
            ></span>
            <span id="notification-count" className="sr-only">
              Tiene 1 notificación nueva
            </span>
          </button>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-2 sm:space-x-3 p-1.5 sm:p-2 text-sm rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
              aria-label={`Menú de usuario: ${user?.nombre}`}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
            >
              <div className="flex-shrink-0">
                <div 
                  className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center"
                  aria-hidden="true"
                >
                  <span className="text-white font-medium text-xs sm:text-sm">
                    {user?.nombre.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="hidden md:block text-left min-w-0">
                <p className="font-medium text-gray-900 truncate text-sm">{user?.nombre}</p>
                <p className="text-xs text-gray-500 capitalize truncate">
                  {user?.rol.replace('_', ' ')}
                </p>
              </div>
            </button>

            {/* User dropdown menu */}
            {isUserMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
              >
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.nombre}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                
                <button
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 touch-manipulation"
                  role="menuitem"
                >
                  <UserCircleIcon className="mr-3 h-4 w-4" aria-hidden="true" />
                  Mi Perfil
                </button>
                
                <button
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 touch-manipulation"
                  role="menuitem"
                >
                  <CogIcon className="mr-3 h-4 w-4" aria-hidden="true" />
                  Configuración
                </button>
                
                <div className="border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 touch-manipulation"
                    role="menuitem"
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" aria-hidden="true" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accessibility Settings Modal */}
      <AccessibilitySettingsModal />

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div 
          className="sm:hidden absolute inset-x-0 top-0 bg-white border-b border-gray-200 z-40"
          role="dialog"
          aria-label="Búsqueda móvil"
          aria-modal="true"
        >
          <div className="flex items-center px-3 py-3">
            <form onSubmit={handleSearch} className="flex-1" role="search">
              <div className="relative">
                <label htmlFor="mobile-search" className="sr-only">
                  Buscar proyectos, actividades, personal
                </label>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="mobile-search"
                  type="search"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  autoFocus
                />
              </div>
            </form>
            <button
              onClick={() => setShowMobileSearch(false)}
              className="ml-3 p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
              aria-label="Cerrar búsqueda"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}