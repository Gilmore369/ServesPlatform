'use client';

import { useState, useEffect } from 'react';
import { Personnel } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { AssignmentManager } from './AssignmentManager';
import { TimesheetEntry } from './TimesheetEntry';
import { UtilizationReport } from './UtilizationReport';
import { 
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CalendarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface PersonnelDetailProps {
  personnel: Personnel;
}

interface Certification {
  tipo: string;
  vencimiento: string;
}

export function PersonnelDetail({ personnel }: PersonnelDetailProps) {
  const [certifications, setCertifications] = useState<Certification[]>([]);

  // Parse certifications from JSON
  useEffect(() => {
    if (personnel.certificaciones_json) {
      try {
        const parsedCerts = JSON.parse(personnel.certificaciones_json);
        setCertifications(parsedCerts);
      } catch {
        setCertifications([]);
      }
    }
  }, [personnel.certificaciones_json]);

  // Check certification status
  const getCertificationStatus = (vencimiento: string) => {
    const expiryDate = new Date(vencimiento);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (expiryDate < today) {
      return { status: 'expired', label: 'Vencida', color: 'red' as const, icon: ExclamationTriangleIcon };
    }
    if (expiryDate <= thirtyDaysFromNow) {
      return { status: 'expiring', label: 'Por vencer', color: 'yellow' as const, icon: ExclamationTriangleIcon };
    }
    return { status: 'valid', label: 'Vigente', color: 'green' as const, icon: CheckCircleIcon };
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = (vencimiento: string) => {
    const expiryDate = new Date(vencimiento);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Basic Information Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Información Personal</h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">DNI/RUC</p>
                  <p className="text-sm text-gray-900">{personnel.dni_ruc}</p>
                </div>
              </div>

              <div className="flex items-center">
                <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{personnel.email}</p>
                </div>
              </div>

              <div className="flex items-center">
                <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Teléfono</p>
                  <p className="text-sm text-gray-900">{personnel.telefono || 'No especificado'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <AcademicCapIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Especialidad</p>
                  <p className="text-sm text-gray-900">{personnel.especialidad}</p>
                </div>
              </div>

              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Zona</p>
                  <p className="text-sm text-gray-900">{personnel.zona}</p>
                </div>
              </div>

              <div className="flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Tarifa por Hora</p>
                  <p className="text-sm text-gray-900">S/ {personnel.tarifa_hora.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Estado</p>
                <Badge color={personnel.activo ? 'green' : 'red'}>
                  {personnel.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-500">Registrado</p>
                <p className="text-sm text-gray-900">
                  {formatDate(personnel.created_at.toString())}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Certifications Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Certificaciones</h2>
            <span className="text-sm text-gray-500">
              {certifications.length} certificación{certifications.length !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>
        <div className="px-6 py-4">
          {certifications.length > 0 ? (
            <div className="space-y-4">
              {certifications.map((cert, index) => {
                const status = getCertificationStatus(cert.vencimiento);
                const daysUntilExpiry = getDaysUntilExpiry(cert.vencimiento);
                const StatusIcon = status.icon;

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <AcademicCapIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{cert.tipo}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            Vence: {formatDate(cert.vencimiento)}
                          </span>
                        </div>
                        {status.status === 'expiring' && daysUntilExpiry > 0 && (
                          <p className="text-xs text-yellow-600 mt-1">
                            Vence en {daysUntilExpiry} día{daysUntilExpiry !== 1 ? 's' : ''}
                          </p>
                        )}
                        {status.status === 'expired' && (
                          <p className="text-xs text-red-600 mt-1">
                            Vencida hace {Math.abs(daysUntilExpiry)} día{Math.abs(daysUntilExpiry) !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge color={status.color}>
                        {status.label}
                      </Badge>
                      <StatusIcon className={`h-5 w-5 ${
                        status.status === 'expired' ? 'text-red-500' :
                        status.status === 'expiring' ? 'text-yellow-500' :
                        'text-green-500'
                      }`} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin certificaciones</h3>
              <p className="mt-1 text-sm text-gray-500">
                Este colaborador no tiene certificaciones registradas.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Activity Tabs */}
      <PersonnelActivityTabs personnelId={personnel.id} />
    </div>
  );
}

// Personnel Activity Tabs Component
interface PersonnelActivityTabsProps {
  personnelId: string;
}

function PersonnelActivityTabs({ personnelId }: PersonnelActivityTabsProps) {
  const [activeTab, setActiveTab] = useState('assignments');

  const tabs = [
    { id: 'assignments', label: 'Asignaciones', icon: CalendarIcon },
    { id: 'timesheet', label: 'Registro de Horas', icon: ClockIcon },
    { id: 'utilization', label: 'Utilización', icon: AcademicCapIcon },
  ];

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'assignments' && (
          <AssignmentManager personnelId={personnelId} />
        )}
        {activeTab === 'timesheet' && (
          <TimesheetEntry personnelId={personnelId} />
        )}
        {activeTab === 'utilization' && (
          <UtilizationReport personnelId={personnelId} />
        )}
      </div>
    </div>
  );
}