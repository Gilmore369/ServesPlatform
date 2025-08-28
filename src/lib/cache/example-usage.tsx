/**
 * Example usage of the intelligent cache system
 * This file demonstrates how to use the cache system in React components
 */

import React, { useState } from 'react';
import { useList, useRecord, CacheMutator, CacheUtils } from './index';

// Example: Materials List Component with Caching
export function MaterialsList() {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });

  const { 
    data: materials, 
    error, 
    isLoading,
    cacheKey,
    invalidateCache,
    refreshData 
  } = useList('materiales', filters, pagination, {
    revalidateOnFocus: true,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  });

  const handleFilterChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
    setPagination({ page: 1, limit: 20 }); // Reset pagination
  };

  const handleRefresh = async () => {
    await refreshData();
  };

  const handleClearCache = async () => {
    await invalidateCache();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando materiales...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error al cargar materiales</h3>
            <p className="mt-1 text-sm text-red-700">{error.message}</p>
            <button 
              onClick={handleRefresh}
              className="mt-2 text-sm text-red-800 underline hover:text-red-900"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cache Controls */}
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
        <div className="text-sm text-gray-600">
          Cache Key: <code className="bg-gray-200 px-1 rounded">{cacheKey}</code>
        </div>
        <div className="space-x-2">
          <button 
            onClick={handleRefresh}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Actualizar
          </button>
          <button 
            onClick={handleClearCache}
            className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
          >
            Limpiar Cache
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-md border">
        <h3 className="text-lg font-medium mb-3">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Categoría</label>
            <select 
              value={filters.categoria || ''}
              onChange={(e) => handleFilterChange({ ...filters, categoria: e.target.value || undefined })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value="">Todas las categorías</option>
              <option value="Herramientas">Herramientas</option>
              <option value="Materiales">Materiales</option>
              <option value="Equipos">Equipos</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Estado</label>
            <select 
              value={filters.activo?.toString() || ''}
              onChange={(e) => handleFilterChange({ 
                ...filters, 
                activo: e.target.value ? e.target.value === 'true' : undefined 
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Materials List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {materials?.map((material: any) => (
            <MaterialItem key={material.id} material={material} />
          ))}
        </ul>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
          disabled={pagination.page <= 1}
          className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-sm text-gray-700">
          Página {pagination.page}
        </span>
        <button 
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          disabled={!materials || materials.length < pagination.limit}
          className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

// Example: Single Material Component with Caching
export function MaterialDetail({ id }: { id: string }) {
  const { data: material, error, isLoading, refreshData } = useRecord('materiales', id, {
    revalidateOnFocus: false,
    refreshInterval: 10 * 60 * 1000 // 10 minutes
  });

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-32 rounded"></div>;
  }

  if (error) {
    return (
      <div className="text-red-600 p-4">
        Error: {error.message}
        <button onClick={refreshData} className="ml-2 underline">Reintentar</button>
      </div>
    );
  }

  if (!material) {
    return <div className="text-gray-500 p-4">Material no encontrado</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{material.descripcion}</h2>
        <span className={`px-2 py-1 rounded-full text-xs ${
          material.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {material.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-500">SKU</label>
          <p className="mt-1 text-sm text-gray-900">{material.sku}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">Categoría</label>
          <p className="mt-1 text-sm text-gray-900">{material.categoria}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">Stock Actual</label>
          <p className="mt-1 text-sm text-gray-900">{material.stock_actual}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">Stock Mínimo</label>
          <p className="mt-1 text-sm text-gray-900">{material.stock_minimo}</p>
        </div>
      </div>
    </div>
  );
}

// Example: Material Item with Actions
function MaterialItem({ material }: { material: any }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleActive = async () => {
    setIsUpdating(true);
    try {
      await CacheMutator.update('materiales', material.id, {
        activo: !material.activo
      }, {
        optimisticUpdate: true,
        revalidateRelated: true
      });
    } catch (error) {
      console.error('Error updating material:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este material?')) {
      return;
    }

    try {
      await CacheMutator.delete('materiales', material.id, {
        revalidateRelated: true
      });
    } catch (error) {
      console.error('Error deleting material:', error);
    }
  };

  return (
    <li className="px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`h-3 w-3 rounded-full ${
              material.activo ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {material.descripcion}
            </div>
            <div className="text-sm text-gray-500">
              SKU: {material.sku} | Stock: {material.stock_actual}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleActive}
            disabled={isUpdating}
            className={`text-sm px-3 py-1 rounded ${
              material.activo 
                ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            } disabled:opacity-50`}
          >
            {isUpdating ? 'Actualizando...' : (material.activo ? 'Desactivar' : 'Activar')}
          </button>
          <button
            onClick={handleDelete}
            className="text-sm px-3 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200"
          >
            Eliminar
          </button>
        </div>
      </div>
    </li>
  );
}

// Example: Cache Statistics Dashboard
export function CacheStatsDashboard() {
  const [stats, setStats] = useState(CacheUtils.getStats());

  const refreshStats = () => {
    setStats(CacheUtils.getStats());
  };

  const clearAllCaches = async () => {
    await CacheUtils.clearAll();
    refreshStats();
  };

  React.useEffect(() => {
    const interval = setInterval(refreshStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Estadísticas de Cache</h3>
        <div className="space-x-2">
          <button 
            onClick={refreshStats}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Actualizar
          </button>
          <button 
            onClick={clearAllCaches}
            className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Limpiar Todo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.hits}</div>
          <div className="text-sm text-blue-800">Cache Hits</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{stats.misses}</div>
          <div className="text-sm text-red-800">Cache Misses</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {(stats.hitRate * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-green-800">Hit Rate</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{stats.size}</div>
          <div className="text-sm text-purple-800">Cache Size</div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Información del Cache</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Los datos de listas se cachean por 5 minutos</li>
          <li>• Los registros individuales se cachean por 10-20 minutos según el tipo</li>
          <li>• Los datos estáticos se cachean por 1 hora</li>
          <li>• El cache se invalida automáticamente en operaciones de escritura</li>
        </ul>
      </div>
    </div>
  );
}