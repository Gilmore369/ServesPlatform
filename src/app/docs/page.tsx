'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/hooks/useApi';
import { Document, DocumentCategory } from '@/lib/types';
import { DocumentationList } from '@/components/docs/DocumentationList';
import { DocumentViewer } from '@/components/docs/DocumentViewer';
import { DocumentForm } from '@/components/docs/DocumentForm';
import { DocumentSearch } from '@/components/docs/DocumentSearch';
import { CategoryManager } from '@/components/docs/CategoryManager';
import { Modal } from '@/components/ui/Modal';
import { Loading } from '@/components/ui/Loading';
import { 
  PlusIcon, 
  FolderIcon,
  DocumentTextIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

export default function DocsPage() {
  const { user } = useAuth();
  const { get } = useApi();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user can manage documents
  const canManage = user?.rol === 'admin_lider' || user?.rol === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [docsResponse, categoriesResponse] = await Promise.all([
        get('/crud', { table: 'Documentos', action: 'list' }),
        get('/crud', { table: 'CategoriaDocumentos', action: 'list' })
      ]);

      if (docsResponse.ok) {
        setDocuments(docsResponse.data || []);
      }
      
      if (categoriesResponse.ok) {
        setCategories(categoriesResponse.data || []);
      }
    } catch (err) {
      console.error('Error loading documentation:', err);
      setError('Error al cargar la documentación');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSaved = () => {
    setShowDocumentForm(false);
    setEditingDocument(null);
    loadData();
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setShowDocumentForm(true);
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.contenido_markdown.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || doc.categoria === selectedCategory;
    
    return matchesSearch && matchesCategory && doc.activo;
  });

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documentación</h1>
            <p className="text-gray-600 mt-1">
              Gestión de SOPs, manuales y documentación del sistema
            </p>
          </div>
          
          <div className="flex space-x-3">
            {canManage && (
              <>
                <button
                  onClick={() => setShowCategoryManager(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Cog6ToothIcon className="h-4 w-4 mr-2" />
                  Categorías
                </button>
                
                <button
                  onClick={() => setShowDocumentForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Nuevo Documento
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6">
        <DocumentSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Documents List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <FolderIcon className="h-5 w-5 mr-2" />
                Documentos ({filteredDocuments.length})
              </h2>
            </div>
            
            <DocumentationList
              documents={filteredDocuments}
              categories={categories}
              selectedDocument={selectedDocument}
              onSelectDocument={handleViewDocument}
              onEditDocument={canManage ? handleEditDocument : undefined}
              onDeleteDocument={canManage ? loadData : undefined}
            />
          </div>
        </div>

        {/* Document Viewer */}
        <div className="lg:col-span-2">
          {selectedDocument ? (
            <DocumentViewer
              document={selectedDocument}
              categories={categories}
              onEdit={canManage ? () => handleEditDocument(selectedDocument) : undefined}
            />
          ) : (
            <div className="bg-white rounded-lg shadow h-96 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <DocumentTextIcon className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-medium">Selecciona un documento</p>
                <p className="text-sm">Elige un documento de la lista para visualizarlo</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Form Modal */}
      {showDocumentForm && (
        <Modal
          isOpen={showDocumentForm}
          onClose={() => {
            setShowDocumentForm(false);
            setEditingDocument(null);
          }}
          title={editingDocument ? 'Editar Documento' : 'Nuevo Documento'}
          size="xl"
        >
          <DocumentForm
            document={editingDocument}
            categories={categories}
            onSave={handleDocumentSaved}
            onCancel={() => {
              setShowDocumentForm(false);
              setEditingDocument(null);
            }}
          />
        </Modal>
      )}

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <Modal
          isOpen={showCategoryManager}
          onClose={() => setShowCategoryManager(false)}
          title="Gestión de Categorías"
          size="lg"
        >
          <CategoryManager
            categories={categories}
            onSave={() => {
              setShowCategoryManager(false);
              loadData();
            }}
            onCancel={() => setShowCategoryManager(false)}
          />
        </Modal>
      )}
    </div>
  );
}