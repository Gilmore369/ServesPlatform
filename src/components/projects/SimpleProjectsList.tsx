'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/simple-auth';
import { ProjectForm } from './ProjectForm';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { CardSkeleton, ErrorState, EmptyState, ButtonLoading } from '@/components/ui/LoadingStates';
import { usePaginatedProjects } from '@/hooks/usePagination';
import { createItem, updateItem, deleteItem } from '@/hooks/useSimpleData';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export function SimpleProjectsList() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [deletingProject, setDeletingProject] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { hasPermission } = useAuth();
  
  // Use the new paginated hook
  const {
    data: projects,
    loading,
    error,
    pagination,
    actions: { setPage, setPageSize, setSearch, refresh }
  } = usePaginatedProjects({
    limit: 12 // Show 12 projects per page in grid view
  });

  const canWrite = hasPermission('write');
  const canDelete = hasPermission('delete');

  const handleCreateProject = async (projectData: any) => {
    setIsCreating(true);
    try {
      await createItem('Proyectos', projectData);
      setShowCreateModal(false);
      refresh(); // Refresh the list
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateProject = async (projectData: any) => {
    if (!editingProject) return;
    
    setIsUpdating(true);
    try {
      await updateItem('Proyectos', editingProject.id, projectData);
      setEditingProject(null);
      refresh(); // Refresh the list
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    
    setIsDeleting(true);
    try {
      await deleteItem('Proyectos', deletingProject.id);
      setDeletingProject(null);
      refresh(); // Refresh the list
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error al eliminar el proyecto');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planificación':
        return 'bg-yellow-100 text-yellow-800';
      case 'En progreso':
        return 'bg-blue-100 text-blue-800';
      case 'Pausado':
        return 'bg-gray-100 text-gray-800';
      case 'Cerrado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Show error state
  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
        </div>
        <ErrorState 
          message={`Error al cargar proyectos: ${error.message}`}
          onRetry={refresh}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          {loading && (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600" />
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar proyectos..."
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Create button */}
          {canWrite && (
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={isCreating}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <ButtonLoading size="sm" />
              ) : (
                <PlusIcon className="h-4 w-4 mr-2" />
              )}
              Nuevo Proyecto
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid or Loading State */}
      {loading ? (
        <CardSkeleton count={pagination.itemsPerPage} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No hay proyectos"
          description="No se encontraron proyectos que coincidan con tu búsqueda"
          action={canWrite ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Crear Primer Proyecto
            </button>
          ) : undefined}
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {project.nombre}
                  </h3>
                  <p className="text-sm text-gray-600">{project.codigo}</p>
                </div>
                
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.estado)}`}>
                  {project.estado}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Cliente:</span> {project.cliente_nombre || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Ubicación:</span> {project.ubicacion}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Avance:</span> {project.avance_pct || 0}%
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${project.avance_pct || 0}%` }}
                ></div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                {canWrite && (
                  <button
                    onClick={() => setEditingProject(project)}
                    disabled={isUpdating}
                    className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                    title="Editar proyecto"
                  >
                    {isUpdating && editingProject?.id === project.id ? (
                      <ButtonLoading size="sm" />
                    ) : (
                      <PencilIcon className="h-4 w-4" />
                    )}
                  </button>
                )}
                
                {canDelete && (
                  <button
                    onClick={() => setDeletingProject(project)}
                    disabled={isDeleting}
                    className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
                    title="Eliminar proyecto"
                  >
                    {isDeleting && deletingProject?.id === project.id ? (
                      <ButtonLoading size="sm" />
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && projects.length > 0 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[6, 12, 24, 48]}
          showPageSizeSelector={true}
          showItemCount={true}
        />
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nuevo Proyecto"
        size="xl"
      >
        <ProjectForm
          onSuccess={handleCreateProject}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        title="Editar Proyecto"
        size="xl"
      >
        {editingProject && (
          <ProjectForm
            project={editingProject}
            onSuccess={handleUpdateProject}
            onCancel={() => setEditingProject(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        title="Confirmar Eliminación"
      >
        {deletingProject && (
          <div className="space-y-4">
            <p className="text-gray-700">
              ¿Estás seguro de que deseas eliminar el proyecto "{deletingProject.nombre}"?
            </p>
            <p className="text-sm text-red-600">
              Esta acción no se puede deshacer.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingProject(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <ButtonLoading size="sm" />
                    <span className="ml-2">Eliminando...</span>
                  </>
                ) : (
                  'Eliminar'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}