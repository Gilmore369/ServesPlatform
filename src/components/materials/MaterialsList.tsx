'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/simple-auth';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton, ErrorState, EmptyState, ButtonLoading } from '@/components/ui/LoadingStates';
import { usePaginatedMaterials } from '@/hooks/usePagination';
import { createItem, updateItem, deleteItem } from '@/hooks/useSimpleData';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export function MaterialsList() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { hasPermission } = useAuth();
  
  // Use the new paginated hook
  const {
    data: materials,
    loading,
    error,
    pagination,
    actions: { setPage, setPageSize, setSearch, refresh }
  } = usePaginatedMaterials({
    limit: 25 // Show 25 materials per page in table view
  });

  const canWrite = hasPermission('write');
  const canDelete = hasPermission('delete');

  const handleCreateMaterial = async (materialData: any) => {
    setIsCreating(true);
    try {
      await createItem('Materiales', materialData);
      setShowCreateModal(false);
      refresh();
    } catch (error) {
      console.error('Error creating material:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateMaterial = async (materialData: any) => {
    if (!editingMaterial) return;
    
    setIsUpdating(true);
    try {
      await updateItem('Materiales', editingMaterial.id, materialData);
      setEditingMaterial(null);
      refresh();
    } catch (error) {
      console.error('Error updating material:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteMaterial = async () => {
    if (!deletingMaterial) return;
    
    setIsDeleting(true);
    try {
      await deleteItem('Materiales', deletingMaterial.id);
      setDeletingMaterial(null);
      refresh();
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Error al eliminar el material');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStockStatusColor = (stock: number, minStock: number) => {
    if (stock <= 0) return 'bg-red-100 text-red-800';
    if (stock <= minStock) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStockStatusText = (stock: number, minStock: number) => {
    if (stock <= 0) return 'Sin stock';
    if (stock <= minStock) return 'Stock bajo';
    return 'En stock';
  };

  // Define table columns
  const columns = [
    {
      key: 'sku',
      title: 'SKU',
      sortable: true,
      filterable: true,
    },
    {
      key: 'descripcion',
      title: 'Descripción',
      sortable: true,
      filterable: true,
      render: (value: string) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      ),
    },
    {
      key: 'categoria',
      title: 'Categoría',
      sortable: true,
      filterable: true,
    },
    {
      key: 'stock_actual',
      title: 'Stock',
      sortable: true,
      align: 'center' as const,
      render: (value: number, row: any) => (
        <div className="flex flex-col items-center">
          <span className="font-medium">{value}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStockStatusColor(value, row.stock_minimo)}`}>
            {getStockStatusText(value, row.stock_minimo)}
          </span>
        </div>
      ),
    },
    {
      key: 'costo_ref',
      title: 'Costo Ref.',
      sortable: true,
      align: 'right' as const,
      render: (value: number) => (
        <span className="font-mono">S/ {value?.toFixed(2) || '0.00'}</span>
      ),
    },
    {
      key: 'proveedor_principal',
      title: 'Proveedor',
      sortable: true,
      filterable: true,
    },
    {
      key: 'activo',
      title: 'Estado',
      sortable: true,
      align: 'center' as const,
      render: (value: boolean) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Acciones',
      align: 'center' as const,
      render: (_: any, row: any) => (
        <div className="flex justify-center gap-2">
          {canWrite && (
            <button
              onClick={() => setEditingMaterial(row)}
              disabled={isUpdating}
              className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50"
              title="Editar material"
            >
              {isUpdating && editingMaterial?.id === row.id ? (
                <ButtonLoading size="sm" />
              ) : (
                <PencilIcon className="h-4 w-4" />
              )}
            </button>
          )}
          
          {canDelete && (
            <button
              onClick={() => setDeletingMaterial(row)}
              disabled={isDeleting}
              className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
              title="Eliminar material"
            >
              {isDeleting && deletingMaterial?.id === row.id ? (
                <ButtonLoading size="sm" />
              ) : (
                <TrashIcon className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      ),
    },
  ];

  // Show error state
  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Materiales</h1>
        </div>
        <ErrorState 
          message={`Error al cargar materiales: ${error.message}`}
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
          <h1 className="text-2xl font-bold text-gray-900">Materiales</h1>
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
              placeholder="Buscar materiales..."
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
              Nuevo Material
            </button>
          )}
        </div>
      </div>

      {/* Materials Table */}
      {loading ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <TableSkeleton rows={pagination.itemsPerPage} columns={columns.length} />
        </div>
      ) : materials.length === 0 ? (
        <EmptyState
          title="No hay materiales"
          description="No se encontraron materiales que coincidan con tu búsqueda"
          action={canWrite ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Crear Primer Material
            </button>
          ) : undefined}
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
      ) : (
        <>
          <Table
            data={materials}
            columns={columns}
            isLoading={loading}
            searchable={false} // We handle search externally
            emptyMessage="No se encontraron materiales"
          />
          
          {/* Pagination */}
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            showPageSizeSelector={true}
            showItemCount={true}
          />
        </>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nuevo Material"
        size="xl"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Formulario de creación de material (por implementar)</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleCreateMaterial({})}
              disabled={isCreating}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <ButtonLoading size="sm" />
                  <span className="ml-2">Creando...</span>
                </>
              ) : (
                'Crear Material'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingMaterial}
        onClose={() => setEditingMaterial(null)}
        title="Editar Material"
        size="xl"
      >
        {editingMaterial && (
          <div className="space-y-4">
            <p className="text-gray-600">Formulario de edición de material (por implementar)</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingMaterial(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUpdateMaterial({})}
                disabled={isUpdating}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <ButtonLoading size="sm" />
                    <span className="ml-2">Actualizando...</span>
                  </>
                ) : (
                  'Actualizar Material'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deletingMaterial}
        onClose={() => setDeletingMaterial(null)}
        title="Confirmar Eliminación"
      >
        {deletingMaterial && (
          <div className="space-y-4">
            <p className="text-gray-700">
              ¿Estás seguro de que deseas eliminar el material "{deletingMaterial.descripcion}"?
            </p>
            <p className="text-sm text-red-600">
              Esta acción no se puede deshacer.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingMaterial(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteMaterial}
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

export default MaterialsList;