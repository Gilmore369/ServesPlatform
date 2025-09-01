/**
 * Enhanced Material Form with Real-time Validation
 * Demonstrates the new validation system integration
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Material } from '@/lib/types';
import { useEnhancedMutations } from '@/hooks/useEnhancedAPI';
import { validateRecord } from '@/lib/validation';
import { ValidationResult } from '@/lib/validation/types';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/button';
import { ValidatedInput, ValidationFeedback } from '../ui/ValidationFeedback';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { logger } from '@/lib/logger';

interface EnhancedMaterialFormProps {
  material?: Material | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (material: Material) => void;
}

export function EnhancedMaterialForm({
  material,
  isOpen,
  onClose,
  onSuccess
}: EnhancedMaterialFormProps) {
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

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);

  const {
    create,
    update,
    isCreating,
    isUpdating,
    isMutating
  } = useEnhancedMutations<Material>('Materiales');

  // Real-time validation
  const validateForm = useCallback(async (data: Partial<Material>) => {
    setIsValidating(true);
    try {
      const result = await validateRecord('Materiales', data, material ? 'update' : 'create');
      setValidationResult(result);
      setHasValidated(true);
      return result;
    } catch (error) {
      logger.error('Form validation error', error);
      setValidationResult({
        isValid: false,
        errors: [{
          field: 'general',
          message: 'Error de validación del formulario',
          type: 'validation'
        }]
      });
      return null;
    } finally {
      setIsValidating(false);
    }
  }, [material]);

  // Handle field changes with validation
  const handleFieldChange = useCallback((field: keyof Material, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Trigger validation after a short delay
    setTimeout(() => {
      validateForm(newFormData);
    }, 300);
  }, [formData, validateForm]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation before submission
    const finalValidation = await validateForm(formData);
    if (!finalValidation?.isValid) {
      logger.warn('Form submission blocked by validation', {
        errors: finalValidation?.errors
      });
      return;
    }

    try {
      let result: Material | null = null;
      
      if (material) {
        result = await update(material.id, formData);
      } else {
        result = await create(formData);
      }

      if (result) {
        logger.info(`Material ${material ? 'updated' : 'created'} successfully`, {
          id: result.id,
          sku: result.sku
        });
        
        if (onSuccess) {
          onSuccess(result);
        }
        onClose();
      }
    } catch (error) {
      logger.error(`Failed to ${material ? 'update' : 'create'} material`, error);
      // Error handling would show a toast notification here
    }
  };

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
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
      setValidationResult(null);
      setHasValidated(false);
    }
  }, [isOpen, material]);

  const isFormValid = validationResult?.isValid ?? false;
  const canSubmit = hasValidated && isFormValid && !isMutating && !isValidating;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={material ? 'Editar Material' : 'Nuevo Material'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <ModalBody>
          {/* Validation Summary */}
          {hasValidated && (
            <div className="mb-6">
              {isFormValid ? (
                <Card className="p-3 bg-green-50 border-green-200">
                  <div className="flex items-center gap-2">
                    <Badge variant="success" size="sm">✓ Válido</Badge>
                    <span className="text-sm text-green-700">
                      Todos los campos son válidos
                    </span>
                  </div>
                </Card>
              ) : (
                <ValidationFeedback
                  validationResult={validationResult}
                  showWarnings={true}
                />
              )}
            </div>
          )}

          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Información Básica
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ValidatedInput
                  tableName="Materiales"
                  fieldName="sku"
                  label="SKU"
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleFieldChange('sku', e.target.value)}
                  fullRecord={formData}
                  required
                  disabled={isMutating}
                  placeholder="Ej: MAT-001"
                />
                
                <ValidatedInput
                  tableName="Materiales"
                  fieldName="categoria"
                  label="Categoría"
                  type="text"
                  value={formData.categoria}
                  onChange={(e) => handleFieldChange('categoria', e.target.value)}
                  fullRecord={formData}
                  required
                  disabled={isMutating}
                  placeholder="Ej: Herramientas"
                />
              </div>

              <div className="mt-4">
                <ValidatedInput
                  tableName="Materiales"
                  fieldName="descripcion"
                  label="Descripción"
                  type="text"
                  value={formData.descripcion}
                  onChange={(e) => handleFieldChange('descripcion', e.target.value)}
                  fullRecord={formData}
                  required
                  disabled={isMutating}
                  placeholder="Descripción detallada del material"
                />
              </div>
            </div>

            {/* Stock and Pricing */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Stock y Precios
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ValidatedInput
                  tableName="Materiales"
                  fieldName="unidad"
                  label="Unidad"
                  type="text"
                  value={formData.unidad}
                  onChange={(e) => handleFieldChange('unidad', e.target.value)}
                  fullRecord={formData}
                  required
                  disabled={isMutating}
                  placeholder="Ej: pza, kg, m"
                />
                
                <ValidatedInput
                  tableName="Materiales"
                  fieldName="stock_actual"
                  label="Stock Actual"
                  type="number"
                  value={formData.stock_actual}
                  onChange={(e) => handleFieldChange('stock_actual', Number(e.target.value))}
                  fullRecord={formData}
                  min="0"
                  step="0.01"
                  disabled={isMutating}
                />
                
                <ValidatedInput
                  tableName="Materiales"
                  fieldName="stock_minimo"
                  label="Stock Mínimo"
                  type="number"
                  value={formData.stock_minimo}
                  onChange={(e) => handleFieldChange('stock_minimo', Number(e.target.value))}
                  fullRecord={formData}
                  min="0"
                  step="0.01"
                  disabled={isMutating}
                />
              </div>

              <div className="mt-4">
                <ValidatedInput
                  tableName="Materiales"
                  fieldName="costo_ref"
                  label="Costo de Referencia (S/)"
                  type="number"
                  value={formData.costo_ref}
                  onChange={(e) => handleFieldChange('costo_ref', Number(e.target.value))}
                  fullRecord={formData}
                  min="0"
                  step="0.01"
                  disabled={isMutating}
                />
              </div>
            </div>

            {/* Supplier and Location */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Proveedor y Ubicación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ValidatedInput
                  tableName="Materiales"
                  fieldName="proveedor_principal"
                  label="Proveedor Principal"
                  type="text"
                  value={formData.proveedor_principal}
                  onChange={(e) => handleFieldChange('proveedor_principal', e.target.value)}
                  fullRecord={formData}
                  disabled={isMutating}
                  placeholder="Nombre del proveedor"
                />
                
                <ValidatedInput
                  tableName="Materiales"
                  fieldName="ubicacion_almacen"
                  label="Ubicación en Almacén"
                  type="text"
                  value={formData.ubicacion_almacen}
                  onChange={(e) => handleFieldChange('ubicacion_almacen', e.target.value)}
                  fullRecord={formData}
                  disabled={isMutating}
                  placeholder="Ej: A-1-3"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Estado
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => handleFieldChange('activo', e.target.checked)}
                  disabled={isMutating}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="activo" className="text-sm font-medium text-gray-700">
                  Material activo
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Los materiales inactivos no aparecerán en las listas de selección
              </p>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {isValidating && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Validando...
                </div>
              )}
              
              {hasValidated && !isValidating && (
                <Badge variant={isFormValid ? 'success' : 'destructive'} size="sm">
                  {isFormValid ? 'Válido' : 'Errores encontrados'}
                </Badge>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isMutating}
              >
                Cancelar
              </Button>
              
              <Button
                type="submit"
                disabled={!canSubmit}
                className={!canSubmit ? 'opacity-50 cursor-not-allowed' : ''}
              >
                {isMutating ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {material ? 'Actualizando...' : 'Creando...'}
                  </div>
                ) : (
                  material ? 'Actualizar Material' : 'Crear Material'
                )}
              </Button>
            </div>
          </div>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default EnhancedMaterialForm;