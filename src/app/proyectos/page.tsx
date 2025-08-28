'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { Project, User, Client } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/Modal';
import { Loading } from '@/components/ui/Loading';
import { ProjectForm } from '@/components/projects/ProjectForm';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface ProjectFilters {
  search: string;
  estado: string;
  responsable_id: string;
  cliente_id: string;
  linea_servicio: string;
  fecha_inicio: string;
  fecha_fin: string;
  presupuesto_min: string;
  presupuesto_max: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    estado: '',
    responsable_id: '',
    cliente_id: '',
    linea_servicio: '',
    fecha_inicio: '',
    fecha_fin: '',
    presupuesto_min: '',
    presupuesto_max: '',
  });

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load projects, users, and clients in parallel
      const [projectsResponse, usersResponse, clientsResponse] = await Promise.all([
        apiClient.getProjects({ limit: 100 }),
        apiClient.getUsers({ limit: 100 }),
        apiClient.getClients({ limit: 100 }),
      ]);

      if (projectsResponse.ok && projectsResponse.data) {
        setProjects(projectsResponse.data);
      } else {
        throw new Error(projectsResponse.message || 'Error loading projects');
      }

      if (usersResponse.ok && usersResponse.data) {
        setUsers(usersResponse.data);
      }

      if (clientsResponse.ok && clientsResponse.data) {
        setClients(clientsResponse.data);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  // Filter projects based on current filters
  const filteredProjects = projects.filter(project => {
    const clientName = getClientName(project.cliente_id);
    const responsableName = getUserName(project.responsable_id);
    
    const matchesSearch = !filters.search || 
      project.nombre.toLowerCase().includes(filters.search.toLowerCase()) ||
      project.codigo.toLowerCase().includes(filters.search.toLowerCase()) ||
      project.descripcion.toLowerCase().includes(filters.search.toLowerCase()) ||
      clientName.toLowerCase().includes(filters.search.toLowerCase()) ||
      responsableName.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesEstado = !filters.estado || project.estado === filters.estado;
    const matchesResponsable = !filters.responsable_id || project.responsable_id === filters.responsable_id;
    const matchesCliente = !filters.cliente_id || project.cliente_id === filters.cliente_id;
    const matchesLineaServicio = !filters.linea_servicio || project.linea_servicio === filters.linea_servicio;
    
    // Date filters
    const matchesFechaInicio = !filters.fecha_inicio || 
      new Date(project.inicio_plan) >= new Date(filters.fecha_inicio);
    const matchesFechaFin = !filters.fecha_fin || 
      new Date(project.fin_plan) <= new Date(filters.fecha_fin);
    
    // Budget filters
    const matchesPresupuestoMin = !filters.presupuesto_min || 
      project.presupuesto_total >= parseFloat(filters.presupuesto_min);
    const matchesPresupuestoMax = !filters.presupuesto_max || 
      project.presupuesto_total <= parseFloat(filters.presupuesto_max);

    return matchesSearch && matchesEstado && matchesResponsable && matchesCliente && 
           matchesLineaServicio && matchesFechaInicio && matchesFechaFin && 
           matchesPresupuestoMin && matchesPresupuestoMax;
  });

  // Get user name by ID
  const getUserName = (userId: string) => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? foundUser.nombre : userId;
  };

  // Get client name by ID
  const getClientName = (clientId: string) => {
    const foundClient = clients.find(c => c.id === clientId);
    return foundClient ? foundClient.razon_social : clientId;
  };

  // Handle project creation
  const handleProjectCreated = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
    setShowCreateModal(false);
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof ProjectFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Show loading state for search
    if (key === 'search') {
      setSearchLoading(true);
      // Simulate search delay
      setTimeout(() => setSearchLoading(false), 300);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      estado: '',
      responsable_id: '',
      cliente_id: '',
      linea_servicio: '',
      fecha_inicio: '',
      fecha_fin: '',
      presupuesto_min: '',
      presupuesto_max: '',
    });
  };

  // Table columns configuration
  const columns = [
    {
      key: 'codigo',
      title: 'Código',
      sortable: true,
      render: (value: unknown, project: Project) => (
        <button
          onClick={() => router.push(`/proyectos/${project.id}`)}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {project.codigo}
        </button>
      ),
    },
    {
      key: 'nombre',
      title: 'Nombre',
      sortable: true,
      filterable: true,
      render: (value: unknown, project: Project) => (
        <div>
          <div className="font-medium text-gray-900">{project.nombre}</div>
          <div className="text-sm text-gray-500">{project.ubicacion}</div>
        </div>
      ),
    },
    {
      key: 'cliente_id',
      title: 'Cliente',
      render: (value: unknown, project: Project) => (
        <div className="text-sm text-gray-900">
          {getClientName(project.cliente_id)}
        </div>
      ),
    },
    {
      key: 'estado',
      title: 'Estado',
      sortable: true,
      render: (value: unknown, project: Project) => {
        const statusColors = {
          'Planificación': 'bg-yellow-100 text-yellow-800',
          'En progreso': 'bg-blue-100 text-blue-800',
          'Pausado': 'bg-red-100 text-red-800',
          'Cerrado': 'bg-green-100 text-green-800',
        };
        return (
          <Badge className={statusColors[project.estado] || 'bg-gray-100 text-gray-800'}>
            {project.estado}
          </Badge>
        );
      },
    },
    {
      key: 'responsable_id',
      title: 'Responsable',
      render: (value: unknown, project: Project) => getUserName(project.responsable_id),
    },
    {
      key: 'avance_pct',
      title: 'Avance',
      sortable: true,
      render: (value: unknown, project: Project) => (
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${project.avance_pct}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">{project.avance_pct}%</span>
        </div>
      ),
    },
    {
      key: 'fechas',
      title: 'Fechas',
      render: (value: unknown, project: Project) => (
        <div className="text-sm">
          <div>Inicio: {new Date(project.inicio_plan).toLocaleDateString()}</div>
          <div>Fin: {new Date(project.fin_plan).toLocaleDateString()}</div>
        </div>
      ),
    },
    {
      key: 'presupuesto_total',
      title: 'Presupuesto',
      sortable: true,
      render: (value: unknown, project: Project) => (
        <div className="text-sm">
          {project.moneda} {project.presupuesto_total.toLocaleString()}
        </div>
      ),
    },
  ];

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-gray-600">
            Gestiona todos los proyectos de la empresa
          </p>
        </div>
        
        {/* Create button - only for admin_lider, admin, editor */}
        {user && ['admin_lider', 'admin', 'editor'].includes(user.rol) && (
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/proyectos/nuevo')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Nuevo Proyecto
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Crear Rápido
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, código, descripción, cliente o responsable..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FunnelIcon className="h-5 w-5" />
            Filtros
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Estado filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={filters.estado}
                  onChange={(e) => handleFilterChange('estado', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos los estados</option>
                  <option value="Planificación">Planificación</option>
                  <option value="En progreso">En progreso</option>
                  <option value="Pausado">Pausado</option>
                  <option value="Cerrado">Cerrado</option>
                </select>
              </div>

              {/* Responsable filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsable
                </label>
                <select
                  value={filters.responsable_id}
                  onChange={(e) => handleFilterChange('responsable_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos los responsables</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cliente filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente
                </label>
                <select
                  value={filters.cliente_id}
                  onChange={(e) => handleFilterChange('cliente_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos los clientes</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.razon_social}
                    </option>
                  ))}
                </select>
              </div>

              {/* Línea de Servicio filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Línea de Servicio
                </label>
                <select
                  value={filters.linea_servicio}
                  onChange={(e) => handleFilterChange('linea_servicio', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todas las líneas</option>
                  <option value="Eléctrico">Eléctrico</option>
                  <option value="Civil">Civil</option>
                  <option value="CCTV">CCTV</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Telecomunicaciones">Telecomunicaciones</option>
                </select>
              </div>

              {/* Fecha Inicio filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio Desde
                </label>
                <input
                  type="date"
                  value={filters.fecha_inicio}
                  onChange={(e) => handleFilterChange('fecha_inicio', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Fecha Fin filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin Hasta
                </label>
                <input
                  type="date"
                  value={filters.fecha_fin}
                  onChange={(e) => handleFilterChange('fecha_fin', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Presupuesto Mínimo filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Presupuesto Mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.presupuesto_min}
                  onChange={(e) => handleFilterChange('presupuesto_min', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              {/* Presupuesto Máximo filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Presupuesto Máximo
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.presupuesto_max}
                  onChange={(e) => handleFilterChange('presupuesto_max', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Clear filters button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Limpiar Todos los Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadData}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Results summary and active filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span>
            Mostrando {filteredProjects.length} de {projects.length} proyectos
          </span>
          {searchLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
        </div>
        
        {/* Active filters summary */}
        {(filters.search || filters.estado || filters.responsable_id || filters.cliente_id || 
          filters.linea_servicio || filters.fecha_inicio || filters.fecha_fin || 
          filters.presupuesto_min || filters.presupuesto_max) && (
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                Búsqueda: &quot;{filters.search}&quot;
              </span>
            )}
            {filters.estado && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                Estado: {filters.estado}
              </span>
            )}
            {filters.responsable_id && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                Responsable: {getUserName(filters.responsable_id)}
              </span>
            )}
            {filters.cliente_id && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                Cliente: {getClientName(filters.cliente_id)}
              </span>
            )}
            {filters.linea_servicio && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                Línea: {filters.linea_servicio}
              </span>
            )}
            {filters.fecha_inicio && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                Desde: {new Date(filters.fecha_inicio).toLocaleDateString()}
              </span>
            )}
            {filters.fecha_fin && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                Hasta: {new Date(filters.fecha_fin).toLocaleDateString()}
              </span>
            )}
            {filters.presupuesto_min && (
              <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded text-xs">
                Min: {parseFloat(filters.presupuesto_min).toLocaleString()}
              </span>
            )}
            {filters.presupuesto_max && (
              <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded text-xs">
                Max: {parseFloat(filters.presupuesto_max).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Projects table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <Table
          data={filteredProjects}
          columns={columns}
          emptyMessage="No se encontraron proyectos"
        />
      </div>

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nuevo Proyecto"
        size="lg"
      >
        <ProjectForm
          onSuccess={handleProjectCreated}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>
    </div>
  );
}