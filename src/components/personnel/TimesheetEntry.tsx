'use client';

import { useState, useEffect } from 'react';
import { TimeEntry, Assignment, Personnel, Project, Activity } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Loading } from '@/components/ui/Loading';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline';

interface TimesheetEntryProps {
  personnelId?: string;
  projectId?: string;
  readonly?: boolean;
}

export function TimesheetEntry({ personnelId, projectId, readonly = false }: TimesheetEntryProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TimeEntry | null>(null);
  const [dateFilter, setDateFilter] = useState({
    fecha_inicio: '',
    fecha_fin: '',
  });

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load time entries based on filter
      let timeEntriesResponse;
      if (personnelId) {
        timeEntriesResponse = await apiClient.getPersonnelTimeEntries(
          personnelId, 
          { 
            limit: 100,
            ...dateFilter 
          }
        );
      } else if (projectId) {
        timeEntriesResponse = await apiClient.getProjectTimeEntries(projectId);
      } else {
        timeEntriesResponse = await apiClient.getTimeEntries({ limit: 100 });
      }

      if (timeEntriesResponse.ok && timeEntriesResponse.data) {
        setTimeEntries(timeEntriesResponse.data);
      }

      // Load reference data
      const [assignmentsResponse, personnelResponse, projectsResponse, activitiesResponse] = await Promise.all([
        apiClient.getAssignments({ limit: 100 }),
        apiClient.getPersonnel({ limit: 100 }),
        apiClient.getProjects({ limit: 100 }),
        apiClient.getActivities({ limit: 100 }),
      ]);

      if (assignmentsResponse.ok && assignmentsResponse.data) {
        setAssignments(assignmentsResponse.data);
      }
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
      setError(err instanceof Error ? err.message : 'Error al cargar registros de tiempo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [personnelId, projectId, dateFilter]);

  // Handle create/edit time entry
  const handleSaveTimeEntry = async (timeEntryData: Partial<TimeEntry>) => {
    try {
      if (editingEntry) {
        await apiClient.updateTimeEntry(editingEntry.id, timeEntryData);
      } else {
        await apiClient.createTimeEntry(timeEntryData);
      }

      setShowForm(false);
      setEditingEntry(null);
      loadData();
    } catch (err) {
      throw err; // Let the form handle the error
    }
  };

  // Handle delete time entry
  const handleDeleteTimeEntry = async (timeEntry: TimeEntry) => {
    try {
      await apiClient.deleteTimeEntry(timeEntry.id);
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar registro de tiempo');
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

  // Calculate total hours
  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.horas_trabajadas, 0);

  // Group entries by date
  const entriesByDate = timeEntries.reduce((groups, entry) => {
    const date = formatDate(entry.fecha);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, TimeEntry[]>);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">
            Registro de Horas
            {personnelId && ` - ${getPersonnelName(personnelId)}`}
            {projectId && ` - ${getProjectName(projectId)}`}
          </h2>
          <p className="text-sm text-gray-600">
            Total de horas registradas: {totalHours.toFixed(1)}h
          </p>
        </div>
        {!readonly && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Registrar Horas
          </button>
        )}
      </div>

      {/* Date Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fecha_inicio" className="block text-sm font-medium text-gray-700 mb-1">
              Desde
            </label>
            <input
              type="date"
              id="fecha_inicio"
              value={dateFilter.fecha_inicio}
              onChange={(e) => setDateFilter(prev => ({ ...prev, fecha_inicio: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="fecha_fin" className="block text-sm font-medium text-gray-700 mb-1">
              Hasta
            </label>
            <input
              type="date"
              id="fecha_fin"
              value={dateFilter.fecha_fin}
              onChange={(e) => setDateFilter(prev => ({ ...prev, fecha_fin: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Time Entries List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {Object.keys(entriesByDate).length > 0 ? (
          <div className="divide-y divide-gray-200">
            {Object.entries(entriesByDate)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, entries]) => (
                <div key={date} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-900 flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {date}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {entries.reduce((sum, entry) => sum + entry.horas_trabajadas, 0).toFixed(1)}h total
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center">
                              <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-sm font-medium text-gray-900">
                                {entry.horas_trabajadas}h
                              </span>
                            </div>
                            {entry.aprobado ? (
                              <Badge color="green">
                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                Aprobado
                              </Badge>
                            ) : (
                              <Badge color="yellow">
                                <XCircleIcon className="h-3 w-3 mr-1" />
                                Pendiente
                              </Badge>
                            )}
                          </div>
                          
                          <div className="mt-1 text-sm text-gray-600">
                            {!personnelId && (
                              <span className="font-medium">{getPersonnelName(entry.colaborador_id)} - </span>
                            )}
                            {!projectId && (
                              <span>{getProjectName(entry.proyecto_id)} - </span>
                            )}
                            <span>{getActivityName(entry.actividad_id)}</span>
                          </div>
                          
                          {entry.descripcion && (
                            <div className="mt-1 text-sm text-gray-500">
                              {entry.descripcion}
                            </div>
                          )}
                        </div>

                        {!readonly && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setEditingEntry(entry);
                                setShowForm(true);
                              }}
                              className="text-gray-600 hover:text-gray-900"
                              title="Editar"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(entry)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Sin registros de tiempo</h3>
            <p className="mt-1 text-sm text-gray-500">
              No hay registros de tiempo para el período seleccionado.
            </p>
          </div>
        )}
      </div>

      {/* Time Entry Form Modal */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingEntry(null);
          }}
          title={editingEntry ? 'Editar Registro de Tiempo' : 'Nuevo Registro de Tiempo'}
        >
          <TimeEntryForm
            timeEntry={editingEntry}
            assignments={assignments}
            personnel={personnel}
            projects={projects}
            activities={activities}
            defaultPersonnelId={personnelId}
            defaultProjectId={projectId}
            onSave={handleSaveTimeEntry}
            onCancel={() => {
              setShowForm(false);
              setEditingEntry(null);
            }}
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          title="Eliminar Registro de Tiempo"
          message="¿Estás seguro de que deseas eliminar este registro de tiempo? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onConfirm={() => handleDeleteTimeEntry(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          variant="danger"
        />
      )}
    </div>
  );
}

