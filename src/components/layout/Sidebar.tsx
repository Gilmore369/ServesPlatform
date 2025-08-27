'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useCanAccessRoute, usePermissions } from '@/lib/hooks/usePermissions';
import { Permission } from '@/lib/permissions';
import {
  HomeIcon,
  FolderIcon,
  UsersIcon,
  CubeIcon,
  DocumentChartBarIcon,
  CogIcon,
  BookOpenIcon,
  CheckCircleIcon,
  XMarkIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles?: Array<'admin_lider' | 'admin' | 'editor' | 'tecnico'>; // Legacy support
  permissions?: Permission[]; // New permission-based access
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    // Dashboard is accessible to all authenticated users
  },
  {
    name: 'Proyectos',
    href: '/proyectos',
    icon: FolderIcon,
    permissions: [Permission.VIEW_ALL_PROJECTS, Permission.VIEW_ASSIGNED_PROJECTS],
  },
  {
    name: 'Personal',
    href: '/personal',
    icon: UsersIcon,
    permissions: [Permission.VIEW_ALL_PERSONNEL],
  },
  {
    name: 'Materiales',
    href: '/materiales',
    icon: CubeIcon,
    permissions: [Permission.VIEW_MATERIALS],
  },
  {
    name: 'Reportes',
    href: '/reportes',
    icon: DocumentChartBarIcon,
    permissions: [Permission.VIEW_OPERATIONAL_REPORTS, Permission.VIEW_FINANCIAL_REPORTS, Permission.VIEW_CAPACITY_REPORTS],
  },
  {
    name: 'Checklists',
    href: '/admin/checklists',
    icon: CheckCircleIcon,
    permissions: [Permission.MANAGE_CHECKLISTS],
  },
  {
    name: 'Administración',
    href: '/admin',
    icon: CogIcon,
    permissions: [Permission.MANAGE_SYSTEM_CONFIG, Permission.MANAGE_CATALOGS],
  },
  {
    name: 'Documentación',
    href: '/docs',
    icon: BookOpenIcon,
    permissions: [Permission.VIEW_DOCUMENTS],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const { hasAnyPermission } = usePermissions();

  // Filter menu items based on user permissions and route access
  const filteredMenuItems = menuItems.filter(item => {
    if (!user) return false;
    
    // Legacy role-based check (for backward compatibility)
    if (item.roles && !item.roles.includes(user.rol)) {
      return false;
    }
    
    // Permission-based check
    if (item.permissions) {
      return hasAnyPermission(item.permissions);
    }
    
    // If no specific permissions or roles defined, allow access
    return true;
  });

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <nav 
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0 lg:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="navigation"
        aria-label="Navegación principal"
        id="main-navigation"
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SP</span>
              </div>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-gray-900">ServesPlatform</h1>
            </div>
          </div>
          
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 touch-manipulation"
            aria-label="Cerrar menú"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-5 px-2" role="menubar">
          <div className="space-y-1">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose} // Close mobile menu on navigation
                  role="menuitem"
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={`
                    group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors touch-manipulation
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${isActive(item.href)
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon
                    className={`
                      mr-3 flex-shrink-0 h-6 w-6
                      ${isActive(item.href)
                        ? 'text-blue-500'
                        : 'text-gray-400 group-hover:text-gray-500'
                      }
                    `}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* User info at bottom */}
        {user && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-medium text-sm" aria-hidden="true">
                    {user.nombre.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.nombre}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user.rol.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}