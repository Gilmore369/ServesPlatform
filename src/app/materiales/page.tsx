'use client';

import { useState, useEffect } from 'react';
import { Material } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/lib/auth';
import { Loading } from '@/components/ui/Loading';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { CardKpi } from '@/components/ui/CardKpi';
import { MaterialForm } from '@/components/materials/MaterialForm';
import { MaterialsTable } from '@/components/materials/MaterialsTable';
import { StockAlerts } from '@/components/materials/StockAlerts';
import { ProcurementDashboard } from '@/components/materials/ProcurementDashboard';
import {
  PlusIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export default function MaterialsPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [activeTab, setActiveTab] = useState<'catalog' | 'procurement'>('catalog');

  // Load materials data
  useEffect(() => {
    loadMaterials();
  }, []);

  // Filter materials based on search and filters
  useEffect(() => {
    let filtered = materials.filter(material => material.activo);

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(material =>
        material.descripcion.toLowerCase().includes(term) ||
        material.sku.toLowerCase().includes(term) ||
        material.categoria.toLowerCase().includes(term) ||
        material.proveedor_principal.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(material => material.categoria === categoryFilter);
    }

    // Stock filter
    if (stockFilter === 'low') {
      filtered = filtered.filter(material => 
        material.stock_actual <= material.stock_minimo && material.stock_actual > 0
      );
    } else if (stockFilter === 'out') {
      filtered = filtered.filter(material => material.stock_actual === 0);
    }

    setFilteredMaterials(filtered);
  }, [materials, searchTerm, categoryFilter, stockFilter]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getMaterials({ limit: 1000 });
      if (response.ok && response.data) {
        setMaterials(response.data);
      } else {
        setError(response.message || 'Error al cargar materiales');
      }
    } catch (err) {
      console.error('Error loading materials:', err);
      setError('Error al cargar materiales');
    } finally {
      setLoading(false);
    }
  };

  // Check if user can edit
  const canEdit = () => {
    if (!user) return false;
    return ['admin_lider', 'admin', 'editor'].includes(user.rol);
  };

  // Handle material creation/update
  const handleMaterialSave = async (materialData: Partial<Material>) => {
    try {
      if (editingMaterial) {
        const response = await apiClient.updateMaterial(editingMaterial.id, materialData);
        if (response.ok) {
          await loadMaterials();
          setShowForm(false);
          setEditingMaterial(null);
        }
      } else {
        const response = await apiClient.createMaterial(materialData);
        if (response.ok) {
          await loadMaterials();
          setShowForm(false);
        }
      }
    } catch (err) {
      console.error('Error saving material:', err);
    }
  };

  // Handle material deletion
  const handleMaterialDelete = async () => {
    if (!deletingMaterial) return;

    try {
      // Instead of deleting, we deactivate the material
      const response = await apiClient.updateMaterial(deletingMaterial.id, { activo: false });
      if (response.ok) {
        await loadMaterials();
        setDeletingMaterial(null);
      }
    } catch (err) {
      console.error('Error deactivating material:', err);
    }
  };

  // Calculate KPIs
  const calculateKPIs = () => {
    const activeMaterials = materials.filter(m => m.activo);
    const totalMaterials = activeMaterials.length;
    const lowStockMaterials = activeMaterials.filter(m => 
      m.stock_actual <= m.stock_minimo && m.stock_actual > 0
    ).length;
    const outOfStockMaterials = activeMaterials.filter(m => m.stock_actual === 0).length;
    const totalValue = activeMaterials.reduce((sum, m) => sum + (m.stock_actual * m.costo_ref), 0);

    return {
      totalMaterials,
      lowStockMaterials,
      outOfStockMaterials,
      totalValue,
    };
  };

  // Get unique categories
  const getCategories = () => {
    const categories = [...new Set(materials.filter(m => m.activo).map(m => m.categoria))];
    return categories.sort();
  };

  const kpis = calculateKPIs();
  const categories = getCategories();

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadMaterials}
          className="mt-2 text-blue-600 hover:text-blue-800 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Materiales</h1>
          <p className="text-gray-600">Administra el catálogo de materiales y controla el inventario</p>
        </div>
        {canEdit() && activeTab === 'catalog' && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            Nuevo Material
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'catalog'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Catálogo de Materiales
          </button>
          <button
            onClick={() => setActiveTab('procurement')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'procurement'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Dashboard de Abastecimiento
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'catalog' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <CardKpi
              title="Total Materiales"
              value={kpis.totalMaterials.toString()}
              icon={CubeIcon}
              color="blue"
            />
            <CardKpi
              title="Stock Bajo"
              value={kpis.lowStockMaterials.toString()}
              icon={ExclamationTriangleIcon}
              color="yellow"
            />
            <CardKpi
              title="Sin Stock"
              value={kpis.outOfStockMaterials.toString()}
              icon={ExclamationTriangleIcon}
              color="red"
            />
            <CardKpi
              title="Valor Total Inventario"
              value={`PEN ${kpis.totalValue.toLocaleString()}`}
              icon={CheckCircleIcon}
              color="green"
            />
          </div>

          {/* Stock Alerts */}
          {(kpis.lowStockMaterials > 0 || kpis.outOfStockMaterials > 0) && (
            <StockAlerts materials={materials.filter(m => m.activo)} />
          )}

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar materiales..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              {/* Stock Filter */}
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'out')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los stocks</option>
                <option value="low">Stock bajo</option>
                <option value="out">Sin stock</option>
              </select>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('');
                  setStockFilter('all');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>

          {/* Materials Table */}
          <MaterialsTable
            materials={filteredMaterials}
            onEdit={canEdit() ? (material) => {
              setEditingMaterial(material);
              setShowForm(true);
            } : undefined}
            onDelete={canEdit() ? setDeletingMaterial : undefined}
          />
        </>
      )}

      {activeTab === 'procurement' && (
        <ProcurementDashboard />
      )}

      {/* Material Form Modal */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingMaterial(null);
          }}
          title={editingMaterial ? 'Editar Material' : 'Nuevo Material'}
        >
          <MaterialForm
            material={editingMaterial}
            onSave={handleMaterialSave}
            onCancel={() => {
              setShowForm(false);
              setEditingMaterial(null);
            }}
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deletingMaterial && (
        <ConfirmDialog
          isOpen={!!deletingMaterial}
          onClose={() => setDeletingMaterial(null)}
          onConfirm={handleMaterialDelete}
          title="Desactivar Material"
          message={`¿Está seguro de que desea desactivar el material "${deletingMaterial.descripcion}"? Este material no se eliminará pero no estará disponible para nuevas asignaciones.`}
          confirmText="Desactivar"
          cancelText="Cancelar"
        />
      )}
    </div>
  );
}