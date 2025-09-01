'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/Loading';
import { ExportCsv } from '@/components/ui/ExportCsv';
import { ReportExporter } from '@/lib/exportUtils';
import { apiClient } from '@/lib/apiClient';
import { Project, Activity, TimeEntry } from '@/lib/types';

interface ScheduleComplianceData {
  projectId: string;
  projectName: string;
  totalActivities: number;
  completedOnTime: number;
  completedLate: number;
  pending: number;
  complianceRate: number;
}

interface AverageDurationData {
  activityType: string;
  plannedDuration: number;
  actualDuration: number;
  variance: number;
  count: number;
}

interface ReworkData {
  projectId: string;
  projectName: string;
  totalActivities: number;
  reworkActivities: number;
  reworkRate: number;
}

export default function OperationalReports() {
  const [loading, setLoading] = useState(true);
  const [scheduleCompliance, setScheduleCompliance] = useState<ScheduleComplianceData[]>([]);
  const [averageDuration, setAverageDuration] = useState<AverageDurationData[]>([]);
  const [reworkData, setReworkData] = useState<ReworkData[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadOperationalData();
  }, [dateRange]);

  const loadOperationalData = async () => {
    try {
      setLoading(true);
      
      // Fetch all required data
      const [projectsResponse, activitiesResponse, timeEntriesResponse] = await Promise.all([
        apiClient.getProjects(),
        apiClient.getActivities(),
        apiClient.getTimeEntries()
      ]);

      if (projectsResponse.ok && activitiesResponse.ok && timeEntriesResponse.ok) {
        const projects = projectsResponse.data || [];
        const activities = activitiesResponse.data || [];
        const timeEntries = timeEntriesResponse.data || [];

        // Calculate schedule compliance
        const complianceData = calculateScheduleCompliance(projects, activities);
        setScheduleCompliance(complianceData);

        // Calculate average duration
        const durationData = calculateAverageDuration(activities, timeEntries);
        setAverageDuration(durationData);

        // Calculate rework data
        const reworkAnalysis = calculateReworkData(projects, activities);
        setReworkData(reworkAnalysis);
      }
    } catch (error) {
      console.error('Error loading operational data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateScheduleCompliance = (projects: Project[], activities: Activity[]): ScheduleComplianceData[] => {
    return projects.map(project => {
      const projectActivities = activities.filter(a => a.proyecto_id === project.id);
      const now = new Date();
      
      let completedOnTime = 0;
      let completedLate = 0;
      let pending = 0;

      projectActivities.forEach(activity => {
        const finPlan = new Date(activity.fin_plan);
        
        if (activity.estado === 'Completada') {
          // For completed activities, check if they were completed on time
          // Since we don't have completion date, we'll use updated_at as proxy
          const completionDate = new Date(activity.updated_at);
          if (completionDate <= finPlan) {
            completedOnTime++;
          } else {
            completedLate++;
          }
        } else {
          // For pending activities, check if they're overdue
          if (now > finPlan) {
            completedLate++; // Overdue activities count as late
          } else {
            pending++;
          }
        }
      });

      const totalActivities = projectActivities.length;
      const complianceRate = totalActivities > 0 ? (completedOnTime / totalActivities) * 100 : 0;

      return {
        projectId: project.id,
        projectName: project.nombre,
        totalActivities,
        completedOnTime,
        completedLate,
        pending,
        complianceRate
      };
    });
  };

  const calculateAverageDuration = (activities: Activity[], timeEntries: TimeEntry[]): AverageDurationData[] => {
    // Group activities by type (using first word of title as type)
    const activityTypes: { [key: string]: { planned: number[], actual: number[] } } = {};

    activities.forEach(activity => {
      const type = activity.titulo.split(' ')[0] || 'General';
      
      if (!activityTypes[type]) {
        activityTypes[type] = { planned: [], actual: [] };
      }

      // Calculate planned duration in days
      const startDate = new Date(activity.inicio_plan);
      const endDate = new Date(activity.fin_plan);
      const plannedDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      activityTypes[type].planned.push(plannedDays);

      // Calculate actual duration from time entries
      const activityTimeEntries = timeEntries.filter(te => te.actividad_id === activity.id);
      const totalHours = activityTimeEntries.reduce((sum, te) => sum + te.horas_trabajadas, 0);
      const actualDays = totalHours / 8; // Assuming 8 hours per day
      activityTypes[type].actual.push(actualDays);
    });

    return Object.entries(activityTypes).map(([type, data]) => {
      const avgPlanned = data.planned.reduce((sum, val) => sum + val, 0) / data.planned.length;
      const avgActual = data.actual.reduce((sum, val) => sum + val, 0) / data.actual.length;
      const variance = ((avgActual - avgPlanned) / avgPlanned) * 100;

      return {
        activityType: type,
        plannedDuration: avgPlanned,
        actualDuration: avgActual,
        variance,
        count: data.planned.length
      };
    });
  };

  const calculateReworkData = (projects: Project[], activities: Activity[]): ReworkData[] => {
    return projects.map(project => {
      const projectActivities = activities.filter(a => a.proyecto_id === project.id);
      
      // Identify rework activities (activities that went back from completed to in progress)
      // For this MVP, we'll consider activities with "revision" or "retrabajo" in description as rework
      const reworkActivities = projectActivities.filter(activity => 
        activity.descripcion?.toLowerCase().includes('revision') ||
        activity.descripcion?.toLowerCase().includes('retrabajo') ||
        activity.estado === 'En revisión'
      );

      const totalActivities = projectActivities.length;
      const reworkCount = reworkActivities.length;
      const reworkRate = totalActivities > 0 ? (reworkCount / totalActivities) * 100 : 0;

      return {
        projectId: project.id,
        projectName: project.nombre,
        totalActivities,
        reworkActivities: reworkCount,
        reworkRate
      };
    });
  };

  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-100 text-green-800';
    if (rate >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getVarianceColor = (variance: number) => {
    if (variance <= 10) return 'bg-green-100 text-green-800';
    if (variance <= 25) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
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
              onClick={loadOperationalData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Actualizar
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Compliance Report */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cumplimiento de Programación</CardTitle>
          <div className="flex gap-2">
            <ExportCsv
              data={scheduleCompliance}
              filename={`cumplimiento-programacion-${dateRange.startDate}-${dateRange.endDate}.csv`}
              headers={[
                { key: 'projectName', label: 'Proyecto' },
                { key: 'totalActivities', label: 'Total Actividades', format: 'number' },
                { key: 'completedOnTime', label: 'Completadas a Tiempo', format: 'number' },
                { key: 'completedLate', label: 'Completadas Tarde', format: 'number' },
                { key: 'pending', label: 'Pendientes', format: 'number' },
                { key: 'complianceRate', label: 'Tasa de Cumplimiento (%)', format: 'percentage' }
              ]}
              showAdvancedOptions={true}
            />
            <button
              onClick={() => ReportExporter.exportOperationalReport(scheduleCompliance, dateRange)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              title="Exportación Rápida"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Rápido
            </button>
          </div>
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
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    A Tiempo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarde
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pendientes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cumplimiento
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scheduleCompliance.map((item) => (
                  <tr key={item.projectId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.projectName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.totalActivities}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.completedOnTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.completedLate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.pending}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getComplianceColor(item.complianceRate)}>
                        {item.complianceRate.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Average Duration Report */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Duración Promedio por Tipo de Actividad</CardTitle>
          <ExportCsv
            data={averageDuration}
            filename={`duracion-promedio-${dateRange.startDate}-${dateRange.endDate}.csv`}
            headers={[
              { key: 'activityType', label: 'Tipo de Actividad' },
              { key: 'plannedDuration', label: 'Duración Planificada (días)' },
              { key: 'actualDuration', label: 'Duración Real (días)' },
              { key: 'variance', label: 'Variación (%)' },
              { key: 'count', label: 'Cantidad' }
            ]}
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Actividad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Planificado (días)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Real (días)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {averageDuration.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.activityType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.plannedDuration.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.actualDuration.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getVarianceColor(Math.abs(item.variance))}>
                        {item.variance > 0 ? '+' : ''}{item.variance.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Rework Analysis Report */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Análisis de Retrabajos</CardTitle>
          <ExportCsv
            data={reworkData}
            filename={`retrabajos-${dateRange.startDate}-${dateRange.endDate}.csv`}
            headers={[
              { key: 'projectName', label: 'Proyecto' },
              { key: 'totalActivities', label: 'Total Actividades' },
              { key: 'reworkActivities', label: 'Retrabajos' },
              { key: 'reworkRate', label: 'Tasa de Retrabajo (%)' }
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
                    Total Actividades
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Retrabajos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasa de Retrabajo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reworkData.map((item) => (
                  <tr key={item.projectId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.projectName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.totalActivities}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.reworkActivities}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getVarianceColor(item.reworkRate)}>
                        {item.reworkRate.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}