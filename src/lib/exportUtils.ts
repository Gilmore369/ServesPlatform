// Export utilities for different data formats

export interface ExportColumn {
  key: string;
  label: string;
  format?: 'text' | 'number' | 'currency' | 'date' | 'percentage' | 'boolean';
  width?: number;
}

export interface ExportOptions {
  filename: string;
  format: 'csv' | 'json' | 'xlsx';
  includeHeaders: boolean;
  dateFormat: 'dd/mm/yyyy' | 'yyyy-mm-dd' | 'dd-mm-yyyy';
  delimiter: ',' | ';' | '\t';
  encoding: 'utf-8' | 'latin1';
  currencySymbol: string;
}

export class DataExporter {
  private static formatValue(value: any, format?: string, options?: Partial<ExportOptions>): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (format) {
      case 'number':
        return typeof value === 'number' ? value.toString() : value;
        
      case 'currency':
        if (typeof value === 'number') {
          const symbol = options?.currencySymbol || 'S/';
          return `${symbol}${value.toFixed(2)}`;
        }
        return value;
        
      case 'percentage':
        return typeof value === 'number' ? `${value.toFixed(1)}%` : value;
        
      case 'date':
        if (value instanceof Date || typeof value === 'string') {
          const date = value instanceof Date ? value : new Date(value);
          if (!isNaN(date.getTime())) {
            const dateFormat = options?.dateFormat || 'dd/mm/yyyy';
            switch (dateFormat) {
              case 'dd/mm/yyyy':
                return date.toLocaleDateString('es-PE');
              case 'yyyy-mm-dd':
                return date.toISOString().split('T')[0];
              case 'dd-mm-yyyy':
                return date.toLocaleDateString('es-PE').replace(/\//g, '-');
            }
          }
        }
        return value;
        
      case 'boolean':
        return value ? 'Sí' : 'No';
        
      default:
        return value.toString();
    }
  }

  static exportToCSV(
    data: any[], 
    columns: ExportColumn[], 
    options: Partial<ExportOptions> = {}
  ): void {
    const defaultOptions: ExportOptions = {
      filename: 'export.csv',
      format: 'csv',
      includeHeaders: true,
      dateFormat: 'dd/mm/yyyy',
      delimiter: ',',
      encoding: 'utf-8',
      currencySymbol: 'S/'
    };

    const finalOptions = { ...defaultOptions, ...options };

    if (!data || data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const rows: string[] = [];

    // Add headers if enabled
    if (finalOptions.includeHeaders) {
      const headerRow = columns
        .map(col => `"${col.label.replace(/"/g, '""')}"`)
        .join(finalOptions.delimiter);
      rows.push(headerRow);
    }

    // Add data rows
    data.forEach(item => {
      const row = columns
        .map(col => {
          const value = this.formatValue(item[col.key], col.format, finalOptions);
          return `"${value.toString().replace(/"/g, '""')}"`;
        })
        .join(finalOptions.delimiter);
      rows.push(row);
    });

    // Create and download file
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { 
      type: `text/csv;charset=${finalOptions.encoding};` 
    });
    
    this.downloadFile(blob, finalOptions.filename);
  }

  static exportToJSON(
    data: any[], 
    columns: ExportColumn[], 
    options: Partial<ExportOptions> = {}
  ): void {
    const defaultOptions: ExportOptions = {
      filename: 'export.json',
      format: 'json',
      includeHeaders: true,
      dateFormat: 'yyyy-mm-dd',
      delimiter: ',',
      encoding: 'utf-8',
      currencySymbol: 'S/'
    };

    const finalOptions = { ...defaultOptions, ...options };

    if (!data || data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Transform data according to column definitions
    const transformedData = data.map(item => {
      const transformedItem: any = {};
      columns.forEach(col => {
        const value = this.formatValue(item[col.key], col.format, finalOptions);
        transformedItem[col.label] = value;
      });
      return transformedItem;
    });

    // Create JSON content
    const jsonContent = JSON.stringify(transformedData, null, 2);
    const blob = new Blob([jsonContent], { 
      type: 'application/json;charset=utf-8;' 
    });
    
    this.downloadFile(blob, finalOptions.filename);
  }

  private static downloadFile(blob: Blob, filename: string): void {
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
  }

  // Utility function to generate filename with timestamp
  static generateFilename(baseName: string, extension: string, includeTimestamp = true): string {
    if (includeTimestamp) {
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '');
      return `${baseName}_${timestamp}.${extension}`;
    }
    return `${baseName}.${extension}`;
  }

