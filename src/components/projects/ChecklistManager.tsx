'use client';

import { useState, useEffect } from 'react';
import { Checklist, ChecklistItem } from '@/lib/types';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Loading } from '@/components/ui/Loading';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface ChecklistManagerProps {
  onSelect?: (checklist: Checklist) => void;
}

export function ChecklistManager({ onSelect }: ChecklistManagerProps) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadChecklists();
  }, []);

  const loadChecklists = async () => {
    setLoading(true);
    try {
      const response = await api.getChecklists();
      if (response.ok && response.data) {
        setChecklists(response.data);
      }
    } catch (error) {
      console.error('Error loading checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete('Checklists', id);
      loadChecklists();
    } catch (error) {
      console.error('Error deleting checklist:', error);
    }
    setDeleteConfirm(null);
  };

  const handleEdit = (checklist: Checklist) => {
    setEditingChecklist(checklist);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingChecklist(null);
  };

  const handleFormSuccess = () => {
    loadChecklists();
    handleFormClose();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Gestión de Checklists</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4" />
          Nuevo Checklist
        </button>
      </div>

      {/* Loading */}
      {loading && <Loading />}

      {/* Checklists List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {checklists.map((checklist) => (
          <ChecklistCard
            key={checklist.id}
            checklist={checklist}
            onEdit={() => handleEdit(checklist)}
            onDelete={() => setDeleteConfirm(checklist.id)}
            onSelect={onSelect ? () => onSelect(checklist) : undefined}
          />
        ))}
      </div>

      {/* Empty State */}
      {!loading && checklists.length === 0 && (
        <div className="text-center py-12">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay checklists</h3>
          <p className="mt-1 text-sm text-gray-500">
            Comienza creando tu primer checklist.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Nuevo Checklist
            </button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={handleFormClose}
        title={editingChecklist ? 'Editar Checklist' : 'Nuevo Checklist'}
        size="lg"
      >
        <ChecklistForm
          checklist={editingChecklist}
          onSuccess={handleFormSuccess}
          onCancel={handleFormClose}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Eliminar Checklist"
        message="¿Estás seguro de que quieres eliminar este checklist? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        type="danger"
      />
    </div>
  );
}

// Checklist Card Component
interface ChecklistCardProps {
  checklist: Checklist;
  onEdit: () => void;
  onDelete: () => void;
  onSelect?: () => void;
}

function ChecklistCard({ checklist, onEdit, onDelete, onSelect }: ChecklistCardProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    try {
      const parsedItems = JSON.parse(checklist.items_json);
      setItems(parsedItems);
    } catch (error) {
      console.error('Error parsing checklist items:', error);
      setItems([]);
    }
  }, [checklist.items_json]);

  const requiredItems = items.filter(item => item.requerido).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900">{checklist.nombre}</h3>
          {checklist.descripcion && (
            <p className="text-sm text-gray-600 mt-1">{checklist.descripcion}</p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Editar"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600"
            title="Eliminar"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
        <span>{items.length} elementos</span>
        {requiredItems > 0 && (
          <span className="flex items-center gap-1">
            <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />
            {requiredItems} requeridos
          </span>
        )}
      </div>

      {/* Preview Items */}
      <div className="space-y-2 mb-4">
        {items.slice(0, 3).map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 border border-gray-300 rounded"></div>
            <span className="text-gray-700 truncate">{item.texto}</span>
            {item.requerido && (
              <ExclamationTriangleIcon className="h-3 w-3 text-orange-500 flex-shrink-0" />
            )}
          </div>
        ))}
        {items.length > 3 && (
          <p className="text-xs text-gray-500">+{items.length - 3} elementos más</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onSelect && (
          <button
            onClick={onSelect}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Seleccionar
          </button>
        )}
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
        >
          Ver Detalles
        </button>
      </div>
    </div>
  );
}

// Checklist Form Component
interface ChecklistFormProps {
  checklist?: Checklist | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function ChecklistForm({ checklist, onSuccess, onCancel }: ChecklistFormProps) {
  const [formData, setFormData] = useState({
    nombre: checklist?.nombre || '',
    descripcion: checklist?.descripcion || '',
  });
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (checklist) {
      try {
        const parsedItems = JSON.parse(checklist.items_json);
        setItems(parsedItems);
      } catch (error) {
        console.error('Error parsing checklist items:', error);
        setItems([]);
      }
    }
  }, [checklist]);

  const addItem = () => {
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      texto: '',
      completado: false,
      requerido: false,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof ChecklistItem, value: string | boolean) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const newErrors: Record<string, string> = {};
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }
    if (items.length === 0) {
      newErrors.items = 'Debe agregar al menos un elemento';
    }
    if (items.some(item => !item.texto.trim())) {
      newErrors.items = 'Todos los elementos deben tener texto';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const checklistData = {
        ...formData,
        items_json: JSON.stringify(items),
      };

      if (checklist) {
        await api.updateChecklist(checklist.id, checklistData);
      } else {
        await api.createChecklist(checklistData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving checklist:', error);
      setErrors({ submit: 'Error al guardar el checklist' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{errors.submit}</p>
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre *
          </label>
          <input
            type="text"
            value={formData.nombre}
            onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.nombre ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Nombre del checklist"
          />
          {errors.nombre && (
            <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Descripción opcional del checklist"
          />
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Elementos del Checklist
          </label>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            Agregar
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={item.texto}
                onChange={(e) => updateItem(index, 'texto', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Texto del elemento"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.requerido}
                  onChange={(e) => updateItem(index, 'requerido', e.target.checked)}
                  className="rounded"
                />
                Requerido
              </label>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="p-1 text-red-600 hover:text-red-800"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {errors.items && (
          <p className="mt-1 text-sm text-red-600">{errors.items}</p>
        )}

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No hay elementos en el checklist</p>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              Agregar primer elemento
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : (checklist ? 'Actualizar' : 'Crear')}
        </button>
      </div>
    </form>
  );
}