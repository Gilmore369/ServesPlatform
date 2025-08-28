'use client';

import React, { useState, useEffect } from 'react';
import { useMobileOptimizations, usePullToRefresh } from '../../hooks/useMobileOptimizations';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { MobileTimeEntry } from './MobileTimeEntry';
import { MobileEvidenceUpload } from './MobileEvidenceUpload';
import { Project, Activity, TimeEntry, Evidence } from '../../lib/types';
import { JWTManager } from '../../lib/jwt';

interface MobileDashboardProps {
  user: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
}

type ActiveView = 'dashboard' | 'time-entry' | 'evidence-upload';

export function MobileDashboard({ user }: MobileDashboardProps) {
  const { isMobile, isTouch, optimizeForMobile } = useMobileOptimizations();
  const { 
    syncStatus, 
    capabilities, 
    triggerSync, 
    getCachedData, 
    getPendingItems,
    refreshReferenceData,
    isOnline,
    hasPendingItems 
  } = useOfflineSync();

  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  
  // Data states
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recentTimeEntries, setRecentTimeEntries] = useState<any[]>([]);
  const [recentEvidence, setRecentEvidence] = useState<any[]>([]);
  
  // UI states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSyncStatus, setShowSyncStatus] = useState(false);

  // Pull to refresh functionality
  const { isPulling, pullDistance } = usePullToRefresh(async () => {
    await handleRefresh();
  });

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Auto-refresh when coming back online
  useEffect(() => {
    if (isOnline && !syncStatus.isSyncing) {
      loadDashboardData();
    }
  }, [isOnline]);

  const loadDashboardData = async () => {
    try {
      const cachedData = await getCachedData();
      setProjects(cachedData.projects);
      setActivities(cachedData.activities);

      // Load pending items
      const pendingItems = await getPendingItems();
      setRecentTimeEntries(pendingItems.timeEntries.slice(0, 5));
      setRecentEvidence(pendingItems.evidence.slice(0, 5));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (isOnline) {
        await refreshReferenceData();
        await triggerSync();
      }
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTimeEntrySuccess = (entry: TimeEntry | string) => {
    console.log('Time entry saved:', entry);
    setActiveView('dashboard');
    loadDashboardData();
  };

  const handleEvidenceSuccess = (evidence: Evidence | string) => {
    console.log('Evidence saved:', evidence);
    setActiveView('dashboard');
    loadDashboardData();
  };

  const getActiveProjects = () => {
    return projects.filter(p => p.estado === 'En progreso').slice(0, 5);
  };

  const getMyActivities = () => {
    // In a real implementation, you would filter by user assignments
    return activities.filter(a => a.estado === 'En progreso').slice(0, 5);
  };

  // Render different views
  if (activeView === 'time-entry') {
    return (
      <MobileTimeEntry
        onSuccess={handleTimeEntrySuccess}
        onCancel={() => setActiveView('dashboard')}
      />
    );
  }

  if (activeView === 'evidence-upload') {
    return (
      <MobileEvidenceUpload
        activityId={selectedActivityId}
        onSuccess={handleEvidenceSuccess}
        onCancel={() => setActiveView('dashboard')}
      />
    );
  }

  // Main dashboard view
  return (
    <div className={`mobile-dashboard ${isMobile ? 'mobile-optimized' : ''} min-h-screen bg-gray-50`}>
      {/* Pull to Refresh Indicator */}
      {isPulling && (
        <div 
          className="fixed top-0 left-0 right-0 bg-blue-500 text-white text-center py-2 z-50 transition-transform"
          style={{ transform: `translateY(${Math.min(pullDistance - 80, 0)}px)` }}
        >
          {pullDistance > 80 ? 'Suelta para actualizar' : 'Desliza para actualizar'}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Hola, {user.nombre.split(' ')[0]}
            </h1>
            <p className="text-sm text-gray-600">
              {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          {/* Sync Status Button */}
          <button
            onClick={() => setShowSyncStatus(!showSyncStatus)}
            className="relative p-2 rounded-full hover:bg-gray-100"
          >
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            {hasPendingItems && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">{syncStatus.pendingItems}</span>
              </div>
            )}
          </button>
        </div>

        {/* Sync Status Panel */}
        {showSyncStatus && (
          <div className="mt-3 p-3 bg-gray-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Estado de Sincronización</span>
              <button
                onClick={triggerSync}
                disabled={syncStatus.isSyncing || !isOnline}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              >
                {syncStatus.isSyncing ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            </div>
            
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Conexión:</span>
                <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                  {isOnline ? 'En línea' : 'Sin conexión'}
                </span>
              </div>
              
              {syncStatus.pendingItems > 0 && (
                <div className="flex justify-between">
                  <span>Pendientes:</span>
                  <span className="text-orange-600">{syncStatus.pendingItems} elementos</span>
                </div>
              )}
              
              {syncStatus.lastSync && (
                <div className="flex justify-between">
                  <span>Última sync:</span>
                  <span>{syncStatus.lastSync.toLocaleTimeString()}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span>Almacenamiento:</span>
                <span>{capabilities.storageInfo.used}MB usado</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setActiveView('time-entry')}
            className="flex flex-col items-center justify-center p-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Registrar Horas</span>
          </button>
          
          <button
            onClick={() => {
              // For evidence upload, we need to select an activity first
              const myActivities = getMyActivities();
              if (myActivities.length > 0) {
                setSelectedActivityId(myActivities[0].id);
                setActiveView('evidence-upload');
              } else {
                alert('No hay actividades disponibles para subir evidencia');
              }
            }}
            className="flex flex-col items-center justify-center p-6 bg-green-600 text-white rounded-xl hover:bg-green-700 active:bg-green-800 transition-colors"
          >
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">Subir Evidencia</span>
          </button>
        </div>
      </div>

      {/* Active Projects */}
      <div className="px-4 pb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Proyectos Activos</h2>
        <div className="space-y-3">
          {getActiveProjects().map(project => (
            <div key={project.id} className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{project.nombre}</h3>
                  <p className="text-sm text-gray-600 mt-1">{project.codigo}</p>
                  <div className="flex items-center mt-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${project.avance_pct}%` }}
                      />
                    </div>
                    <span className="ml-2 text-sm text-gray-600">{project.avance_pct}%</span>
                  </div>
                </div>
                <div className="ml-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.estado === 'En progreso' ? 'bg-blue-100 text-blue-800' :
                    project.estado === 'Pausado' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.estado}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {getActiveProjects().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p>No hay proyectos activos</p>
            </div>
          )}
        </div>
      </div>

      {/* My Activities */}
      <div className="px-4 pb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Mis Actividades</h2>
        <div className="space-y-3">
          {getMyActivities().map(activity => (
            <div key={activity.id} className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{activity.nombre}</h3>
                  <p className="text-sm text-gray-600 mt-1">{activity.codigo}</p>
                  {activity.fecha_fin && (
                    <p className="text-xs text-gray-500 mt-1">
                      Vence: {new Date(activity.fecha_fin).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex flex-col items-end">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    activity.estado === 'En progreso' ? 'bg-blue-100 text-blue-800' :
                    activity.estado === 'Completado' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.estado}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedActivityId(activity.id);
                      setActiveView('evidence-upload');
                    }}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    Subir evidencia
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {getMyActivities().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No hay actividades asignadas</p>
            </div>
          )}
        </div>
      </div>

      {/* Pending Items (if any) */}
      {hasPendingItems && (
        <div className="px-4 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Pendientes de Sincronización</h2>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-orange-800">
                  {syncStatus.pendingItems} elementos esperando sincronización
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Se sincronizarán automáticamente cuando haya conexión
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offline Notice */}
      {!isOnline && (
        <div className="px-4 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">Sin conexión a internet</p>
                <p className="text-xs text-red-600 mt-1">
                  Puedes seguir trabajando. Los datos se sincronizarán cuando se restablezca la conexión.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button (for manual refresh) */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${
            isRefreshing 
              ? 'bg-gray-400 text-gray-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <svg 
            className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
}