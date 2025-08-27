'use client';

import { useState } from 'react';
import { Document, DocumentCategory } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import {
  PencilIcon,
  CalendarIcon,
  TagIcon,
  DocumentDuplicateIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';

interface DocumentViewerProps {
  document: Document;
  categories: DocumentCategory[];
  onEdit?: () => void;
}

export function DocumentViewer({ document, categories, onEdit }: DocumentViewerProps) {
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);

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

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Simple markdown to HTML converter for basic formatting
  const renderMarkdown = (markdown: string) => {
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-gray-900 mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h1>')
      
      // Bold and Italic
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-4 rounded-md overflow-x-auto my-4"><code class="text-sm">$1</code></pre>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">$1</code>')
      
      // Lists
      .replace(/^\* (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br>');

    // Wrap in paragraphs
    html = '<p class="mb-4">' + html + '</p>';
    
    // Clean up empty paragraphs
    html = html.replace(/<p class="mb-4"><\/p>/g, '');
    
    return html;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${document.titulo}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              h1 { color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
              h2 { color: #374151; margin-top: 30px; }
              h3 { color: #4b5563; margin-top: 20px; }
              .header { border-bottom: 1px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
              .meta { color: #6b7280; font-size: 14px; }
              pre { background: #f3f4f6; padding: 15px; border-radius: 5px; }
              code { background: #f3f4f6; padding: 2px 4px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${document.titulo}</h1>
              <div class="meta">
                <p><strong>Tipo:</strong> ${document.tipo}</p>
                <p><strong>Categoría:</strong> ${getCategoryName(document.categoria)}</p>
                <p><strong>Versión:</strong> ${document.version}</p>
                <p><strong>Estado:</strong> ${document.estado}</p>
                <p><strong>Última actualización:</strong> ${formatDate(document.updated_at)}</p>
              </div>
            </div>
            <div class="content">
              ${renderMarkdown(document.contenido_markdown)}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(document.contenido_markdown);
      alert('Contenido copiado al portapapeles');
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      alert('Error al copiar el contenido');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">{getTypeIcon(document.tipo)}</span>
              <h1 className="text-2xl font-bold text-gray-900">{document.titulo}</h1>
            </div>
            
            <div className="flex items-center space-x-4 mb-4">
              <Badge variant="secondary">
                {getCategoryName(document.categoria)}
              </Badge>
              <Badge variant={getStatusVariant(document.estado)}>
                {document.estado}
              </Badge>
              <span className="text-sm text-gray-500">Versión {document.version}</span>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span>Actualizado: {formatDate(document.updated_at)}</span>
              </div>
              
              {document.fecha_aprobacion && (
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span>Aprobado: {formatDate(document.fecha_aprobacion)}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <div className="flex items-center mt-4">
                <TagIcon className="h-4 w-4 mr-2 text-gray-400" />
                <div className="flex flex-wrap gap-2">
                  {document.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              title="Imprimir"
            >
              <PrinterIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={handleCopy}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              title="Copiar contenido"
            >
              <DocumentDuplicateIcon className="h-5 w-5" />
            </button>

            {onEdit && (
              <button
                onClick={onEdit}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Editar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Contenido</h2>
          <button
            onClick={() => setShowRawMarkdown(!showRawMarkdown)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showRawMarkdown ? 'Ver renderizado' : 'Ver markdown'}
          </button>
        </div>

        <div className="prose max-w-none">
          {showRawMarkdown ? (
            <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm font-mono whitespace-pre-wrap">
              {document.contenido_markdown}
            </pre>
          ) : (
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(document.contenido_markdown)
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}