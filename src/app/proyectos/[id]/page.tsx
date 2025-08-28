'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { Project, Activity, User } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Loading } from '@/components/ui/Loading';
import { Badge } from '@/components/ui/badge';
import { ProjectTabs } from '@/components/projects/ProjectTabs';
import { ProjectStats } from '@/components/projects/ProjectStats';
import { ProjectQuickActions } from '@/components/projects/ProjectQuickActions';
import {
  ArrowLeftIcon,
  PencilIcon,
  CalendarIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjectData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load project, activities, and users in parallel
      const [projectResponse, activitiesResponse, usersResponse] = await Promise.all([
        apiClient.getProject(projectId),
        apiClient.getActivities({ limit: 100 }),
        apiClient.getUsers({ limit: 100 }),
      ]);

      if (projectResponse.ok && projectResponse.data) {
        setProject(projectResponse.data);
      } else {
        throw new Error(projectResponse.message || 'Project not found');
      }

      if (activitiesResponse.ok && activitiesResponse.data) {
        // Filter activities for this project
        const projectActivities = activitiesResponse.data.filter(
          (activity: Activity) => activity.proyecto_id === projectId
        );
        setActivities(projectActivities);
      }

      if (usersResponse.ok && usersResponse.data) {
        setUsers(usersResponse.data);
      }
    } catch (err) {
      console.error('Error loading project data:', err);
      setError(err instanceof Error ? err.message : 'Error loading project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load project data
  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId, loadProjectData]);

  // Get user name by ID
  const getUserName = (userId: string) => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? foundUser.nombre : userId;
  };

  // Check if user can edit this project
  const canEdit = () => {
    if (!user || !project) return false;
    
    // Admin roles can edit any project
    if (['admin_lider', 'admin'].includes(user.rol)) return true;
    
    // Editors can edit if they are the project responsible
    if (user.rol === 'editor' && project.responsable_id === user.id) return true;
    
    return false;
  };

  // Handle project update
  const handleProjectUpdate = (updatedProject: Project) => {
    setProject(updatedProject);
  };

  // Handle activity updates
  const handleActivitiesUpdate = () => {
    loadProjectData(); // Reload to get fresh data
  };

  if (loading) {
    return <Loading />;
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Proyecto no encontrado'}
          </h1>
          <button
            onClick={() => router.push('/proyectos')}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Volver a proyectos
          </button>
        </div>
      </div>
    );
  }

  const statusColors = {
    'Planificación': 'bg-yellow-100 text-yellow-800',
    'En progreso': 'bg-blue-100 text-blue-800',
    'Pausado': 'bg-red-100 text-red-800',
    'Cerrado': 'bg-green-100 text-green-800',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/proyectos')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{project.nombre}</h1>
                <Badge className={statusColors[project.estado] || 'bg-gray-100 text-gray-800'}>
                  {project.estado}
                </Badge>
              </div>
              <p className="text-gray-600">Código: {project.codigo}</p>
            </div>
          </div>

          {/* Edit button */}
          {canEdit() && (
            <button
              onClick={() => router.push(`/proyectos/${project.id}/editar`)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <PencilIcon className="h-4 w-4" />
              Editar
            </button>
          )}
        </div>

        {/* Project Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Location */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <MapPinIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ubicación</p>
              <p className="font-medium text-gray-900">{project.ubicacion}</p>
            </div>
          </div>

          {/* Responsible */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <UserIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Responsable</p>
              <p className="font-medium text-gray-900">{getUserName(project.responsable_id)}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <CalendarIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Duración</p>
              <p className="font-medium text-gray-900">
                {new Date(project.inicio_plan).toLocaleDateString()} - {new Date(project.fin_plan).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Budget */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <CurrencyDollarIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Presupuesto</p>
              <p className="font-medium text-gray-900">
                {project.moneda} {project.presupuesto_total.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progreso del Proyecto</span>
            <span className="text-sm text-gray-600">{project.avance_pct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${project.avance_pct}%` }}
            />
          </div>
        </div>

        {/* Description */}
        {project.descripcion && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Descripción</h3>
            <p className="text-gray-600">{project.descripcion}</p>
          </div>
        )}

        {/* Service Line and SLA */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Línea de Servicio</h3>
            <p className="text-gray-900">{project.linea_servicio}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">SLA Objetivo</h3>
            <p className="text-gray-900">{project.sla_objetivo} días</p>
          </div>
        </div>
      </div>

      {/* Project Statistics */}
      <ProjectStats project={project} activities={activities} />

      {/* Quick Actions */}
      <ProjectQuickActions 
        project={project} 
        activities={activities} 
        users={users}
        onUpdate={handleActivitiesUpdate}
      />

      {/* Project Tabs */}
      <ProjectTabs
        project={project}
        activities={activities}
        users={users}
        onProjectUpdate={handleProjectUpdate}
        onActivitiesUpdate={handleActivitiesUpdate}
      />
    </div>
  );
}