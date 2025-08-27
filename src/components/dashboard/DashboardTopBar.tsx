'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TopBarProps } from '@/lib/dashboard-types';
import { JWTManager } from '@/lib/jwt';
import {
  Bars3Icon,
  BellIcon,
  ChatBubbleLeftEllipsisIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  CogIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export function DashboardTopBar({ title, onToggleSidebar, user, notifications }: TopBarProps) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadNotifications = notifications.filter(n => !n.read);
  const unreadCount = unreadNotifications.length;

  const handleLogout = () => {
    JWTManager.logout();
    router.push('/login');
  };

  const formatNotificationTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return timestamp.toLocaleDateString();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 backdrop-blur-sm bg-opacity-95 sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Left side - Menu button and title */}
        <div className="flex items-center">
          {/* Mobile menu button */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            aria-label="Abrir menú de navegación"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Page title */}
          <h1 className="ml-4 lg:ml-0 text-xl sm:text-2xl font-semibold text-gray-900 truncate">
            {title}
          </h1>
        </div>

        {/* Right side - Notifications and user menu */}
        <div className="flex items-center space-x-4">
          {/* Messages */}
          <button 
            className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            aria-label="Mensajes (3 nuevos)"
          >
            <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
              aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} nuevas)` : ''}`}
            >
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200 animate-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-gray-100">
                  <h3 className="text-sm font-medium text-gray-900">Notificaciones</h3>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      No hay notificaciones
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-l-4 ${
                          notification.read 
                            ? 'border-transparent' 
                            : 'border-blue-500 bg-blue-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {notification.message}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {formatNotificationTime(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Ver todas las notificaciones
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-3 p-2 text-sm rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
              aria-label={`Menú de usuario: ${user.nombre}`}
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user.nombre.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="hidden md:block text-left min-w-0">
                <p className="font-medium text-gray-900 truncate">{user.nombre}</p>
                <p className="text-xs text-gray-500 capitalize truncate">
                  {user.rol.replace('_', ' ')}
                </p>
              </div>
            </button>

            {/* User dropdown menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200 animate-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.nombre}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    router.push('/perfil');
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                >
                  <UserCircleIcon className="mr-3 h-4 w-4" />
                  Mi Perfil
                </button>
                
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    router.push('/configuracion');
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                >
                  <CogIcon className="mr-3 h-4 w-4" />
                  Configuración
                </button>
                
                <div className="border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}