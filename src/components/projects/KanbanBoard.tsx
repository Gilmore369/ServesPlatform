'use client';

import { useState } from 'react';
import { Activity, User } from '@/lib/types';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/Modal';
import { ActivityForm } from './ActivityForm';
import { ActivityDetail } from './ActivityDetail';
import {
  PlusIcon,
  CalendarIcon,
  UserIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface KanbanBoardProps {
  activities: Activity[];
  users: User[];
  projectId: string;
  onUpdate: () => void;
}

type ActivityStatus = 'Pendiente' | 'En progreso' | 'En revisión' | 'Completada';

const statusConfig: Record<ActivityStatus, { label: string; color: string; bgColor: string }> = {
  'Pendiente': {
    label: 'Pendiente',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
  },
  'En progreso': {
    label: 'En Progreso',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
  },
  'En revisión': {
    label: 'En Revisión',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
  },
  'Completada': {
    label: 'Completada',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
  },
};

const priorityConfig = {
  'Baja': { color: 'bg-gray-100 text-gray-800', icon: null },
  'Media': { color: 'bg-blue-100 text-blue-800', icon: null },
  'Alta': { color: 'bg-orange-100 text-orange-800', icon: ExclamationTriangleIcon },
  'Crítica': { color: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon },
};

export function KanbanBoard({ activities, users, projectId, onUpdate }: KanbanBoardProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showActivityDetail, setShowActivityDetail] = useState<Activity | null>(null);
  const [draggedActivity, setDraggedActivity] = useState<Activity | null>(null);

  // Group activities by status
  const groupedActivities = activities.reduce((acc, activity) => {
    const status = activity.estado as ActivityStatus;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(activity);
    return acc;
  }, {} as Record<ActivityStatus, Activity[]>);

  // Get user name by ID
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.nombre : userId;
  };

  // Handle activity status change via drag and drop
  const handleDragStart = (activity: Activity) => {
    setDraggedActivity(activity);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: ActivityStatus) => {
    e.preventDefault();
    
    if (!draggedActivity || draggedActivity.estado === newStatus) {
      setDraggedActivity(null);
      return;
    }

    // Prevent completion without validation
    if (newStatus === 'Completada') {
      // Show activity detail for completion validation
      setShowActivityDetail(draggedActivity);
      setDraggedActivity(null);
      return;
    }

    try {
      const updatedActivity = {
        ...draggedActivity,
        estado: newStatus,
      };

      const response = await api.updateActivity(draggedActivity.id, updatedActivity);
      
      if (response.ok) {
        onUpdate(); // Refresh activities
      } else {
        console.error('Error updating activity status:', response.message);
      }
    } catch (error) {
      console.error('Error updating activity status:', error);
    } finally {
      setDraggedActivity(null);
    }
  };

  // Handle status change via dropdown (for mobile)
  const handleStatusChange = async (activity: Activity, newStatus: ActivityStatus) => {
    if (activity.estado === newStatus) return;

    // Prevent completion without validation
    if (newStatus === 'Completada') {
      setShowActivityDetail(activity);
      return;
    }

    try {
      const updatedActivity = {
        ...activity,
        estado: newStatus,
      };

      const response = await api.updateActivity(activity.id, updatedActivity);
      
      if (response.ok) {
        onUpdate();
      } else {
        console.error('Error updating activity status:', response.message);
      }
    } catch (error) {
      console.error('Error updating activity status:', error);
    }
  };

  // Handle activity creation
  const handleActivityCreated = () => {
    setShowCreateModal(false);
    onUpdate();
  };

  // Handle activity update
  const handleActivityUpdated = () => {
    setSelectedActivity(null);
    onUpdate();
  };

  // Check if date is overdue
  const isOverdue = (activity: Activity) => {
    const today = new Date();
    const endDate = new Date(activity.fin_plan);
    return endDate < today && activity.estado !== 'Completada';
  };

  // Render activity card
  const renderActivityCard = (activity: Activity) => {
    const priorityInfo = priorityConfig[activity.prioridad];
    const PriorityIcon = priorityInfo.icon;
    const overdue = isOverdue(activity);

    return (
      <div
        key={activity.id}
        draggable
        onDragStart={() => handleDragStart(activity)}
        className={`bg-white p-3 sm:p-4 rounded-lg border shadow-sm cursor-move hover:shadow-md transition-all duration-200 touch-manipulation ${
          overdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
        } ${draggedActivity?.id === activity.id ? 'opacity-50 scale-95' : ''}`}
      >
        {/* Activity Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">{activity.titulo}</h4>
            <p className="text-xs text-gray-600 truncate">{activity.codigo}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {PriorityIcon && <PriorityIcon className="h-3 w-3 text-orange-500" />}
            <Badge className={`text-xs ${priorityInfo.color}`}>
              {activity.prioridad}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {activity.descripcion && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {activity.descripcion}
          </p>
        )}

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">Progreso</span>
            <span className="text-xs text-gray-600">{activity.porcentaje_avance}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${activity.porcentaje_avance}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <UserIcon className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{getUserName(activity.responsable_id)}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <CalendarIcon className="h-3 w-3" />
            <span className={`${overdue ? 'text-red-600 font-medium' : ''} whitespace-nowrap`}>
              {new Date(activity.fin_plan).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Mobile status selector */}
        <div className="mt-3 sm:hidden">
          <select
            value={activity.estado}
            onChange={(e) => handleStatusChange(activity, e.target.value as ActivityStatus)}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-xs px-2 py-1 border border-gray-300 rounded bg-white"
          >
            <option value="Pendiente">Pendiente</option>
            <option value="En progreso">En progreso</option>
            <option value="En revisión">En revisión</option>
            <option value="Completada">Completada</option>
          </select>
        </div>

        {/* Click to view details */}
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={() => setShowActivityDetail(activity)}
        />

        {/* Overdue indicator */}
        {overdue && (
          <div className="mt-2 text-xs text-red-600 font-medium">
            ⚠️ Vencida
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Total: {activities.length} actividades
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <PlusIcon className="h-4 w-4" />
          Nueva Actividad
        </button>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {Object.entries(statusConfig).map(([status, config]) => {
          const statusActivities = groupedActivities[status as ActivityStatus] || [];
          
          return (
            <div
              key={status}
              className={`${config.bgColor} rounded-lg p-3 sm:p-4 min-h-64 sm:min-h-96 transition-colors duration-200 ${
                draggedActivity && draggedActivity.estado !== status ? 'ring-2 ring-blue-300 ring-opacity-50' : ''
              }`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDrop={(e) => handleDrop(e, status as ActivityStatus)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-medium ${config.color}`}>
                  {config.label}
                </h3>
                <span className={`text-sm px-2 py-1 rounded-full bg-white ${config.color}`}>
                  {statusActivities.length}
                </span>
              </div>

              {/* Activity Cards */}
              <div className="space-y-3">
                {statusActivities.map(renderActivityCard)}
              </div>

              {/* Empty State */}
              {statusActivities.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No hay actividades</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Activity Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nueva Actividad"
        size="lg"
      >
        <ActivityForm
          projectId={projectId}
          users={users}
          onSuccess={handleActivityCreated}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Activity Detail Modal */}
      <Modal
        isOpen={!!showActivityDetail}
        onClose={() => setShowActivityDetail(null)}
        title="Detalle de Actividad"
        size="xl"
      >
        {showActivityDetail && (
          <ActivityDetail
            activity={showActivityDetail}
            users={users}
            onUpdate={onUpdate}
            onClose={() => setShowActivityDetail(null)}
          />
        )}
      </Modal>
    </div>
  );
}