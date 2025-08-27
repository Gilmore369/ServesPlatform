'use client';

import { DocumentCategory } from '@/lib/types';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface DocumentSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categories: DocumentCategory[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function DocumentSearch({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange
}: DocumentSearchProps) {
  const activeCategories = categories.filter(cat => cat.activo);

  const clearFilters = () => {
    onSearchChange('');
    onCategoryChange('');
  };

  const hasActiveFilters = searchQuery || selectedCategory;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar en documentos, contenido, tags..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="sm:w-64">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas las categorías</option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <XMarkIcon className="h-4 w-4 mr-2" />
            Limpiar
          </button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {searchQuery && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Búsqueda: &quot;{searchQuery}&quot;
              <button
                onClick={() => onSearchChange('')}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {selectedCategory && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Categoría: {activeCategories.find(c => c.id === selectedCategory)?.nombre}
              <button
                onClick={() => onCategoryChange('')}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-green-400 hover:bg-green-200 hover:text-green-500"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}