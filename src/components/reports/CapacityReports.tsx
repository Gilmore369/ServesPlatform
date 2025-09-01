'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/Loading';
import { ExportCsv } from '@/components/ui/ExportCsv';
import { apiClient } from '@/lib/apiClient';
import { Personnel, Assignment, TimeEntry, Project, Activity } from '@/lib/types';

interface CrewUtilizationData {
  personnelId: string;
  personnelName: string;
  specialty: string;
  zone: string;
  plannedHours: number;
  actualHours: number;
  utilizationRate: number;
  activeAssignments: number;
}

interface PlanVsActualData {
  projectId: string;
  projectName: string;
  plannedHours: number;
  actualHours: number;
  variance: number;
  variancePercentage: number;
  status: string;
}

export default function CapacityReports() {
  const [loading, setLoading] = useState(true);
  const [crewUtilization, setCrewUtilization] = useState<CrewUtilizationData[]>([]);
  const [planVsActual, setPlanVsActual] = useState<PlanVsActualData[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadCapacityData();
  }, [dateRange]);

  const loadCapacityData = async () => {
    try {
      setLoading(true);
      
      // Fetch all required data
      const [personnelResponse, assignmentsResponse, timeEntriesResponse, projectsResponse, activitiesResponse] = await Promise.all([
        apiClient.getPersonnel(),
        apiClient.getAssignments(),
        apiClient.getTimeEntries(),
        apiClient.getProjects(),
        apiClient.getActivities()
      ]);

      if (personnelResponse.ok && assignmentsResponse.ok && timeEntriesResponse.ok && projectsResponse.ok && activitiesResponse.ok) {
        const personnel = personnelResponse.data || [];
        const assignments = assignmentsResponse.data || [];
        const timeEntries = timeEntriesResponse.data || [];
        const projects = projectsResponse.data || [];
        const activities = activitiesResponse.data || [];

        // Filter data by date range
        const filteredTimeEntries = timeEntries.filter(te => {
          const entryDate = new Date(te.fecha);
          const startDate = new Date(dateRange.startDate);
          const endDate = new Date(dateRange.endDate);
          return entryDate >= startDate && entryDate <= endDate;
        });

        const filteredAssignments = assignments.filter(assignment => {
          const startDate = new Date(assignment.fecha_inicio);
          const endDate = new Date(assignment.fecha_fin);
          const rangeStart = new Date(dateRange.startDate);
          const rangeEnd = new Date(dateRange.endDate);
          
          // Check if assignment overlaps with date range
          return startDate <= rangeEnd && endDate >= rangeStart;
        });

        // Calculate crew utilization
        const utilizationData = calculateCrewUtilization(personnel, filteredAssignments, filteredTimeEntries);
        setCrewUtilization(utilizationData);

        // Calculate plan vs actual
        const planActualData = calculatePlanVsActual(projects, activities, filteredAssignments, filteredTimeEntries);
        setPlanVsActual(planActualData);
      }
    } catch (error) {
      console.error('Error loading capacity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCrewUtilization = (
    personnel: Personnel[], 
    assignments: Assignment[], 
    timeEntries: TimeEntry[]
  ): CrewUtilizationData[] => {
    return personnel.filter(person => person.activo).map(person => {
      // Get assignments for this person
      const personAssignments = assignments.filter(a => a.colaborador_id === person.id && a.activo);
      
      // Calculate planned hours from assignments
      const plannedHours = personAssignments.reduce((sum, assignment) => {
        return sum + assignment.horas_planificadas;
      }, 0);

      // Calculate actual hours from time entries
      const personTimeEntries = timeEntries.filter(te => te.colaborador_id === person.id);
      const actualHours = personTimeEntries.reduce((sum, te) => sum + te.horas_trabajadas, 0);

      // Calculate utilization rate
      const utilizationRate = plannedHours > 0 ? (actualHours / plannedHours) * 100 : 0;

      return {
        personnelId: person.id,
        personnelName: person.nombres,
        specialty: person.especialidad,
        zone: person.zona,
        plannedHours,
        actualHours,
        utilizationRate,
        activeAssignments: personAssignments.length
      };
    });
  };

  const calculatePlanVsActual = (
    projects: Project[],
    activities: Activity[],
    assignments: Assignment[],
    timeEntries: TimeEntry[]
  ): PlanVsActualData[] => {
    return projects.map(project => {
      // Get project assignments and calculate planned hours
      const projectAssignments = assignments.filter(a => a.proyecto_id === project.id);
      const plannedHours = projectAssignments.reduce((sum, assignment) => {
        return sum + assignment.horas_planificadas;
      }, 0);

      // Get actual hours from time entries
      const projectTimeEntries = timeEntries.filter(te => te.proyecto_id === project.id);
      const actualHours = projectTimeEntries.reduce((sum, te) => sum + te.horas_trabajadas, 0);

      // Calculate variance
      const variance = actualHours - plannedHours;
      const variancePercentage = plannedHours > 0 ? (variance / plannedHours) * 100 : 0;

      return {
        projectId: project.id,
        projectName: project.nombre,
        plannedHours,
        actualHours,
        variance,
        variancePercentage,
        status: project.estado
      };
    });
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80 && rate <= 120) return 'bg-green-100 text-green-800';
    if (rate >= 60 && rate < 80) return 'bg-yellow-100 text-yellow-800';
    if (rate > 120) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getVarianceColor = (percentage: number) => {
    const absPercentage = Math.abs(percentage);
    if (absPercentage <= 10) return 'bg-green-100 text-green-800';
    if (absPercentage <= 25) return 'bg-yellow-100 text-yellow-800';
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
              onClick={loadCapacityData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Actualizar
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Crew Utilization Report */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Utilización de Cuadrillas</CardTitle>
          <ExportCsv
            data={crewUtilization}
            filename={`utilizacion-cuadrillas-${dateRange.startDate}-${dateRange.endDate}.csv`}
            headers={[
              { key: 'personnelName', label: 'Colaborador' },
              { key: 'specialty', label: 'Especialidad' },
              { key: 'zone', label: 'Zona' },
              { key: 'plannedHours', label: 'Horas Planificadas' },
              { key: 'actualHours', label: 'Horas Reales' },
              { key: 'utilizationRate', label: 'Tasa de Utilización (%)' },
              { key: 'activeAssignments', label: 'Asignaciones Activas' }
            ]}
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Colaborador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Especialidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zona
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    H. Planificadas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    H. Reales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilización
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asignaciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {crewUtilization.map((item) => (
                  <tr key={item.personnelId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.personnelName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.specialty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.zone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.plannedHours.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.actualHours.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getUtilizationColor(item.utilizationRate)}>
                        {item.utilizationRate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.activeAssignments}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Plan vs Actual Report */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Plan vs Ejecutado por Proyecto</CardTitle>
          <ExportCsv
            data={planVsActual}
            filename={`plan-vs-ejecutado-${dateRange.startDate}-${dateRange.endDate}.csv`}
            headers={[
              { key: 'projectName', label: 'Proyecto' },
              { key: 'status', label: 'Estado' },
              { key: 'plannedHours', label: 'Horas Planificadas' },
              { key: 'actualHours', label: 'Horas Reales' },
              { key: 'variance', label: 'Variación (horas)' },
              { key: 'variancePercentage', label: 'Variación (%)' }
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
                    H. Planificadas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    H. Reales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variación (h)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variación (%)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {planVsActual.map((item) => (
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
                      {item.plannedHours.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.actualHours.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.variance > 0 ? '+' : ''}{item.variance.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getVarianceColor(item.variancePercentage)}>
                        {item.variancePercentage > 0 ? '+' : ''}{item.variancePercentage.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {crewUtilization.length > 0 
                  ? (crewUtilization.reduce((sum, item) => sum + item.utilizationRate, 0) / crewUtilization.length).toFixed(1)
                  : '0'
                }%
              </div>
              <div className="text-sm text-gray-500">Utilización Promedio</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {crewUtilization.filter(item => item.utilizationRate >= 80 && item.utilizationRate <= 120).length}
              </div>
              <div className="text-sm text-gray-500">Colaboradores en Rango Óptimo</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {planVsActual.length > 0 
                  ? (planVsActual.reduce((sum, item) => sum + Math.abs(item.variancePercentage), 0) / planVsActual.length).toFixed(1)
                  : '0'
                }%
              </div>
              <div className="text-sm text-gray-500">Variación Promedio Plan vs Real</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}