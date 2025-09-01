'use client';

import { Material } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface MaterialsTableProps {
  materials: Material[];
  onEdit?: (material: Material) => void;
  onDelete?: (material: Material) => void;
}

export function MaterialsTable({ materials, onEdit, onDelete }: MaterialsTableProps) {
  // Get stock status
  const getStockStatus = (material: Material) => {
    if (material.stock_actual === 0) {
      return { status: 'Sin Stock', color: 'bg-red-100 text-red-800' };
    } else if (material.stock_actual <= material.stock_minimo) {
      return { status: 'Stock Bajo', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { status: 'Stock OK', color: 'bg-green-100 text-green-800' };
    }
  };

  if (materials.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <ExclamationTriangleIcon className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron materiales</h3>
        <p className="text-gray-500">
          No hay materiales que coincidan con los filtros aplicados.
        </p>
      </div>
    );
  }

  return (
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
                Valor Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Proveedor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              {(onEdit || onDelete) && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {materials.map((material) => {
              const stockStatus = getStockStatus(material);
              const stockValue = material.stock_actual * material.costo_ref;
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
                      {material.ubicacion_almacen && (
                        <div className="text-xs text-gray-400">
                          Ubicación: {material.ubicacion_almacen}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className="bg-blue-100 text-blue-800">
                      {material.categoria}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {material.stock_actual} {material.unidad}
                    </div>
                    <div className="text-xs text-gray-500">
                      Mín: {material.stock_minimo} {material.unidad}
                    </div>
                    {isLowStock && (
                      <div className="flex items-center text-xs text-yellow-600 mt-1">
                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                        Reorden necesario
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    PEN {material.costo_ref.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    PEN {stockValue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {material.proveedor_principal}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={stockStatus.color}>
                      {stockStatus.status}
                    </Badge>
                  </td>
                  {(onEdit || onDelete) && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(material)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar material"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(material)}
                            className="text-red-600 hover:text-red-900"
                            title="Desactivar material"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Summary */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            Mostrando {materials.length} material{materials.length !== 1 ? 'es' : ''}
          </span>
          <span>
            Valor total: PEN {materials.reduce((sum, m) => sum + (m.stock_actual * m.costo_ref), 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}