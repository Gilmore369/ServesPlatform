'use client';

import { useState, useEffect } from 'react';
import { ProjectDocument } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/hooks/useApi';
import { Modal } from '@/components/ui/Modal';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Loading } from '@/components/ui/Loading';
import { Badge } from '@/components/ui/badge';
import {
  DocumentIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  LinkIcon,
  CalendarIcon,
  FolderIcon
} from '@heroicons/react/24/outline';

interface ProjectDocumentsProps {
  projectId: string;
}

interface DocumentFormData {
  titulo: string;
  descripcion: string;
  tipo: string;
  url: string;
  fecha_documento: string;
}

export function ProjectDocuments({ projectId }: ProjectDocumentsProps) {
  const { user } = useAuth();
  const { get, post, put, del } = useApi();
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();
  
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState<ProjectDocument | null>(null);
  const [formData, setFormData] = useState<DocumentFormData>({
    titulo: '',
    descripcion: '',
    tipo: 'Documento',
    url: '',
    fecha_documento: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const documentTypes = [
    { value: 'Contrato', label: 'Contrato', icon: '📄', variant: 'info' },
    { value: 'Plano', label: 'Plano', icon: '📐', variant: 'success' },
    { value: 'Especificación', label: 'Especificación', icon: '📋', variant: 'secondary' },
    { value: 'Certificado', label: 'Certificado', icon: '🏆', variant: 'warning' },
    { value: 'Foto', label: 'Foto', icon: '📷', variant: 'info' },
    { value: 'Reporte', label: 'Reporte', icon: '📊', variant: 'secondary' },
    { value: 'Otro', label: 'Otro', icon: '📎', variant: 'default' }
  ];

  useEffect(() => {
    loadDocuments();
  }, [projectId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await get('/crud', {
        table: 'DocumentosProyecto',
        action: 'list',
        proyecto_id: projectId
      });

      if (response.ok) {
        setDocuments(response.data || []);
      } else {
        throw new Error(response.message || 'Error al cargar documentos');
      }
    } catch (err) {
      console.error('Error loading project documents:', err);
      setError('Error al cargar los documentos del proyecto');
    } finally {
      setLoading(false);
    }
  };

  const handleNewDocument = () => {
    setEditingDocument(null);
    setFormData({
      titulo: '',
      descripcion: '',
      tipo: 'Documento',
      url: '',
      fecha_documento: ''
    });
    setShowForm(true);
    setError(null);
  };

  const handleEditDocument = (document: ProjectDocument) => {
    setEditingDocument(document);
    setFormData({
      titulo: document.titulo,
      descripcion: document.descripcion || '',
      tipo: document.tipo,
      url: document.url,
      fecha_documento: document.fecha_documento 
        ? new Date(document.fecha_documento).toISOString().split('T')[0]
        : ''
    });
    setShowForm(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim()) {
      setError('El título es requerido');
      return;
    }
    
    if (!formData.url.trim()) {
      setError('La URL es requerida');
      return;
    }

    // Basic URL validation
    try {
      new URL(formData.url);
    } catch {
      setError('La URL no es válida');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        ...formData,
        proyecto_id: projectId,
        usuario_id: user?.id,
        activo: true,
        fecha_documento: formData.fecha_documento || null
      };

      let response;
      if (editingDocument) {
        response = await put('/crud', {
          table: 'DocumentosProyecto',
          action: 'update',
          id: editingDocument.id,
          ...payload
        });
      } else {
        response = await post('/crud', {
          table: 'DocumentosProyecto',
          action: 'create',
          ...payload
        });
      }

      if (response.ok) {
        setShowForm(false);
        setEditingDocument(null);
        loadDocuments();
      } else {
        throw new Error(response.message || 'Error al guardar documento');
      }
    } catch (err) {
      console.error('Error saving document:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar documento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (document: ProjectDocument) => {
    showConfirm({
      title: 'Eliminar Documento',
      message: `¿Estás seguro de que deseas eliminar el documento "${document.titulo}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          const response = await del('/crud', {
            table: 'DocumentosProyecto',
            action: 'delete',
            id: document.id
          });

          if (response.ok) {
            loadDocuments();
          } else {
            throw new Error(response.message || 'Error al eliminar documento');
          }
        } catch (error) {
          console.error('Error deleting document:', error);
          alert('Error al eliminar el documento');
        }
      }
    });
  };

  const getTypeInfo = (tipo: string) => {
    return documentTypes.find(t => t.value === tipo) || documentTypes[documentTypes.length - 1];
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const openDocument = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FolderIcon className="h-5 w-5 mr-2" />
            Documentos del Proyecto ({documents.length})
          </h3>
          <p className="text-sm text-gray-500">
            Enlaces a documentos almacenados en Drive, SharePoint u otros sistemas
          </p>
        </div>
        <button
          onClick={handleNewDocument}
          className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Agregar Documento
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <DocumentIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay documentos</h3>
          <p className="text-gray-500 mb-4">
            Agrega enlaces a documentos relacionados con este proyecto
          </p>
          <button
            onClick={handleNewDocument}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Agregar Primer Documento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((document) => {
            const typeInfo = getTypeInfo(document.tipo);
            return (
              <div
                key={document.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{typeInfo.icon}</span>
                    <Badge variant={typeInfo.variant as 'success' | 'warning' | 'info' | 'danger' | 'default' | 'secondary'} size="sm">
                      {typeInfo.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEditDocument(document)}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded"
                      title="Editar documento"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(document)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Eliminar documento"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                  {document.titulo}
                </h4>

                {document.descripcion && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {document.descripcion}
                  </p>
                )}

                <div className="space-y-2 text-xs text-gray-500 mb-4">
                  {document.fecha_documento && (
                    <div className="flex items-center">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      <span>Fecha: {formatDate(document.fecha_documento)}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    <span>Agregado: {formatDate(document.created_at)}</span>
                  </div>
                </div>

                <button
                  onClick={() => openDocument(document.url)}
                  className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Abrir Documento
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Form Modal */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingDocument(null);
          }}
          title={editingDocument ? 'Editar Documento' : 'Agregar Documento'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL del Documento *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://drive.google.com/... o https://sharepoint.com/..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enlace a Google Drive, SharePoint, Dropbox u otro sistema de almacenamiento
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descripción opcional del documento"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha del Documento
              </label>
              <input
                type="date"
                value={formData.fecha_documento}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha_documento: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingDocument(null);
                }}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {saving && <Loading size="sm" className="mr-2" />}
                {editingDocument ? 'Actualizar' : 'Agregar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialogComponent />
    </div>
  );
}