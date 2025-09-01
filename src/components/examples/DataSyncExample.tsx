/**
 * Data Synchronization Example Component
 * Demonstrates immediate data refresh, optimistic updates, and user feedback
 */

'use client';

import React, { useState } from 'react';
import { useProjectsSync } from '@/hooks/useDataSync';
import { SyncedDataTable, SyncedActionButton } from '@/components/ui/SyncedForm';
import { DataOperationFeedback, RefreshIndicator } from '@/components/ui/DataOperationFeedback';
import { Project } from '@/lib/types';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';

export function DataSyncExample() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Use enhanced data sync hook
  const projectsSync = useProjectsSync({ limit: 10 });

  // Table columns configuration
  const columns = [
    {
      key: 'codigo' as keyof Project,
      label: 'Código',
      render: (value: string) => (
        <span className="font-mono text-sm">{value}</span>
      )
    },
    {
      key: 'nombre' as keyof Project,
      label: 'Nombre',
      render: (value: string) => (
        <span className="font-medium">{value}</span>
      )
    },
    {
      key: 'estado' as keyof Project,
      label: 'Estado',
      render: (value: string) => {
        const colors = {
          'Planificación': 'bg-yellow-100 text-yellow-800',
          'En progreso': 'bg-blue-100 text-blue-800',
          'Pausado': 'bg-orange-100 text-orange-800',
          'Cerrado': 'bg-green-100 text-green-800'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[value as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
            {value}
          </span>
        );
      }
    },
    {
      key: 'presupuesto_total' as keyof Project,
      label: 'Presupuesto',
      render: (value: number, item: Project) => (
        <span className="text-sm">
          {item.moneda} {value?.toLocaleString() || '0'}
        </span>
      )
    },
    {
      key: 'avance_pct' as keyof Project,
      label: 'Avance',
      render: (value: number) => (
        <div className="flex items-center space-x-2">
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${value || 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-600">{value || 0}%</span>
        </div>
      )
    }
  ];

  // Quick action handlers
  const handleQuickStatusUpdate = async (project: Project, newStatus: string) => {
    await projectsSync.actions.update(project.id, { estado: newStatus });
  };

  const handleBulkStatusUpdate = async (status: string) => {
    const selectedProjects = projectsSync.data.slice(0, 3); // Update first 3 projects
    
    for (const project of selectedProjects) {
      await projectsSync.actions.update(project.id, { estado: status });
    }
  };

  const handleCreateSampleProject = async () => {
    const sampleProject = {
      codigo: `DEMO-${Date.now()}`,
      nombre: `Proyecto Demo ${new Date().toLocaleTimeString()}`,
      cliente_id: 'demo-client',
      responsable_id: 'demo-user',
      ubicacion: 'Lima, Perú',
      descripcion: 'Proyecto de demostración creado automáticamente',
      linea_servicio: 'Eléctrico',
      sla_objetivo: 30,
      inicio_plan: new Date(),
      fin_plan: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      presupuesto_total: Math.floor(Math.random() * 100000) + 10000,
      moneda: 'PEN' as const,
      estado: 'Planificación' as const,
      avance_pct: 0
    };

    await projectsSync.actions.create(sampleProject);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Sincronización de Datos en Tiempo Real
          </h2>
          <p className="text-gray-600 mt-1">
            Demostración de actualizaciones inmediatas, estados de carga y feedback del usuario
          </p>
        </div>
        
        <RefreshIndicator
          onRefresh={projectsSync.actions.refresh}
          loading={projectsSync.state.loading}
          lastRefresh={projectsSync.state.lastOperation.timestamp || undefined}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Acciones Rápidas</h3>
        <div className="flex flex-wrap gap-3">
          <SyncedActionButton
            syncState={projectsSync.state}
            action={handleCreateSampleProject}
            variant="primary"
            showStatus
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Proyecto Demo
          </SyncedActionButton>

          <SyncedActionButton
            syncState={projectsSync.state}
            action={() => handleBulkStatusUpdate('En progreso')}
            variant="secondary"
            showStatus
          >
            <Edit className="w-4 h-4 mr-2" />
            Actualizar Primeros 3 a "En Progreso"
          </SyncedActionButton>

          <SyncedActionButton
            syncState={projectsSync.state}
            action={projectsSync.actions.refresh}
            variant="secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refrescar Datos
          </SyncedActionButton>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Proyectos</p>
              <p className="text-2xl font-bold text-gray-900">{projectsSync.data.length}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm font-bold">{projectsSync.data.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Progreso</p>
              <p className="text-2xl font-bold text-blue-600">
                {projectsSync.data.filter(p => p.estado === 'En progreso').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm">▶</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completados</p>
              <p className="text-2xl font-bold text-green-600">
                {projectsSync.data.filter(p => p.estado === 'Cerrado').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-sm">✓</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Estado de Sync</p>
              <p className="text-sm font-medium">
                {projectsSync.state.loading ? 'Sincronizando...' :
                 projectsSync.state.error ? 'Error' :
                 'Sincronizado'}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              projectsSync.state.loading ? 'bg-yellow-500 animate-pulse' :
              projectsSync.state.error ? 'bg-red-500' :
              'bg-green-500'
            }`} />
          </div>
        </div>
      </div>

      {/* Data Table with Sync Features */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Proyectos con Sincronización Automática</h3>
          <p className="text-sm text-gray-600 mt-1">
            Los cambios se reflejan inmediatamente con actualizaciones optimistas
          </p>
        </div>
        
        <SyncedDataTable
          data={projectsSync.data}
          syncState={projectsSync.state}
          syncActions={projectsSync.actions}
          columns={columns}
          onEdit={(project) => {
            setSelectedProject(project);
            // In a real app, this would open an edit modal
            console.log('Edit project:', project);
          }}
          onDelete={(project) => {
            console.log('Deleted project:', project);
          }}
          className="p-4"
        />
      </div>

      {/* Individual Project Quick Actions */}
      {projectsSync.data.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold mb-3">Acciones Individuales</h3>
          <div className="space-y-2">
            {projectsSync.data.slice(0, 3).map((project) => (
              <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{project.nombre}</span>
                  <span className="ml-2 text-sm text-gray-600">({project.estado})</span>
                </div>
                <div className="flex space-x-2">
                  {project.estado !== 'En progreso' && (
                    <SyncedActionButton
                      syncState={projectsSync.state}
                      action={() => handleQuickStatusUpdate(project, 'En progreso')}
                      variant="primary"
                      size="sm"
                    >
                      Iniciar
                    </SyncedActionButton>
                  )}
                  {project.estado !== 'Cerrado' && (
                    <SyncedActionButton
                      syncState={projectsSync.state}
                      action={() => handleQuickStatusUpdate(project, 'Cerrado')}
                      variant="secondary"
                      size="sm"
                    >
                      Completar
                    </SyncedActionButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold mb-3">Métricas de Rendimiento</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Última Operación</p>
            <p className="font-medium">
              {projectsSync.state.lastOperation.type || 'Ninguna'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Estado</p>
            <p className={`font-medium ${
              projectsSync.state.lastOperation.success ? 'text-green-600' : 
              projectsSync.state.error ? 'text-red-600' : 'text-gray-600'
            }`}>
              {projectsSync.state.lastOperation.success ? 'Exitosa' :
               projectsSync.state.error ? 'Error' : 'Pendiente'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Tiempo</p>
            <p className="font-medium">
              {projectsSync.state.lastOperation.timestamp 
                ? projectsSync.state.lastOperation.timestamp.toLocaleTimeString()
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Cache</p>
            <p className="font-medium text-green-600">Activo</p>
          </div>
        </div>
      </div>
    </div>
  );
}