'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { auditLogger, AuditLogEntry, AuditAction, ResourceType } from '@/lib/auditLog';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/Modal';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { Permission } from '@/lib/permissions';
import { 
  EyeIcon, 
  FunnelIcon,
  CalendarIcon,
  UserIcon,
  ShieldExclamationIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface AuditLogFilters {
  usuario_id?: string;
  accion?: string;
  recurso_tipo?: string;
  fecha_inicio?: Date;
  fecha_fin?: Date;
}

export function AuditLogViewer() {
  const { user } = useAuth();
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AuditLogFilters>({});

  const loadAuditLog = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const entries = await auditLogger.getAuditLog({
        ...filters,
        limit: 100,
      });
      
      setAuditEntries(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el log de auditoría');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLog();
  }, [filters]);

  const handleViewDetails = (entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setShowDetails(true);
  };

  const handleApplyFilters = (newFilters: AuditLogFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('login') || action.includes('logout')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (action.includes('created')) {
      return 'bg-green-100 text-green-800';
    }
    if (action.includes('updated')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    if (action.includes('deleted') || action.includes('deactivated')) {
      return 'bg-red-100 text-red-800';
    }
    if (action.includes('failed') || action.includes('denied') || action.includes('unauthorized')) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getResourceTypeIcon = (resourceType: string) => {
    switch (resourceType) {
      case ResourceType.USER:
        return <UserIcon className="h-4 w-4" />;
      case ResourceType.PROJECT:
        return <DocumentTextIcon className="h-4 w-4" />;
      default:
        return <DocumentTextIcon className="h-4 w-4" />;
    }
  };

  const formatActionName = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatResourceType = (resourceType: string) => {
    const types: Record<string, string> = {
      [ResourceType.USER]: 'Usuario',
      [ResourceType.PROJECT]: 'Proyecto',
      [ResourceType.ACTIVITY]: 'Actividad',
      [ResourceType.PERSONNEL]: 'Personal',
      [ResourceType.MATERIAL]: 'Material',
      [ResourceType.BOM]: 'BOM',
      [ResourceType.ASSIGNMENT]: 'Asignación',
      [ResourceType.TIME_ENTRY]: 'Registro de Horas',
      [ResourceType.SYSTEM_CONFIG]: 'Configuración',
      [ResourceType.REPORT]: 'Reporte',
    };
    return types[resourceType] || resourceType;
  };

  const columns = [
    {
      key: 'timestamp',
      label: 'Fecha/Hora',
      render: (entry: AuditLogEntry) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {new Date(entry.timestamp).toLocaleDateString()}
          </div>
          <div className="text-gray-500">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: 'usuario_nombre',
      label: 'Usuario',
      render: (entry: AuditLogEntry) => (
        <div className="flex items-center">
          <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm font-medium text-gray-900">
            {entry.usuario_nombre}
          </span>
        </div>
      ),
    },
    {
      key: 'accion',
      label: 'Acción',
      render: (entry: AuditLogEntry) => (
        <Badge className={getActionBadgeColor(entry.accion)}>
          {formatActionName(entry.accion)}
        </Badge>
      ),
    },
    {
      key: 'recurso_tipo',
      label: 'Recurso',
      render: (entry: AuditLogEntry) => (
        <div className="flex items-center">
          {getResourceTypeIcon(entry.recurso_tipo)}
          <span className="ml-2 text-sm text-gray-900">
            {formatResourceType(entry.recurso_tipo)}
          </span>
        </div>
      ),
    },
    {
      key: 'recurso_nombre',
      label: 'Nombre del Recurso',
      render: (entry: AuditLogEntry) => (
        <span className="text-sm text-gray-600">
          {entry.recurso_nombre || entry.recurso_id || '-'}
        </span>
      ),
    },
    {
      key: 'ip_address',
      label: 'IP',
      render: (entry: AuditLogEntry) => (
        <span className="text-xs text-gray-500 font-mono">
          {entry.ip_address || '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (entry: AuditLogEntry) => (
        <button
          onClick={() => handleViewDetails(entry)}
          className="text-blue-600 hover:text-blue-900"
          title="Ver detalles"
        >
          <EyeIcon className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <PermissionGate permission={Permission.VIEW_AUDIT_LOG}>
      <div>
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <ShieldExclamationIcon className="h-6 w-6 mr-2" />
                Log de Auditoría
              </h1>
              <p className="mt-1 text-gray-600">
                Registro de todas las acciones realizadas en el sistema
              </p>
            </div>
            
            <button
              onClick={() => setShowFilters(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filtros
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Active Filters Display */}
        {Object.keys(filters).length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Filtros activos:</span>
                {filters.accion && (
                  <Badge className="bg-blue-100 text-blue-800">
                    Acción: {formatActionName(filters.accion)}
                  </Badge>
                )}
                {filters.recurso_tipo && (
                  <Badge className="bg-blue-100 text-blue-800">
                    Recurso: {formatResourceType(filters.recurso_tipo)}
                  </Badge>
                )}
                {filters.fecha_inicio && (
                  <Badge className="bg-blue-100 text-blue-800">
                    Desde: {filters.fecha_inicio.toLocaleDateString()}
                  </Badge>
                )}
                {filters.fecha_fin && (
                  <Badge className="bg-blue-100 text-blue-800">
                    Hasta: {filters.fecha_fin.toLocaleDateString()}
                  </Badge>
                )}
              </div>
              <button
                onClick={() => setFilters({})}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <Table
            data={auditEntries}
            columns={columns}
            loading={loading}
            searchQuery=""
            onSearchChange={() => {}}
            searchPlaceholder="Los filtros se aplican usando el botón Filtros"
            showSearch={false}
          />
        </div>

        {/* Filters Modal */}
        <Modal
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          title="Filtrar Log de Auditoría"
        >
          <AuditLogFilters
            currentFilters={filters}
            onApply={handleApplyFilters}
            onCancel={() => setShowFilters(false)}
          />
        </Modal>

        {/* Details Modal */}
        <Modal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="Detalles del Evento de Auditoría"
        >
          {selectedEntry && (
            <AuditLogDetails
              entry={selectedEntry}
              onClose={() => setShowDetails(false)}
            />
          )}
        </Modal>
      </div>
    </PermissionGate>
  );
}

// Filters component
interface AuditLogFiltersProps {
  currentFilters: AuditLogFilters;
  onApply: (filters: AuditLogFilters) => void;
  onCancel: () => void;
}

function AuditLogFilters({ currentFilters, onApply, onCancel }: AuditLogFiltersProps) {
  const [filters, setFilters] = useState<AuditLogFilters>(currentFilters);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(filters);
  };

  const actionOptions = Object.values(AuditAction).map(action => ({
    value: action,
    label: formatActionName(action),
  }));

  const resourceTypeOptions = Object.values(ResourceType).map(type => ({
    value: type,
    label: formatResourceType(type),
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="accion" className="block text-sm font-medium text-gray-700">
          Acción
        </label>
        <select
          id="accion"
          value={filters.accion || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, accion: e.target.value || undefined }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Todas las acciones</option>
          {actionOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="recurso_tipo" className="block text-sm font-medium text-gray-700">
          Tipo de Recurso
        </label>
        <select
          id="recurso_tipo"
          value={filters.recurso_tipo || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, recurso_tipo: e.target.value || undefined }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Todos los recursos</option>
          {resourceTypeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="fecha_inicio" className="block text-sm font-medium text-gray-700">
            Fecha Inicio
          </label>
          <input
            type="date"
            id="fecha_inicio"
            value={filters.fecha_inicio ? filters.fecha_inicio.toISOString().split('T')[0] : ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              fecha_inicio: e.target.value ? new Date(e.target.value) : undefined 
            }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="fecha_fin" className="block text-sm font-medium text-gray-700">
            Fecha Fin
          </label>
          <input
            type="date"
            id="fecha_fin"
            value={filters.fecha_fin ? filters.fecha_fin.toISOString().split('T')[0] : ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              fecha_fin: e.target.value ? new Date(e.target.value) : undefined 
            }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Aplicar Filtros
        </button>
      </div>
    </form>
  );
}

// Details component
interface AuditLogDetailsProps {
  entry: AuditLogEntry;
  onClose: () => void;
}

function AuditLogDetails({ entry, onClose }: AuditLogDetailsProps) {
  let details;
  try {
    details = JSON.parse(entry.detalles_json);
  } catch {
    details = {};
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Usuario</label>
          <p className="mt-1 text-sm text-gray-900">{entry.usuario_nombre}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha/Hora</label>
          <p className="mt-1 text-sm text-gray-900">
            {new Date(entry.timestamp).toLocaleString()}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Acción</label>
          <Badge className={getActionBadgeColor(entry.accion)}>
            {formatActionName(entry.accion)}
          </Badge>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Recurso</label>
          <p className="mt-1 text-sm text-gray-900">
            {formatResourceType(entry.recurso_tipo)}
          </p>
        </div>
        {entry.recurso_nombre && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre del Recurso</label>
            <p className="mt-1 text-sm text-gray-900">{entry.recurso_nombre}</p>
          </div>
        )}
        {entry.ip_address && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Dirección IP</label>
            <p className="mt-1 text-sm text-gray-900 font-mono">{entry.ip_address}</p>
          </div>
        )}
      </div>

      {Object.keys(details).length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Detalles</label>
          <div className="bg-gray-50 rounded-md p-3">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

// Helper functions (duplicated from the main component for the sub-components)
function formatActionName(action: string) {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatResourceType(resourceType: string) {
  const types: Record<string, string> = {
    [ResourceType.USER]: 'Usuario',
    [ResourceType.PROJECT]: 'Proyecto',
    [ResourceType.ACTIVITY]: 'Actividad',
    [ResourceType.PERSONNEL]: 'Personal',
    [ResourceType.MATERIAL]: 'Material',
    [ResourceType.BOM]: 'BOM',
    [ResourceType.ASSIGNMENT]: 'Asignación',
    [ResourceType.TIME_ENTRY]: 'Registro de Horas',
    [ResourceType.SYSTEM_CONFIG]: 'Configuración',
    [ResourceType.REPORT]: 'Reporte',
  };
  return types[resourceType] || resourceType;
}

function getActionBadgeColor(action: string) {
  if (action.includes('login') || action.includes('logout')) {
    return 'bg-blue-100 text-blue-800';
  }
  if (action.includes('created')) {
    return 'bg-green-100 text-green-800';
  }
  if (action.includes('updated')) {
    return 'bg-yellow-100 text-yellow-800';
  }
  if (action.includes('deleted') || action.includes('deactivated')) {
    return 'bg-red-100 text-red-800';
  }
  if (action.includes('failed') || action.includes('denied') || action.includes('unauthorized')) {
    return 'bg-red-100 text-red-800';
  }
  return 'bg-gray-100 text-gray-800';
}