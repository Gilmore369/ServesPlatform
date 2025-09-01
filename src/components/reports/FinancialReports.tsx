'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/Loading';
import { ExportCsv } from '@/components/ui/ExportCsv';
import { apiClient } from '@/lib/apiClient';
import { Project, TimeEntry, Personnel, BOM, Material } from '@/lib/types';

interface ProjectProfitabilityData {
  projectId: string;
  projectName: string;
  budgetTotal: number;
  currency: string;
  laborCost: number;
  materialCost: number;
  totalCost: number;
  grossMargin: number;
  grossMarginPercentage: number;
  status: string;
}

interface CostBreakdownData {
  category: string;
  amount: number;
  percentage: number;
  currency: string;
}

export default function FinancialReports() {
  const [loading, setLoading] = useState(true);
  const [projectProfitability, setProjectProfitability] = useState<ProjectProfitabilityData[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdownData[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadFinancialData();
  }, [dateRange]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      
      // Fetch all required data
      const [projectsResponse, timeEntriesResponse, personnelResponse, bomResponse, materialsResponse] = await Promise.all([
        apiClient.getProjects(),
        apiClient.getTimeEntries(),
        apiClient.getPersonnel(),
        apiClient.getBOMs(),
        apiClient.getMaterials()
      ]);

      if (projectsResponse.ok && timeEntriesResponse.ok && personnelResponse.ok && bomResponse.ok && materialsResponse.ok) {
        const projects = projectsResponse.data || [];
        const timeEntries = timeEntriesResponse.data || [];
        const personnel = personnelResponse.data || [];
        const boms = bomResponse.data || [];
        const materials = materialsResponse.data || [];

        // Filter data by date range
        const filteredTimeEntries = timeEntries.filter(te => {
          const entryDate = new Date(te.fecha);
          const startDate = new Date(dateRange.startDate);
          const endDate = new Date(dateRange.endDate);
          return entryDate >= startDate && entryDate <= endDate;
        });

        // Calculate project profitability
        const profitabilityData = calculateProjectProfitability(projects, filteredTimeEntries, personnel, boms, materials);
        setProjectProfitability(profitabilityData);

        // Calculate cost breakdown
        const breakdownData = calculateCostBreakdown(profitabilityData);
        setCostBreakdown(breakdownData);
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProjectProfitability = (
    projects: Project[],
    timeEntries: TimeEntry[],
    personnel: Personnel[],
    boms: BOM[],
    materials: Material[]
  ): ProjectProfitabilityData[] => {
    return projects.map(project => {
      // Calculate labor cost
      const projectTimeEntries = timeEntries.filter(te => te.proyecto_id === project.id);
      const laborCost = projectTimeEntries.reduce((sum, te) => {
        const person = personnel.find(p => p.id === te.colaborador_id);
        const hourlyRate = person?.tarifa_hora || 0;
        return sum + (te.horas_trabajadas * hourlyRate);
      }, 0);

      // Calculate material cost
      const projectBOMs = boms.filter(bom => bom.proyecto_id === project.id);
      const materialCost = projectBOMs.reduce((sum, bom) => {
        const material = materials.find(m => m.id === bom.material_id);
        const unitCost = bom.costo_unit_est || material?.costo_ref || 0;
        return sum + (bom.qty_requerida * unitCost);
      }, 0);

      // Calculate totals and margins
      const totalCost = laborCost + materialCost;
      const grossMargin = project.presupuesto_total - totalCost;
      const grossMarginPercentage = project.presupuesto_total > 0 
        ? (grossMargin / project.presupuesto_total) * 100 
        : 0;

      return {
        projectId: project.id,
        projectName: project.nombre,
        budgetTotal: project.presupuesto_total,
        currency: project.moneda,
        laborCost,
        materialCost,
        totalCost,
        grossMargin,
        grossMarginPercentage,
        status: project.estado
      };
    });
  };

  const calculateCostBreakdown = (profitabilityData: ProjectProfitabilityData[]): CostBreakdownData[] => {
    const totalLaborCost = profitabilityData.reduce((sum, item) => sum + item.laborCost, 0);
    const totalMaterialCost = profitabilityData.reduce((sum, item) => sum + item.materialCost, 0);
    const totalCost = totalLaborCost + totalMaterialCost;

    if (totalCost === 0) {
      return [];
    }

    return [
      {
        category: 'Mano de Obra',
        amount: totalLaborCost,
        percentage: (totalLaborCost / totalCost) * 100,
        currency: 'PEN' // Default currency for breakdown
      },
      {
        category: 'Materiales',
        amount: totalMaterialCost,
        percentage: (totalMaterialCost / totalCost) * 100,
        currency: 'PEN'
      }
    ];
  };

  const getMarginColor = (percentage: number) => {
    if (percentage >= 20) return 'bg-green-100 text-green-800';
    if (percentage >= 10) return 'bg-yellow-100 text-yellow-800';
    if (percentage >= 0) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'PEN',
      minimumFractionDigits: 2
    });
    return formatter.format(amount);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <button
              onClick={loadFinancialData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Actualizar
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Project Profitability Report */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Rentabilidad por Proyecto</CardTitle>
          <ExportCsv
            data={projectProfitability}
            filename={`rentabilidad-proyectos-${dateRange.startDate}-${dateRange.endDate}.csv`}
            headers={[
              { key: 'projectName', label: 'Proyecto' },
              { key: 'status', label: 'Estado' },
              { key: 'budgetTotal', label: 'Presupuesto Total' },
              { key: 'currency', label: 'Moneda' },
              { key: 'laborCost', label: 'Costo Mano de Obra' },
              { key: 'materialCost', label: 'Costo Materiales' },
              { key: 'totalCost', label: 'Costo Total' },
              { key: 'grossMargin', label: 'Margen Bruto' },
              { key: 'grossMarginPercentage', label: 'Margen Bruto (%)' }
            ]}
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proyecto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Presupuesto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Costo M.O.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Costo Mat.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Costo Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margen Bruto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margen %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projectProfitability.map((item) => (
                  <tr key={item.projectId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.projectName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-blue-100 text-blue-800">
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(item.budgetTotal, item.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(item.laborCost, item.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(item.materialCost, item.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(item.totalCost, item.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(item.grossMargin, item.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getMarginColor(item.grossMarginPercentage)}>
                        {item.grossMarginPercentage.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Desglose de Costos</CardTitle>
          <ExportCsv
            data={costBreakdown}
            filename={`desglose-costos-${dateRange.startDate}-${dateRange.endDate}.csv`}
            headers={[
              { key: 'category', label: 'Categoría' },
              { key: 'amount', label: 'Monto' },
              { key: 'percentage', label: 'Porcentaje (%)' }
            ]}
          />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cost Breakdown Table */}
            <div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Porcentaje
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {costBreakdown.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(item.amount, item.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visual Cost Breakdown */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Distribución de Costos</h4>
              {costBreakdown.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.category}</span>
                    <span className="font-medium">{item.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        index === 0 ? 'bg-blue-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {projectProfitability.length > 0 
                  ? formatCurrency(
                      projectProfitability.reduce((sum, item) => sum + item.budgetTotal, 0),
                      'PEN'
                    )
                  : formatCurrency(0, 'PEN')
                }
              </div>
              <div className="text-sm text-gray-500">Presupuesto Total</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {projectProfitability.length > 0 
                  ? formatCurrency(
                      projectProfitability.reduce((sum, item) => sum + item.totalCost, 0),
                      'PEN'
                    )
                  : formatCurrency(0, 'PEN')
                }
              </div>
              <div className="text-sm text-gray-500">Costo Total</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {projectProfitability.length > 0 
                  ? formatCurrency(
                      projectProfitability.reduce((sum, item) => sum + item.grossMargin, 0),
                      'PEN'
                    )
                  : formatCurrency(0, 'PEN')
                }
              </div>
              <div className="text-sm text-gray-500">Margen Bruto Total</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {projectProfitability.length > 0 
                  ? (
                      projectProfitability.reduce((sum, item) => sum + item.grossMarginPercentage, 0) / 
                      projectProfitability.length
                    ).toFixed(1)
                  : '0'
                }%
              </div>
              <div className="text-sm text-gray-500">Margen Promedio</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}