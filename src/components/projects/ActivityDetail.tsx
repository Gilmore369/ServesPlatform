'use client';

import { useState, useEffect } from 'react';
import { Activity, User, Checklist, ActivityChecklist, Evidence, ChecklistItem } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Loading } from '@/components/ui/Loading';
import {
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';

interface ActivityDetailProps {
  activity: Activity;
  users: User[];
  onUpdate: () => void;
  onClose: () => void;
}

export function ActivityDetail({ activity, users, onUpdate, onClose }: ActivityDetailProps) {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [activityChecklist, setActivityChecklist] = useState<ActivityChecklist | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load activity data
  useEffect(() => {
    loadActivityData();
  }, [activity.id]);

  const loadActivityData = async () => {
    setLoading(true);
    try {
      // Load checklists
      const checklistsResponse = await apiClient.getChecklists();
      if (checklistsResponse.ok && checklistsResponse.data) {
        setChecklists(checklistsResponse.data);
      }

      // Load activity checklist if exists
      if (activity.checklist_id) {
        const activityChecklistResponse = await apiClient.getActivityChecklists(activity.id);
        if (activityChecklistResponse.ok && activityChecklistResponse.data && activityChecklistResponse.data.length > 0) {
          setActivityChecklist(activityChecklistResponse.data[0]);
        }
      }

      // Load evidence
      const evidenceResponse = await apiClient.getActivityEvidence(activity.id);
      if (evidenceResponse.ok && evidenceResponse.data) {
        setEvidence(evidenceResponse.data);
      }
    } catch (error) {
      console.error('Error loading activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get user name by ID
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.nombre : userId;
  };

  // Check if activity can be completed
  const canComplete = () => {
    const hasRequiredChecklist = !activityChecklist || activityChecklist.completado;
    const hasEvidence = evidence.length > 0;
    return hasRequiredChecklist && hasEvidence;
  };

  // Handle activity completion
  const handleComplete = async () => {
    if (!canComplete()) {
      return;
    }

    try {
      const updatedActivity = {
        ...activity,
        estado: 'Completada' as const,
        porcentaje_avance: 100,
      };

      const response = await apiClient.updateActivity(activity.id, updatedActivity);
      if (response.ok) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Error completing activity:', error);
    }
  };

  return (
    <div className="space-y-6">
      {loading && <Loading />}

      {/* Activity Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{activity.titulo}</h2>
            <p className="text-sm text-gray-600">{activity.codigo}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${
              activity.estado === 'Completada' ? 'bg-green-100 text-green-800' :
              activity.estado === 'En progreso' ? 'bg-blue-100 text-blue-800' :
              activity.estado === 'En revisión' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {activity.estado}
            </Badge>
            <Badge className={`${
              activity.prioridad === 'Crítica' ? 'bg-red-100 text-red-800' :
              activity.prioridad === 'Alta' ? 'bg-orange-100 text-orange-800' :
              activity.prioridad === 'Media' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {activity.prioridad}
            </Badge>
          </div>
        </div>

        {/* Activity Info */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Responsable:</span>
            <p className="font-medium">{getUserName(activity.responsable_id)}</p>
          </div>
          <div>
            <span className="text-gray-500">Fecha Inicio:</span>
            <p className="font-medium">{new Date(activity.inicio_plan).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-gray-500">Fecha Fin:</span>
            <p className="font-medium">{new Date(activity.fin_plan).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Description */}
        {activity.descripcion && (
          <div className="mt-4">
            <span className="text-gray-500 text-sm">Descripción:</span>
            <p className="mt-1 text-gray-900">{activity.descripcion}</p>
          </div>
        )}

        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Progreso</span>
            <span className="text-sm font-medium">{activity.porcentaje_avance}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${activity.porcentaje_avance}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist Section */}
      <ChecklistSection
        activity={activity}
        checklists={checklists}
        activityChecklist={activityChecklist}
        onUpdate={loadActivityData}
        showForm={showChecklistForm}
        onShowForm={setShowChecklistForm}
      />

      {/* Evidence Section */}
      <EvidenceSection
        activity={activity}
        evidence={evidence}
        currentUserId={currentUser?.id || ''}
        onUpdate={loadActivityData}
        showForm={showEvidenceForm}
        onShowForm={setShowEvidenceForm}
        onDelete={setDeleteConfirm}
      />

      {/* Completion Requirements */}
      {activity.estado !== 'Completada' && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Requisitos para Completar</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {activityChecklist?.completado ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              )}
              <span className={activityChecklist?.completado ? 'text-green-700' : 'text-red-700'}>
                Checklist completado
              </span>
            </div>
            <div className="flex items-center gap-2">
              {evidence.length > 0 ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              )}
              <span className={evidence.length > 0 ? 'text-green-700' : 'text-red-700'}>
                Al menos una evidencia
              </span>
            </div>
          </div>

          {canComplete() && (
            <button
              onClick={handleComplete}
              className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
            >
              Marcar como Completada
            </button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cerrar
        </button>
      </div>

      {/* Delete Evidence Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (deleteConfirm) {
            try {
              await apiClient.deleteEvidence(deleteConfirm);
              loadActivityData();
            } catch (error) {
              console.error('Error deleting evidence:', error);
            }
            setDeleteConfirm(null);
          }
        }}
        title="Eliminar Evidencia"
        message="¿Estás seguro de que quieres eliminar esta evidencia? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        type="danger"
      />
    </div>
  );
}

// Checklist Section Component
interface ChecklistSectionProps {
  activity: Activity;
  checklists: Checklist[];
  activityChecklist: ActivityChecklist | null;
  onUpdate: () => void;
  showForm: boolean;
  onShowForm: (show: boolean) => void;
}

function ChecklistSection({ 
  activity, 
  checklists, 
  activityChecklist, 
  onUpdate, 
  showForm, 
  onShowForm 
}: ChecklistSectionProps) {
  const [selectedChecklistId, setSelectedChecklistId] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (activityChecklist) {
      try {
        const items = JSON.parse(activityChecklist.items_estado_json);
        setChecklistItems(items);
      } catch (error) {
        console.error('Error parsing checklist items:', error);
      }
    }
  }, [activityChecklist]);

  const handleAssignChecklist = async () => {
    if (!selectedChecklistId) return;

    try {
      const checklist = checklists.find(c => c.id === selectedChecklistId);
      if (!checklist) return;

      const items: ChecklistItem[] = JSON.parse(checklist.items_json);
      const itemsWithStatus = items.map(item => ({ ...item, completado: false }));

      const checklistData = {
        actividad_id: activity.id,
        checklist_id: selectedChecklistId,
        items_estado_json: JSON.stringify(itemsWithStatus),
        completado: false,
      };

      await apiClient.createActivityChecklist(checklistData);
      onUpdate();
      onShowForm(false);
      setSelectedChecklistId('');
    } catch (error) {
      console.error('Error assigning checklist:', error);
    }
  };

  const handleItemToggle = async (itemId: string) => {
    if (!activityChecklist) return;

    const updatedItems = checklistItems.map(item =>
      item.id === itemId ? { ...item, completado: !item.completado } : item
    );

    const allCompleted = updatedItems.every(item => item.completado);

    try {
      await apiClient.updateActivityChecklist(activityChecklist.id, {
        items_estado_json: JSON.stringify(updatedItems),
        completado: allCompleted,
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Checklist</h3>
        {!activityChecklist && (
          <button
            onClick={() => onShowForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <PlusIcon className="h-4 w-4" />
            Asignar Checklist
          </button>
        )}
      </div>

      {activityChecklist ? (
        <div className="space-y-3">
          {checklistItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                checked={item.completado}
                onChange={() => handleItemToggle(item.id)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className={`flex-1 ${item.completado ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {item.texto}
              </span>
              {item.requerido && (
                <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" title="Requerido" />
              )}
            </div>
          ))}
          
          {activityChecklist.completado && (
            <div className="flex items-center gap-2 text-green-700 font-medium">
              <CheckCircleIcon className="h-5 w-5" />
              Checklist completado
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No hay checklist asignado a esta actividad</p>
        </div>
      )}

      {/* Assign Checklist Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => onShowForm(false)}
        title="Asignar Checklist"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Checklist
            </label>
            <select
              value={selectedChecklistId}
              onChange={(e) => setSelectedChecklistId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar...</option>
              {checklists.map(checklist => (
                <option key={checklist.id} value={checklist.id}>
                  {checklist.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => onShowForm(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAssignChecklist}
              disabled={!selectedChecklistId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Asignar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Evidence Section Component
interface EvidenceSectionProps {
  activity: Activity;
  evidence: Evidence[];
  currentUserId: string;
  onUpdate: () => void;
  showForm: boolean;
  onShowForm: (show: boolean) => void;
  onDelete: (id: string) => void;
}

function EvidenceSection({ 
  activity, 
  evidence, 
  currentUserId,
  onUpdate, 
  showForm, 
  onShowForm, 
  onDelete 
}: EvidenceSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Evidencias</h3>
        <button
          onClick={() => onShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <PlusIcon className="h-4 w-4" />
          Agregar Evidencia
        </button>
      </div>

      {evidence.length > 0 ? (
        <div className="space-y-3">
          {evidence.map((item) => (
            <EvidenceItem
              key={item.id}
              evidence={item}
              onDelete={() => onDelete(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No hay evidencias registradas</p>
        </div>
      )}

      {/* Add Evidence Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => onShowForm(false)}
        title="Agregar Evidencia"
      >
        <EvidenceForm
          activityId={activity.id}
          currentUserId={currentUserId}
          onSuccess={() => {
            onUpdate();
            onShowForm(false);
          }}
          onCancel={() => onShowForm(false)}
        />
      </Modal>
    </div>
  );
}

// Evidence Item Component
interface EvidenceItemProps {
  evidence: Evidence;
  onDelete: () => void;
}

function EvidenceItem({ evidence, onDelete }: EvidenceItemProps) {
  const getIcon = () => {
    switch (evidence.tipo) {
      case 'foto':
        return <PhotoIcon className="h-5 w-5 text-blue-500" />;
      case 'video':
        return <VideoCameraIcon className="h-5 w-5 text-purple-500" />;
      case 'documento':
        return <DocumentIcon className="h-5 w-5 text-green-500" />;
      default:
        return <LinkIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      {getIcon()}
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{evidence.titulo}</h4>
        {evidence.descripcion && (
          <p className="text-sm text-gray-600">{evidence.descripcion}</p>
        )}
        <a
          href={evidence.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Ver evidencia →
        </a>
      </div>
      <button
        onClick={onDelete}
        className="p-1 text-red-600 hover:text-red-800"
        title="Eliminar evidencia"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// Evidence Form Component
interface EvidenceFormProps {
  activityId: string;
  currentUserId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function EvidenceForm({ activityId, currentUserId, onSuccess, onCancel }: EvidenceFormProps) {
  const [formData, setFormData] = useState({
    tipo: 'foto' as Evidence['tipo'],
    titulo: '',
    descripcion: '',
    url: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const newErrors: Record<string, string> = {};
    if (!formData.titulo.trim()) {
      newErrors.titulo = 'El título es requerido';
    }
    if (!formData.url.trim()) {
      newErrors.url = 'La URL es requerida';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await apiClient.createEvidence({
        ...formData,
        actividad_id: activityId,
        usuario_id: currentUserId,
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating evidence:', error);
      setErrors({ submit: 'Error al guardar la evidencia' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{errors.submit}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Evidencia
        </label>
        <select
          value={formData.tipo}
          onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as Evidence['tipo'] }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="foto">Foto</option>
          <option value="documento">Documento</option>
          <option value="video">Video</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título *
        </label>
        <input
          type="text"
          value={formData.titulo}
          onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.titulo ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Título de la evidencia"
        />
        {errors.titulo && (
          <p className="mt-1 text-sm text-red-600">{errors.titulo}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL *
        </label>
        <input
          type="url"
          value={formData.url}
          onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.url ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="https://drive.google.com/..."
        />
        {errors.url && (
          <p className="mt-1 text-sm text-red-600">{errors.url}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          value={formData.descripcion}
          onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Descripción opcional..."
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}