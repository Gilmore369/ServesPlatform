'use client';

import { useState } from 'react';
import { Document, DocumentCategory } from '@/lib/types';
import { useApi } from '@/lib/hooks/useApi';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import {
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon,
  TagIcon
} from '@heroicons/react/24/outline';

interface DocumentationListProps {
  documents: Document[];
  categories: DocumentCategory[];
  selectedDocument: Document | null;
  onSelectDocument: (document: Document) => void;
  onEditDocument?: (document: Document) => void;
  onDeleteDocument?: () => void;
}

export function DocumentationList({
  documents,
  categories,
  selectedDocument,
  onSelectDocument,
  onEditDocument,
  onDeleteDocument
}: DocumentationListProps) {
  const { del } = useApi();
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.nombre || 'Sin categoría';
  };



  const getStatusVariant = (estado: string): 'success' | 'warning' | 'info' | 'danger' | 'default' => {
    switch (estado) {
      case 'Aprobado': return 'success';
      case 'Revisión': return 'warning';
      case 'Borrador': return 'info';
      case 'Obsoleto': return 'danger';
      default: return 'default';
    }
  };

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'SOP': return '📋';
      case 'Manual': return '📖';
      case 'Procedimiento': return '⚙️';
      case 'Política': return '📜';
      default: return '📄';
    }
  };

  const handleDelete = async (document: Document) => {
    showConfirm({
      title: 'Eliminar Documento',
      message: `¿Estás seguro de que deseas eliminar el documento "${document.titulo}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          setDeletingId(document.id);
          const response = await del('/crud', {
            table: 'Documentos',
            action: 'delete',
            id: document.id
          });

          if (response.ok) {
            onDeleteDocument?.();
          } else {
            throw new Error(response.message || 'Error al eliminar documento');
          }
        } catch (error) {
          console.error('Error deleting document:', error);
          alert('Error al eliminar el documento');
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (documents.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <DocumentTextIcon className="h-12 w-12 mx-auto mb-4" />
        <p className="text-lg font-medium">No hay documentos</p>
        <p className="text-sm">No se encontraron documentos que coincidan con los filtros</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {documents.map((document) => (
        <div
          key={document.id}
          className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
            selectedDocument?.id === document.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
          }`}
          onClick={() => onSelectDocument(document)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Document Header */}
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">{getTypeIcon(document.tipo)}</span>
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {document.titulo}
                </h3>
              </div>

              {/* Document Info */}
              <div className="space-y-2">
                {/* Category and Status */}
                <div className="flex items-center space-x-2">
                  <Badge
                    variant="secondary"
                    size="sm"
                  >
                    {getCategoryName(document.categoria)}
                  </Badge>
                  <Badge
                    variant={getStatusVariant(document.estado)}
                    size="sm"
                  >
                    {document.estado}
                  </Badge>
                </div>

                {/* Version and Date */}
                <div className="flex items-center text-xs text-gray-500 space-x-4">
                  <span className="flex items-center">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    v{document.version}
                  </span>
                  <span>
                    {formatDate(document.updated_at)}
                  </span>
                </div>

                {/* Tags */}
                {document.tags && document.tags.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <TagIcon className="h-3 w-3 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {document.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {document.tags.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{document.tags.length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDocument(document);
                }}
                className="p-1 text-gray-400 hover:text-blue-600 rounded"
                title="Ver documento"
              >
                <EyeIcon className="h-4 w-4" />
              </button>

              {onEditDocument && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditDocument(document);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded"
                  title="Editar documento"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}

              {onDeleteDocument && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(document);
                  }}
                  disabled={deletingId === document.id}
                  className="p-1 text-gray-400 hover:text-red-600 rounded disabled:opacity-50"
                  title="Eliminar documento"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      <ConfirmDialogComponent />
    </div>
  );
}