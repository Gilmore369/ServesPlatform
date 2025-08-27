'use client';

import { useState } from 'react';
import { Project, BOM, Material } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import {
  CheckIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

interface PurchaseRequestGeneratorProps {
  project: Project;
  boms: BOM[];
  materials: Material[];
  onClose: () => void;
}

interface PurchaseRequestItem {
  bomId: string;
  materialId: string;
  material: Material;
  qtyRequired: number;
  unitCost: number;
  totalCost: number;
  supplier: string;
  leadTime: number;
  selected: boolean;
}

export function PurchaseRequestGenerator({
  project,
  boms,
  materials,
  onClose,
}: PurchaseRequestGeneratorProps) {
  const { user } = useAuth();
  
  // Prepare purchase request items
  const [items, setItems] = useState<PurchaseRequestItem[]>(() => {
    return boms.map(bom => {
      const material = materials.find(m => m.id === bom.material_id);
      if (!material) return null;

      return {
        bomId: bom.id,
        materialId: bom.material_id,
        material,
        qtyRequired: bom.qty_requerida,
        unitCost: bom.costo_unit_est,
        totalCost: bom.qty_requerida * bom.costo_unit_est,
        supplier: bom.proveedor_sugerido,
        leadTime: bom.lead_time_dias,
        selected: true,
      };
    }).filter(Boolean) as PurchaseRequestItem[];
  });

  const [requestData, setRequestData] = useState({
    observaciones: '',
    fechaSolicitud: new Date().toISOString().split('T')[0],
  });

  // Toggle item selection
  const toggleItemSelection = (bomId: string) => {
    setItems(prev => prev.map(item => 
      item.bomId === bomId 
        ? { ...item, selected: !item.selected }
        : item
    ));
  };

  // Select/deselect all items
  const toggleAllItems = () => {
    const allSelected = items.every(item => item.selected);
    setItems(prev => prev.map(item => ({ ...item, selected: !allSelected })));
  };

  // Calculate totals
  const selectedItems = items.filter(item => item.selected);
  const totalCost = selectedItems.reduce((sum, item) => sum + item.totalCost, 0);
  const totalItems = selectedItems.length;

  // Group items by supplier
  const itemsBySupplier = selectedItems.reduce((acc, item) => {
    const supplier = item.supplier || 'Sin proveedor';
    if (!acc[supplier]) {
      acc[supplier] = [];
    }
    acc[supplier].push(item);
    return acc;
  }, {} as Record<string, PurchaseRequestItem[]>);

  // Generate purchase request document
  const generatePurchaseRequest = () => {
    const requestNumber = `SOL-${project.codigo}-${Date.now().toString().slice(-6)}`;
    const currentDate = new Date().toLocaleDateString('es-PE');
    
    let content = `
SOLICITUD DE COMPRA
Número: ${requestNumber}
Fecha: ${currentDate}
Proyecto: ${project.codigo} - ${project.nombre}
Solicitante: ${user?.nombre || 'Usuario'}

MATERIALES SOLICITADOS:
`;

    Object.entries(itemsBySupplier).forEach(([supplier, supplierItems]) => {
      content += `\nProveedor: ${supplier}\n`;
      content += `${'='.repeat(50)}\n`;
      
      supplierItems.forEach((item, index) => {
        content += `${index + 1}. ${item.material.descripcion}\n`;
        content += `   SKU: ${item.material.sku}\n`;
        content += `   Cantidad: ${item.qtyRequired} ${item.material.unidad}\n`;
        content += `   Costo Unit.: ${project.moneda} ${item.unitCost.toLocaleString()}\n`;
        content += `   Total: ${project.moneda} ${item.totalCost.toLocaleString()}\n`;
        content += `   Lead Time: ${item.leadTime} días\n\n`;
      });
      
      const supplierTotal = supplierItems.reduce((sum, item) => sum + item.totalCost, 0);
      content += `Subtotal Proveedor: ${project.moneda} ${supplierTotal.toLocaleString()}\n\n`;
    });

    content += `
RESUMEN:
Total de Items: ${totalItems}
Costo Total: ${project.moneda} ${totalCost.toLocaleString()}

OBSERVACIONES:
${requestData.observaciones || 'Ninguna'}

APROBACIONES:
Solicitante: _________________ Fecha: _________
Supervisor: _________________ Fecha: _________
Gerencia: __________________ Fecha: _________
`;

    return content;
  };

  // Download as text file
  const downloadRequest = () => {
    const content = generatePurchaseRequest();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Solicitud_Compra_${project.codigo}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print request
  const printRequest = () => {
    const content = generatePurchaseRequest();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Solicitud de Compra - ${project.codigo}</title>
            <style>
              body { font-family: monospace; white-space: pre-wrap; margin: 20px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Generar Solicitud de Compra
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Proyecto: {project.codigo} - {project.nombre}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-blue-600">Items Seleccionados</div>
          <div className="text-2xl font-bold text-blue-900">{totalItems}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-green-600">Costo Total</div>
          <div className="text-2xl font-bold text-green-900">
            {project.moneda} {totalCost.toLocaleString()}
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-purple-600">Proveedores</div>
          <div className="text-2xl font-bold text-purple-900">
            {Object.keys(itemsBySupplier).length}
          </div>
        </div>
      </div>

      {/* Items Selection */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-md font-medium text-gray-900">
            Materiales a Solicitar
          </h4>
          <button
            onClick={toggleAllItems}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {items.every(item => item.selected) ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <input
                      type="checkbox"
                      checked={items.every(item => item.selected)}
                      onChange={toggleAllItems}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Material
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Costo Unit.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Proveedor
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.bomId} className={item.selected ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItemSelection(item.bomId)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {item.material.descripcion}
                      </div>
                      <div className="text-sm text-gray-500">
                        SKU: {item.material.sku}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.qtyRequired} {item.material.unidad}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {project.moneda} {item.unitCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {project.moneda} {item.totalCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.supplier || 'Sin proveedor'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Observations */}
      <div>
        <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
          Observaciones
        </label>
        <textarea
          id="observaciones"
          name="observaciones"
          rows={3}
          value={requestData.observaciones}
          onChange={(e) => setRequestData(prev => ({ ...prev, observaciones: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Observaciones adicionales para la solicitud de compra..."
        />
      </div>

      {/* Preview by Supplier */}
      {selectedItems.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">
            Vista Previa por Proveedor
          </h4>
          
          {Object.entries(itemsBySupplier).map(([supplier, supplierItems]) => {
            const supplierTotal = supplierItems.reduce((sum, item) => sum + item.totalCost, 0);
            
            return (
              <div key={supplier} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium text-gray-900">{supplier}</h5>
                  <span className="text-sm font-medium text-gray-600">
                    {project.moneda} {supplierTotal.toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {supplierItems.length} item(s) - Lead time promedio: {' '}
                  {Math.round(supplierItems.reduce((sum, item) => sum + item.leadTime, 0) / supplierItems.length)} días
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
        
        <div className="flex gap-2">
          <button
            onClick={printRequest}
            disabled={selectedItems.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PrinterIcon className="h-4 w-4" />
            Imprimir
          </button>
          
          <button
            onClick={downloadRequest}
            disabled={selectedItems.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            Descargar Solicitud
          </button>
        </div>
      </div>
    </div>
  );
}