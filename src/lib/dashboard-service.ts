/**
 * Dashboard Service
 * Provides data for dashboard components with mock data and real API integration
 */

import { 
  DashboardMetrics, 
  DashboardProject, 
  DashboardTask, 
  TeamMember, 
  CalendarEvent 
} from './dashboard-types';
import { api } from './api';
import { shouldUseMockData, logDevelopmentMode } from './development-mode';

class DashboardService {
  /**
   * Fetch dashboard metrics (KPIs)
   */
  async fetchMetrics(): Promise<DashboardMetrics> {
    // Check if we should use mock data
    if (shouldUseMockData()) {
      logDevelopmentMode('DashboardService', 'fetchMetrics');
      return {
        activeProjects: 8,
        activePersonnel: 24,
        pendingTasks: 12,
        remainingBudget: 250000
      };
    }

    try {
      // Try to get real data from the dashboard stats endpoint
      const response = await fetch('/api/dashboard/stats');
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Dashboard metrics from Google Sheets:', data);
        
        return {
          activeProjects: data.activeProjects || 0,
          activePersonnel: data.activePersonnel || 0,
          pendingTasks: data.pendingTasks || 0,
          remainingBudget: data.remainingBudget || 0
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Failed to fetch real metrics from dashboard endpoint, trying individual APIs:', error);
      
      try {
        // Fallback: Try to get data from individual API endpoints
        const [projects, personnel, tasks] = await Promise.all([
          api.getProjects({ limit: 100 }),
          api.getPersonnel({ limit: 100 }),
          api.getActivities({ limit: 100 })
        ]);

        // Calculate metrics from real data
        const activeProjects = projects.data?.filter(p => 
          p.estado === 'En progreso' || p.status === 'En progreso' ||
          p.estado === 'Activo' || p.status === 'Activo'
        ).length || 0;
        
        const activePersonnel = personnel.data?.filter(p => 
          p.activo === true || p.active === true ||
          p.estado === 'Activo' || p.status === 'Activo'
        ).length || 0;
        
        const pendingTasks = tasks.data?.filter(t => 
          t.estado === 'Pendiente' || t.status === 'Pendiente'
        ).length || 0;
        
        // Mock remaining budget for now
        const remainingBudget = 250000;

        console.log('✅ Dashboard metrics calculated from individual APIs:', {
          activeProjects,
          activePersonnel,
          pendingTasks,
          remainingBudget
        });

        return {
          activeProjects,
          activePersonnel,
          pendingTasks,
          remainingBudget
        };
      } catch (apiError) {
        console.warn('Failed to fetch real metrics from individual APIs, using mock data:', apiError);
        
        // Return mock data as final fallback
        return {
          activeProjects: 8,
          activePersonnel: 24,
          pendingTasks: 12,
          remainingBudget: 250000
        };
      }
    }
  }

  /**
   * Fetch recent projects
   */
  async fetchRecentProjects(): Promise<DashboardProject[]> {
    // Always use mock data in development to avoid CORS issues
    if (shouldUseMockData()) {
      logDevelopmentMode('DashboardService', 'fetchRecentProjects');
      return this.getMockProjects();
    }

    try {
      // Try to get real data from API
      const response = await api.getProjects({ limit: 6 });
      
      if (response.ok && response.data) {
        return response.data.map(project => ({
          id: project.id,
          name: project.nombre || project.name || 'Proyecto Sin Nombre',
          description: project.descripcion || project.description || 'Sin descripción',
          status: this.mapProjectStatus(project.estado || project.status),
          progress: project.progreso || project.progress || Math.floor(Math.random() * 100),
          startDate: new Date(project.fecha_inicio || project.startDate || Date.now()),
          endDate: new Date(project.fecha_fin || project.endDate || Date.now() + 30 * 24 * 60 * 60 * 1000),
          teamMembers: [], // Will be populated separately if needed
          statusColor: this.getStatusColor(project.estado || project.status)
        }));
      }
    } catch (error) {
      console.warn('Failed to fetch real projects, using mock data:', error);
    }

    // Return mock data as fallback
    return this.getMockProjects();
  }

  /**
   * Get mock projects data
   */
  private getMockProjects(): DashboardProject[] {
    return [
      {
        id: 'proj_001',
        name: 'Villa Los Olivos',
        description: 'Construcción de complejo residencial de 120 unidades',
        status: 'En progreso',
        progress: 75,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-12-30'),
        teamMembers: [
          { id: 'tm1', name: 'Carlos Mendoza', role: 'Arquitecto', avatar: '', status: 'Disponible', statusColor: 'bg-green-500' },
          { id: 'tm2', name: 'Ana García', role: 'Ingeniera', avatar: '', status: 'En obra', statusColor: 'bg-blue-500' }
        ],
        statusColor: 'bg-blue-100 text-blue-800'
      },
      {
        id: 'proj_002',
        name: 'Centro Comercial Plaza Norte',
        description: 'Desarrollo de centro comercial de 3 niveles',
        status: 'Planificación',
        progress: 25,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2025-06-15'),
        teamMembers: [
          { id: 'tm3', name: 'Luis Rodriguez', role: 'Project Manager', avatar: '', status: 'En reunión', statusColor: 'bg-yellow-500' }
        ],
        statusColor: 'bg-yellow-100 text-yellow-800'
      },
      {
        id: 'proj_003',
        name: 'Complejo Deportivo Municipal',
        description: 'Construcción de complejo deportivo con piscina olímpica',
        status: 'Diseño',
        progress: 45,
        startDate: new Date('2024-02-10'),
        endDate: new Date('2024-11-20'),
        teamMembers: [
          { id: 'tm4', name: 'María López', role: 'Diseñadora', avatar: '', status: 'Disponible', statusColor: 'bg-green-500' },
          { id: 'tm5', name: 'Pedro Sánchez', role: 'Ingeniero Civil', avatar: '', status: 'En obra', statusColor: 'bg-blue-500' }
        ],
        statusColor: 'bg-purple-100 text-purple-800'
      }
    ];
  }

  /**
   * Fetch pending tasks
   */
  async fetchPendingTasks(): Promise<DashboardTask[]> {
    // Always use mock data in development to avoid CORS issues
    if (shouldUseMockData()) {
      logDevelopmentMode('DashboardService', 'fetchPendingTasks');
      return this.getMockTasks();
    }

    try {
      // Try to get real data from API
      const response = await api.getActivities({ limit: 20 });
      
      if (response.ok && response.data) {
        return response.data
          .filter(task => task.estado === 'Pendiente' || task.status === 'Pendiente')
          .map(task => ({
            id: task.id,
            title: task.nombre || task.title || 'Tarea Sin Título',
            project: task.proyecto_nombre || task.project || 'Proyecto Desconocido',
            priority: this.mapPriority(task.prioridad || task.priority),
            dueDate: new Date(task.fecha_vencimiento || task.dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'Pendiente',
            priorityColor: this.getPriorityColor(task.prioridad || task.priority)
          }));
      }
    } catch (error) {
      console.warn('Failed to fetch real tasks, using mock data:', error);
    }

    // Return mock data as fallback
    return this.getMockTasks();
  }

  /**
   * Get mock tasks data
   */
  private getMockTasks(): DashboardTask[] {
    return [
      {
        id: 'task_001',
        title: 'Revisión de planos estructurales',
        project: 'Villa Los Olivos',
        priority: 'Alta',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        status: 'Pendiente',
        priorityColor: 'bg-blue-100 text-blue-800 border-blue-200'
      },
      {
        id: 'task_002',
        title: 'Inspección de cimientos',
        project: 'Centro Comercial Plaza Norte',
        priority: 'Alta',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday (overdue)
        status: 'Pendiente',
        priorityColor: 'bg-blue-100 text-blue-800 border-blue-200'
      },
      {
        id: 'task_003',
        title: 'Entrega de materiales',
        project: 'Complejo Deportivo Municipal',
        priority: 'Media',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'Pendiente',
        priorityColor: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      },
      {
        id: 'task_004',
        title: 'Reunión con cliente',
        project: 'Villa Los Olivos',
        priority: 'Baja',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'Pendiente',
        priorityColor: 'bg-green-100 text-green-800 border-green-200'
      }
    ];
  }

  /**
   * Fetch team availability
   */
  async fetchTeamAvailability(): Promise<TeamMember[]> {
    // Always use mock data in development to avoid CORS issues
    if (shouldUseMockData()) {
      logDevelopmentMode('DashboardService', 'fetchTeamAvailability');
      return this.getMockTeamMembers();
    }

    try {
      // Try to get real data from API
      const response = await api.getPersonnel({ limit: 20 });
      
      if (response.ok && response.data) {
        return response.data
          .filter(person => person.activo)
          .map(person => ({
            id: person.id,
            name: person.nombre || person.name || 'Sin Nombre',
            role: person.cargo || person.role || 'Sin Cargo',
            avatar: person.avatar || '',
            status: this.mapPersonStatus(person.estado || person.status),
            availableFrom: person.disponible_desde || person.availableFrom,
            statusColor: this.getPersonStatusColor(person.estado || person.status)
          }));
      }
    } catch (error) {
      console.warn('Failed to fetch real team data, using mock data:', error);
    }

    // Return mock data as fallback
    return this.getMockTeamMembers();
  }

  /**
   * Get mock team members data
   */
  private getMockTeamMembers(): TeamMember[] {
    return [
      {
        id: 'member_001',
        name: 'Carlos Mendoza',
        role: 'Arquitecto Senior',
        avatar: '',
        status: 'Disponible',
        statusColor: 'bg-green-500'
      },
      {
        id: 'member_002',
        name: 'Ana García',
        role: 'Ingeniera Civil',
        avatar: '',
        status: 'En obra',
        availableFrom: '14:00',
        statusColor: 'bg-blue-500'
      },
      {
        id: 'member_003',
        name: 'Luis Rodriguez',
        role: 'Project Manager',
        avatar: '',
        status: 'En reunión',
        availableFrom: '16:30',
        statusColor: 'bg-yellow-500'
      },
      {
        id: 'member_004',
        name: 'María López',
        role: 'Diseñadora',
        avatar: '',
        status: 'Disponible',
        statusColor: 'bg-green-500'
      },
      {
        id: 'member_005',
        name: 'Pedro Sánchez',
        role: 'Ingeniero Estructural',
        avatar: '',
        status: 'No disponible',
        availableFrom: 'Mañana 09:00',
        statusColor: 'bg-red-500'
      }
    ];
  }

  /**
   * Fetch calendar events
   */
  async fetchCalendarEvents(): Promise<CalendarEvent[]> {
    // Always use mock data for calendar events for now
    logDevelopmentMode('DashboardService', 'fetchCalendarEvents');
    // For now, return mock data
    // In the future, this could integrate with Google Calendar or other calendar systems
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return [
      {
        id: 'event_001',
        title: 'Reunión de seguimiento Villa Los Olivos',
        project: 'Villa Los Olivos',
        date: tomorrow,
        startTime: '10:00',
        endTime: '11:30',
        type: 'meeting',
        icon: '👥',
        iconColor: 'text-blue-600'
      },
      {
        id: 'event_002',
        title: 'Entrega de materiales',
        project: 'Centro Comercial Plaza Norte',
        date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
        startTime: '08:00',
        endTime: '12:00',
        type: 'delivery',
        icon: '📦',
        iconColor: 'text-green-600'
      },
      {
        id: 'event_003',
        title: 'Inspección de seguridad',
        project: 'Complejo Deportivo Municipal',
        date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
        startTime: '14:00',
        endTime: '16:00',
        type: 'inspection',
        icon: '🔍',
        iconColor: 'text-yellow-600'
      },
      {
        id: 'event_004',
        title: 'Revisión de planos',
        project: 'Villa Los Olivos',
        date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
        startTime: '09:00',
        endTime: '11:00',
        type: 'review',
        icon: '📋',
        iconColor: 'text-purple-600'
      }
    ];
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: string): Promise<boolean> {
    try {
      // Try to update via API
      const response = await api.updateActivity(taskId, { estado: 'Completada' });
      return response.ok;
    } catch (error) {
      console.warn('Failed to complete task via API:', error);
      // For mock data, just return true
      return true;
    }
  }

  // Helper methods for mapping data
  private mapProjectStatus(status: string): DashboardProject['status'] {
    const statusMap: Record<string, DashboardProject['status']> = {
      'en_progreso': 'En progreso',
      'planificacion': 'Planificación',
      'diseño': 'Diseño',
      'completado': 'Completado'
    };
    return statusMap[status?.toLowerCase()] || 'Planificación';
  }

  private mapPriority(priority: string): DashboardTask['priority'] {
    const priorityMap: Record<string, DashboardTask['priority']> = {
      'alta': 'Alta',
      'media': 'Media',
      'baja': 'Baja',
      'high': 'Alta',
      'medium': 'Media',
      'low': 'Baja'
    };
    return priorityMap[priority?.toLowerCase()] || 'Media';
  }

  private mapPersonStatus(status: string): TeamMember['status'] {
    const statusMap: Record<string, TeamMember['status']> = {
      'disponible': 'Disponible',
      'en_reunion': 'En reunión',
      'en_obra': 'En obra',
      'no_disponible': 'No disponible',
      'available': 'Disponible',
      'meeting': 'En reunión',
      'onsite': 'En obra',
      'unavailable': 'No disponible'
    };
    return statusMap[status?.toLowerCase()] || 'Disponible';
  }

  private getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'En progreso': 'bg-blue-100 text-blue-800',
      'Planificación': 'bg-yellow-100 text-yellow-800',
      'Diseño': 'bg-purple-100 text-purple-800',
      'Completado': 'bg-green-100 text-green-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  }

  private getPriorityColor(priority: string): string {
    const colorMap: Record<string, string> = {
      'Alta': 'bg-blue-100 text-blue-800 border-blue-200',
      'Media': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Baja': 'bg-green-100 text-green-800 border-green-200'
    };
    return colorMap[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  private getPersonStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'Disponible': 'bg-green-500',
      'En reunión': 'bg-yellow-500',
      'En obra': 'bg-blue-500',
      'No disponible': 'bg-red-500'
    };
    return colorMap[status] || 'bg-gray-500';
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();