// Time Entry Form Component
interface TimeEntryFormProps {
  timeEntry?: TimeEntry | null;
  assignments: Assignment[];
  personnel: Personnel[];
  projects: Project[];
  activities: Activity[];
  defaultPersonnelId?: string;
  defaultProjectId?: string;
  onSave: (data: Partial<TimeEntry>) => Promise<void>;
  onCancel: () => void;
}

function TimeEntryForm({ 
  timeEntry, 
  assignments,
  personnel, 
  projects, 
  activities, 
  defaultPersonnelId,
  defaultProjectId,
  onSave, 
  onCancel 
}: TimeEntryFormProps) {
  const [formData, setFormData] = useState({
    colaborador_id: defaultPersonnelId || '',
    proyecto_id: defaultProjectId || '',
    actividad_id: '',
    fecha: '',
    horas_trabajadas: 0,
    descripcion: '',
    aprobado: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data
  useEffect(() => {
    if (timeEntry) {
      setFormData({
        colaborador_id: timeEntry.colaborador_id,
        proyecto_id: timeEntry.proyecto_id,
        actividad_id: timeEntry.actividad_id,
        fecha: new Date(timeEntry.fecha).toISOString().split('T')[0],
        horas_trabajadas: timeEntry.horas_trabajadas,
        descripcion: timeEntry.descripcion || '',
        aprobado: timeEntry.aprobado,
      });
    } else {
      // Set today as default date
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, fecha: today }));
    }
  }, [timeEntry]);

  // Filter activities by selected project
  const filteredActivities = activities.filter(activity => 
    activity.proyecto_id === formData.proyecto_id
  );

  // Check if personnel is assigned to the selected activity
  const isValidAssignment = () => {
    if (!formData.colaborador_id || !formData.actividad_id) return true;
    
    return assignments.some(assignment => 
      assignment.colaborador_id === formData.colaborador_id &&
      assignment.actividad_id === formData.actividad_id &&
      assignment.activo
    );
  };

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
    if (!formData.fecha) return 'Fecha es requerida';
    if (formData.horas_trabajadas <= 0) return 'Horas trabajadas debe ser mayor a 0';
    if (formData.horas_trabajadas > 24) return 'Horas trabajadas no puede ser mayor a 24';

    // Check if personnel is assigned to the activity
    if (!isValidAssignment()) {
      return 'El colaborador no está asignado a esta actividad';
    }

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
        fecha: new Date(formData.fecha),
      };

      await onSave(dataToSave);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar registro de tiempo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {!isValidAssignment() && formData.colaborador_id && formData.actividad_id && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ El colaborador seleccionado no está asignado a esta actividad
          </p>
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
            {filteredActivities.map(activity => (
              <option key={activity.id} value={activity.id}>
                {activity.codigo} - {activity.titulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha *
          </label>
          <input
            type="date"
            id="fecha"
            value={formData.fecha}
            onChange={(e) => handleChange('fecha', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="horas_trabajadas" className="block text-sm font-medium text-gray-700 mb-1">
            Horas Trabajadas *
          </label>
          <input
            type="number"
            id="horas_trabajadas"
            step="0.25"
            min="0"
            max="24"
            value={formData.horas_trabajadas}
            onChange={(e) => handleChange('horas_trabajadas', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="8.0"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="aprobado"
            checked={formData.aprobado}
            onChange={(e) => handleChange('aprobado', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="aprobado" className="ml-2 block text-sm text-gray-900">
            Registro aprobado
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
          Descripción del Trabajo
        </label>
        <textarea
          id="descripcion"
          rows={3}
          value={formData.descripcion}
          onChange={(e) => handleChange('descripcion', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Describe brevemente el trabajo realizado..."
        />
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
          {loading ? 'Guardando...' : (timeEntry ? 'Actualizar' : 'Registrar')} Tiempo
        </button>
      </div>
    </form>
  );
}