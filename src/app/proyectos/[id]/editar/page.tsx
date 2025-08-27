'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { Project } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Loading } from '@/components/ui/Loading';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load project data
  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getProject(projectId);
      
      if (response.ok && response.data) {
        setProject(response.data);
      } else {
        throw new Error(response.message || 'Project not found');
      }
    } catch (err) {
      console.error('Error loading project:', err);
      setError(err instanceof Error ? err.message : 'Error loading project');
    } finally {
      setLoading(false);
    }
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
  const handleProjectUpdated = (updatedProject: Project) => {
    // Redirect back to project detail page
    router.push(`/proyectos/${updatedProject.id}`);
  };

  const handleCancel = () => {
    router.push(`/proyectos/${projectId}`);
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

  if (!canEdit()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            No tienes permisos para editar este proyecto
          </h1>
          <button
            onClick={() => router.push(`/proyectos/${projectId}`)}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Volver al proyecto
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleCancel}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Proyecto</h1>
          <p className="text-gray-600">
            {project.nombre} ({project.codigo})
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <ProjectForm
          project={project}
          onSuccess={handleProjectUpdated}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}