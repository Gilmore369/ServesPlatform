'use client';

import { useState } from 'react';
import { BOM, Material } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/Modal';
import {
  PencilIcon,
  ClockIcon,
  CheckCircleIcon,
  TruckIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';

interface BOMStatusTrackerProps {
  boms: BOM[];
  materials: Material[];
  onStatusUpdate?: () => void;
}

interface StatusUpdateForm {
  bomId: string;
  estado_abastecimiento: BOM['estado_abastecimiento'];
  qty_asignada: number;
  observaciones: string;
}

export function BOMStatusTracker({ boms, materials, onStatusUpdate }: BOMStatusTrackerProps) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  const [updateForm, setUpdateForm] = useState<StatusUpdateForm>({
    bomId: '',
    estado_abastecimiento: 'Por pedir',
    qty_asignada: 0,
    observaciones: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Get material by ID
  const getMaterialById = (materialId: string) => {
    return materials.find(m => m.id === materialId);
  };

  // Handle status update
  const handleStatusUpdate = (bom: BOM) => {
    setSelectedBOM(bom);
    setUpdateForm({
      bomId: bom.id,
      estado_abastecimiento: bom.estado_abastecimiento,
      qty_asignada: bom.qty_asignada,
      observaciones: '',
    });
    setShowUpdateModal(true);
  };

  // Submit status update
  const submitStatusUpdate = async () => {
    if (!selectedBOM) return;

    try {
      setIsUpdating(true);
      
      const response = await apiClient.updateBOM(selectedBOM.id, {
        estado_abastecimiento: updateForm.estado_abastecimiento,
        qty_asignada: updateForm.qty_asignada,
      });

      if (response.ok) {
        setShowUpdateModal(false);
        setSelectedBOM(null);
        onStatusUpdate?.();
      }
    } catch (error) {
      console.error('Error updating BOM status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Status progression
  const statusProgression = [
    'Por pedir',
    'Pedido',
    'En tránsito',
    'Recibido',
    'Entregado',
  ];

  // Get status icon
  const getStatusIcon = (status: BOM['estado_abastecimiento']) => {
    switch (status) {
      case 'Por pedir':
        return ShoppingCartIcon;
      case 'Pedido':
        return ClockIcon;
      case 'En tránsito':
        return TruckIcon;
      case 'Recibido':
      case 'Entregado':
        return CheckCircleIcon;
      default:
        return ShoppingCartIcon;
    }
  };

  // Get status color
  const getStatusColor = (status: BOM['estado_abastecimiento']) => {
    switch (status) {
      case 'Por pedir':
        return 'bg-red-100 text-red-800';
      case 'Pedido':
        return 'bg-yellow-100 text-yellow-800';
      case 'En tránsito':
        return 'bg-blue-100 text-blue-800';
      case 'Recibido':
        return 'bg-purple-100 text-purple-800';
      case 'Entregado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = (status: BOM['estado_abastecimiento']) => {
    const index = statusProgression.indexOf(status);
    return ((index + 1) / statusProgression.length) * 100;
  };

  // Group BOMs by status
  const bomsByStatus = boms.reduce((acc, bom) => {
    if (!acc[bom.estado_abastecimiento]) {
      acc[bom.estado_abastecimiento] = [];
    }
    acc[bom.estado_abastecimiento].push(bom);
    return acc;
  }, {} as Record<string, BOM[]>);

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {statusProgression.map((status) => {
          const count = bomsByStatus[status]?.length || 0;
          const StatusIcon = getStatusIcon(status as BOM['estado_abastecimiento']);
          
          return (
            <div key={status} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{status}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-xs text-gray-500">
                {boms.length > 0 ? Math.round((count / boms.length) * 100) : 0}% del total
              </div>
            </div>
          );
        })}
      </div>

      {/* BOM Items with Status Tracking */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Seguimiento de Estado de Materiales
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado Actual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progreso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Requerida
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {boms.map((bom) => {
                const material = getMaterialById(bom.material_id);
                const progress = getProgressPercentage(bom.estado_abastecimiento);
                const isShortage = bom.qty_asignada < bom.qty_requerida;
                
                return (
                  <tr key={bom.id} className={isShortage ? 'bg-yellow-50' : ''}>
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
                        Req: {bom.qty_requerida} {material?.unidad || ''}
                      </div>
                      <div className={`text-sm ${isShortage ? 'text-yellow-600' : 'text-gray-500'}`}>
                        Asig: {bom.qty_asignada} {material?.unidad || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusColor(bom.estado_abastecimiento)}>
                        {bom.estado_abastecimiento}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.round(progress)}% completado
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(bom.fecha_requerida).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Lead time: {bom.lead_time_dias} días
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {bom.proveedor_sugerido || 'Sin proveedor'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleStatusUpdate(bom)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        title="Actualizar estado"
                      >
                        <PencilIcon className="h-4 w-4" />
                        Actualizar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Update Modal */}
      {showUpdateModal && selectedBOM && (
        <Modal
          isOpen={showUpdateModal}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedBOM(null);
          }}
          title="Actualizar Estado de Material"
        >
          <div className="space-y-4">
            {/* Material Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-900">
                {getMaterialById(selectedBOM.material_id)?.descripcion}
              </div>
              <div className="text-sm text-gray-500">
                SKU: {getMaterialById(selectedBOM.material_id)?.sku}
              </div>
            </div>

            {/* Current Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado Actual
              </label>
              <Badge className={getStatusColor(selectedBOM.estado_abastecimiento)}>
                {selectedBOM.estado_abastecimiento}
              </Badge>
            </div>

            {/* New Status */}
            <div>
              <label htmlFor="nuevo_estado" className="block text-sm font-medium text-gray-700 mb-1">
                Nuevo Estado *
              </label>
              <select
                id="nuevo_estado"
                value={updateForm.estado_abastecimiento}
                onChange={(e) => setUpdateForm(prev => ({
                  ...prev,
                  estado_abastecimiento: e.target.value as BOM['estado_abastecimiento']
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusProgression.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Quantity Assigned */}
            <div>
              <label htmlFor="qty_asignada" className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad Asignada
              </label>
              <input
                type="number"
                id="qty_asignada"
                value={updateForm.qty_asignada}
                onChange={(e) => setUpdateForm(prev => ({
                  ...prev,
                  qty_asignada: parseFloat(e.target.value) || 0
                }))}
                min="0"
                max={selectedBOM.qty_requerida}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-sm text-gray-500 mt-1">
                Cantidad requerida: {selectedBOM.qty_requerida} {getMaterialById(selectedBOM.material_id)?.unidad}
              </div>
            </div>

            {/* Observations */}
            <div>
              <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                id="observaciones"
                value={updateForm.observaciones}
                onChange={(e) => setUpdateForm(prev => ({
                  ...prev,
                  observaciones: e.target.value
                }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones sobre la actualización del estado..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setSelectedBOM(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isUpdating}
              >
                Cancelar
              </button>
              <button
                onClick={submitStatusUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={isUpdating}
              >
                {isUpdating ? 'Actualizando...' : 'Actualizar Estado'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}