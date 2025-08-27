"use client";

import React from 'react';
import { ScheduleProps, CalendarEvent, EVENT_ICONS } from '@/lib/dashboard-types';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export function Schedule({ events, currentMonth, onNavigateMonth, isLoading = false }: ScheduleProps) {
  // Get month name in Spanish
  const getMonthName = (date: Date) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[date.getMonth()];
  };

  // Get events for current month
  const currentMonthEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate.getMonth() === currentMonth.getMonth() && 
           eventDate.getFullYear() === currentMonth.getFullYear();
  });

  // Sort events by date and time
  const sortedEvents = currentMonthEvents.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    return a.startTime.localeCompare(b.startTime);
  });

  // Format date for display
  const formatDate = (date: Date) => {
    const day = date.getDate();
    const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weekday = weekdays[date.getDay()];
    return `${weekday} ${day}`;
  };

  // Format time range
  const formatTimeRange = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`;
  };

  // Get event type label in Spanish
  const getEventTypeLabel = (type: CalendarEvent['type']) => {
    const labels = {
      'meeting': 'Reunión',
      'delivery': 'Entrega',
      'inspection': 'Inspección',
      'review': 'Revisión'
    };
    return labels[type];
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3 p-3 border border-gray-100 rounded-lg">
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Cronograma</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigateMonth('prev')}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Mes anterior"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">
            {getMonthName(currentMonth)} {currentMonth.getFullYear()}
          </span>
          <button
            onClick={() => onNavigateMonth('next')}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Mes siguiente"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Events list */}
      <div className="space-y-3">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">📅</div>
            <p className="text-gray-500 text-sm">
              No hay eventos programados para {getMonthName(currentMonth).toLowerCase()}
            </p>
          </div>
        ) : (
          sortedEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-start space-x-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Event icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg ${event.iconColor}`}>
                {EVENT_ICONS[event.type]}
              </div>

              {/* Event details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {event.title}
                    </h4>
                    <p className="text-xs text-gray-600 truncate mt-1">
                      {event.project}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 ${event.iconColor}`}>
                      {getEventTypeLabel(event.type)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {formatDate(new Date(event.date))}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimeRange(event.startTime, event.endTime)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mobile responsive event list - shows more compact view on small screens */}
      <div className="block sm:hidden mt-4">
        {sortedEvents.length > 0 && (
          <div className="text-xs text-gray-500 text-center">
            {sortedEvents.length} evento{sortedEvents.length !== 1 ? 's' : ''} este mes
          </div>
        )}
      </div>
    </div>
  );
}