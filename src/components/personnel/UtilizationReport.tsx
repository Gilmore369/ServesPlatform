'use client';

import { useState, useEffect } from 'react';
import { Personnel, Assignment, TimeEntry, Project } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/Loading';
import { 
  ChartBarIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon 
} from '@heroicons/react/24/outline';

interface UtilizationData {
  personnel: Personnel;
  horasPlanificadas: number;
  horasEjecutadas: number;
  utilizacion: number;
  proyectosActivos: number;
  asignacionesActivas: number;
}

interface UtilizationReportProps {
  personnelId?: string;
  dateRange?: {
    fecha_inicio: string;
    fecha_fin: string;
  };
}

export function UtilizationReport({ personnelId, dateRange }: UtilizationReportProps) {
  const [utilizationData, setUtilizationData] = useState<UtilizationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof UtilizationData>('utilizacion');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load utilization data
  const loadUtilizationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all required data
      const [personnelResponse, assignmentsResponse, timeEntriesResponse, projectsResponse] = await Promise.all([
        personnelId 
          ? apiClient.getPersonnelMember(personnelId).then(r => ({ ok: r.ok, data: r.data ? [r.data] : [] }))
          : apiClient.getPersonnel({ limit: 100 }),
        apiClient.getAssignments({ limit: 1000 }),
        apiClient.getTimeEntries({ limit: 1000 }),
        apiClient.getProjects({ limit: 100 }),
      ]);

      if (!personnelResponse.ok || !assignmentsResponse.ok || !timeEntriesResponse.ok || !projectsResponse.ok) {
        throw new Error('Error al cargar datos');
      }

      const personnel = personnelResponse.data || [];
      const assignments = assignmentsResponse.data || [];
      const timeEntries = timeEntriesResponse.data || [];
      const projects = projectsResponse.data || [];

      // Filter data by date range if provided
      const filteredAssignments = dateRange 
        ? assignments.filter(assignment => {
            const startDate = new Date(assignment.fecha_inicio);
            const endDate = new Date(assignment.fecha_fin);
            const rangeStart = new Date(dateRange.fecha_inicio);
            const rangeEnd = new Date(dateRange.fecha_fin);
            
            return (startDate <= rangeEnd && endDate >= rangeStart);
          })
        : assignments;

      const filteredTimeEntries = dateRange
        ? timeEntries.filter(entry => {
            const entryDate = new Date(entry.fecha);
            const rangeStart = new Date(dateRange.fecha_inicio);
            const rangeEnd = new Date(dateRange.fecha_fin);
            
            return entryDate >= rangeStart && entryDate <= rangeEnd;
          })
        : timeEntries;

      // Calculate utilization for each personnel
      const utilizationData: UtilizationData[] = personnel
        .filter(person => person.activo)
        .map(person => {
          // Get assignments for this person
          const personAssignments = filteredAssignments.filter(
            assignment => assignment.colaborador_id === person.id && assignment.activo
          );

          // Get time entries for this person
          const personTimeEntries = filteredTimeEntries.filter(
            entry => entry.colaborador_id === person.id
          );

          // Calculate planned hours
          const horasPlanificadas = personAssignments.reduce((sum, assignment) => {
            if (dateRange) {
              // Calculate overlap between assignment and date range
              const assignmentStart = new Date(assignment.fecha_inicio);
              const assignmentEnd = new Date(assignment.fecha_fin);
              const rangeStart = new Date(dateRange.fecha_inicio);
              const rangeEnd = new Date(dateRange.fecha_fin);
              
              const overlapStart = new Date(Math.max(assignmentStart.getTime(), rangeStart.getTime()));
              const overlapEnd = new Date(Math.min(assignmentEnd.getTime(), rangeEnd.getTime()));
              
              if (overlapStart <= overlapEnd) {
                const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const totalDays = Math.ceil((assignmentEnd.getTime() - assignmentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const proportionalHours = (assignment.horas_planificadas * overlapDays) / totalDays;
                return sum + proportionalHours;
              }
              return sum;
            }
            return sum + assignment.horas_planificadas;
          }, 0);

          // Calculate executed hours
          const horasEjecutadas = personTimeEntries.reduce((sum, entry) => sum + entry.horas_trabajadas, 0);

          // Calculate utilization percentage
          const utilizacion = horasPlanificadas > 0 ? (horasEjecutadas / horasPlanificadas) * 100 : 0;

          // Count active projects
          const proyectosActivos = new Set(
            personAssignments.map(assignment => assignment.proyecto_id)
          ).size;

          return {
            personnel: person,
            horasPlanificadas,
            horasEjecutadas,
            utilizacion,
            proyectosActivos,
            asignacionesActivas: personAssignments.length,
          };
        });

      setUtilizationData(utilizationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos de utilización');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUtilizationData();
  }, [personnelId, dateRange]);

  // Sort data
  const sortedData = [...utilizationData].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'object' && 'nombres' in aValue) {
      // Handle Personnel object
      const aName = (aValue as Personnel).nombres;
      const bName = (bValue as Personnel).nombres;
      return sortDirection === 'asc' 
        ? aName.localeCompare(bName)
        : bName.localeCompare(aName);
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof UtilizationData) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Calculate summary statistics
  const totalPersonnel = utilizationData.length;
  const avgUtilization = totalPersonnel > 0 
    ? utilizationData.reduce((sum, data) => sum + data.utilizacion, 0) / totalPersonnel 
    : 0;
  const totalPlannedHours = utilizationData.reduce((sum, data) => sum + data.horasPlanificadas, 0);
  const totalExecutedHours = utilizationData.reduce((sum, data) => sum + data.horasEjecutadas, 0);

  // Get utilization status
  const getUtilizationStatus = (utilization: number) => {
    if (utilization >= 90) return { color: 'green' as const, label: 'Óptima' };
    if (utilization >= 70) return { color: 'yellow' as const, label: 'Buena' };
    if (utilization >= 50) return { color: 'orange' as const, label: 'Regular' };
    return { color: 'red' as const, label: 'Baja' };
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-medium text-gray-900">Reporte de Utilización</h2>
        <p className="text-sm text-gray-600">
          Análisis de utilización del personal y KPIs de productividad
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <UserIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Personal Activo</p>
              <p className="text-2xl font-bold text-gray-900">{totalPersonnel}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Utilización Promedio</p>
              <p className="text-2xl font-bold text-gray-900">{avgUtilization.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Horas Planificadas</p>
              <p className="text-2xl font-bold text-gray-900">{totalPlannedHours.toFixed(0)}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Horas Ejecutadas</p>
              <p className="text-2xl font-bold text-gray-900">{totalExecutedHours.toFixed(0)}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Utilization Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Detalle por Colaborador</h3>
        </div>
        
        {sortedData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('personnel')}
                  >
                    Colaborador
                    {sortField === 'personnel' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Especialidad
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('horasPlanificadas')}
                  >
                    Horas Plan.
                    {sortField === 'horasPlanificadas' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('horasEjecutadas')}
                  >
                    Horas Ejec.
                    {sortField === 'horasEjecutadas' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('utilizacion')}
                  >
                    Utilización
                    {sortField === 'utilizacion' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('proyectosActivos')}
                  >
                    Proyectos
                    {sortField === 'proyectosActivos' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('asignacionesActivas')}
                  >
                    Asignaciones
                    {sortField === 'asignacionesActivas' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((data) => {
                  const utilizationStatus = getUtilizationStatus(data.utilizacion);
                  const variance = data.horasEjecutadas - data.horasPlanificadas;
                  
                  return (
                    <tr key={data.personnel.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-700">
                                {data.personnel.nombres.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {data.personnel.nombres}
                            </div>
                            <div className="text-sm text-gray-500">
                              {data.personnel.zona}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.personnel.especialidad}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.horasPlanificadas.toFixed(1)}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {data.horasEjecutadas.toFixed(1)}h
                          {variance !== 0 && (
                            <span className={`ml-2 flex items-center text-xs ${
                              variance > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {variance > 0 ? (
                                <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                              ) : (
                                <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
                              )}
                              {Math.abs(variance).toFixed(1)}h
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Badge color={utilizationStatus.color}>
                            {data.utilizacion.toFixed(1)}%
                          </Badge>
                          <span className="ml-2 text-xs text-gray-500">
                            {utilizationStatus.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.proyectosActivos}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.asignacionesActivas}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Sin datos de utilización</h3>
            <p className="mt-1 text-sm text-gray-500">
              No hay datos suficientes para generar el reporte de utilización.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}