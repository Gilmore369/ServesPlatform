/**
 * Assignment form with business rule validation
 */

import { useState, useEffect } from 'react';
import { Assignment, Personnel, Project, Activity } from '@/lib/types';
import { useAssignmentOverlapValidation } from '@/lib/hooks/useBusinessRules';
import { ValidationAlert } from '@/components/ui/ValidationAlert';

interface AssignmentFormProps {
  assignment?: Assignment;
  personnel: Personnel[];
  projects: Project[];
  activities: Activity[];
  existingAssignments: Assignment[];
  onSave: (assignmentData: Partial<Assignment>) => Promise<void>;
  onCancel: () => void;
}

interface AssignmentFormData {
  colaborador_id: string;
  proyecto_id: string;
  actividad_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  horas_planificadas: number;
  rol_asignacion: string;
  activo: boolean;
}

const initialFormData: AssignmentFormData = {
  colaborador_id: '',
  proyecto_id: '',
  actividad_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  horas_planificadas: 8,
  rol_asignacion: '',
  activo: true,
};

export function AssignmentForm({
  assignment,
  personnel,
  projects,
  activities,
  existingAssignments,
  onSave,
  onCancel
}: AssignmentFormProps) {
  const [formData, setFormData] = useState<AssignmentFormData>(
    assignment ? {
      colaborador_id: assignment.colaborador_id,
      proyecto_id: assignment.proyecto_id,
      actividad_id: assignment.actividad_id,
      fecha_inicio: new Date(assignment.fecha_inicio).toISOString().split('T')[0],
      fecha_fin: new Date(assignment.fecha_fin).toISOString().split('T')[0],
      horas_planificadas: assignment.horas_planificadas,
      rol_asignacion: assignment.rol_asignacion,
      activo: assignment.activo,
    } : initialFormData
  );

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter existing assignments for overlap validation (exclude current assignment if editing)
  const relevantAssignments = existingAssignments.filter(a => 
    assignment ? a.id !== assignment.id : true
  );

  // Business rule validation for assignment overlap
  const overlapValidation = useAssignmentOverlapValidation(
    formData.colaborador_id && formData.fecha_inicio && formData.fecha_fin ? {
      colaborador_id: formData.colaborador_id,
      proyecto_id: formData.proyecto_id,
      actividad_id: formData.actividad_id,
      fecha_inicio: new Date(formData.fecha_inicio),
      fecha_fin: new Date(formData.fecha_fin),
      horas_planificadas: formData.horas_planificadas,
      rol_asignacion: formData.rol_asignacion,
      activo: formData.activo,
    } : null,
    relevantAssignments
  );

  // Filter activities by selected project
  const projectActivities = activities.filter(
    activity => activity.proyecto_id === formData.proyecto_id
  );

  // Handle form field changes
  const handleChange = (field: keyof AssignmentFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Reset activity when project changes
    if (field === 'proyecto_id') {
      setFormData(prev => ({ ...prev, actividad_id: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.colaborador_id) {
      newErrors.colaborador_id = 'El colaborador es requerido';
    }

    if (!formData.proyecto_id) {
      newErrors.proyecto_id = 'El proyecto es requerido';
    }

    if (!formData.actividad_id) {
      newErrors.actividad_id = 'La actividad es requerida';
    }

    if (!formData.fecha_inicio) {
      newErrors.fecha_inicio = 'La fecha de inicio es requerida';
    }

    if (!formData.fecha_fin) {
      newErrors.fecha_fin = 'La fecha de fin es requerida';
    }

    if (formData.fecha_inicio && formData.fecha_fin && formData.fecha_inicio >= formData.fecha_fin) {
      newErrors.fecha_fin = 'La fecha de fin debe ser posterior a la fecha de inicio';
    }

    if (formData.horas_planificadas <= 0) {
      newErrors.horas_planificadas = 'Las horas planificadas deben ser mayor a 0';
    }

    if (!formData.rol_asignacion.trim()) {
      newErrors.rol_asignacion = 'El rol de asignación es requerido';
    }

    // Business rule validation
    if (!overlapValidation.isValid) {
      newErrors.overlap = 'Conflicto de asignación detectado';
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
      const assignmentData = {
        ...formData,
        fecha_inicio: new Date(formData.fecha_inicio),
        fecha_fin: new Date(formData.fecha_fin),
      };

      await onSave(assignmentData);
    } catch (error) {
      console.error('Error saving assignment:', error);
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Error al guardar asignación' 
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

      {/* Overlap validation alert */}
      {formData.colaborador_id && formData.fecha_inicio && formData.fecha_fin && (
        <ValidationAlert validation={overlapValidation} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colaborador */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Colaborador *
          </label>
          <select
            value={formData.colaborador_id}
            onChange={(e) => handleChange('colaborador_id', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.colaborador_id ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Seleccionar colaborador</option>
            {personnel.filter(p => p.activo).map(person => (
              <option key={person.id} value={person.id}>
                {person.nombres} - {person.especialidad}
              </option>
            ))}
          </select>
          {errors.colaborador_id && (
            <p className="mt-1 text-sm text-red-600">{errors.colaborador_id}</p>
          )}
        </div>

        {/* Proyecto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Proyecto *
          </label>
          <select
            value={formData.proyecto_id}
            onChange={(e) => handleChange('proyecto_id', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.proyecto_id ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Seleccionar proyecto</option>
            {projects.filter(p => p.estado !== 'Cerrado').map(project => (
              <option key={project.id} value={project.id}>
                {project.codigo} - {project.nombre}
              </option>
            ))}
          </select>
          {errors.proyecto_id && (
            <p className="mt-1 text-sm text-red-600">{errors.proyecto_id}</p>
          )}
        </div>

        {/* Actividad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Actividad *
          </label>
          <select
            value={formData.actividad_id}
            onChange={(e) => handleChange('actividad_id', e.target.value)}
            disabled={!formData.proyecto_id}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
              errors.actividad_id ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Seleccionar actividad</option>
            {projectActivities.map(activity => (
              <option key={activity.id} value={activity.id}>
                {activity.codigo} - {activity.titulo}
              </option>
            ))}
          </select>
          {errors.actividad_id && (
            <p className="mt-1 text-sm text-red-600">{errors.actividad_id}</p>
          )}
        </div>

        {/* Rol de Asignación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rol de Asignación *
          </label>
          <input
            type="text"
            value={formData.rol_asignacion}
            onChange={(e) => handleChange('rol_asignacion', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.rol_asignacion ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Ej: Técnico Principal, Supervisor, etc."
          />
          {errors.rol_asignacion && (
            <p className="mt-1 text-sm text-red-600">{errors.rol_asignacion}</p>
          )}
        </div>

        {/* Fecha Inicio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Inicio *
          </label>
          <input
            type="date"
            value={formData.fecha_inicio}
            onChange={(e) => handleChange('fecha_inicio', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.fecha_inicio ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.fecha_inicio && (
            <p className="mt-1 text-sm text-red-600">{errors.fecha_inicio}</p>
          )}
        </div>

        {/* Fecha Fin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Fin *
          </label>
          <input
            type="date"
            value={formData.fecha_fin}
            onChange={(e) => handleChange('fecha_fin', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.fecha_fin ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.fecha_fin && (
            <p className="mt-1 text-sm text-red-600">{errors.fecha_fin}</p>
          )}
        </div>
      </div>

      {/* Horas Planificadas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Horas Planificadas *
        </label>
        <input
          type="number"
          min="0.1"
          step="0.1"
          value={formData.horas_planificadas}
          onChange={(e) => handleChange('horas_planificadas', parseFloat(e.target.value) || 0)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.horas_planificadas ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors.horas_planificadas && (
          <p className="mt-1 text-sm text-red-600">{errors.horas_planificadas}</p>
        )}
      </div>

      {/* Estado Activo */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="activo"
          checked={formData.activo}
          onChange={(e) => handleChange('activo', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
          Asignación activa
        </label>
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
          disabled={loading || !overlapValidation.isValid}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : (assignment ? 'Actualizar' : 'Crear Asignación')}
        </button>
      </div>
    </form>
  );
}