'use client';

import { useState } from 'react';
import { DocumentCategory } from '@/lib/types';
import { useApi } from '@/lib/hooks/useApi';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Loading } from '@/components/ui/Loading';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  SwatchIcon
} from '@heroicons/react/24/outline';

interface CategoryManagerProps {
  categories: DocumentCategory[];
  onSave: () => void;
  onCancel: () => void;
}

interface CategoryFormData {
  nombre: string;
  descripcion: string;
  color: string;
  icono: string;
}

export function CategoryManager({ categories, onSave, onCancel }: CategoryManagerProps) {
  const { post, put, del } = useApi();
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();
  
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    nombre: '',
    descripcion: '',
    color: 'blue',
    icono: '📁'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorOptions = [
    { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
    { value: 'green', label: 'Verde', class: 'bg-green-500' },
    { value: 'yellow', label: 'Amarillo', class: 'bg-yellow-500' },
    { value: 'red', label: 'Rojo', class: 'bg-red-500' },
    { value: 'purple', label: 'Morado', class: 'bg-purple-500' },
    { value: 'pink', label: 'Rosa', class: 'bg-pink-500' },
    { value: 'indigo', label: 'Índigo', class: 'bg-indigo-500' },
    { value: 'gray', label: 'Gris', class: 'bg-gray-500' }
  ];

  const iconOptions = [
    '📁', '📋', '📖', '📄', '📝', '🔧', '⚙️', '📊', 
    '📈', '📉', '🎯', '💡', '🔍', '📌', '🏷️', '📦'
  ];

  const handleNewCategory = () => {
    setEditingCategory(null);
    setFormData({
      nombre: '',
      descripcion: '',
      color: 'blue',
      icono: '📁'
    });
    setShowForm(true);
    setError(null);
  };

  const handleEditCategory = (category: DocumentCategory) => {
    setEditingCategory(category);
    setFormData({
      nombre: category.nombre,
      descripcion: category.descripcion || '',
      color: category.color,
      icono: category.icono || '📁'
    });
    setShowForm(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        ...formData,
        activo: true
      };

      let response;
      if (editingCategory) {
        response = await put('/crud', {
          table: 'CategoriaDocumentos',
          action: 'update',
          id: editingCategory.id,
          ...payload
        });
      } else {
        response = await post('/crud', {
          table: 'CategoriaDocumentos',
          action: 'create',
          ...payload
        });
      }

      if (response.ok) {
        setShowForm(false);
        setEditingCategory(null);
        onSave();
      } else {
        throw new Error(response.message || 'Error al guardar categoría');
      }
    } catch (err) {
      console.error('Error saving category:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (category: DocumentCategory) => {
    showConfirm({
      title: 'Eliminar Categoría',
      message: `¿Estás seguro de que deseas eliminar la categoría "${category.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          const response = await del('/crud', {
            table: 'CategoriaDocumentos',
            action: 'delete',
            id: category.id
          });

          if (response.ok) {
            onSave();
          } else {
            throw new Error(response.message || 'Error al eliminar categoría');
          }
        } catch (error) {
          console.error('Error deleting category:', error);
          alert('Error al eliminar la categoría');
        }
      }
    });
  };

  const activeCategories = categories.filter(cat => cat.activo);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Categorías de Documentos</h3>
          <p className="text-sm text-gray-500">
            Gestiona las categorías para organizar la documentación
          </p>
        </div>
        <button
          onClick={handleNewCategory}
          className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Nueva Categoría
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
        {activeCategories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <SwatchIcon className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-medium">No hay categorías</p>
            <p className="text-sm">Crea la primera categoría para organizar los documentos</p>
          </div>
        ) : (
          activeCategories.map((category) => (
            <div key={category.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full bg-${category.color}-500`} />
                <span className="text-lg">{category.icono}</span>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{category.nombre}</h4>
                  {category.descripcion && (
                    <p className="text-sm text-gray-500">{category.descripcion}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEditCategory(category)}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded"
                  title="Editar categoría"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="Eliminar categoría"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Category Form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
          </h4>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nombre de la categoría"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                      className={`w-8 h-8 rounded-full ${color.class} ${
                        formData.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descripción opcional de la categoría"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icono
              </label>
              <div className="flex flex-wrap gap-2">
                {iconOptions.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, icono: icon }))}
                    className={`w-10 h-10 text-lg border border-gray-300 rounded-md hover:bg-gray-50 ${
                      formData.icono === icon ? 'bg-blue-50 border-blue-500' : ''
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading && <Loading size="sm" className="mr-2" />}
                {editingCategory ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cerrar
        </button>
      </div>

      <ConfirmDialogComponent />
    </div>
  );
}