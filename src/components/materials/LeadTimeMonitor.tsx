'use client';

import { useState, useEffect } from 'react';
import { BOM, Material } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

interface LeadTimeAlert {
  id: string;
  material: Material;
  bom: BOM;
  expectedDelivery: Date;
  actualDelivery?: Date;
  daysDelayed: number;
  status: 'on_time' | 'at_risk' | 'delayed';
  alertLevel: 'low' | 'medium' | 'high';
}

interface LeadTimeMonitorProps {
  projectId?: string;
}

export function LeadTimeMonitor({ projectId }: LeadTimeMonitorProps) {
  const [alerts, setAlerts] = useState<LeadTimeAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'at_risk' | 'delayed'>('all');

  useEffect(() => {
    loadLeadTimeData();
  }, [projectId]);

  const loadLeadTimeData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load BOMs and materials
      const [bomsResponse, materialsResponse] = await Promise.all([
        projectId 
          ? apiClient.getProjectBOMs(projectId)
          : apiClient.getBOMs({ limit: 1000 }),
        apiClient.getMaterials({ limit: 1000 }),
      ]);

      if (bomsResponse.ok && bomsResponse.data && materialsResponse.ok && materialsResponse.data) {
        const materials = materialsResponse.data;
        const boms = bomsResponse.data;

        // Calculate lead time alerts
        const leadTimeAlerts: LeadTimeAlert[] = boms
          .filter(bom => ['Pedido', 'En tránsito', 'Recibido'].includes(bom.estado_abastecimiento))
          .map(bom => {
            const material = materials.find(m => m.id === bom.material_id);
            if (!material) return null;

            // Calculate expected delivery date
            const orderDate = new Date(bom.created_at);
            const expectedDelivery = new Date(orderDate);
            expectedDelivery.setDate(expectedDelivery.getDate() + bom.lead_time_dias);

            // Calculate actual delivery (if delivered)
            const actualDelivery = bom.estado_abastecimiento === 'Entregado' 
              ? new Date(bom.updated_at) 
              : undefined;

            // Calculate delay
            const today = new Date();
            const referenceDate = actualDelivery || today;
            const daysDelayed = Math.ceil((referenceDate.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24));

            // Determine status and alert level
            let status: 'on_time' | 'at_risk' | 'delayed';
            let alertLevel: 'low' | 'medium' | 'high';

            if (bom.estado_abastecimiento === 'Entregado') {
              status = daysDelayed <= 0 ? 'on_time' : 'delayed';
              alertLevel = daysDelayed <= 2 ? 'low' : daysDelayed <= 7 ? 'medium' : 'high';
            } else {
              // For items still in transit
              const daysUntilExpected = Math.ceil((expectedDelivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysUntilExpected < -2) {
                status = 'delayed';
                alertLevel = 'high';
              } else if (daysUntilExpected <= 1) {
                status = 'at_risk';
                alertLevel = 'medium';
              } else {
                status = 'on_time';
                alertLevel = 'low';
              }
            }

            return {
              id: bom.id,
              material,
              bom,
              expectedDelivery,
              actualDelivery,
              daysDelayed,
              status,
              alertLevel,
            };
          })
          .filter(Boolean) as LeadTimeAlert[];

        setAlerts(leadTimeAlerts);
      }
    } catch (err) {
      console.error('Error loading lead time data:', err);
      setError('Error al cargar datos de lead time');
    } finally {
      setLoading(false);
    }
  };

  // Filter alerts based on status
  const filteredAlerts = alerts.filter(alert => {
    if (filterStatus === 'all') return true;
    return alert.status === filterStatus;
  });

  // Calculate summary metrics
  const metrics = {
    total: alerts.length,
    onTime: alerts.filter(a => a.status === 'on_time').length,
    atRisk: alerts.filter(a => a.status === 'at_risk').length,
    delayed: alerts.filter(a => a.status === 'delayed').length,
    avgDelay: alerts.length > 0 
      ? Math.round(alerts.reduce((sum, a) => sum + Math.max(0, a.daysDelayed), 0) / alerts.length)
      : 0,
  };

  // Status colors and icons
  const getStatusDisplay = (alert: LeadTimeAlert) => {
    switch (alert.status) {
      case 'on_time':
        return {
          color: 'bg-green-100 text-green-800',
          icon: CheckCircleIcon,
          text: 'A Tiempo',
        };
      case 'at_risk':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: ExclamationTriangleIcon,
          text: 'En Riesgo',
        };
      case 'delayed':
        return {
          color: 'bg-red-100 text-red-800',
          icon: ExclamationTriangleIcon,
          text: 'Retrasado',
        };
    }
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadLeadTimeData}
          className="mt-2 text-blue-600 hover:text-blue-800 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Monitor de Lead Times</h3>
        <p className="text-gray-600">
          Seguimiento de tiempos de entrega y alertas de retrasos
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Total Items</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{metrics.total}</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-600">A Tiempo</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{metrics.onTime}</p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-600">En Riesgo</span>
          </div>
          <p className="text-2xl font-bold text-yellow-900">{metrics.atRisk}</p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-600">Retrasados</span>
          </div>
          <p className="text-2xl font-bold text-red-900">{metrics.delayed}</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-600">Retraso Prom.</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">{metrics.avgDelay} días</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos los estados</option>
          <option value="at_risk">En riesgo</option>
          <option value="delayed">Retrasados</option>
        </select>
      </div>

      {/* Alerts Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado Pedido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Esperada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Real
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Retraso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado Lead Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nivel Alerta
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No hay alertas de lead time para mostrar
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const statusDisplay = getStatusDisplay(alert);
                  const StatusIcon = statusDisplay.icon;

                  return (
                    <tr key={alert.id} className={
                      alert.alertLevel === 'high' ? 'bg-red-50' :
                      alert.alertLevel === 'medium' ? 'bg-yellow-50' : ''
                    }>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {alert.material.descripcion}
                          </div>
                          <div className="text-sm text-gray-500">
                            SKU: {alert.material.sku}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={
                          alert.bom.estado_abastecimiento === 'Pedido' ? 'bg-yellow-100 text-yellow-800' :
                          alert.bom.estado_abastecimiento === 'En tránsito' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }>
                          {alert.bom.estado_abastecimiento}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {alert.expectedDelivery.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {alert.actualDelivery 
                          ? alert.actualDelivery.toLocaleDateString()
                          : 'Pendiente'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          alert.daysDelayed > 0 ? 'text-red-600' :
                          alert.daysDelayed === 0 ? 'text-green-600' :
                          'text-blue-600'
                        }`}>
                          {alert.daysDelayed > 0 
                            ? `+${alert.daysDelayed} días`
                            : alert.daysDelayed === 0
                            ? 'A tiempo'
                            : `${alert.daysDelayed} días`
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4" />
                          <Badge className={statusDisplay.color}>
                            {statusDisplay.text}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getAlertLevelColor(alert.alertLevel)}>
                          {alert.alertLevel === 'low' ? 'Bajo' :
                           alert.alertLevel === 'medium' ? 'Medio' : 'Alto'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="text-sm text-gray-600">
          <strong>Resumen:</strong> De {metrics.total} items monitoreados, {metrics.delayed} están retrasados 
          y {metrics.atRisk} están en riesgo de retraso. El retraso promedio es de {metrics.avgDelay} días.
        </div>
      </div>
    </div>
  );
}