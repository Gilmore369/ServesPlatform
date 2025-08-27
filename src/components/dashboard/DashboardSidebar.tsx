'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarProps } from '@/lib/dashboard-types';
import {
  HomeIcon,
  FolderIcon,
  UsersIcon,
  CubeIcon,
  DocumentChartBarIcon,
  CogIcon,
  BookOpenIcon,
  XMarkIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  section?: 'principal' | 'administracion';
}

const menuItems: MenuItem[] = [
  // Principal Section
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    section: 'principal',
  },
  {
    name: 'Proyectos',
    href: '/proyectos',
    icon: FolderIcon,
    section: 'principal',
  },
  {
    name: 'Personal',
    href: '/personal',
    icon: UsersIcon,
    section: 'principal',
  },
  {
    name: 'Reportes',
    href: '/reportes',
    icon: DocumentChartBarIcon,
    section: 'principal',
  },
  
  // Administración Section
  {
    name: 'Materiales',
    href: '/materiales',
    icon: CubeIcon,
    section: 'administracion',
  },
  {
    name: 'Gestión de Usuarios',
    href: '/admin/usuarios',
    icon: UsersIcon,
    section: 'administracion',
  },
  {
    name: 'Configuración',
    href: '/admin',
    icon: CogIcon,
    section: 'administracion',
  },
  {
    name: 'Documentación',
    href: '/docs',
    icon: BookOpenIcon,
    section: 'administracion',
  },
];

export function DashboardSidebar({ isOpen, onClose, user }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const principalItems = menuItems.filter(item => item.section === 'principal');
  const administracionItems = menuItems.filter(item => item.section === 'administracion');

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Enhanced Sidebar with improved responsive behavior */}
      <nav 
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-gradient-to-b from-blue-800 to-blue-900 text-white shadow-2xl 
          transform transition-all duration-500 ease-in-out backdrop-blur-sm
          lg:translate-x-0 lg:static lg:inset-0 lg:shadow-xl lg:border-r lg:border-blue-700
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="navigation"
        aria-label="Navegación principal"
      >
        {/* Header with logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-blue-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <WrenchScrewdriverIcon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold text-white">ConstructPro</h1>
            </div>
          </div>
          
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Cerrar menú"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* User info section */}
        <div className="p-4">
          <div className="flex items-center mb-6">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {user.nombre.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {user.nombre}
              </p>
              <p className="text-xs text-blue-200 truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Navigation sections */}
          <nav className="space-y-6">
            {/* Principal Section */}
            <div>
              <h3 className="px-3 text-xs font-bold text-blue-300 uppercase tracking-wider mb-2">
                Principal
              </h3>
              <div className="space-y-1">
                {principalItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      className={`
                        group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        ${isActive(item.href)
                          ? 'bg-blue-700 text-white'
                          : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                        }
                      `}
                    >
                      <Icon
                        className="mr-3 flex-shrink-0 h-5 w-5"
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Administración Section */}
            <div>
              <h3 className="px-3 text-xs font-bold text-blue-300 uppercase tracking-wider mb-2">
                Administración
              </h3>
              <div className="space-y-1">
                {administracionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      className={`
                        group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        ${isActive(item.href)
                          ? 'bg-blue-700 text-white'
                          : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                        }
                      `}
                    >
                      <Icon
                        className="mr-3 flex-shrink-0 h-5 w-5"
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>


      </nav>
    </>
  );
}