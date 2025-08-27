'use client';

import { useState, useEffect } from 'react';
import { Project, Activity, Material, BOM } from '@/lib/types';

interface BOMFormProps {
  bom?: BOM | null;
  project: Project;
  activities: Activity[];
  materials: Material[];
  onSave: (bomData: Partial<BOM>) => void;
  onCancel: () => void;
}

export function BOMForm({
  bom,
  project,
  activities,
  materials,
  onSave,
  onCancel,
}: BOMFormProps) {
  const [formData, setFormData] = useState({
    actividad_id: bom?.actividad_id || '',
    material_id: bom?.material_id || '',
    qty_requerida: bom?.qty_requerida || 0,
    qty_asignada: bom?.qty_asignada || 0,
    proveedor_sugerido: bom?.proveedor_sugerido || '',
    costo_unit_est: bom?.costo_unit_est || 0,
    lead_time_dias: bom?.lead_time_dias || 0,
    estado_abastecimiento: bom?.estado_abastecimiento || 'Por pedir' as const,
    fecha_requerida: bom?.fecha_requerida 
      ? new Date(bom.fecha_requerida).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // Update selected material when material_id changes
  useEffect(() => {
    if (formData.material_id) {
      const material = materials.find(m => m.id === formData.material_id);
      setSelectedMaterial(material || null);
      
      // Auto-fill cost and supplier if not editing
      if (material && !bom) {
        setFormData(prev => ({
          ...prev,
          costo_unit_est: material.costo_ref,
          proveedor_sugerido: material.proveedor_principal,
        }));
      }
    } else {
      setSelectedMaterial(null);
    }
  }, [formData.material_id, materials, bom]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('qty') || name.includes('costo') || name.includes('lead_time')
        ? parseFloat(value) || 0
        : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.actividad_id) {
      newErrors.actividad_id = 'Seleccione una actividad';
    }

    if (!formData.material_id) {
      newErrors.material_id = 'Seleccione un material';
    }

    if (formData.qty_requerida <= 0) {
      newErrors.qty_requerida = 'La cantidad requerida debe ser mayor a 0';
    }

    if (formData.qty_asignada < 0) {
      newErrors.qty_asignada = 'La cantidad asignada no puede ser negativa';
    }

    if (formData.costo_unit_est <= 0) {
      newErrors.costo_unit_est = 'El costo unitario debe ser mayor a 0';
    }

    if (formData.lead_time_dias < 0) {
      newErrors.lead_time_dias = 'El lead time no puede ser negativo';
    }

    if (!formData.fecha_requerida) {
      newErrors.fecha_requerida = 'Seleccione una fecha requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const bomData: Partial<BOM> = {
      ...formData,
      fecha_requerida: new Date(formData.fecha_requerida),
    };

    onSave(bomData);
  };

  const estadoOptions = [
    'Por pedir',
    'Pedido',
    'En tránsito',
    'Recibido',
    'Entregado',
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Activity Selection */}
      <div>
        <label htmlFor="actividad_id" className="block text-sm font-medium text-gray-700 mb-1">
          Actividad *
        </label>
        <select
          id="actividad_id"
          name="actividad_id"
          value={formData.actividad_id}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.actividad_id ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <option value="">Seleccionar actividad...</option>
          {activities.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.codigo} - {activity.titulo}
            </option>
          ))}
        </select>
        {errors.actividad_id && (
          <p className="mt-1 text-sm text-red-600">{errors.actividad_id}</p>
        )}
      </div>

      {/* Material Selection */}
      <div>
        <label htmlFor="material_id" className="block text-sm font-medium text-gray-700 mb-1">
          Material *
        </label>
        <select
          id="material_id"
          name="material_id"
          value={formData.material_id}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.material_id ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <option value="">Seleccionar material...</option>
          {materials.filter(m => m.activo).map((material) => (
            <option key={material.id} value={material.id}>
              {material.sku} - {material.descripcion}
            </option>
          ))}
        </select>
        {errors.material_id && (
          <p className="mt-1 text-sm text-red-600">{errors.material_id}</p>
        )}
        
        {/* Material Info */}
        {selectedMaterial && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Categoría:</span> {selectedMaterial.categoria}
              </div>
              <div>
                <span className="font-medium">Unidad:</span> {selectedMaterial.unidad}
              </div>
              <div>
                <span className="font-medium">Stock Actual:</span> {selectedMaterial.stock_actual}
              </div>
              <div>
                <span className="font-medium">Costo Ref:</span> {project.moneda} {selectedMaterial.costo_ref}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quantities */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="qty_requerida" className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad Requerida *
          </label>
          <input
            type="number"
            id="qty_requerida"
            name="qty_requerida"
            value={formData.qty_requerida}
            onChange={handleInputChange}
            min="0"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.qty_requerida ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.qty_requerida && (
            <p className="mt-1 text-sm text-red-600">{errors.qty_requerida}</p>
          )}
        </div>

        <div>
          <label htmlFor="qty_asignada" className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad Asignada
          </label>
          <input
            type="number"
            id="qty_asignada"
            name="qty_asignada"
            value={formData.qty_asignada}
            onChange={handleInputChange}
            min="0"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.qty_asignada ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.qty_asignada && (
            <p className="mt-1 text-sm text-red-600">{errors.qty_asignada}</p>
          )}
        </div>
      </div>

      {/* Cost and Lead Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="costo_unit_est" className="block text-sm font-medium text-gray-700 mb-1">
            Costo Unitario Estimado *
          </label>
          <input
            type="number"
            id="costo_unit_est"
            name="costo_unit_est"
            value={formData.costo_unit_est}
            onChange={handleInputChange}
            min="0"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.costo_unit_est ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.costo_unit_est && (
            <p className="mt-1 text-sm text-red-600">{errors.costo_unit_est}</p>
          )}
        </div>

        <div>
          <label htmlFor="lead_time_dias" className="block text-sm font-medium text-gray-700 mb-1">
            Lead Time (días)
          </label>
          <input
            type="number"
            id="lead_time_dias"
            name="lead_time_dias"
            value={formData.lead_time_dias}
            onChange={handleInputChange}
            min="0"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.lead_time_dias ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.lead_time_dias && (
            <p className="mt-1 text-sm text-red-600">{errors.lead_time_dias}</p>
          )}
        </div>
      </div>

      {/* Supplier and Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="proveedor_sugerido" className="block text-sm font-medium text-gray-700 mb-1">
            Proveedor Sugerido
          </label>
          <input
            type="text"
            id="proveedor_sugerido"
            name="proveedor_sugerido"
            value={formData.proveedor_sugerido}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="estado_abastecimiento" className="block text-sm font-medium text-gray-700 mb-1">
            Estado de Abastecimiento
          </label>
          <select
            id="estado_abastecimiento"
            name="estado_abastecimiento"
            value={formData.estado_abastecimiento}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {estadoOptions.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Required Date */}
      <div>
        <label htmlFor="fecha_requerida" className="block text-sm font-medium text-gray-700 mb-1">
          Fecha Requerida *
        </label>
        <input
          type="date"
          id="fecha_requerida"
          name="fecha_requerida"
          value={formData.fecha_requerida}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.fecha_requerida ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors.fecha_requerida && (
          <p className="mt-1 text-sm text-red-600">{errors.fecha_requerida}</p>
        )}
      </div>

      {/* Total Cost Display */}
      {formData.qty_requerida > 0 && formData.costo_unit_est > 0 && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium text-blue-900">
            Costo Total Estimado: {project.moneda} {(formData.qty_requerida * formData.costo_unit_est).toLocaleString()}
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {bom ? 'Actualizar' : 'Agregar'} Material
        </button>
      </div>
    </form>
  );
}