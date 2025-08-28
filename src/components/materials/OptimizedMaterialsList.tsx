/**
 * Optimized materials list component demonstrating performance optimizations
 * Uses lazy loading, compression, and query optimization
 */

import React, { useState, useMemo } from 'react';
import { LazyLoad, LazyTable } from '../ui/LazyLoad';
import { useOptimizedData, useOptimizedSearch } from '../../hooks/useOptimizedData';
import { Card } from '../ui/card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface Material {
  id: string;
  sku: string;
  descripcion: string;
  categoria: string;
  unidad: string;
  costo_ref: number;
  stock_actual: number;
  stock_minimo: number;
  proveedor_principal: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface MaterialsListProps {
  onMaterialSelect?: (material: Material) => void;
  showPerformanceMetrics?: boolean;
}

export const OptimizedMaterialsList: React.FC<MaterialsListProps> = ({
  onMaterialSelect,
  showPerformanceMetrics = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');

  // Build filters
  const filters = useMemo(() => {
    const filterObj: Record<string, any> = {};
    
    if (selectedCategory) {
      filterObj.categoria = selectedCategory;
    }
    
    if (showActiveOnly) {
      filterObj.activo = true;
    }
    
    return filterObj;
  }, [selectedCategory, showActiveOnly]);

  // Use optimized data fetching
  const {
    data: materials,
    isLoading,
    error,
    hasMore,
    totalRecords,
    loadMore,
    refresh,
    performanceMetrics
  } = useOptimizedData<Material>({
    table: 'Materiales',
    pageSize: 50,
    filters,
    enableCompression: true,
    enableOptimization: true,
    cacheStrategy: 'moderate'
  });

  // Use optimized search
  const {
    searchQuery: currentSearchQuery,
    performSearch,
    clearSearch,
    isSearching,
    searchResults,
    hasMoreResults,
    loadMoreResults,
    searchError
  } = useOptimizedSearch<Material>('Materiales', ['sku', 'descripcion', 'categoria']);

  // Determine which data to display
  const displayData = searchQuery.trim() ? searchResults : materials;
  const displayHasMore = searchQuery.trim() ? hasMoreResults : hasMore;
  const displayLoadMore = searchQuery.trim() ? loadMoreResults : loadMore;
  const displayIsLoading = searchQuery.trim() ? isSearching : isLoading;
  const displayError = searchQuery.trim() ? searchError : error;

  // Table columns configuration
  const columns = [
    {
      key: 'sku' as keyof Material,
      label: 'SKU',
      width: '120px',
      render: (value: string, material: Material) => (
        <span className="font-mono text-sm">{value}</span>
      )
    },
    {
      key: 'descripcion' as keyof Material,
      label: 'Descripción',
      render: (value: string, material: Material) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{material.categoria}</div>
        </div>
      )
    },
    {
      key: 'stock_actual' as keyof Material,
      label: 'Stock',
      width: '100px',
      render: (value: number, material: Material) => (
        <div className="text-right">
          <div className={`font-medium ${value <= material.stock_minimo ? 'text-red-600' : 'text-gray-900'}`}>
            {value}
          </div>
          <div className="text-xs text-gray-500">{material.unidad}</div>
        </div>
      )
    },
    {
      key: 'costo_ref' as keyof Material,
      label: 'Costo Ref.',
      width: '100px',
      render: (value: number) => (
        <div className="text-right font-medium text-gray-900">
          S/ {value.toFixed(2)}
        </div>
      )
    },
    {
      key: 'proveedor_principal' as keyof Material,
      label: 'Proveedor',
      width: '150px'
    },
    {
      key: 'activo' as keyof Material,
      label: 'Estado',
      width: '80px',
      render: (value: boolean) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Activo' : 'Inactivo'}
        </span>
      )
    }
  ];

  // Card render function for lazy loading
  const renderMaterialCard = (material: Material, index: number) => (
    <Card 
      key={material.id} 
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onMaterialSelect?.(material)}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium text-gray-900">{material.descripcion}</h3>
          <p className="text-sm text-gray-500">SKU: {material.sku}</p>
        </div>
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          material.activo 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {material.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Categoría:</span>
          <span className="ml-1 font-medium">{material.categoria}</span>
        </div>
        <div>
          <span className="text-gray-500">Stock:</span>
          <span className={`ml-1 font-medium ${
            material.stock_actual <= material.stock_minimo ? 'text-red-600' : 'text-gray-900'
          }`}>
            {material.stock_actual} {material.unidad}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Costo:</span>
          <span className="ml-1 font-medium">S/ {material.costo_ref.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-500">Proveedor:</span>
          <span className="ml-1 font-medium">{material.proveedor_principal}</span>
        </div>
      </div>
    </Card>
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim()) {
      performSearch(query);
    } else {
      clearSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Materiales</h2>
          <p className="text-sm text-gray-500">
            {totalRecords > 0 && `${displayData.length} de ${totalRecords} materiales`}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
          >
            {viewMode === 'table' ? '📋 Tabla' : '🗃️ Tarjetas'}
          </Button>
          <Button onClick={refresh} disabled={displayIsLoading}>
            🔄 Actualizar
          </Button>
        </div>
      </div>

      {/* Filters and search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <Input
              type="text"
              placeholder="Buscar por SKU, descripción o categoría..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las categorías</option>
              <option value="Herramientas">Herramientas</option>
              <option value="Materiales">Materiales</option>
              <option value="Equipos">Equipos</option>
              <option value="Consumibles">Consumibles</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Solo activos</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Performance metrics */}
      {showPerformanceMetrics && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Métricas de Rendimiento</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Tiempo Promedio</div>
              <div className="text-lg font-semibold text-gray-900">
                {performanceMetrics.averageLoadTime}ms
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Cache Hit Rate</div>
              <div className="text-lg font-semibold text-green-600">
                {(performanceMetrics.cacheHitRate * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Compresión</div>
              <div className="text-lg font-semibold text-blue-600">
                {performanceMetrics.compressionRatio.toFixed(1)}x
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Requests</div>
              <div className="text-lg font-semibold text-gray-900">
                {performanceMetrics.totalRequests}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Error display */}
      {displayError && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center text-red-800">
            <span className="mr-2">⚠️</span>
            <span>{displayError}</span>
          </div>
        </Card>
      )}

      {/* Data display */}
      {viewMode === 'table' ? (
        <Card className="overflow-hidden">
          <LazyTable
            columns={columns}
            data={displayData}
            onLoadMore={displayLoadMore}
            hasMore={displayHasMore}
            isLoading={displayIsLoading}
            virtualized={displayData.length > 100}
            rowHeight={60}
          />
        </Card>
      ) : (
        <LazyLoad
          items={displayData}
          renderItem={renderMaterialCard}
          onLoadMore={displayLoadMore}
          hasMore={displayHasMore}
          isLoading={displayIsLoading}
          batchSize={20}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        />
      )}

      {/* Loading state */}
      {displayIsLoading && displayData.length === 0 && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Cargando materiales...</span>
        </div>
      )}

      {/* Empty state */}
      {!displayIsLoading && displayData.length === 0 && !displayError && (
        <Card className="p-8 text-center">
          <div className="text-gray-500">
            <div className="text-4xl mb-2">📦</div>
            <div className="text-lg font-medium">No se encontraron materiales</div>
            <div className="text-sm">
              {searchQuery.trim() 
                ? 'Intenta con otros términos de búsqueda'
                : 'Ajusta los filtros para ver más resultados'
              }
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default OptimizedMaterialsList;