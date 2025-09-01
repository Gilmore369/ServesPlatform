'use client';

import { useState, useEffect } from 'react';
import { Assignment, Personnel, Project, Activity } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Loading } from '@/components/ui/Loading';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { useAssignmentOverlapValidation } from '@/lib/hooks/useBusinessRules';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface AssignmentManagerProps {
  personnelId?: string;
  projectId?: string;
}

export function AssignmentManager({ personnelId, projectId }: AssignmentManagerProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Assignment | null>(null);

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load assignments based on filter
      let assignmentsResponse;
      if (personnelId) {
        assignmentsResponse = await apiClient.getPersonnelAssignments(personnelId);
      } else if (projectId) {
        assignmentsResponse = await apiClient.getProjectAssignments(projectId);
      } else {
        assignmentsResponse = await apiClient.getAssignments({ limit: 100 });
      }

      if (assignmentsResponse.ok && assignmentsResponse.data) {
        setAssignments(assignmentsResponse.data);
      }

      // Load reference data
      const [personnelResponse, projectsResponse, activitiesResponse] = await Promise.all([
        apiClient.getPersonnel({ limit: 100 }),
        apiClient.getProjects({ limit: 100 }),
        apiClient.getActivities({ limit: 100 }),
      ]);

      if (personnelResponse.ok && personnelResponse.data) {
        setPersonnel(personnelResponse.data);
      }
      if (projectsResponse.ok && projectsResponse.data) {
        setProjects(projectsResponse.data);
      }
      if (activitiesResponse.ok && activitiesResponse.data) {
        setActivities(activitiesResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar asignaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [personnelId, projectId]);

  // Check for assignment overlaps using business rules
  const checkOverlaps = (newAssignment: Partial<Assignment>, excludeId?: string) => {
    // Filter out the assignment being edited
    const relevantAssignments = assignments.filter(assignment => 
      excludeId ? assignment.id !== excludeId : true
    );

    return relevantAssignments.filter(assignment => {
      if (assignment.colaborador_id !== newAssignment.colaborador_id) return false;
      if (!assignment.activo) return false;

      const existingStart = new Date(assignment.fecha_inicio);
      const existingEnd = new Date(assignment.fecha_fin);
      const newStart = new Date(newAssignment.fecha_inicio!);
      const newEnd = new Date(newAssignment.fecha_fin!);

      return (newStart <= existingEnd && newEnd >= existingStart);
    });
  };

  // Handle create/edit assignment
  const handleSaveAssignment = async (assignmentData: Partial<Assignment>) => {
    try {
      // Validate assignment using business rules
      if (assignmentData.colaborador_id && assignmentData.fecha_inicio && assignmentData.fecha_fin) {
        const relevantAssignments = assignments.filter(assignment => 
          editingAssignment ? assignment.id !== editingAssignment.id : true
        );

        const validation = useAssignmentOverlapValidation(
          assignmentData as Omit<Assignment, 'id' | 'created_at' | 'updated_at'>,
          relevantAssignments
        );

        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
      }

      if (editingAssignment) {
        await apiClient.updateAssignment(editingAssignment.id, assignmentData);
      } else {
        await apiClient.createAssignment(assignmentData);
      }

      setShowForm(false);
      setEditingAssignment(null);
      loadData();
    } catch (err) {
      throw err; // Let the form handle the error
    }
  };

  // Handle delete assignment
  const handleDeleteAssignment = async (assignment: Assignment) => {
    try {
      await apiClient.deleteAssignment(assignment.id);
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar asignación');
    }
  };

  // Get personnel name
  const getPersonnelName = (personnelId: string) => {
    const person = personnel.find(p => p.id === personnelId);
    return person?.nombres || 'Desconocido';
  };

  // Get project name
  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.nombre || 'Desconocido';
  };

  // Get activity name
  const getActivityName = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    return activity?.titulo || 'Desconocida';
  };

  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-PE');
  };

  // Check if assignment is current
  const isCurrentAssignment = (assignment: Assignment) => {
    const today = new Date();
    const start = new Date(assignment.fecha_inicio);
    const end = new Date(assignment.fecha_fin);
    return today >= start && today <= end && assignment.activo;
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">
            Gestión de Asignaciones
            {personnelId && ` - ${getPersonnelName(personnelId)}`}
            {projectId && ` - ${getProjectName(projectId)}`}
          </h2>
          <p className="text-sm text-gray-600">
            Administra las asignaciones de personal a proyectos y actividades
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Nueva Asignación
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Assignments List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {assignments.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-sm font-medium text-gray-900">
                        {!personnelId && getPersonnelName(assignment.colaborador_id)}
                        {!projectId && getProjectName(assignment.proyecto_id)}
                        {personnelId && projectId && getActivityName(assignment.actividad_id)}
                      </h3>
                      {isCurrentAssignment(assignment) && (
                        <Badge color="green">Activa</Badge>
                      )}
                      {!assignment.activo && (
                        <Badge color="gray">Inactiva</Badge>
                      )}
                    </div>
                    
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      {!personnelId && (
                        <div className="flex items-center">
                          <span className="font-medium">Colaborador:</span>
                          <span className="ml-1">{getPersonnelName(assignment.colaborador_id)}</span>
                        </div>
                      )}
                      {!projectId && (
                        <div className="flex items-center">
                          <span className="font-medium">Proyecto:</span>
                          <span className="ml-1">{getProjectName(assignment.proyecto_id)}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <span className="font-medium">Actividad:</span>
                        <span className="ml-1">{getActivityName(assignment.actividad_id)}</span>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>{formatDate(assignment.fecha_inicio)} - {formatDate(assignment.fecha_fin)}</span>
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        <span>{assignment.horas_planificadas}h planificadas</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium">Rol:</span>
                        <span className="ml-1">{assignment.rol_asignacion}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingAssignment(assignment);
                        setShowForm(true);
                      }}
                      className="text-gray-600 hover:text-gray-900"
                      title="Editar"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(assignment)}
                      className="text-red-600 hover:text-red-900"
                      title="Eliminar"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Sin asignaciones</h3>
            <p className="mt-1 text-sm text-gray-500">
              No hay asignaciones registradas. Crea una nueva asignación para comenzar.
            </p>
          </div>
        )}
      </div>

      {/* Assignment Form Modal */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingAssignment(null);
          }}
          title={editingAssignment ? 'Editar Asignación' : 'Nueva Asignación'}
        >
          <AssignmentForm
            assignment={editingAssignment}
            personnel={personnel}
            projects={projects}
            activities={activities}
            defaultPersonnelId={personnelId}
            defaultProjectId={projectId}
            onSave={handleSaveAssignment}
            onCancel={() => {
              setShowForm(false);
              setEditingAssignment(null);
            }}
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          title="Eliminar Asignación"
          message="¿Estás seguro de que deseas eliminar esta asignación? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onConfirm={() => handleDeleteAssignment(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          variant="danger"
        />
      )}
    </div>
  );
}

