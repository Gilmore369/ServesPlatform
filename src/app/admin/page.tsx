'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { 
  UsersIcon, 
  CogIcon, 
  CheckCircleIcon,
  BuildingOfficeIcon,
  CubeIcon,
  DocumentTextIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

const adminModules = [
  {
    name: 'Gestión de Usuarios',
    description: 'Crear, editar y gestionar usuarios del sistema',
    href: '/admin/usuarios',
    icon: UsersIcon,
    color: 'bg-blue-500',
  },
  {
    name: 'Configuración del Sistema',
    description: 'Parámetros generales y configuración',
    href: '/admin/config',
    icon: CogIcon,
    color: 'bg-green-500',
  },
  {
    name: 'Plantillas de Checklists',
    description: 'Gestionar plantillas de checklists reutilizables',
    href: '/admin/checklists',
    icon: CheckCircleIcon,
    color: 'bg-purple-500',
  },
  {
    name: 'Catálogo de Clientes',
    description: 'Gestionar información de clientes',
    href: '/admin/clientes',
    icon: BuildingOfficeIcon,
    color: 'bg-orange-500',
  },
  {
    name: 'Catálogo de Materiales',
    description: 'Gestionar catálogo maestro de materiales',
    href: '/admin/materiales-catalogo',
    icon: CubeIcon,
    color: 'bg-indigo-500',
  },
  {
    name: 'Líneas de Servicio',
    description: 'Configurar líneas de servicio disponibles',
    href: '/admin/lineas-servicio',
    icon: DocumentTextIcon,
    color: 'bg-teal-500',
  },
  {
    name: 'Log de Auditoría',
    description: 'Revisar el registro de acciones del sistema',
    href: '/admin/auditoria',
    icon: ShieldExclamationIcon,
    color: 'bg-red-500',
  },
];

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || (user.rol !== 'admin_lider' && user.rol !== 'admin'))) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || (user.rol !== 'admin_lider' && user.rol !== 'admin')) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Administración</h1>
        <p className="mt-2 text-gray-600">
          Gestiona usuarios, configuraciones y catálogos del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.name}
              href={module.href}
              className="group relative bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <div className={`${module.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                    {module.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {module.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}