'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Loading } from './Loading';

export interface Column<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  searchable?: boolean;
  onSearch?: (query: string) => void;
  emptyMessage?: string;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Table<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  pagination,
  searchable = false,
  onSearch,
  emptyMessage = 'No hay datos disponibles',
  className = '',
}: TableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle sorting
  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      setSortDirection(prev => 
        prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'
      );
      if (sortDirection === 'desc') {
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  // Sort and filter data
  const processedData = useMemo(() => {
    let result = [...data];

    // Client-side filtering if no external search handler
    if (searchQuery && !onSearch) {
      result = result.filter(row =>
        columns.some(column => {
          if (!column.filterable) return false;
          const value = row[column.key as keyof T];
          return String(value).toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
    }

    // Client-side sorting
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        const aValue = a[sortColumn as keyof T];
        const bValue = b[sortColumn as keyof T];

        if (aValue === bValue) return 0;

        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }

        return sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [data, searchQuery, sortColumn, sortDirection, columns, onSearch]);

  const renderSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <div className="w-4 h-4" />; // Placeholder for alignment
    }

    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="w-4 h-4" />
    ) : (
      <ChevronDownIcon className="w-4 h-4" />
    );
  };

  const renderPagination = () => {
    if (!pagination) return null;

    const { page, pageSize, total, onPageChange } = pagination;
    const totalPages = Math.ceil(total / pageSize);
    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);

    return (
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-medium">{startItem}</span> a{' '}
              <span className="font-medium">{endItem}</span> de{' '}
              <span className="font-medium">{total}</span> resultados
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                if (pageNum > totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      pageNum === page
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white shadow overflow-hidden sm:rounded-md ${className}`}>
      {/* Search bar */}
      {searchable && (
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="block w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto" role="region" aria-label="Tabla de datos">
        <table className="min-w-full divide-y divide-gray-200" role="table">
          <thead className="bg-gray-50">
            <tr role="row">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  scope="col"
                  role="columnheader"
                  tabIndex={column.sortable ? 0 : undefined}
                  aria-sort={
                    sortColumn === String(column.key) 
                      ? sortDirection === 'asc' ? 'ascending' : 'descending'
                      : column.sortable ? 'none' : undefined
                  }
                  className={`px-3 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.align === 'center' ? 'text-center' :
                    column.align === 'right' ? 'text-right' : 'text-left'
                  } ${column.sortable ? 'cursor-pointer hover:bg-gray-100 touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset' : ''}`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                  onKeyDown={(e) => {
                    if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSort(String(column.key));
                    }
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <span className="truncate">{column.title}</span>
                    {column.sortable && (
                      <span aria-hidden="true">
                        {renderSortIcon(String(column.key))}
                      </span>
                    )}
                  </div>
                  {column.sortable && (
                    <span className="sr-only">
                      {sortColumn === String(column.key) 
                        ? `Ordenado ${sortDirection === 'asc' ? 'ascendente' : 'descendente'}`
                        : 'Ordenable'
                      }
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr role="row">
                <td colSpan={columns.length} className="px-3 sm:px-6 py-8 sm:py-12" role="cell">
                  <Loading text="Cargando datos..." />
                </td>
              </tr>
            ) : processedData.length === 0 ? (
              <tr role="row">
                <td colSpan={columns.length} className="px-3 sm:px-6 py-8 sm:py-12 text-center text-gray-500" role="cell">
                  <div className="text-sm">{emptyMessage}</div>
                </td>
              </tr>
            ) : (
              processedData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50" role="row">
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      role="cell"
                      className={`px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 ${
                        column.align === 'center' ? 'text-center' :
                        column.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div className="truncate max-w-xs sm:max-w-none">
                        {column.render
                          ? column.render(row[column.key as keyof T], row, index)
                          : String(row[column.key as keyof T] || '')
                        }
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
}