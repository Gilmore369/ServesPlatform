'use client';

import { useMemo } from 'react';
import { Project, Activity } from '@/lib/types';
import { CardKpi } from '@/components/ui/CardKpi';
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

interface ProjectStatsProps {
  project: Project;
  activities: Activity[];
}

export function ProjectStats({ project, activities }: ProjectStatsProps) {
  const stats = useMemo(() => {
    const totalActivities = activities.length;
    const completedActivities = activities.filter(a => a.estado === 'Completada').length;
    const inProgressActivities = activities.filter(a => a.estado === 'En progreso').length;
    const overdueActivities = activities.filter(a => {
      const today = new Date();
      const endDate = new Date(a.fin_plan);
      return endDate < today && a.estado !== 'Completada';
    }).length;

    const completionRate = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;
    
    // Calculate project timeline
    const startDate = new Date(project.inicio_plan);
    const endDate = new Date(project.fin_plan);
    const today = new Date();
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const timeProgress = totalDays > 0 ? Math.min((elapsedDays / totalDays) * 100, 100) : 0;
    
    // Calculate average activity progress
    const avgProgress = activities.length > 0 
      ? activities.reduce((sum, a) => sum + a.porcentaje_avance, 0) / activities.length 
      : 0;

    return {
      totalActivities,
      completedActivities,
      inProgressActivities,
      overdueActivities,
      completionRate,
      totalDays,
      elapsedDays,
      remainingDays,
      timeProgress,
      avgProgress,
    };
  }, [project, activities]);

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 60) return 'text-blue-600';
    if (progress >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBgColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-100';
    if (progress >= 60) return 'bg-blue-100';
    if (progress >= 40) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* Total Activities */}
      <CardKpi
        title="Total Actividades"
        value={stats.totalActivities.toString()}
        icon={<ClockIcon className="h-6 w-6" />}
        color="blue"
        subtitle="Actividades planificadas"
      />

      {/* Completed Activities */}
      <CardKpi
        title="Completadas"
        value={stats.completedActivities.toString()}
        icon={<CheckCircleIcon className="h-6 w-6" />}
        color="green"
        subtitle={`${stats.completionRate.toFixed(1)}% del total`}
      />

      {/* In Progress Activities */}
      <CardKpi
        title="En Progreso"
        value={stats.inProgressActivities.toString()}
        icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
        color="blue"
        subtitle="Actividades activas"
      />

      {/* Overdue Activities */}
      <CardKpi
        title="Vencidas"
        value={stats.overdueActivities.toString()}
        icon={<ExclamationTriangleIcon className="h-6 w-6" />}
        color={stats.overdueActivities > 0 ? "red" : "gray"}
        subtitle={stats.overdueActivities > 0 ? "Requieren atención" : "Sin retrasos"}
      />

      {/* Budget Status */}
      <CardKpi
        title="Presupuesto"
        value={`${project.moneda} ${project.presupuesto_total.toLocaleString()}`}
        icon={<CurrencyDollarIcon className="h-6 w-6" />}
        color="purple"
        subtitle="Presupuesto total"
      />

      {/* Timeline Status */}
      <CardKpi
        title="Días Restantes"
        value={stats.remainingDays > 0 ? stats.remainingDays.toString() : "Vencido"}
        icon={<CalendarDaysIcon className="h-6 w-6" />}
        color={stats.remainingDays > 0 ? "blue" : "red"}
        subtitle={`${stats.elapsedDays} de ${stats.totalDays} días`}
      />

      {/* Progress Comparison */}
      <div className="col-span-full">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Progreso del Proyecto</h3>
          
          <div className="space-y-4">
            {/* Work Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Progreso de Trabajo</span>
                <span className={`text-sm font-medium ${getProgressColor(stats.avgProgress)}`}>
                  {stats.avgProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    stats.avgProgress >= 80 ? 'bg-green-500' :
                    stats.avgProgress >= 60 ? 'bg-blue-500' :
                    stats.avgProgress >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(stats.avgProgress, 100)}%` }}
                />
              </div>
            </div>

            {/* Time Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Progreso de Tiempo</span>
                <span className={`text-sm font-medium ${getProgressColor(stats.timeProgress)}`}>
                  {stats.timeProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    stats.timeProgress >= 80 ? 'bg-green-500' :
                    stats.timeProgress >= 60 ? 'bg-blue-500' :
                    stats.timeProgress >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(stats.timeProgress, 100)}%` }}
                />
              </div>
            </div>

            {/* Progress Analysis */}
            <div className="mt-4 p-3 rounded-lg bg-gray-50">
              <div className="text-sm">
                {stats.avgProgress > stats.timeProgress ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <ArrowTrendingUpIcon className="h-4 w-4" />
                    <span>El proyecto va adelantado respecto al cronograma</span>
                  </div>
                ) : stats.avgProgress < stats.timeProgress - 10 ? (
                  <div className="flex items-center gap-2 text-red-700">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <span>El proyecto va retrasado respecto al cronograma</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-blue-700">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>El proyecto va según lo planificado</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}