'use client';

import React, { useState, useEffect } from 'react';
import { useMobileOptimizations } from '../../hooks/useMobileOptimizations';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { TimeEntry, Project, Activity, Personnel } from '../../lib/types';
import { JWTManager } from '../../lib/jwt';

interface MobileTimeEntryProps {
  onSuccess?: (entry: TimeEntry | string) => void;
  onCancel?: () => void;
  defaultProjectId?: string;
  defaultActivityId?: string;
}

interface TimeEntryForm {
  proyecto_id: string;
  actividad_id: string;
  fecha: string;
  horas_trabajadas: number;
  descripcion: string;
}

export function MobileTimeEntry({ 
  onSuccess, 
  onCancel, 
  defaultProjectId = '', 
  defaultActivityId = '' 
}: MobileTimeEntryProps) {
  const { isMobile, isTouch, addTouchFeedback } = useMobileOptimizations();
  const { 
    storeTimeEntryOffline, 
    getCachedData, 
    isOnline, 
    syncStatus,
    isOfflineCapable 
  } = useOfflineSync();

  const [form, setForm] = useState<TimeEntryForm>({
    proyecto_id: defaultProjectId,
    actividad_id: defaultActivityId,
    fecha: new Date().toISOString().split('T')[0],
    horas_trabajadas: 0,
    descripcion: ''
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Load cached data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const cachedData = await getCachedData();
        setProjects(cachedData.projects);
        setActivities(cachedData.activities);
        setPersonnel(cachedData.personnel);
      } catch (error) {
        console.error('Failed to load cached data:', error);
      }
    };

    loadData();
  }, [getCachedData]);

  // Filter activities by selected project
  useEffect(() => {
    if (form.proyecto_id) {
      const projectActivities = activities.filter(
        activity => activity.proyecto_id === form.proyecto_id
      );
      setFilteredActivities(projectActivities);
      
      // Reset activity selection if current activity doesn't belong to selected project
      if (form.actividad_id && !projectActivities.find(a => a.id === form.actividad_id)) {
        setForm(prev => ({ ...prev, actividad_id: '' }));
      }
    } else {
      setFilteredActivities([]);
      setForm(prev => ({ ...prev, actividad_id: '' }));
    }
  }, [form.proyecto_id, activities]);

  // Add touch feedback to interactive elements
  useEffect(() => {
    if (isTouch) {
      const buttons = document.querySelectorAll('.mobile-time-entry button');
      const cleanupFunctions: (() => void)[] = [];

      buttons.forEach(button => {
        const cleanup = addTouchFeedback(button as HTMLElement);
        if (cleanup) cleanupFunctions.push(cleanup);
      });

      return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
      };
    }
  }, [isTouch, addTouchFeedback]);

  const handleInputChange = (field: keyof TimeEntryForm, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.proyecto_id) {
      newErrors.proyecto_id = 'Selecciona un proyecto';
    }

    if (!form.actividad_id) {
      newErrors.actividad_id = 'Selecciona una actividad';
    }

    if (!form.fecha) {
      newErrors.fecha = 'Ingresa la fecha';
    } else {
      const selectedDate = new Date(form.fecha);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (selectedDate > today) {
        newErrors.fecha = 'No puedes registrar horas futuras';
      }
    }

    if (!form.horas_trabajadas || form.horas_trabajadas <= 0) {
      newErrors.horas_trabajadas = 'Ingresa las horas trabajadas';
    } else if (form.horas_trabajadas > 24) {
      newErrors.horas_trabajadas = 'No puedes trabajar más de 24 horas en un día';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const user = JWTManager.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const timeEntryData = {
        colaborador_id: user.id,
        proyecto_id: form.proyecto_id,
        actividad_id: form.actividad_id,
        fecha: new Date(form.fecha),
        horas_trabajadas: form.horas_trabajadas,
        descripcion: form.descripcion || undefined
      };

      let result: string | TimeEntry;

      if (isOnline) {
        // Try to submit directly to API
        try {
          // This would be implemented with the actual API call
          // For now, we'll store offline and sync immediately
          result = await storeTimeEntryOffline(timeEntryData);
        } catch (error) {
          // If online submission fails, store offline
          console.warn('Online submission failed, storing offline:', error);
          result = await storeTimeEntryOffline(timeEntryData);
        }
      } else {
        // Store offline when not connected
        result = await storeTimeEntryOffline(timeEntryData);
      }

      // Show success message
      setShowSuccess(true);
      
      // Reset form
      setForm({
        proyecto_id: defaultProjectId,
        actividad_id: defaultActivityId,
        fecha: new Date().toISOString().split('T')[0],
        horas_trabajadas: 0,
        descripcion: ''
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(result);
      }

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Failed to submit time entry:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Error al guardar el registro'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProject = projects.find(p => p.id === form.proyecto_id);
  const selectedActivity = filteredActivities.find(a => a.id === form.actividad_id);

  return (
    <div className={`mobile-time-entry ${isMobile ? 'mobile-optimized' : ''}`}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Registrar Horas
          </h2>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 p-2 -mr-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center mt-2 text-sm">
          <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
          {syncStatus.pendingItems > 0 && (
            <span className="ml-2 text-orange-600">
              ({syncStatus.pendingItems} pendientes)
            </span>
          )}
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mx-4 mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Registro guardado {!isOnline && 'offline '}exitosamente
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Project Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Proyecto *
          </label>
          <select
            value={form.proyecto_id}
            onChange={(e) => handleInputChange('proyecto_id', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.proyecto_id ? 'border-red-500' : 'border-gray-300'
            } ${isMobile ? 'text-base' : 'text-sm'}`}
            disabled={isSubmitting}
          >
            <option value="">Seleccionar proyecto...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.codigo} - {project.nombre}
              </option>
            ))}
          </select>
          {errors.proyecto_id && (
            <p className="mt-1 text-sm text-red-600">{errors.proyecto_id}</p>
          )}
        </div>

        {/* Activity Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Actividad *
          </label>
          <select
            value={form.actividad_id}
            onChange={(e) => handleInputChange('actividad_id', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.actividad_id ? 'border-red-500' : 'border-gray-300'
            } ${isMobile ? 'text-base' : 'text-sm'}`}
            disabled={isSubmitting || !form.proyecto_id}
          >
            <option value="">Seleccionar actividad...</option>
            {filteredActivities.map(activity => (
              <option key={activity.id} value={activity.id}>
                {activity.codigo} - {activity.nombre}
              </option>
            ))}
          </select>
          {errors.actividad_id && (
            <p className="mt-1 text-sm text-red-600">{errors.actividad_id}</p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha *
          </label>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => handleInputChange('fecha', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.fecha ? 'border-red-500' : 'border-gray-300'
            } ${isMobile ? 'text-base' : 'text-sm'}`}
            disabled={isSubmitting}
          />
          {errors.fecha && (
            <p className="mt-1 text-sm text-red-600">{errors.fecha}</p>
          )}
        </div>

        {/* Hours */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Horas Trabajadas *
          </label>
          <input
            type="number"
            min="0.5"
            max="24"
            step="0.5"
            value={form.horas_trabajadas || ''}
            onChange={(e) => handleInputChange('horas_trabajadas', parseFloat(e.target.value) || 0)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.horas_trabajadas ? 'border-red-500' : 'border-gray-300'
            } ${isMobile ? 'text-base' : 'text-sm'}`}
            disabled={isSubmitting}
            placeholder="8.0"
          />
          {errors.horas_trabajadas && (
            <p className="mt-1 text-sm text-red-600">{errors.horas_trabajadas}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción del Trabajo
          </label>
          <textarea
            value={form.descripcion}
            onChange={(e) => handleInputChange('descripcion', e.target.value)}
            rows={3}
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
              isMobile ? 'text-base' : 'text-sm'
            }`}
            disabled={isSubmitting}
            placeholder="Describe brevemente el trabajo realizado..."
          />
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {errors.submit}
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 px-6 rounded-lg font-medium transition-colors ${
              isSubmitting
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            } ${isMobile ? 'text-base' : 'text-sm'}`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </div>
            ) : (
              `Registrar Horas ${!isOnline ? '(Offline)' : ''}`
            )}
          </button>
        </div>

        {/* Offline Notice */}
        {!isOnline && isOfflineCapable && (
          <div className="p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-md text-sm">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Modo sin conexión</p>
                <p className="mt-1">Los datos se guardarán localmente y se sincronizarán cuando se restablezca la conexión.</p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}