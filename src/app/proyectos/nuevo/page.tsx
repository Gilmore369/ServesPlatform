'use client';

import { useRouter } from 'next/navigation';
import { Project } from '@/lib/types';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function NewProjectPage() {
  const router = useRouter();

  const handleProjectCreated = (project: Project) => {
    // Redirect to the new project's detail page
    router.push(`/proyectos/${project.id}`);
  };

  const handleCancel = () => {
    router.push('/proyectos');
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Crear Nuevo Proyecto</h1>
          <p className="text-gray-600">
            Complete la información del proyecto para comenzar
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <ProjectForm
          onSuccess={handleProjectCreated}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}