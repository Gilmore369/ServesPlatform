'use client';

import { Material } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface StockAlertsProps {
  materials: Material[];
}

export function StockAlerts({ materials }: StockAlertsProps) {
  // Filter materials with stock issues
  const outOfStockMaterials = materials.filter(m => m.stock_actual === 0);
  const lowStockMaterials = materials.filter(m => 
    m.stock_actual <= m.stock_minimo && m.stock_actual > 0
  );

  if (outOfStockMaterials.length === 0 && lowStockMaterials.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-red-50 border-b border-red-200 px-6 py-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
          <h3 className="text-lg font-medium text-red-900">
            Alertas de Inventario
          </h3>
        </div>
        <p className="text-sm text-red-700 mt-1">
          Materiales que requieren atención inmediata
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {/* Out of Stock Materials */}
        {outOfStockMaterials.length > 0 && (
          <div className="p-6">
            <div className="flex items-center mb-4">
              <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
              <h4 className="text-md font-medium text-red-900">
                Sin Stock ({outOfStockMaterials.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {outOfStockMaterials.map((material) => (
                <div
                  key={material.id}
                  className="bg-red-50 border border-red-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-medium text-red-900 truncate">
                        {material.descripcion}
                      </h5>
                      <p className="text-xs text-red-700">
                        SKU: {material.sku}
                      </p>
                    </div>
                    <Badge className="bg-red-100 text-red-800 ml-2">
                      {material.categoria}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs text-red-700">
                    <span>Stock: 0 {material.unidad}</span>
                    <span>Mín: {material.stock_minimo}</span>
                  </div>
                  <div className="mt-2 text-xs text-red-600">
                    Proveedor: {material.proveedor_principal}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low Stock Materials */}
        {lowStockMaterials.length > 0 && (
          <div className="p-6">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <h4 className="text-md font-medium text-yellow-900">
                Stock Bajo ({lowStockMaterials.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockMaterials.map((material) => (
                <div
                  key={material.id}
                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-medium text-yellow-900 truncate">
                        {material.descripcion}
                      </h5>
                      <p className="text-xs text-yellow-700">
                        SKU: {material.sku}
                      </p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800 ml-2">
                      {material.categoria}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs text-yellow-700">
                    <span>Stock: {material.stock_actual} {material.unidad}</span>
                    <span>Mín: {material.stock_minimo}</span>
                  </div>
                  <div className="mt-2 text-xs text-yellow-600">
                    Proveedor: {material.proveedor_principal}
                  </div>
                  
                  {/* Stock Level Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-yellow-700 mb-1">
                      <span>Nivel de Stock</span>
                      <span>{Math.round((material.stock_actual / material.stock_minimo) * 100)}%</span>
                    </div>
                    <div className="w-full bg-yellow-200 rounded-full h-2">
                      <div
                        className="bg-yellow-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((material.stock_actual / material.stock_minimo) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <span className="font-medium">
              {outOfStockMaterials.length + lowStockMaterials.length}
            </span>
            {' '}material{outOfStockMaterials.length + lowStockMaterials.length !== 1 ? 'es' : ''} requieren atención
          </div>
          <div className="flex gap-2">
            <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
              Generar Reporte de Faltantes
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}