/**
 * Enhanced Materials List Component
 * Demonstrates the new Google Sheets integration with advanced features
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useEnhancedList, useEnhancedSearch, useEnhancedMutations } from '@/hooks/useEnhancedAPI';
import { Material } from '@/lib/types';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/badge';
import { Loading } from '../ui/Loading';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { logger } from '@/lib/logger';

interface EnhancedMaterialsListProps {
  className?: string;
  showSearch?: boolean;
  showActions?: boolean;
  pageSize?: number;
}

export function EnhancedMaterialsList({
  className = '',
  showSearch = true,
  showActions = true,
  pageSize = 50
}: EnhancedMaterialsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Material | null>(null);

  // Enhanced hooks for data management
  const {
    data: allMaterials,
    error: listError,
    isLoading: isLoadingList,
    refresh: refreshList
  } = useEnhancedList<Material>('Materiales', { limit: pageSize });

  const {
    data: searchResults,
    error: searchError,
    isLoading: isSearching
  } = useEnhancedSearch<Material>(
    'Materiales',
    searchTerm,
    selectedCategory ? { categoria: selectedCategory } : undefined,
    { debounceMs: 300 }
  );

  const {
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting,
    isMutating
  } = useEnhancedMutations<Material>('Materiales');

  // Determine which data to display
  const displayData = useMemo(() => {
    if (searchTerm || selectedCategory) {
      return searchResults || [];
    }
    return allMaterials || [];
  }, [searchTerm, selectedCategory, searchResults, allMaterials]);

  // Extract unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allMaterials?.forEach(material => {
      if (material.categoria) cats.add(material.categoria);
    });
    return Array.from(cats).sort();
  }, [allMaterials]);

  // Get stock status for a material
  const getStockStatus = (material: Material) => {
    if (material.stock_actual <= 0) return 'out-of-stock';
    if (material.stock_actual <= material.stock_minimo) return 'low-stock';
    return 'in-stock';
  };

  const getStockBadgeVariant = (status: string) => {
    switch (status) {
      case 'out-of-stock': return 'destructive';
      case 'low-stock': return 'warning';
      case 'in-stock': return 'success';
      default: return 'default';
    }
  };

  const getStockLabel = (status: string) => {
    switch (status) {
      case 'out-of-stock': return 'Sin Stock';
      case 'low-stock': return 'Stock Bajo';
      case 'in-stock': return 'En Stock';
      default: return 'Desconocido';
    }
  };

  // Handle create material
  const handleCreate = async (materialData: Partial<Material>) => {
    try {
      await create(materialData);
      setShowCreateModal(false);
      logger.info('Material created successfully');
    } catch (error) {
      logger.error('Failed to create material', error);
      // Error handling would show a toast or alert here
    }
  };

  // Handle update material
  const handleUpdate = async (id: string, materialData: Partial<Material>) => {
    try {
      await update(id, materialData);
      setEditingMaterial(null);
      logger.info('Material updated successfully', { id });
    } catch (error) {
      logger.error('Failed to update material', error);
      // Error handling would show a toast or alert here
    }
  };

  // Handle delete material
  const handleDelete = async (material: Material) => {
    try {
      await remove(material.id);
      setDeleteConfirm(null);
      logger.info('Material deleted successfully', { id: material.id });
    } catch (error) {
      logger.error('Failed to delete material', error);
      // Error handling would show a toast or alert here
    }
  };

  // Loading state
  if (isLoadingList && !allMaterials) {
    return (
      <div className={`enhanced-materials-list ${className}`}>
        <Loading />
        <p className="text-center text-gray-600 mt-4">
          Cargando materiales con caché inteligente...
        </p>
      </div>
    );
  }

  // Error state
  if (listError && !allMaterials) {
    return (
      <div className={`enhanced-materials-list ${className}`}>
        <Card className="p-6 text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Error al cargar materiales
          </h3>
          <p className="text-gray-600 mb-4">
            {listError.message}
          </p>
          <Button onClick={refreshList}>
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={`enhanced-materials-list ${className}`}>
      {/* Header with search and filters */}
      {showSearch && (
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Buscar materiales por SKU, descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            {showActions && (
              <Button
                onClick={() => setShowCreateModal(true)}
                disabled={isMutating}
              >
                Nuevo Material
              </Button>
            )}
          </div>
          
          {/* Search status */}
          {(searchTerm || selectedCategory) && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              {isSearching && <Loading size="sm" />}
              <span>
                {isSearching 
                  ? 'Buscando...' 
                  : `${displayData.length} resultado${displayData.length !== 1 ? 's' : ''} encontrado${displayData.length !== 1 ? 's' : ''}`
                }
              </span>
              {(searchTerm || selectedCategory) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Materials grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayData.map((material) => {
          const stockStatus = getStockStatus(material);
          
          return (
            <Card key={material.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{material.sku}</h3>
                  <p className="text-gray-600 text-sm">{material.descripcion}</p>
                </div>
                <Badge variant={getStockBadgeVariant(stockStatus)}>
                  {getStockLabel(stockStatus)}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Categoría:</span>
                  <span>{material.categoria}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Stock:</span>
                  <span>
                    {material.stock_actual} {material.unidad}
                    {material.stock_actual <= material.stock_minimo && (
                      <span className="text-red-500 ml-1">
                        (Mín: {material.stock_minimo})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Costo ref:</span>
                  <span>S/ {material.costo_ref.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Proveedor:</span>
                  <span className="truncate ml-2">{material.proveedor_principal}</span>
                </div>
              </div>

              {showActions && (
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingMaterial(material)}
                    disabled={isMutating}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteConfirm(material)}
                    disabled={isMutating}
                  >
                    Eliminar
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {displayData.length === 0 && !isLoadingList && !isSearching && (
        <Card className="p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            No se encontraron materiales
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedCategory
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza agregando tu primer material'
            }
          </p>
          {showActions && !searchTerm && !selectedCategory && (
            <Button onClick={() => setShowCreateModal(true)}>
              Agregar Material
            </Button>
          )}
        </Card>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingMaterial) && (
        <MaterialFormModal
          material={editingMaterial}
          isOpen={showCreateModal || !!editingMaterial}
          onClose={() => {
            setShowCreateModal(false);
            setEditingMaterial(null);
          }}
          onSave={editingMaterial 
            ? (data) => handleUpdate(editingMaterial.id, data)
            : handleCreate
          }
          isLoading={isCreating || isUpdating}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm)}
          title="Eliminar Material"
          message={`¿Estás seguro de que deseas eliminar el material "${deleteConfirm.sku}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="destructive"
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}

// Simple form modal component (would be more complex in real implementation)
interface MaterialFormModalProps {
  material?: Material | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Material>) => Promise<void>;
  isLoading: boolean;
}

function MaterialFormModal({
  material,
  isOpen,
  onClose,
  onSave,
  isLoading
}: MaterialFormModalProps) {
  const [formData, setFormData] = useState<Partial<Material>>({
    sku: material?.sku || '',
    descripcion: material?.descripcion || '',
    categoria: material?.categoria || '',
    unidad: material?.unidad || '',
    costo_ref: material?.costo_ref || 0,
    stock_actual: material?.stock_actual || 0,
    stock_minimo: material?.stock_minimo || 0,
    proveedor_principal: material?.proveedor_principal || '',
    ubicacion_almacen: material?.ubicacion_almacen || '',
    activo: material?.activo ?? true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(formData);
    } catch (error) {
      // Error handling would be done by parent component
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={material ? 'Editar Material' : 'Nuevo Material'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU *
            </label>
            <Input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría *
            </label>
            <Input
              type="text"
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción *
          </label>
          <Input
            type="text"
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            required
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidad *
            </label>
            <Input
              type="text"
              value={formData.unidad}
              onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Actual
            </label>
            <Input
              type="number"
              value={formData.stock_actual}
              onChange={(e) => setFormData({ ...formData, stock_actual: Number(e.target.value) })}
              min="0"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Mínimo
            </label>
            <Input
              type="number"
              value={formData.stock_minimo}
              onChange={(e) => setFormData({ ...formData, stock_minimo: Number(e.target.value) })}
              min="0"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Guardando...' : (material ? 'Actualizar' : 'Crear')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default EnhancedMaterialsList;