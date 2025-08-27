'use client';

import { useState, useEffect } from 'react';
import { Project, Material, BOM, Activity } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/lib/auth';
import { Loading } from '@/components/ui/Loading';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { BOMForm } from './BOMForm';
import { PurchaseRequestGenerator } from './PurchaseRequestGenerator';
import { BOMStatusTracker } from './BOMStatusTracker';
import { LeadTimeMonitor } from './LeadTimeMonitor';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

interface MaterialsTabProps {
  project: Project;
  activities?: Activity[];
  onProjectUpdate?: (project: Project) => void;
}

export function MaterialsTab({ project, activities = [] }: MaterialsTabProps) {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projectBOMs, setProjectBOMs] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBOMForm, setShowBOMForm] = useState(false);
  const [showPurchaseRequest, setShowPurchaseRequest] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);
  const [deletingBOM, setDeletingBOM] = useState<BOM | null>(null);
  const [activeTab, setActiveTab] = useState<'bom' | 'materials' | 'procurement' | 'leadtime'>('bom');

  // Load materials and BOM data
  useEffect(() => {
    loadData();
  }, [project.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [materialsResponse, bomsResponse] = await Promise.all([
        apiClient.getMaterials({ limit: 1000 }),
        apiClient.getProjectBOMs(project.id),
      ]);

      if (materialsResponse.ok && materialsResponse.data) {
        setMaterials(materialsResponse.data);
      }

      if (bomsResponse.ok && bomsResponse.data) {
        setProjectBOMs(bomsResponse.data);
      }
    } catch (err) {
      console.error('Error loading materials data:', err);
      setError('Error al cargar los datos de materiales');
    } finally {
      setLoading(false);
    }
  };

  // Get material by ID
  const getMaterialById = (materialId: string) => {
    return materials.find(m => m.id === materialId);
  };

  // Get activity by ID
  const getActivityById = (activityId: string) => {
    return activities.find(a => a.id === activityId);
  };

  // Check if user can edit
  const canEdit = () => {
    if (!user) return false;
    return ['admin_lider', 'admin'].includes(user.rol) || 
           (user.rol === 'editor' && project.responsable_id === user.id);
  };

  // Handle BOM creation/update
  const handleBOMSave = async (bomData: Partial<BOM>) => {
    try {
      if (editingBOM) {
        const response = await apiClient.updateBOM(editingBOM.id, bomData);
        if (response.ok) {
          await loadData();
          setShowBOMForm(false);
          setEditingBOM(null);
        }
      } else {
        const response = await apiClient.createBOM({
          ...bomData,
          proyecto_id: project.id,
        });
        if (response.ok) {
          await loadData();
          setShowBOMForm(false);
        }
      }
    } catch (err) {
      console.error('Error saving BOM:', err);
    }
  };

  // Handle BOM deletion
  const handleBOMDelete = async () => {
    if (!deletingBOM) return;

    try {
      const response = await apiClient.deleteBOM(deletingBOM.id);
      if (response.ok) {
        await loadData();
        setDeletingBOM(null);
      }
    } catch (err) {
      console.error('Error deleting BOM:', err);
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalItems = projectBOMs.length;
    const totalCost = projectBOMs.reduce((sum, bom) => sum + (bom.qty_requerida * bom.costo_unit_est), 0);
    const pendingItems = projectBOMs.filter(bom => bom.estado_abastecimiento === 'Por pedir').length;
    const shortageItems = projectBOMs.filter(bom => bom.qty_asignada < bom.qty_requerida).length;

    return { totalItems, totalCost, pendingItems, shortageItems };
  };

  const totals = calculateTotals();

  // Status colors
  const statusColors = {
    'Por pedir': 'bg-red-100 text-red-800',
    'Pedido': 'bg-yellow-100 text-yellow-800',
    'En tránsito': 'bg-blue-100 text-blue-800',
    'Recibido': 'bg-purple-100 text-purple-800',
    'Entregado': 'bg-green-100 text-green-800',
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 text-blue-600 hover:text-blue-800 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <CubeIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Total Items</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{totals.totalItems}</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-green-600">Costo Total</span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {project.moneda} {totals.totalCost.toLocaleString()}
          </p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <ShoppingCartIcon className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-600">Por Pedir</span>
          </div>
          <p className="text-2xl font-bold text-yellow-900">{totals.pendingItems}</p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-600">Faltantes</span>
          </div>
          <p className="text-2xl font-bold text-red-900">{totals.shortageItems}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('bom')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'bom'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Lista de Materiales (BOM)
          </button>
          <button
            onClick={() => setActiveTab('procurement')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'procurement'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Estado de Abastecimiento
          </button>
          <button
            onClick={() => setActiveTab('leadtime')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'leadtime'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Monitor Lead Times
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'materials'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Catálogo de Materiales
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'bom' && (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Lista de Materiales del Proyecto
            </h3>
            <div className="flex gap-2">
              {totals.pendingItems > 0 && canEdit() && (
                <button
                  onClick={() => setShowPurchaseRequest(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <ShoppingCartIcon className="h-4 w-4" />
                  Generar Solicitud de Compra
                </button>
              )}
              {canEdit() && (
                <button
                  onClick={() => setShowBOMForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  Agregar Material
                </button>
              )}
            </div>
          </div>

          {/* BOM Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Material
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actividad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Costo Unit.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Req.
                    </th>
                    {canEdit() && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projectBOMs.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit() ? 8 : 7} className="px-6 py-8 text-center text-gray-500">
                        No hay materiales asignados a este proyecto
                      </td>
                    </tr>
                  ) : (
                    projectBOMs.map((bom) => {
                      const material = getMaterialById(bom.material_id);
                      const activity = getActivityById(bom.actividad_id);
                      const totalCost = bom.qty_requerida * bom.costo_unit_est;
                      const isShortage = bom.qty_asignada < bom.qty_requerida;

                      return (
                        <tr key={bom.id} className={isShortage ? 'bg-red-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {material?.descripcion || 'Material no encontrado'}
                              </div>
                              <div className="text-sm text-gray-500">
                                SKU: {material?.sku || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {activity?.titulo || 'Actividad no encontrada'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {activity?.codigo || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {bom.qty_requerida} {material?.unidad || ''}
                            </div>
                            {isShortage && (
                              <div className="text-sm text-red-600">
                                Asignado: {bom.qty_asignada}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {project.moneda} {bom.costo_unit_est.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {project.moneda} {totalCost.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={statusColors[bom.estado_abastecimiento]}>
                              {bom.estado_abastecimiento}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(bom.fecha_requerida).toLocaleDateString()}
                          </td>
                          {canEdit() && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingBOM(bom);
                                    setShowBOMForm(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setDeletingBOM(bom)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'procurement' && (
        <BOMStatusTracker
          boms={projectBOMs}
          materials={materials}
          onStatusUpdate={loadData}
        />
      )}

      {activeTab === 'leadtime' && (
        <LeadTimeMonitor projectId={project.id} />
      )}

      {activeTab === 'materials' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Catálogo de Materiales
          </h3>
          
          {/* Materials Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Material
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Costo Ref.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proveedor
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {materials.filter(m => m.activo).map((material) => {
                    const isLowStock = material.stock_actual <= material.stock_minimo;
                    
                    return (
                      <tr key={material.id} className={isLowStock ? 'bg-yellow-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {material.descripcion}
                            </div>
                            <div className="text-sm text-gray-500">
                              SKU: {material.sku}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {material.categoria}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {material.stock_actual} {material.unidad}
                          </div>
                          {isLowStock && (
                            <div className="text-sm text-yellow-600">
                              Mín: {material.stock_minimo}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {project.moneda} {material.costo_ref.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {material.proveedor_principal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BOM Form Modal */}
      {showBOMForm && (
        <Modal
          isOpen={showBOMForm}
          onClose={() => {
            setShowBOMForm(false);
            setEditingBOM(null);
          }}
          title={editingBOM ? 'Editar Material en BOM' : 'Agregar Material a BOM'}
        >
          <BOMForm
            bom={editingBOM}
            project={project}
            activities={activities}
            materials={materials}
            onSave={handleBOMSave}
            onCancel={() => {
              setShowBOMForm(false);
              setEditingBOM(null);
            }}
          />
        </Modal>
      )}

      {/* Purchase Request Modal */}
      {showPurchaseRequest && (
        <Modal
          isOpen={showPurchaseRequest}
          onClose={() => setShowPurchaseRequest(false)}
          title="Generar Solicitud de Compra"
        >
          <PurchaseRequestGenerator
            project={project}
            boms={projectBOMs.filter(bom => bom.estado_abastecimiento === 'Por pedir')}
            materials={materials}
            onClose={() => setShowPurchaseRequest(false)}
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deletingBOM && (
        <ConfirmDialog
          isOpen={!!deletingBOM}
          onClose={() => setDeletingBOM(null)}
          onConfirm={handleBOMDelete}
          title="Eliminar Material de BOM"
          message={`¿Está seguro de que desea eliminar este material de la lista de materiales?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
        />
      )}
    </div>
  );
}