'use client';

import React, { useState } from 'react';
import { Modal, ModalBody, ModalFooter } from './Modal';

interface ExportHeader {
  key: string;
  label: string;
  format?: 'text' | 'number' | 'currency' | 'date' | 'percentage' | 'boolean';
}

interface ExportCsvProps {
  data: any[];
  filename: string;
  headers: ExportHeader[];
  className?: string;
  children?: React.ReactNode;
  showAdvancedOptions?: boolean;
  filterFunction?: (item: any) => boolean;
}

interface ExportOptions {
  includeHeaders: boolean;
  dateFormat: 'dd/mm/yyyy' | 'yyyy-mm-dd' | 'dd-mm-yyyy';
  numberFormat: 'decimal' | 'integer';
  currencySymbol: string;
  encoding: 'utf-8' | 'latin1';
  delimiter: ',' | ';' | '\t';
}

export function ExportCsv({ 
  data, 
  filename, 
  headers, 
  className = '',
  children,
  showAdvancedOptions = false,
  filterFunction
}: ExportCsvProps) {
  
  const [showModal, setShowModal] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeHeaders: true,
    dateFormat: 'dd/mm/yyyy',
    numberFormat: 'decimal',
    currencySymbol: 'S/',
    encoding: 'utf-8',
    delimiter: ','
  });

  const exportToCsv = (options?: ExportOptions) => {
    const finalOptions = options || exportOptions;
    
    if (!data || data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Apply filter if provided
    let filteredData = data;
    if (filterFunction) {
      filteredData = data.filter(filterFunction);
    }

    if (filteredData.length === 0) {
      alert('No hay datos que coincidan con los filtros aplicados');
      return;
    }

    // Create CSV content
    const csvContent = convertToCSV(filteredData, headers, finalOptions);
    
    // Create and download file
    const blob = new Blob([csvContent], { 
      type: `text/csv;charset=${finalOptions.encoding};` 
    });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const convertToCSV = (data: any[], headers: ExportHeader[], options: ExportOptions): string => {
    const rows: string[] = [];
    
    // Create header row if enabled
    if (options.includeHeaders) {
      const headerRow = headers.map(header => 
        `"${header.label.replace(/"/g, '""')}"`
      ).join(options.delimiter);
      rows.push(headerRow);
    }
    
    // Create data rows
    const dataRows = data.map(item => {
      return headers.map(header => {
        let value = item[header.key];
        
        // Handle different data types based on format
        if (value === null || value === undefined) {
          value = '';
        } else {
          switch (header.format) {
            case 'number':
              if (typeof value === 'number') {
                value = options.numberFormat === 'integer' 
                  ? Math.round(value).toString()
                  : value.toFixed(2);
              }
              break;
              
            case 'currency':
              if (typeof value === 'number') {
                value = `${options.currencySymbol}${value.toFixed(2)}`;
              }
              break;
              
            case 'percentage':
              if (typeof value === 'number') {
                value = `${value.toFixed(1)}%`;
              }
              break;
              
            case 'date':
              if (value instanceof Date || typeof value === 'string') {
                const date = value instanceof Date ? value : new Date(value);
                if (!isNaN(date.getTime())) {
                  switch (options.dateFormat) {
                    case 'dd/mm/yyyy':
                      value = date.toLocaleDateString('es-PE');
                      break;
                    case 'yyyy-mm-dd':
                      value = date.toISOString().split('T')[0];
                      break;
                    case 'dd-mm-yyyy':
                      value = date.toLocaleDateString('es-PE').replace(/\//g, '-');
                      break;
                  }
                }
              }
              break;
              
            case 'boolean':
              value = value ? 'Sí' : 'No';
              break;
              
            default:
              value = value.toString();
          }
        }
        
        // Escape quotes and wrap in quotes
        return `"${value.toString().replace(/"/g, '""')}"`;
      }).join(options.delimiter);
    });
    
    rows.push(...dataRows);
    return rows.join('\n');
  };

  const handleQuickExport = () => {
    if (showAdvancedOptions) {
      setShowModal(true);
    } else {
      exportToCsv();
    }
  };

  const handleAdvancedExport = () => {
    exportToCsv(exportOptions);
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={handleQuickExport}
        className={`
          inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm 
          leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        title="Exportar a CSV"
        disabled={!data || data.length === 0}
      >
        {children || (
          <>
            <svg 
              className="w-4 h-4 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
            Exportar CSV
          </>
        )}
      </button>

      {/* Advanced Export Options Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Opciones de Exportación"
        >
          <ModalBody>
            <div className="space-y-4">
              {/* General Options */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Opciones Generales</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeHeaders}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeHeaders: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Incluir encabezados</span>
                  </label>
                </div>
              </div>

              {/* Format Options */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Formato</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Separador
                    </label>
                    <select
                      value={exportOptions.delimiter}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        delimiter: e.target.value as ',' | ';' | '\t'
                      }))}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                    >
                      <option value=",">Coma (,)</option>
                      <option value=";">Punto y coma (;)</option>
                      <option value="\t">Tabulación</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Codificación
                    </label>
                    <select
                      value={exportOptions.encoding}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        encoding: e.target.value as 'utf-8' | 'latin1'
                      }))}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                    >
                      <option value="utf-8">UTF-8</option>
                      <option value="latin1">Latin1</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Date and Number Format */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Formato de Datos</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Formato de Fecha
                    </label>
                    <select
                      value={exportOptions.dateFormat}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        dateFormat: e.target.value as 'dd/mm/yyyy' | 'yyyy-mm-dd' | 'dd-mm-yyyy'
                      }))}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                    >
                      <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                      <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                      <option value="dd-mm-yyyy">DD-MM-YYYY</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Símbolo de Moneda
                    </label>
                    <input
                      type="text"
                      value={exportOptions.currencySymbol}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        currencySymbol: e.target.value
                      }))}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                      placeholder="S/"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Vista Previa</h4>
                <div className="bg-gray-50 p-2 rounded text-xs font-mono">
                  {data && data.length > 0 && (
                    <div>
                      {exportOptions.includeHeaders && (
                        <div className="text-gray-600">
                          {headers.slice(0, 3).map(h => h.label).join(exportOptions.delimiter)}
                          {headers.length > 3 && '...'}
                        </div>
                      )}
                      <div className="text-gray-800">
                        {headers.slice(0, 3).map(h => {
                          let value = data[0][h.key];
                          if (h.format === 'currency' && typeof value === 'number') {
                            value = `${exportOptions.currencySymbol}${value.toFixed(2)}`;
                          }
                          return value;
                        }).join(exportOptions.delimiter)}
                        {headers.length > 3 && '...'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdvancedExport}
              className="ml-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Exportar
            </button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}

export default ExportCsv;