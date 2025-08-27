'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Personnel } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { 
  EyeIcon, 
  PencilIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

interface PersonnelListProps {
  personnel: Personnel[];
  onEdit?: (personnel: Personnel) => void;
  canManage?: boolean;
}

interface Certification {
  tipo: string;
  vencimiento: string;
}

export function PersonnelList({ personnel, onEdit, canManage = false }: PersonnelListProps) {
  const [sortField, setSortField] = useState<keyof Personnel>('nombres');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Parse certifications from JSON
  const parseCertifications = (certificationsJson?: string): Certification[] => {
    if (!certificationsJson) return [];
    try {
      return JSON.parse(certificationsJson);
    } catch {
      return [];
    }
  };

  // Check if any certification is expiring soon (within 30 days)
  const hasExpiringCertifications = (certificationsJson?: string): boolean => {
    const certifications = parseCertifications(certificationsJson);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return certifications.some(cert => {
      const expiryDate = new Date(cert.vencimiento);
      return expiryDate <= thirtyDaysFromNow;
    });
  };

  // Check if any certification is expired
  const hasExpiredCertifications = (certificationsJson?: string): boolean => {
    const certifications = parseCertifications(certificationsJson);
    const today = new Date();

    return certifications.some(cert => {
      const expiryDate = new Date(cert.vencimiento);
      return expiryDate < today;
    });
  };

  // Get certification status
  const getCertificationStatus = (certificationsJson?: string) => {
    if (hasExpiredCertifications(certificationsJson)) {
      return { status: 'expired', label: 'Vencidas', color: 'red' as const };
    }
    if (hasExpiringCertifications(certificationsJson)) {
      return { status: 'expiring', label: 'Por vencer', color: 'yellow' as const };
    }
    return { status: 'valid', label: 'Vigentes', color: 'green' as const };
  };

  // Sort personnel
  const sortedPersonnel = [...personnel].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof Personnel) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const columns = [
    {
      key: 'nombres' as keyof Personnel,
      label: 'Nombre',
      sortable: true,
      render: (personnel: Personnel) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {personnel.nombres.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{personnel.nombres}</div>
            <div className="text-sm text-gray-500">{personnel.dni_ruc}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'especialidad' as keyof Personnel,
      label: 'Especialidad',
      sortable: true,
      render: (personnel: Personnel) => (
        <div>
          <div className="text-sm text-gray-900">{personnel.especialidad}</div>
          <div className="text-sm text-gray-500">{personnel.zona}</div>
        </div>
      ),
    },
    {
      key: 'email' as keyof Personnel,
      label: 'Contacto',
      sortable: true,
      render: (personnel: Personnel) => (
        <div>
          <div className="text-sm text-gray-900">{personnel.email}</div>
          <div className="text-sm text-gray-500">{personnel.telefono}</div>
        </div>
      ),
    },
    {
      key: 'tarifa_hora' as keyof Personnel,
      label: 'Tarifa/Hora',
      sortable: true,
      render: (personnel: Personnel) => (
        <div className="text-sm text-gray-900">
          S/ {personnel.tarifa_hora.toFixed(2)}
        </div>
      ),
    },
    {
      key: 'certificaciones_json' as keyof Personnel,
      label: 'Certificaciones',
      sortable: false,
      render: (personnel: Personnel) => {
        const certStatus = getCertificationStatus(personnel.certificaciones_json);
        const certCount = parseCertifications(personnel.certificaciones_json).length;
        
        return (
          <div className="flex items-center space-x-2">
            <Badge color={certStatus.color}>
              {certStatus.label}
            </Badge>
            <span className="text-sm text-gray-500">
              ({certCount} cert{certCount !== 1 ? 's' : ''})
            </span>
            {certStatus.status === 'expired' && (
              <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
            )}
            {certStatus.status === 'expiring' && (
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
            )}
            {certStatus.status === 'valid' && (
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
            )}
          </div>
        );
      },
    },
    {
      key: 'activo' as keyof Personnel,
      label: 'Estado',
      sortable: true,
      render: (personnel: Personnel) => (
        <Badge color={personnel.activo ? 'green' : 'red'}>
          {personnel.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions' as keyof Personnel,
      label: 'Acciones',
      sortable: false,
      render: (personnel: Personnel) => (
        <div className="flex items-center space-x-2">
          <Link
            href={`/personal/${personnel.id}`}
            className="text-blue-600 hover:text-blue-900"
            title="Ver detalle"
          >
            <EyeIcon className="h-4 w-4" />
          </Link>
          {canManage && onEdit && (
            <button
              onClick={() => onEdit(personnel)}
              className="text-gray-600 hover:text-gray-900"
              title="Editar"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (personnel.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay colaboradores</h3>
          <p className="mt-1 text-sm text-gray-500">
            Comienza agregando un nuevo colaborador al sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <Table
        data={sortedPersonnel}
        columns={columns}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    </div>
  );
}