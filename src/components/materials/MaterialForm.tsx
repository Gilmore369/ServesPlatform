'use client';

import { useState, useEffect } from 'react';
import { Material } from '@/lib/types';

interface MaterialFormProps {
  material?: Material | null;
  onSave: (materialData: Partial<Material>) => void;
  onCancel: () => void;
}

export function MaterialForm({ material, onSave, onCancel }: MaterialFormProps) {
  const [formData, setFormData] = useState({
    sku: '',
    descripcion: '',
    categoria: '',
    unidad: '',
    costo_ref: 0,
    stock_actual: 0,
    stock_minimo: 0,
    proveedor_principal: '',
    ubicacion_almacen: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Common categories for materials
  const commonCategories = [
    'Eléctrico',
    'Civil',
    'CCTV',
    'Herramientas',
    'Consumibles',
    'Seguridad',
    'Comunicaciones',
    'Mantenimiento',
    'Otros',
  ];

  // Common units
  const commonUnits = [
    'Unidad',
    'Metro',
    'Kilogramo',
    'Litro',
    'Caja',
    'Rollo',
    'Paquete',
    'Galón',
    'Pieza',
    'Par',
  ];

  // Initialize form data
  useEffect(() => {
    if (material) {
      setFormData({
        sku: material.sku,
        descripcion: material.descripcion,
        categoria: material.categoria,
        unidad: material.unidad,
        costo_ref: material.costo_ref,
        stock_actual: material.stock_actual,
        stock_minimo: material.stock_minimo,
        proveedor_principal: material.proveedor_principal,
        ubicacion_almacen: material.ubicacion_almacen,
      });
    }
  }, [material]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric fields
    if (['costo_ref', 'stock_actual', 'stock_minimo'].includes(name)) {
      const numericValue = parseFloat(value) || 0;
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.sku.trim()) {
      newErrors.sku = 'El SKU es requerido';
    }

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es requerida';
    }

    if (!formData.categoria.trim()) {
      newErrors.categoria = 'La categoría es requerida';
    }

    if (!formData.unidad.trim()) {
      newErrors.unidad = 'La unidad es requerida';
    }

    if (formData.costo_ref <= 0) {
      newErrors.costo_ref = 'El costo de referencia debe ser mayor a 0';
    }

    if (formData.stock_actual < 0) {
      newErrors.stock_actual = 'El stock actual no puede ser negativo';
    }

    if (formData.stock_minimo < 0) {
      newErrors.stock_minimo = 'El stock mínimo no puede ser negativo';
    }

    if (!formData.proveedor_principal.trim()) {
      newErrors.proveedor_principal = 'El proveedor principal es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        activo: true, // New materials are active by default
      });
    } catch (error) {
      console.error('Error saving material:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SKU */}
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
            SKU *
          </label>
          <input
            type="text"
            id="sku"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.sku ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Ej: ELE-001"
          />
          {errors.sku && <p className="mt-1 text-sm text-red-600">{errors.sku}</p>}
        </div>

        {/* Categoría */}
        <div>
          <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-1">
            Categoría *
          </label>
          <select
            id="categoria"
            name="categoria"
            value={formData.categoria}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.categoria ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Seleccionar categoría</option>
            {commonCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          {errors.categoria && <p className="mt-1 text-sm text-red-600">{errors.categoria}</p>}
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
          Descripción *
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.descripcion ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Descripción detallada del material"
        />
        {errors.descripcion && <p className="mt-1 text-sm text-red-600">{errors.descripcion}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Unidad */}
        <div>
          <label htmlFor="unidad" className="block text-sm font-medium text-gray-700 mb-1">
            Unidad de Medida *
          </label>
          <select
            id="unidad"
            name="unidad"
            value={formData.unidad}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.unidad ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Seleccionar unidad</option>
            {commonUnits.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
          {errors.unidad && <p className="mt-1 text-sm text-red-600">{errors.unidad}</p>}
        </div>

        {/* Costo de Referencia */}
        <div>
          <label htmlFor="costo_ref" className="block text-sm font-medium text-gray-700 mb-1">
            Costo de Referencia (PEN) *
          </label>
          <input
            type="number"
            id="costo_ref"
            name="costo_ref"
            value={formData.costo_ref}
            onChange={handleChange}
            min="0"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.costo_ref ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0.00"
          />
          {errors.costo_ref && <p className="mt-1 text-sm text-red-600">{errors.costo_ref}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stock Actual */}
        <div>
          <label htmlFor="stock_actual" className="block text-sm font-medium text-gray-700 mb-1">
            Stock Actual
          </label>
          <input
            type="number"
            id="stock_actual"
            name="stock_actual"
            value={formData.stock_actual}
            onChange={handleChange}
            min="0"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.stock_actual ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
          />
          {errors.stock_actual && <p className="mt-1 text-sm text-red-600">{errors.stock_actual}</p>}
        </div>

        {/* Stock Mínimo */}
        <div>
          <label htmlFor="stock_minimo" className="block text-sm font-medium text-gray-700 mb-1">
            Stock Mínimo
          </label>
          <input
            type="number"
            id="stock_minimo"
            name="stock_minimo"
            value={formData.stock_minimo}
            onChange={handleChange}
            min="0"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.stock_minimo ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
          />
          {errors.stock_minimo && <p className="mt-1 text-sm text-red-600">{errors.stock_minimo}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Proveedor Principal */}
        <div>
          <label htmlFor="proveedor_principal" className="block text-sm font-medium text-gray-700 mb-1">
            Proveedor Principal *
          </label>
          <input
            type="text"
            id="proveedor_principal"
            name="proveedor_principal"
            value={formData.proveedor_principal}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.proveedor_principal ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Nombre del proveedor"
          />
          {errors.proveedor_principal && <p className="mt-1 text-sm text-red-600">{errors.proveedor_principal}</p>}
        </div>

        {/* Ubicación en Almacén */}
        <div>
          <label htmlFor="ubicacion_almacen" className="block text-sm font-medium text-gray-700 mb-1">
            Ubicación en Almacén
          </label>
          <input
            type="text"
            id="ubicacion_almacen"
            name="ubicacion_almacen"
            value={formData.ubicacion_almacen}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Estante A-1, Zona B"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : (material ? 'Actualizar' : 'Crear')}
        </button>
      </div>
    </form>
  );
}