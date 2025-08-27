'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface ServiceLine {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

interface ServiceLineFormData {
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  activo: boolean;
}

const defaultFormData: ServiceLineFormData = {
  codigo: '',
  nombre: '',
  descripcion: '',
  categoria: 'Eléctrico',
  activo: true,
};

const categories = [
  'Eléctrico',
  'Civil',
  'CCTV',
  'Mantenimiento',
  'Telecomunicaciones',
  'Seguridad',
  'Otros'
];

function ServiceLineForm({ 
  serviceLine, 
  onSuccess, 
  onCancel 
}: { 
  serviceLine?: ServiceLine | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<ServiceLineFormData>(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (serviceLine) {
      setFormData({
        codigo: serviceLine.codigo,
        nombre: serviceLine.nombre,
        descripcion: serviceLine.descripcion,
        categoria: serviceLine.categoria,
        activo: serviceLine.activo,
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [serviceLine]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.codigo.trim()) {
      errors.codigo = 'El código es requerido';
    }

    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    }

    if (!formData.descripcion.trim()) {
      errors.descripcion = 'La descripción es requerida';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;
      if (serviceLine) {
        response = await apiClient.update('LineasServicio', serviceLine.id, formData);
      } else {
        response = await apiClient.create('LineasServicio', formData);
      }

      if (response.ok) {
        onSuccess();
      } else {
        setError(response.message || 'Error al guardar línea de servicio');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ServiceLineFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="codigo" className="block text-sm font-medium text-gray-700">
          Código *
        </label>
        <input
          type="text"
          id="codigo"
          value={formData.codigo}
          onChange={(e) => handleInputChange('codigo', e.target.value)}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            validationErrors.codigo ? 'border-red-300' : ''
          }`}
          disabled={loading}
          placeholder="Ej: ELE, CIV, CCTV"
        />
        {validationErrors.codigo && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.codigo}</p>
        )}
      </div>

      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
          Nombre *
        </label>
        <input
          type="text"
          id="nombre"
          value={formData.nombre}
          onChange={(e) => handleInputChange('nombre', e.target.value)}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            validationErrors.nombre ? 'border-red-300' : ''
          }`}
          disabled={loading}
          placeholder="Nombre de la línea de servicio"
        />
        {validationErrors.nombre && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.nombre}</p>
        )}
      </div>

      <div>
        <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">
          Categoría *
        </label>
        <select
          id="categoria"
          value={formData.categoria}
          onChange={(e) => handleInputChange('categoria', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          disabled={loading}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">
          Descripción *
        </label>
        <textarea
          id="descripcion"
          rows={3}
          value={formData.descripcion}
          onChange={(e) => handleInputChange('descripcion', e.target.value)}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            validationErrors.descripcion ? 'border-red-300' : ''
          }`}
          disabled={loading}
          placeholder="Descripción detallada de la línea de servicio"
        />
        {validationErrors.descripcion && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.descripcion}</p>
        )}
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="activo"
          checked={formData.activo}
          onChange={(e) => handleInputChange('activo', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          disabled={loading}
        />
        <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
          Línea de servicio activa
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Guardando...' : serviceLine ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
}

export function ServiceLinesConfig() {
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showServiceLineForm, setShowServiceLineForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedServiceLine, setSelectedServiceLine] = useState<ServiceLine | null>(null);

  const loadServiceLines = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.list<ServiceLine>('LineasServicio', { q: searchQuery });
      
      if (response.ok && response.data) {
        setServiceLines(response.data);
      } else {
        setError(response.message || 'Error al cargar líneas de servicio');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServiceLines();
  }, [searchQuery]);

  const handleCreateServiceLine = () => {
    setSelectedServiceLine(null);
    setShowServiceLineForm(true);
  };

  const handleEditServiceLine = (serviceLine: ServiceLine) => {
    setSelectedServiceLine(serviceLine);
    setShowServiceLineForm(true);
  };

  const handleDeleteServiceLine = (serviceLine: ServiceLine) => {
    setSelectedServiceLine(serviceLine);
    setShowDeleteConfirm(true);
  };

  const handleToggleActive = async (serviceLine: ServiceLine) => {
    try {
      const response = await apiClient.update('LineasServicio', serviceLine.id, {
        activo: !serviceLine.activo
      });

      if (response.ok) {
        await loadServiceLines();
      } else {
        setError(response.message || 'Error al actualizar línea de servicio');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    }
  };

  const confirmDeleteServiceLine = async () => {
    if (!selectedServiceLine) return;

    try {
      const response = await apiClient.delete('LineasServicio', selectedServiceLine.id);
      
      if (response.ok) {
        await loadServiceLines();
        setShowDeleteConfirm(false);
        setSelectedServiceLine(null);
      } else {
        setError(response.message || 'Error al eliminar línea de servicio');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    }
  };

  const handleServiceLineFormSuccess = async () => {
    setShowServiceLineForm(false);
    setSelectedServiceLine(null);
    await loadServiceLines();
  };

  const getCategoryBadgeColor = (categoria: string) => {
    switch (categoria) {
      case 'Eléctrico':
        return 'bg-yellow-100 text-yellow-800';
      case 'Civil':
        return 'bg-gray-100 text-gray-800';
      case 'CCTV':
        return 'bg-blue-100 text-blue-800';
      case 'Mantenimiento':
        return 'bg-green-100 text-green-800';
      case 'Telecomunicaciones':
        return 'bg-purple-100 text-purple-800';
      case 'Seguridad':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const columns = [
    {
      key: 'codigo',
      label: 'Código',
      render: (serviceLine: ServiceLine) => (
        <span className="font-mono text-sm font-medium text-gray-900">
          {serviceLine.codigo}
        </span>
      ),
    },
    {
      key: 'nombre',
      label: 'Línea de Servicio',
      render: (serviceLine: ServiceLine) => (
        <div>
          <div className="font-medium text-gray-900">{serviceLine.nombre}</div>
          <div className="text-sm text-gray-500">{serviceLine.descripcion}</div>
        </div>
      ),
    },
    {
      key: 'categoria',
      label: 'Categoría',
      render: (serviceLine: ServiceLine) => (
        <Badge className={getCategoryBadgeColor(serviceLine.categoria)}>
          {serviceLine.categoria}
        </Badge>
      ),
    },
    {
      key: 'activo',
      label: 'Estado',
      render: (serviceLine: ServiceLine) => (
        <Badge className={serviceLine.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
          {serviceLine.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Creado',
      render: (serviceLine: ServiceLine) => (
        <span className="text-sm text-gray-500">
          {new Date(serviceLine.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (serviceLine: ServiceLine) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditServiceLine(serviceLine)}
            className="text-blue-600 hover:text-blue-900"
            title="Editar línea de servicio"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => handleToggleActive(serviceLine)}
            className={serviceLine.activo ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
            title={serviceLine.activo ? 'Desactivar línea' : 'Activar línea'}
          >
            {serviceLine.activo ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
          
          <button
            onClick={() => handleDeleteServiceLine(serviceLine)}
            className="text-red-600 hover:text-red-900"
            title="Eliminar línea de servicio"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <DocumentTextIcon className="h-6 w-6 mr-2" />
              Líneas de Servicio
            </h1>
            <p className="mt-1 text-gray-600">
              Configura las líneas de servicio disponibles en el sistema
            </p>
          </div>
          
          <button
            onClick={handleCreateServiceLine}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nueva Línea de Servicio
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <Table
          data={serviceLines}
          columns={columns}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Buscar por código, nombre o categoría..."
        />
      </div>

      {/* Service Line Form Modal */}
      <Modal
        isOpen={showServiceLineForm}
        onClose={() => setShowServiceLineForm(false)}
        title={selectedServiceLine ? 'Editar Línea de Servicio' : 'Nueva Línea de Servicio'}
      >
        <ServiceLineForm
          serviceLine={selectedServiceLine}
          onSuccess={handleServiceLineFormSuccess}
          onCancel={() => setShowServiceLineForm(false)}
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteServiceLine}
        title="Eliminar Línea de Servicio"
        message={`¿Estás seguro de que deseas eliminar la línea de servicio "${selectedServiceLine?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}