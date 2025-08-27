'use client';

import { useState, useEffect } from 'react';
import { Document, DocumentCategory } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/hooks/useApi';
import { Loading } from '@/components/ui/Loading';
import {
  EyeIcon,
  CodeBracketIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface DocumentFormProps {
  document?: Document | null;
  categories: DocumentCategory[];
  onSave: () => void;
  onCancel: () => void;
}

export function DocumentForm({ document, categories, onSave, onCancel }: DocumentFormProps) {
  const { user } = useAuth();
  const { post, put } = useApi();
  
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'SOP' as const,
    categoria: '',
    contenido_markdown: '',
    tags: [] as string[],
    version: '1.0',
    estado: 'Borrador' as const
  });
  
  const [tagInput, setTagInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const documentTypes = [
    { value: 'SOP', label: 'SOP (Procedimiento Operativo)' },
    { value: 'Manual', label: 'Manual' },
    { value: 'Procedimiento', label: 'Procedimiento' },
    { value: 'Política', label: 'Política' },
    { value: 'Otro', label: 'Otro' }
  ];

  const documentStates = [
    { value: 'Borrador', label: 'Borrador' },
    { value: 'Revisión', label: 'En Revisión' },
    { value: 'Aprobado', label: 'Aprobado' },
    { value: 'Obsoleto', label: 'Obsoleto' }
  ];

  useEffect(() => {
    if (document) {
      setFormData({
        titulo: document.titulo,
        tipo: document.tipo,
        categoria: document.categoria,
        contenido_markdown: document.contenido_markdown,
        tags: document.tags || [],
        version: document.version,
        estado: document.estado
      });
    }
  }, [document]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim()) {
      setError('El título es requerido');
      return;
    }
    
    if (!formData.contenido_markdown.trim()) {
      setError('El contenido es requerido');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        ...formData,
        autor_id: user?.id,
        activo: true
      };

      let response;
      if (document) {
        response = await put('/crud', {
          table: 'Documentos',
          action: 'update',
          id: document.id,
          ...payload
        });
      } else {
        response = await post('/crud', {
          table: 'Documentos',
          action: 'create',
          ...payload
        });
      }

      if (response.ok) {
        onSave();
      } else {
        throw new Error(response.message || 'Error al guardar documento');
      }
    } catch (err) {
      console.error('Error saving document:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar documento');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Simple markdown to HTML converter for preview
  const renderMarkdown = (markdown: string) => {
    return markdown
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-gray-900 mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-4">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded-md overflow-x-auto my-3"><code class="text-sm">$1</code></pre>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">$1</code>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank">$1</a>')
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/\n/g, '<br>');
  };

  const activeCategories = categories.filter(cat => cat.activo);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Título *
          </label>
          <input
            type="text"
            value={formData.titulo}
            onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Título del documento"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo
          </label>
          <select
            value={formData.tipo}
            onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as Document['tipo'] }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {documentTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoría
          </label>
          <select
            value={formData.categoria}
            onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Seleccionar categoría</option>
            {activeCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Versión
          </label>
          <input
            type="text"
            value={formData.version}
            onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="1.0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado
          </label>
          <select
            value={formData.estado}
            onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value as Document['estado'] }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {documentStates.map(state => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Agregar tag y presionar Enter"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Contenido (Markdown) *
          </label>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {showPreview ? (
                <>
                  <CodeBracketIcon className="h-3 w-3 mr-1" />
                  Editor
                </>
              ) : (
                <>
                  <EyeIcon className="h-3 w-3 mr-1" />
                  Vista previa
                </>
              )}
            </button>
          </div>
        </div>

        {showPreview ? (
          <div className="border border-gray-300 rounded-md p-4 min-h-96 bg-gray-50">
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(formData.contenido_markdown) || '<p class="text-gray-500 italic">Sin contenido para mostrar</p>'
              }}
            />
          </div>
        ) : (
          <textarea
            value={formData.contenido_markdown}
            onChange={(e) => setFormData(prev => ({ ...prev, contenido_markdown: e.target.value }))}
            rows={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            placeholder="Escribe el contenido en formato Markdown..."
            required
          />
        )}

        <div className="mt-2 text-xs text-gray-500 flex items-start">
          <InformationCircleIcon className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
          <span>
            Puedes usar Markdown para formatear el texto: **negrita**, *cursiva*, `código`, 
            # Títulos, - listas, [enlaces](url), etc.
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
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
          {document ? 'Actualizar' : 'Crear'} Documento
        </button>
      </div>
    </form>
  );
}