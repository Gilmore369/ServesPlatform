'use client';

import { useState } from 'react';
import { Project, Activity, User } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Modal } from '@/components/ui/Modal';
import { ActivityForm } from './ActivityForm';
import {
  PlusIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface ProjectQuickActionsProps {
  project: Project;
  activities: Activity[];
  users: User[];
  onUpdate: () => void;
}

export function ProjectQuickActions({ project, activities, users, onUpdate }: ProjectQuickActionsProps) {
  const { user } = useAuth();
  const [showActivityModal, setShowActivityModal] = useState(false);

  // Check permissions
  const canEdit = () => {
    if (!user) return false;
    if (['admin_lider', 'admin'].includes(user.rol)) return true;
    if (user.rol === 'editor' && project.responsable_id === user.id) return true;
    return false;
  };

  const canCreateActivity = () => {
    return canEdit() && project.estado !== 'Cerrado';
  };

  // Quick action handlers
  const handleCreateActivity = () => {
    setShowActivityModal(true);
  };

  const handleActivityCreated = () => {
    setShowActivityModal(false);
    onUpdate();
  };

  const handleCloneProject = () => {
    // This would open a modal to clone the project
    console.log('Clone project:', project.id);
  };

  const handleArchiveProject = () => {
    // This would show a confirmation dialog to archive the project
    console.log('Archive project:', project.id);
  };

  const handleChangeStatus = (newStatus: Project['estado']) => {
    // This would update the project status
    console.log('Change status to:', newStatus);
  };

  if (!canEdit()) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Acciones Rápidas</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Create Activity */}
          {canCreateActivity() && (
            <button
              onClick={handleCreateActivity}
              className="flex flex-col items-center gap-2 p-3 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PlusIcon className="h-6 w-6 text-blue-600" />
              <span className="text-xs text-gray-700">Nueva Actividad</span>
            </button>
          )}

          {/* Clone Project */}
          <button
            onClick={handleCloneProject}
            className="flex flex-col items-center gap-2 p-3 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <DocumentDuplicateIcon className="h-6 w-6 text-purple-600" />
            <span className="text-xs text-gray-700">Clonar Proyecto</span>
          </button>

          {/* Status Actions */}
          {project.estado === 'Planificación' && (
            <button
              onClick={() => handleChangeStatus('En progreso')}
              className="flex flex-col items-center gap-2 p-3 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PlayIcon className="h-6 w-6 text-green-600" />
              <span className="text-xs text-gray-700">Iniciar</span>
            </button>
          )}

          {project.estado === 'En progreso' && (
            <button
              onClick={() => handleChangeStatus('Pausado')}
              className="flex flex-col items-center gap-2 p-3 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PauseIcon className="h-6 w-6 text-yellow-600" />
              <span className="text-xs text-gray-700">Pausar</span>
            </button>
          )}

          {project.estado === 'Pausado' && (
            <button
              onClick={() => handleChangeStatus('En progreso')}
              className="flex flex-col items-center gap-2 p-3 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PlayIcon className="h-6 w-6 text-green-600" />
              <span className="text-xs text-gray-700">Reanudar</span>
            </button>
          )}

          {(project.estado === 'En progreso' || project.estado === 'Pausado') && 
           activities.every(a => a.estado === 'Completada') && activities.length > 0 && (
            <button
              onClick={() => handleChangeStatus('Cerrado')}
              className="flex flex-col items-center gap-2 p-3 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
              <span className="text-xs text-gray-700">Completar</span>
            </button>
          )}

          {/* Archive Project */}
          {project.estado === 'Cerrado' && (
            <button
              onClick={handleArchiveProject}
              className="flex flex-col items-center gap-2 p-3 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArchiveBoxIcon className="h-6 w-6 text-gray-600" />
              <span className="text-xs text-gray-700">Archivar</span>
            </button>
          )}
        </div>

        {/* Project Health Indicators */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {activities.filter(a => a.estado === 'Completada').length}
              </div>
              <div className="text-xs text-gray-500">Completadas</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {activities.filter(a => a.estado === 'En progreso').length}
              </div>
              <div className="text-xs text-gray-500">En Progreso</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {activities.filter(a => {
                  const today = new Date();
                  const endDate = new Date(a.fin_plan);
                  return endDate < today && a.estado !== 'Completada';
                }).length}
              </div>
              <div className="text-xs text-gray-500">Vencidas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Activity Modal */}
      <Modal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        title="Nueva Actividad"
        size="lg"
      >
        <ActivityForm
          projectId={project.id}
          users={users}
          onSuccess={handleActivityCreated}
          onCancel={() => setShowActivityModal(false)}
        />
      </Modal>
    </>
  );
}