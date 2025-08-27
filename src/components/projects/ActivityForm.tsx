'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Activity, User, ActivityChecklist, Evidence } from '@/lib/types';
import { useActivityStateChangeValidation } from '@/lib/hooks/useBusinessRules';
import { ValidationAlert } from '@/components/ui/ValidationAlert';

interface ActivityFormProps {
  activity?: Activity;
  projectId: string;
  users: User[];
  checklist?: ActivityChecklist;
  evidence?: Evidence[];
  onSuccess: (activity: Activity) => void;
  onCancel: () => void;
}

interface ActivityFormData {
  codigo: string;
  titulo: string;
  descripcion: string;
  responsable_id: string;
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  estado: 'Pendiente' | 'En progreso' | 'En revisión' | 'Completada';
  inicio_plan: string;
  fin_plan: string;
  porcentaje_avance: number;
}

const initialFormData: ActivityFormData = {
  codigo: '',
  titulo: '',
  descripcion: '',
  responsable_id: '',
  prioridad: 'Media',
  estado: 'Pendiente',
  inicio_plan: '',
  fin_plan: '',
  porcentaje_avance: 0,
};

export function ActivityForm({ activity, projectId, users, checklist, evidence, onSuccess, onCancel }: ActivityFormProps) {
  const [formData, setFormData] = useState<ActivityFormData>(
    activity ? {
      codigo: activity.codigo,
      titulo: activity.titulo,
      descripcion: activity.descripcion,
      responsable_id: activity.responsable_id,
      prioridad: activity.prioridad,
      estado: activity.estado,
      inicio_plan: new Date(activity.inicio_plan).toISOString().split('T')[0],
      fin_plan: new Date(activity.fin_plan).toISOString().split('T')[0],
      porcentaje_avance: activity.porcentaje_avance,
    } : initialFormData
  );

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Business rule validation for state changes
  const stateChangeValidation = useActivityStateChangeValidation(
    activity || null,
    formData.estado,
    checklist,
    evidence
  );

  // Generate activity code automatically for new activities
  useEffect(() => {
    if (!activity && !formData.codigo) {
      const timestamp = Date.now().toString(36).toUpperCase();
      setFormData(prev => ({ ...prev, codigo: `ACT-${timestamp}` }));
    }
  }, [activity, formData.codigo]);

  // Handle form field changes
  const handleChange = (field: keyof ActivityFormData, value: string | number) => {
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
    }

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'El título es requerido';
    }

    if (!formData.responsable_id) {
      newErrors.responsable_id = 'El responsable es requerido';
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

    if (formData.porcentaje_avance < 0 || formData.porcentaje_avance > 100) {
      newErrors.porcentaje_avance = 'El porcentaje debe estar entre 0 y 100';
    }

    // Business rule validation for state changes
    if (activity && formData.estado !== activity.estado) {
      if (!stateChangeValidation.isValid) {
        newErrors.estado = 'Cambio de estado no válido';
      }
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
      const activityData = {
        ...formData,
        proyecto_id: projectId,
        inicio_plan: new Date(formData.inicio_plan),
        fin_plan: new Date(formData.fin_plan),
      };

      let response;
      if (activity) {
        // Update existing activity
        response = await apiClient.updateActivity(activity.id, activityData);
      } else {
        // Create new activity
        response = await apiClient.createActivity(activityData);
      }

      if (response.ok && response.data) {
        onSuccess(response.data);
      } else {
        throw new Error(response.message || 'Error saving activity');
      }
    } catch (error) {
      console.error('Error saving activity:', error);
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Error saving activity' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error message */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{errors.submit}</p>
        </div>
      )}

      {/* Business rule validation for state changes */}
      {activity && formData.estado !== activity.estado && (
        <ValidationAlert 
          validation={stateChangeValidation}
          className="mb-4"
        />
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
            placeholder="Ej: ACT-001"
          />
          {errors.codigo && (
            <p className="mt-1 text-sm text-red-600">{errors.codigo}</p>
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

        {/* Prioridad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prioridad
          </label>
          <select
            value={formData.prioridad}
            onChange={(e) => handleChange('prioridad', e.target.value as ActivityFormData['prioridad'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Baja">Baja</option>
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
            <option value="Crítica">Crítica</option>
          </select>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={formData.estado}
            onChange={(e) => handleChange('estado', e.target.value as ActivityFormData['estado'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Pendiente">Pendiente</option>
            <option value="En progreso">En progreso</option>
            <option value="En revisión">En revisión</option>
            <option value="Completada">Completada</option>
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
      </div>

      {/* Título */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título *
        </label>
        <input
          type="text"
          value={formData.titulo}
          onChange={(e) => handleChange('titulo', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.titulo ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Título de la actividad"
        />
        {errors.titulo && (
          <p className="mt-1 text-sm text-red-600">{errors.titulo}</p>
        )}
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
          placeholder="Descripción detallada de la actividad..."
        />
      </div>

      {/* Porcentaje de Avance */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Porcentaje de Avance
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            value={formData.porcentaje_avance}
            onChange={(e) => handleChange('porcentaje_avance', parseInt(e.target.value))}
            className="flex-1"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              value={formData.porcentaje_avance}
              onChange={(e) => handleChange('porcentaje_avance', parseInt(e.target.value) || 0)}
              className={`w-20 px-2 py-1 border rounded text-center ${
                errors.porcentaje_avance ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <span className="text-gray-600">%</span>
          </div>
        </div>
        {errors.porcentaje_avance && (
          <p className="mt-1 text-sm text-red-600">{errors.porcentaje_avance}</p>
        )}
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
          {loading ? 'Guardando...' : (activity ? 'Actualizar' : 'Crear Actividad')}
        </button>
      </div>
    </form>
  );
}