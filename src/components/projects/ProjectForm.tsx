'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Project, User, Client } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { ClientForm } from '@/components/clients/ClientForm';
import { PlusIcon } from '@heroicons/react/24/outline';

interface ProjectFormProps {
  project?: Project;
  onSuccess: (project: Project) => void;
  onCancel: () => void;
}

interface ProjectFormData {
  codigo: string;
  nombre: string;
  cliente_id: string;
  responsable_id: string;
  ubicacion: string;
  descripcion: string;
  linea_servicio: string;
  sla_objetivo: number;
  inicio_plan: string;
  fin_plan: string;
  presupuesto_total: number;
  moneda: 'PEN' | 'USD';
  estado: 'Planificación' | 'En progreso' | 'Pausado' | 'Cerrado';
}

const initialFormData: ProjectFormData = {
  codigo: '',
  nombre: '',
  cliente_id: '',
  responsable_id: '',
  ubicacion: '',
  descripcion: '',
  linea_servicio: '',
  sla_objetivo: 30,
  inicio_plan: '',
  fin_plan: '',
  presupuesto_total: 0,
  moneda: 'PEN',
  estado: 'Planificación',
};

export function ProjectForm({ project, onSuccess, onCancel }: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectFormData>(
    project ? {
      codigo: project.codigo,
      nombre: project.nombre,
      cliente_id: project.cliente_id,
      responsable_id: project.responsable_id,
      ubicacion: project.ubicacion,
      descripcion: project.descripcion,
      linea_servicio: project.linea_servicio,
      sla_objetivo: project.sla_objetivo,
      inicio_plan: new Date(project.inicio_plan).toISOString().split('T')[0],
      fin_plan: new Date(project.fin_plan).toISOString().split('T')[0],
      presupuesto_total: project.presupuesto_total,
      moneda: project.moneda,
      estado: project.estado,
    } : initialFormData
  );

  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showClientModal, setShowClientModal] = useState(false);

  // Load users and clients for dropdowns
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [usersResponse, clientsResponse] = await Promise.all([
        apiClient.getUsers({ limit: 100 }),
        apiClient.getClients({ limit: 100 }),
      ]);

      if (usersResponse.ok && usersResponse.data) {
        // Filter users that can be project managers (admin_lider, admin, editor)
        const projectManagers = usersResponse.data.filter(user => 
          ['admin_lider', 'admin', 'editor'].includes(user.rol) && user.activo
        );
        setUsers(projectManagers);
      }

      if (clientsResponse.ok && clientsResponse.data) {
        // Filter active clients
        const activeClients = clientsResponse.data.filter(client => client.activo);
        setClients(activeClients);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  // Handle form field changes
  const handleChange = (field: keyof ProjectFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.codigo.trim()) {
      newErrors.codigo = 'El código es requerido';
    } else if (!/^[A-Z0-9-]+$/.test(formData.codigo)) {
      newErrors.codigo = 'El código debe contener solo letras mayúsculas, números y guiones';
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (!formData.cliente_id.trim()) {
      newErrors.cliente_id = 'El cliente es requerido';
    }

    if (!formData.responsable_id) {
      newErrors.responsable_id = 'El responsable es requerido';
    }

    if (!formData.ubicacion.trim()) {
      newErrors.ubicacion = 'La ubicación es requerida';
    }

    if (!formData.linea_servicio.trim()) {
      newErrors.linea_servicio = 'La línea de servicio es requerida';
    }

    if (!formData.inicio_plan) {
      newErrors.inicio_plan = 'La fecha de inicio es requerida';
    }

    if (!formData.fin_plan) {
      newErrors.fin_plan = 'La fecha de fin es requerida';
    }

    if (formData.inicio_plan && formData.fin_plan && formData.inicio_plan >= formData.fin_plan) {
      newErrors.fin_plan = 'La fecha de fin debe ser posterior a la fecha de inicio';
    }

    if (formData.presupuesto_total <= 0) {
      newErrors.presupuesto_total = 'El presupuesto debe ser mayor a 0';
    }

    if (formData.sla_objetivo <= 0) {
      newErrors.sla_objetivo = 'El SLA objetivo debe ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare data for API
      const projectData = {
        ...formData,
        inicio_plan: new Date(formData.inicio_plan),
        fin_plan: new Date(formData.fin_plan),
        avance_pct: project?.avance_pct || 0,
      };

      let response;
      if (project) {
        // Update existing project
        response = await apiClient.updateProject(project.id, projectData);
      } else {
        // Create new project
        response = await apiClient.createProject(projectData);
      }

      if (response.ok && response.data) {
        onSuccess(response.data);
      } else {
        throw new Error(response.message || 'Error saving project');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Error saving project' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle client creation
  const handleClientCreated = (newClient: Client) => {
    setClients(prev => [newClient, ...prev]);
    setFormData(prev => ({ ...prev, cliente_id: newClient.id }));
    setShowClientModal(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error message */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{errors.submit}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Código */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Código *
          </label>
          <input
            type="text"
            value={formData.codigo}
            onChange={(e) => handleChange('codigo', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.codigo ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Ej: PROJ-2024-001"
          />
          {errors.codigo && (
            <p className="mt-1 text-sm text-red-600">{errors.codigo}</p>
          )}
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre *
          </label>
          <input
            type="text"
            value={formData.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.nombre ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Nombre del proyecto"
          />
          {errors.nombre && (
            <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
          )}
        </div>

        {/* Cliente */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cliente *
          </label>
          <div className="flex gap-2">
            <select
              value={formData.cliente_id}
              onChange={(e) => handleChange('cliente_id', e.target.value)}
              className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.cliente_id ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccionar cliente</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.razon_social} ({client.ruc})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowClientModal(true)}
              className="px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 flex items-center gap-1"
              title="Crear nuevo cliente"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          {errors.cliente_id && (
            <p className="mt-1 text-sm text-red-600">{errors.cliente_id}</p>
          )}
        </div>

        {/* Responsable */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Responsable *
          </label>
          <select
            value={formData.responsable_id}
            onChange={(e) => handleChange('responsable_id', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.responsable_id ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Seleccionar responsable</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.nombre} ({user.rol})
              </option>
            ))}
          </select>
          {errors.responsable_id && (
            <p className="mt-1 text-sm text-red-600">{errors.responsable_id}</p>
          )}
        </div>

        {/* Ubicación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ubicación *
          </label>
          <input
            type="text"
            value={formData.ubicacion}
            onChange={(e) => handleChange('ubicacion', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.ubicacion ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Ubicación del proyecto"
          />
          {errors.ubicacion && (
            <p className="mt-1 text-sm text-red-600">{errors.ubicacion}</p>
          )}
        </div>

        {/* Línea de Servicio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Línea de Servicio *
          </label>
          <select
            value={formData.linea_servicio}
            onChange={(e) => handleChange('linea_servicio', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.linea_servicio ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Seleccionar línea de servicio</option>
            <option value="Eléctrico">Eléctrico</option>
            <option value="Civil">Civil</option>
            <option value="CCTV">CCTV</option>
            <option value="Mantenimiento">Mantenimiento</option>
            <option value="Telecomunicaciones">Telecomunicaciones</option>
          </select>
          {errors.linea_servicio && (
            <p className="mt-1 text-sm text-red-600">{errors.linea_servicio}</p>
          )}
        </div>

        {/* SLA Objetivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SLA Objetivo (días) *
          </label>
          <input
            type="number"
            min="1"
            value={formData.sla_objetivo}
            onChange={(e) => handleChange('sla_objetivo', parseInt(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.sla_objetivo ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.sla_objetivo && (
            <p className="mt-1 text-sm text-red-600">{errors.sla_objetivo}</p>
          )}
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={formData.estado}
            onChange={(e) => handleChange('estado', e.target.value as ProjectFormData['estado'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Planificación">Planificación</option>
            <option value="En progreso">En progreso</option>
            <option value="Pausado">Pausado</option>
            <option value="Cerrado">Cerrado</option>
          </select>
        </div>

        {/* Fecha Inicio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Inicio *
          </label>
          <input
            type="date"
            value={formData.inicio_plan}
            onChange={(e) => handleChange('inicio_plan', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.inicio_plan ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.inicio_plan && (
            <p className="mt-1 text-sm text-red-600">{errors.inicio_plan}</p>
          )}
        </div>

        {/* Fecha Fin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Fin *
          </label>
          <input
            type="date"
            value={formData.fin_plan}
            onChange={(e) => handleChange('fin_plan', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.fin_plan ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.fin_plan && (
            <p className="mt-1 text-sm text-red-600">{errors.fin_plan}</p>
          )}
        </div>

        {/* Presupuesto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Presupuesto Total *
          </label>
          <div className="flex">
            <select
              value={formData.moneda}
              onChange={(e) => handleChange('moneda', e.target.value as 'PEN' | 'USD')}
              className="px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="PEN">PEN</option>
              <option value="USD">USD</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.presupuesto_total}
              onChange={(e) => handleChange('presupuesto_total', parseFloat(e.target.value) || 0)}
              className={`flex-1 px-3 py-2 border-t border-r border-b rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.presupuesto_total ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0.00"
            />
          </div>
          {errors.presupuesto_total && (
            <p className="mt-1 text-sm text-red-600">{errors.presupuesto_total}</p>
          )}
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          value={formData.descripcion}
          onChange={(e) => handleChange('descripcion', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Descripción detallada del proyecto..."
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : (project ? 'Actualizar' : 'Crear Proyecto')}
        </button>
      </div>

      {/* Create Client Modal */}
      <Modal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        title="Crear Nuevo Cliente"
        size="lg"
      >
        <ClientForm
          onSuccess={handleClientCreated}
          onCancel={() => setShowClientModal(false)}
        />
      </Modal>
    </form>
  );
}