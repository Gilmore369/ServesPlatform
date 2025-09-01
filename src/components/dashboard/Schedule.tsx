'use client';

import React, { useState } from 'react';
import { CalendarEvent, ScheduleProps, EVENT_ICONS, EVENT_COLORS } from '@/lib/dashboard-types';

// Icons
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// Loading skeleton component
const EventSkeleton = () => (
  <div className="flex items-center space-x-3 p-3 animate-pulse">
    <div className="w-8 h-8 bg-gray-200 rounded"></div>
    <div className="flex-1">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
    <div className="h-3 bg-gray-200 rounded w-16"></div>
  </div>
);

// Individual event component
interface EventItemProps {
  event: CalendarEvent;
}

const EventItem: React.FC<EventItemProps> = ({ event }) => {
  const formatTime = (time: string) => {
    // Assuming time is in HH:MM format
    return time;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const formatEventDate = (date: Date) => {
    if (isToday(date)) return 'Hoy';
    if (isTomorrow(date)) return 'Mañana';
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      {/* Event icon */}
      <div className={`w-8 h-8 rounded flex items-center justify-center text-lg ${EVENT_COLORS[event.type]} bg-gray-100`}>
        {EVENT_ICONS[event.type]}
      </div>

      {/* Event info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {event.title}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {event.project}
        </p>
      </div>

      {/* Time and date */}
      <div className="text-right">
        <p className="text-xs font-medium text-gray-900">
          {formatTime(event.startTime)}
        </p>
        <p className="text-xs text-gray-500">
          {formatEventDate(event.date)}
        </p>
      </div>
    </div>
  );
};

// Main Schedule component
export const Schedule: React.FC<ScheduleProps> = ({
  events,
  currentMonth,
  onNavigateMonth,
  isLoading = false
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Filter events for the current week
  const getUpcomingEvents = () => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    return events
      .filter(event => event.date >= now && event.date <= nextWeek)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 8); // Limit to 8 events
  };

  const upcomingEvents = getUpcomingEvents();

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2 text-gray-600" />
              Próximos Eventos
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {upcomingEvents.length} evento{upcomingEvents.length !== 1 ? 's' : ''} esta semana
            </p>
          </div>
          
          {/* Month navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigateMonth('prev')}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Mes anterior"
            >
              <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-900 min-w-0 px-2">
              {formatMonthYear(currentMonth)}
            </span>
            <button
              onClick={() => onNavigateMonth('next')}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Mes siguiente"
            >
              <ChevronRightIcon className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-1">
            {[...Array(5)].map((_, index) => (
              <EventSkeleton key={index} />
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="text-center py-8">
            <CalendarIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No hay eventos próximos</h4>
            <p className="text-gray-600">No tienes eventos programados para esta semana.</p>
          </div>
        ) : (
          <>
            {/* Events list */}
            <div className="space-y-1">
              {upcomingEvents.map((event) => (
                <EventItem key={event.id} event={event} />
              ))}
            </div>

            {/* Event type legend */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-2">Tipos de eventos:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center">
                  <span className="mr-2">👥</span>
                  <span className="text-gray-600">Reuniones</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">📦</span>
                  <span className="text-gray-600">Entregas</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">🔍</span>
                  <span className="text-gray-600">Inspecciones</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">📋</span>
                  <span className="text-gray-600">Revisiones</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Schedule;