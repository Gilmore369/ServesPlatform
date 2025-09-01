'use client';

import { useState, useEffect } from 'react';
import { BOM, Material, Project } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { Badge } from '@/components/ui/badge';
import { CardKpi } from '@/components/ui/CardKpi';
import { Loading } from '@/components/ui/Loading';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TruckIcon,
  ShoppingCartIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

interface ProcurementDashboardProps {
  projectId?: string;
}

interface ProcurementMetrics {
  totalBOMs: number;
  pendingOrders: number;
  inTransit: number;
  delivered: number;
  overdueBOMs: number;
  avgLeadTime: number;
  totalValue: number;
  criticalItems: number;
}

interface ProcurementItem extends BOM {
  material: Material;
  project: Project;
  daysUntilRequired: number;
  isOverdue: boolean;
  isCritical: boolean;
}

export function ProcurementDashboard({ projectId }: ProcurementDashboardProps) {
  const [procurementItems, setProcurementItems] = useState<ProcurementItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'overdue' | 'critical'>('overview');

  useEffect(() => {
    loadProcurementData();
  }, [projectId]);

  const loadProcurementData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load BOMs, materials, and projects
      const [bomsResponse, materialsResponse, projectsResponse] = await Promise.all([
        projectId 
          ? apiClient.getProjectBOMs(projectId)
          : apiClient.getBOMs({ limit: 1000 }),
        apiClient.getMaterials({ limit: 1000 }),
        projectId 
          ? apiClient.getProject(projectId).then(res => res.ok && res.data ? [res.data] : [])
          : apiClient.getProjects({ limit: 1000 }).then(res => res.ok && res.data ? res.data : []),
      ]);

      if (materialsResponse.ok && materialsResponse.data) {
        setMaterials(materialsResponse.data);
      }

      if (Array.isArray(projectsResponse)) {
        setProjects(projectsResponse);
      } else if (projectsResponse.ok && projectsResponse.data) {
        setProjects(projectsResponse.data);
      }

      if (bomsResponse.ok && bomsResponse.data) {
        // Enrich BOMs with material and project data
        const enrichedBOMs = bomsResponse.data.map(bom => {
          const material = materialsResponse.data?.find(m => m.id === bom.material_id);
          const project = Array.isArray(projectsResponse) 
            ? projectsResponse.find(p => p.id === bom.proyecto_id)
            : projectsResponse.data?.find?.(p => p.id === bom.proyecto_id) || projectsResponse.data;

          const requiredDate = new Date(bom.fecha_requerida);
          const today = new Date();
          const daysUntilRequired = Math.ceil((requiredDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const isOverdue = daysUntilRequired < 0 && bom.estado_abastecimiento !== 'Entregado';
          const isCritical = daysUntilRequired <= 7 && bom.estado_abastecimiento === 'Por pedir';

          return {
            ...bom,
            material: material!,
            project: project!,
            daysUntilRequired,
            isOverdue,
            isCritical,
          };
        }).filter(item => item.material && item.project);

        setProcurementItems(enrichedBOMs);
      }
    } catch (err) {
      console.error('Error loading procurement data:', err);
      setError('Error al cargar datos de abastecimiento');
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const calculateMetrics = (): ProcurementMetrics => {
    const totalBOMs = procurementItems.length;
    const pendingOrders = procurementItems.filter(item => item.estado_abastecimiento === 'Por pedir').length;
    const inTransit = procurementItems.filter(item => 
      ['Pedido', 'En tránsito'].includes(item.estado_abastecimiento)
    ).length;
    const delivered = procurementItems.filter(item => item.estado_abastecimiento === 'Entregado').length;
    const overdueBOMs = procurementItems.filter(item => item.isOverdue).length;
    const criticalItems = procurementItems.filter(item => item.isCritical).length;
    
    const totalValue = procurementItems.reduce((sum, item) => 
      sum + (item.qty_requerida * item.costo_unit_est), 0
    );
    
    const avgLeadTime = procurementItems.length > 0
      ? procurementItems.reduce((sum, item) => sum + item.lead_time_dias, 0) / procurementItems.length
      : 0;

    return {
      totalBOMs,
      pendingOrders,
      inTransit,
      delivered,
      overdueBOMs,
      avgLeadTime: Math.round(avgLeadTime),
      totalValue,
      criticalItems,
    };
  };

  // Filter items based on active tab
  const getFilteredItems = () => {
    switch (activeTab) {
      case 'pending':
        return procurementItems.filter(item => item.estado_abastecimiento === 'Por pedir');
      case 'overdue':
        return procurementItems.filter(item => item.isOverdue);
      case 'critical':
        return procurementItems.filter(item => item.isCritical);
      default:
        return procurementItems;
    }
  };

  // Status colors
  const statusColors = {
    'Por pedir': 'bg-red-100 text-red-800',
    'Pedido': 'bg-yellow-100 text-yellow-800',
    'En tránsito': 'bg-blue-100 text-blue-800',
    'Recibido': 'bg-purple-100 text-purple-800',
    'Entregado': 'bg-green-100 text-green-800',
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadProcurementData}
          className="mt-2 text-blue-600 hover:text-blue-800 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const metrics = calculateMetrics();
  const filteredItems = getFilteredItems();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard de Abastecimiento</h2>
        <p className="text-gray-600">
          {projectId ? 'Vista del proyecto específico' : 'Vista general de todos los proyectos'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardKpi
          title="Total Items BOM"
          value={metrics.totalBOMs.toString()}
          icon={ShoppingCartIcon}
          color="blue"
        />
        <CardKpi
          title="Pendientes de Pedir"
          value={metrics.pendingOrders.toString()}
          icon={ExclamationTriangleIcon}
          color="red"
        />
        <CardKpi
          title="En Tránsito"
          value={metrics.inTransit.toString()}
          icon={TruckIcon}
          color="yellow"
        />
        <CardKpi
          title="Entregados"
          value={metrics.delivered.toString()}
          icon={CheckCircleIcon}
          color="green"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardKpi
          title="Items Vencidos"
          value={metrics.overdueBOMs.toString()}
          icon={CalendarDaysIcon}
          color="red"
        />
        <CardKpi
          title="Items Críticos"
          value={metrics.criticalItems.toString()}
          icon={ExclamationTriangleIcon}
          color="yellow"
        />
        <CardKpi
          title="Lead Time Promedio"
          value={`${metrics.avgLeadTime} días`}
          icon={ClockIcon}
          color="blue"
        />
        <CardKpi
          title="Valor Total BOM"
          value={`PEN ${metrics.totalValue.toLocaleString()}`}
          icon={ShoppingCartIcon}
          color="green"
        />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: 'Resumen General', count: metrics.totalBOMs },
            { key: 'pending', label: 'Por Pedir', count: metrics.pendingOrders },
            { key: 'overdue', label: 'Vencidos', count: metrics.overdueBOMs },
            { key: 'critical', label: 'Críticos', count: metrics.criticalItems },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Items Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proyecto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Requerida
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No hay items que mostrar para esta vista
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`${
                      item.isOverdue ? 'bg-red-50' : 
                      item.isCritical ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.material.descripcion}
                        </div>
                        <div className="text-sm text-gray-500">
                          SKU: {item.material.sku}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.project.codigo}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.project.nombre}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.qty_requerida} {item.material.unidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={statusColors[item.estado_abastecimiento]}>
                        {item.estado_abastecimiento}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(item.fecha_requerida).toLocaleDateString()}
                      </div>
                      <div className={`text-sm ${
                        item.isOverdue ? 'text-red-600' :
                        item.isCritical ? 'text-yellow-600' :
                        'text-gray-500'
                      }`}>
                        {item.isOverdue ? 
                          `Vencido hace ${Math.abs(item.daysUntilRequired)} días` :
                          item.daysUntilRequired === 0 ?
                          'Hoy' :
                          `En ${item.daysUntilRequired} días`
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.lead_time_dias} días
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.proveedor_sugerido || 'Sin proveedor'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}