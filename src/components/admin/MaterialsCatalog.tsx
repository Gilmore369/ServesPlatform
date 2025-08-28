'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Material } from '@/lib/types';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { MaterialForm } from '@/components/materials/MaterialForm';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CubeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export function MaterialsCatalog() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getMaterials({ q: searchQuery });
      
      if (response.ok && response.data) {
        setMaterials(response.data);
      } else {
        setError(response.message || 'Error al cargar materiales');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [searchQuery]);

  const handleCreateMaterial = () => {
    setSelectedMaterial(null);
    setShowMaterialForm(true);
  };

  const handleEditMaterial = (material: Material) => {
    setSelectedMaterial(material);
    setShowMaterialForm(true);
  };

  const handleDeleteMaterial = (material: Material) => {
    setSelectedMaterial(material);
    setShowDeleteConfirm(true);
  };

  const handleToggleActive = async (material: Material) => {
    try {
      const response = await apiClient.updateMaterial(material.id, {
        activo: !material.activo
      });

      if (response.ok) {
        await loadMaterials();
      } else {
        setError(response.message || 'Error al actualizar material');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    }
  };

  const confirmDeleteMaterial = async () => {
    if (!selectedMaterial) return;

    try {
      const response = await apiClient.delete('Materiales', selectedMaterial.id);
      
      if (response.ok) {
        await loadMaterials();
        setShowDeleteConfirm(false);
        setSelectedMaterial(null);
      } else {
        setError(response.message || 'Error al eliminar material');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    }
  };

  const handleMaterialFormSuccess = async () => {
    setShowMaterialForm(false);
    setSelectedMaterial(null);
    await loadMaterials();
  };

  const getStockStatus = (material: Material) => {
    if (material.stock_actual <= 0) {
      return { status: 'Sin stock', color: 'bg-red-100 text-red-800' };
    } else if (material.stock_actual <= material.stock_minimo) {
      return { status: 'Stock bajo', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { status: 'Stock OK', color: 'bg-green-100 text-green-800' };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const columns = [
    {
      key: 'material',
      label: 'Material',
      render: (material: Material) => (
        <div>
          <div className="font-medium text-gray-900">{material.descripcion}</div>
          <div className="text-sm text-gray-500">SKU: {material.sku}</div>
          <div className="text-xs text-gray-400">{material.categoria}</div>
        </div>
      ),
    },
    {
      key: 'stock',
      label: 'Stock',
      render: (material: Material) => {
        const stockStatus = getStockStatus(material);
        return (
          <div>
            <div className="text-sm text-gray-900">
              {material.stock_actual} {material.unidad}
            </div>
            <div className="text-xs text-gray-500">
              Mín: {material.stock_minimo} {material.unidad}
            </div>
            <Badge className={stockStatus.color}>
              {stockStatus.status}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'costo',
      label: 'Costo Ref.',
      render: (material: Material) => (
        <div>
          <div className="text-sm text-gray-900">
            {formatCurrency(material.costo_ref)}
          </div>
          <div className="text-xs text-gray-500">
            por {material.unidad}
          </div>
        </div>
      ),
    },
    {
      key: 'proveedor',
      label: 'Proveedor',
      render: (material: Material) => (
        <div>
          <div className="text-sm text-gray-900">{material.proveedor_principal}</div>
          <div className="text-xs text-gray-500">{material.ubicacion_almacen}</div>
        </div>
      ),
    },
    {
      key: 'activo',
      label: 'Estado',
      render: (material: Material) => (
        <Badge className={material.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
          {material.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (material: Material) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditMaterial(material)}
            className="text-blue-600 hover:text-blue-900"
            title="Editar material"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => handleToggleActive(material)}
            className={material.activo ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
            title={material.activo ? 'Desactivar material' : 'Activar material'}
          >
            {material.activo ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
          
          <button
            onClick={() => handleDeleteMaterial(material)}
            className="text-red-600 hover:text-red-900"
            title="Eliminar material"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // Calculate summary statistics
  const totalMaterials = materials.length;
  const activeMaterials = materials.filter(m => m.activo).length;
  const lowStockMaterials = materials.filter(m => m.stock_actual <= m.stock_minimo && m.activo).length;
  const outOfStockMaterials = materials.filter(m => m.stock_actual <= 0 && m.activo).length;

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <CubeIcon className="h-6 w-6 mr-2" />
              Catálogo de Materiales
            </h1>
            <p className="mt-1 text-gray-600">
              Gestiona el catálogo maestro de materiales e inventario
            </p>
          </div>
          
          <button
            onClick={handleCreateMaterial}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuevo Material
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <CubeIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Materiales</p>
              <p className="text-2xl font-semibold text-gray-900">{totalMaterials}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <EyeIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Activos</p>
              <p className="text-2xl font-semibold text-gray-900">{activeMaterials}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Stock Bajo</p>
              <p className="text-2xl font-semibold text-gray-900">{lowStockMaterials}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Sin Stock</p>
              <p className="text-2xl font-semibold text-gray-900">{outOfStockMaterials}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <Table
          data={materials}
          columns={columns}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Buscar por SKU, descripción o categoría..."
        />
      </div>

      {/* Material Form Modal */}
      <Modal
        isOpen={showMaterialForm}
        onClose={() => setShowMaterialForm(false)}
        title={selectedMaterial ? 'Editar Material' : 'Nuevo Material'}
      >
        <MaterialForm
          material={selectedMaterial}
          onSuccess={handleMaterialFormSuccess}
          onCancel={() => setShowMaterialForm(false)}
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteMaterial}
        title="Eliminar Material"
        message={`¿Estás seguro de que deseas eliminar el material "${selectedMaterial?.descripcion}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}