  // Utility function to filter data based on date range
  static filterByDateRange(
    data: any[], 
    dateField: string, 
    startDate: string, 
    endDate: string
  ): any[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= start && itemDate <= end;
    });
  }

  // Utility function to apply multiple filters
  static applyFilters(
    data: any[], 
    filters: { [key: string]: any }
  ): any[] {
    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          return true; // Skip empty filters
        }
        
        const itemValue = item[key];
        
        // Handle different comparison types
        if (typeof value === 'string' && value.includes('*')) {
          // Wildcard matching
          const regex = new RegExp(value.replace(/\*/g, '.*'), 'i');
          return regex.test(itemValue?.toString() || '');
        }
        
        if (Array.isArray(value)) {
          // Array contains matching
          return value.includes(itemValue);
        }
        
        // Exact matching
        return itemValue === value;
      });
    });
  }
}

// Pre-configured export functions for common report types
export const ReportExporter = {
  exportOperationalReport: (data: any[], dateRange: { startDate: string; endDate: string }) => {
    const columns: ExportColumn[] = [
      { key: 'projectName', label: 'Proyecto' },
      { key: 'totalActivities', label: 'Total Actividades', format: 'number' },
      { key: 'completedOnTime', label: 'Completadas a Tiempo', format: 'number' },
      { key: 'completedLate', label: 'Completadas Tarde', format: 'number' },
      { key: 'pending', label: 'Pendientes', format: 'number' },
      { key: 'complianceRate', label: 'Tasa de Cumplimiento (%)', format: 'percentage' }
    ];

    const filename = DataExporter.generateFilename(
      `reporte-operacional-${dateRange.startDate}-${dateRange.endDate}`,
      'csv'
    );

    DataExporter.exportToCSV(data, columns, { filename });
  },

  exportCapacityReport: (data: any[], dateRange: { startDate: string; endDate: string }) => {
    const columns: ExportColumn[] = [
      { key: 'personnelName', label: 'Colaborador' },
      { key: 'specialty', label: 'Especialidad' },
      { key: 'zone', label: 'Zona' },
      { key: 'plannedHours', label: 'Horas Planificadas', format: 'number' },
      { key: 'actualHours', label: 'Horas Reales', format: 'number' },
      { key: 'utilizationRate', label: 'Tasa de Utilización (%)', format: 'percentage' },
      { key: 'activeAssignments', label: 'Asignaciones Activas', format: 'number' }
    ];

    const filename = DataExporter.generateFilename(
      `reporte-capacidad-${dateRange.startDate}-${dateRange.endDate}`,
      'csv'
    );

    DataExporter.exportToCSV(data, columns, { filename });
  },

  exportFinancialReport: (data: any[], dateRange: { startDate: string; endDate: string }) => {
    const columns: ExportColumn[] = [
      { key: 'projectName', label: 'Proyecto' },
      { key: 'status', label: 'Estado' },
      { key: 'budgetTotal', label: 'Presupuesto Total', format: 'currency' },
      { key: 'laborCost', label: 'Costo Mano de Obra', format: 'currency' },
      { key: 'materialCost', label: 'Costo Materiales', format: 'currency' },
      { key: 'totalCost', label: 'Costo Total', format: 'currency' },
      { key: 'grossMargin', label: 'Margen Bruto', format: 'currency' },
      { key: 'grossMarginPercentage', label: 'Margen Bruto (%)', format: 'percentage' }
    ];

    const filename = DataExporter.generateFilename(
      `reporte-financiero-${dateRange.startDate}-${dateRange.endDate}`,
      'csv'
    );

    DataExporter.exportToCSV(data, columns, { filename });
  }
};