// Assignment Form Component
interface AssignmentFormProps {
  assignment?: Assignment | null;
  personnel: Personnel[];
  projects: Project[];
  activities: Activity[];
  defaultPersonnelId?: string;
  defaultProjectId?: string;
  onSave: (data: Partial<Assignment>) => Promise<void>;
  onCancel: () => void;
}

function AssignmentForm({ 
  assignment, 
  personnel, 
  projects, 
  activities, 
  defaultPersonnelId,
  defaultProjectId,
  onSave, 
  onCancel 
}: AssignmentFormProps) {
  const [formData, setFormData] = useState({
    colaborador_id: defaultPersonnelId || '',
    proyecto_id: defaultProjectId || '',
    actividad_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    horas_planificadas: 0,
    rol_asignacion: '',
    activo: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data
  useEffect(() => {
    if (assignment) {
      setFormData({
        colaborador_id: assignment.colaborador_id,
        proyecto_id: assignment.proyecto_id,
        actividad_id: assignment.actividad_id,
        fecha_inicio: new Date(assignment.fecha_inicio).toISOString().split('T')[0],
        fecha_fin: new Date(assignment.fecha_fin).toISOString().split('T')[0],
        horas_planificadas: assignment.horas_planificadas,
        rol_asignacion: assignment.rol_asignacion,
        activo: assignment.activo,
      });
    }
  }, [assignment]);

  // Filter activities by selected project
  const filteredActivities = activities.filter(activity => 
    activity.proyecto_id === formData.proyecto_id
  );

  // Handle form field changes
  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Reset activity when project changes
    if (field === 'proyecto_id') {
      setFormData(prev => ({
        ...prev,
        actividad_id: '',
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    if (!formData.colaborador_id) return 'Colaborador es requerido';
    if (!formData.proyecto_id) return 'Proyecto es requerido';
    if (!formData.actividad_id) return 'Actividad es requerida';
    if (!formData.fecha_inicio) return 'Fecha de inicio es requerida';
    if (!formData.fecha_fin) return 'Fecha de fin es requerida';
    if (!formData.rol_asignacion.trim()) return 'Rol de asignación es requerido';
    if (formData.horas_planificadas <= 0) return 'Horas planificadas debe ser mayor a 0';

    // Validate date range
    const startDate = new Date(formData.fecha_inicio);
    const endDate = new Date(formData.fecha_fin);
    if (endDate <= startDate) return 'La fecha de fin debe ser posterior a la fecha de inicio';

    return null;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dataToSave = {
        ...formData,
        fecha_inicio: new Date(formData.fecha_inicio),
        fecha_fin: new Date(formData.fecha_fin),
      };

      await onSave(dataToSave);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar asignación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="colaborador_id" className="block text-sm font-medium text-gray-700 mb-1">
            Colaborador *
          </label>
          <select
            id="colaborador_id"
            value={formData.colaborador_id}
            onChange={(e) => handleChange('colaborador_id', e.target.value)}
            disabled={!!defaultPersonnelId}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">Seleccionar colaborador</option>
            {personnel.filter(p => p.activo).map(person => (
              <option key={person.id} value={person.id}>
                {person.nombres} - {person.especialidad}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="proyecto_id" className="block text-sm font-medium text-gray-700 mb-1">
            Proyecto *
          </label>
          <select
            id="proyecto_id"
            value={formData.proyecto_id}
            onChange={(e) => handleChange('proyecto_id', e.target.value)}
            disabled={!!defaultProjectId}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">Seleccionar proyecto</option>
            {projects.filter(p => p.estado !== 'Cerrado').map(project => (
              <option key={project.id} value={project.id}>
                {project.codigo} - {project.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="actividad_id" className="block text-sm font-medium text-gray-700 mb-1">
            Actividad *
          </label>
          <select
            id="actividad_id"
            value={formData.actividad_id}
            onChange={(e) => handleChange('actividad_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleccionar actividad</option>
            {filteredActivities.filter(a => a.estado !== 'Completada').map(activity => (
              <option key={activity.id} value={activity.id}>
                {activity.codigo} - {activity.titulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rol_asignacion" className="block text-sm font-medium text-gray-700 mb-1">
            Rol en la Asignación *
          </label>
          <input
            type="text"
            id="rol_asignacion"
            value={formData.rol_asignacion}
            onChange={(e) => handleChange('rol_asignacion', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: Técnico Principal, Supervisor, Ayudante"
          />
        </div>

        <div>
          <label htmlFor="fecha_inicio" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Inicio *
          </label>
          <input
            type="date"
            id="fecha_inicio"
            value={formData.fecha_inicio}
            onChange={(e) => handleChange('fecha_inicio', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="fecha_fin" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Fin *
          </label>
          <input
            type="date"
            id="fecha_fin"
            value={formData.fecha_fin}
            onChange={(e) => handleChange('fecha_fin', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="horas_planificadas" className="block text-sm font-medium text-gray-700 mb-1">
            Horas Planificadas *
          </label>
          <input
            type="number"
            id="horas_planificadas"
            step="0.5"
            min="0"
            value={formData.horas_planificadas}
            onChange={(e) => handleChange('horas_planificadas', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="40"
          />
        </div>

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
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : (assignment ? 'Actualizar' : 'Crear')} Asignación
        </button>
      </div>
    </form>
  );
}