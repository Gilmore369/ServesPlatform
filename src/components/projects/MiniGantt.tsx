'use client';

import { useState, useMemo } from 'react';
import { Activity, User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

interface MiniGanttProps {
  activities: Activity[];
  users: User[];
  projectId: string;
  onUpdate: () => void;
}

interface GanttActivity extends Activity {
  startDate: Date;
  endDate: Date;
  duration: number;
  position: number;
  width: number;
}

export function MiniGantt({ activities, users, projectId, onUpdate }: MiniGanttProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Get start of week (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  // Get week dates (7 days starting from Monday)
  const weekDates = useMemo(() => {
    const start = getWeekStart(currentWeek);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeek]);

  // Process activities for Gantt display
  const ganttActivities = useMemo(() => {
    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    
    return activities
      .map((activity): GanttActivity | null => {
        const startDate = new Date(activity.inicio_plan);
        const endDate = new Date(activity.fin_plan);
        
        // Skip activities that don't overlap with current week
        if (endDate < weekStart || startDate > weekEnd) {
          return null;
        }

        // Calculate position and width within the week
        const weekStartTime = weekStart.getTime();
        const weekEndTime = weekEnd.getTime();
        const weekDuration = weekEndTime - weekStartTime;
        
        const activityStart = Math.max(startDate.getTime(), weekStartTime);
        const activityEnd = Math.min(endDate.getTime(), weekEndTime);
        
        const position = ((activityStart - weekStartTime) / weekDuration) * 100;
        const width = ((activityEnd - activityStart) / weekDuration) * 100;
        
        const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          ...activity,
          startDate,
          endDate,
          duration,
          position,
          width: Math.max(width, 2), // Minimum width for visibility
        };
      })
      .filter((activity): activity is GanttActivity => activity !== null)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [activities, weekDates]);

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  // Get user name by ID
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.nombre : userId;
  };

  // Get status color
  const getStatusColor = (status: Activity['estado']) => {
    const colors = {
      'Pendiente': 'bg-gray-400',
      'En progreso': 'bg-blue-500',
      'En revisión': 'bg-yellow-500',
      'Completada': 'bg-green-500',
    };
    return colors[status] || 'bg-gray-400';
  };

  // Get priority color
  const getPriorityColor = (priority: Activity['prioridad']) => {
    const colors = {
      'Baja': 'border-gray-300',
      'Media': 'border-blue-300',
      'Alta': 'border-orange-300',
      'Crítica': 'border-red-300',
    };
    return colors[priority] || 'border-gray-300';
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Format week range
  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    const startStr = start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium text-gray-900">Vista Semanal</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarIcon className="h-4 w-4" />
            {formatWeekRange()}
          </div>
        </div>
        
        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentWeek(new Date())}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50"
          >
            Hoy
          </button>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {/* Header with days */}
        <div className="grid grid-cols-8 border-b bg-gray-50">
          <div className="p-3 text-sm font-medium text-gray-700 border-r">
            Actividad
          </div>
          {weekDates.map((date, index) => (
            <div
              key={index}
              className={`p-3 text-center text-sm border-r last:border-r-0 ${
                isToday(date) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
              }`}
            >
              <div className="font-medium">
                {date.toLocaleDateString('es-ES', { weekday: 'short' })}
              </div>
              <div className="text-xs">
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Activities */}
        <div className="divide-y">
          {ganttActivities.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay actividades programadas para esta semana</p>
            </div>
          ) : (
            ganttActivities.map((activity) => (
              <div key={activity.id} className="grid grid-cols-8 hover:bg-gray-50">
                {/* Activity Info */}
                <div className="p-3 border-r">
                  <div className="space-y-1">
                    <div className="font-medium text-sm text-gray-900">
                      {activity.titulo}
                    </div>
                    <div className="text-xs text-gray-600">
                      {activity.codigo}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${
                        activity.estado === 'Completada' ? 'bg-green-100 text-green-800' :
                        activity.estado === 'En progreso' ? 'bg-blue-100 text-blue-800' :
                        activity.estado === 'En revisión' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.estado}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <UserIcon className="h-3 w-3" />
                        {getUserName(activity.responsable_id)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="col-span-7 relative p-3">
                  <div className="relative h-6">
                    {/* Activity Bar */}
                    <div
                      className={`absolute top-1 h-4 rounded-sm border-2 ${getStatusColor(activity.estado)} ${getPriorityColor(activity.prioridad)} opacity-80`}
                      style={{
                        left: `${activity.position}%`,
                        width: `${activity.width}%`,
                      }}
                    >
                      {/* Progress indicator */}
                      <div
                        className="h-full bg-white bg-opacity-30 rounded-sm"
                        style={{ width: `${activity.porcentaje_avance}%` }}
                      />
                    </div>

                    {/* Activity details tooltip on hover */}
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity group">
                      <div className="absolute top-6 left-0 bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-10 whitespace-nowrap pointer-events-none">
                        <div className="font-medium">{activity.titulo}</div>
                        <div className="text-gray-300">
                          {activity.startDate.toLocaleDateString()} - {activity.endDate.toLocaleDateString()}
                        </div>
                        <div>Progreso: {activity.porcentaje_avance}%</div>
                        <div>Duración: {activity.duration} días</div>
                        <div>Responsable: {getUserName(activity.responsable_id)}</div>
                      </div>
                    </div>

                    {/* Click handler for activity details */}
                    <div 
                      className="absolute inset-0 cursor-pointer hover:bg-black hover:bg-opacity-10 rounded-sm transition-colors"
                      onClick={() => {
                        // You could add a callback here to show activity details
                        console.log('Activity clicked:', activity.titulo);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-gray-400 rounded-sm"></div>
          <span>Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-blue-500 rounded-sm"></div>
          <span>En progreso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-yellow-500 rounded-sm"></div>
          <span>En revisión</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-green-500 rounded-sm"></div>
          <span>Completada</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-gray-600">Total Actividades</div>
          <div className="text-lg font-semibold text-gray-900">{ganttActivities.length}</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-blue-600">En Progreso</div>
          <div className="text-lg font-semibold text-blue-900">
            {ganttActivities.filter(a => a.estado === 'En progreso').length}
          </div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <div className="text-yellow-600">En Revisión</div>
          <div className="text-lg font-semibold text-yellow-900">
            {ganttActivities.filter(a => a.estado === 'En revisión').length}
          </div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-green-600">Completadas</div>
          <div className="text-lg font-semibold text-green-900">
            {ganttActivities.filter(a => a.estado === 'Completada').length}
          </div>
        </div>
      </div>
    </div>
  );
}