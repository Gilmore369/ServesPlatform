import { apiClient } from './apiClient';
import { 
  DashboardMetrics, 
  DashboardProject, 
  DashboardTask, 
  TeamMember, 
  CalendarEvent,
  PRIORITY_COLORS,
  STATUS_COLORS,
  TEAM_STATUS_COLORS,
  EVENT_ICONS,
  EVENT_COLORS
} from './dashboard-types';
import { Project, Activity, Personnel, Assignment } from './types';

export class DashboardService {
  /**
   * Fetch dashboard metrics from the API
   */
  async fetchMetrics(): Promise<DashboardMetrics> {
    try {
      // Fetch data in parallel for better performance
      const [projectsResponse, personnelResponse, activitiesResponse] = await Promise.all([
        apiClient.getProjects({ limit: 1000 }),
        apiClient.getPersonnel({ limit: 1000 }),
        apiClient.getActivities({ limit: 1000 })
      ]);

      const projects = projectsResponse.data || [];
      const personnel = personnelResponse.data || [];
      const activities = activitiesResponse.data || [];

      // Calculate metrics
      const activeProjects = projects.filter(p => 
        p.estado === 'En progreso' || p.estado === 'Planificación'
      ).length;

      const activePersonnel = personnel.filter(p => 
        p.activo === true
      ).length;

      const pendingTasks = activities.filter(a => 
        a.estado === 'Pendiente' || a.estado === 'En progreso'
      ).length;

      // Calculate remaining budget (sum of active projects' remaining budget)
      const remainingBudget = projects
        .filter(p => p.estado === 'En progreso' || p.estado === 'Planificación')
        .reduce((total, project) => {
          const budget = parseFloat(project.presupuesto_total?.toString() || '0');
          // For now, we'll estimate spent as percentage of budget based on progress
          const spent = budget * (project.avance_pct / 100);
          return total + (budget - spent);
        }, 0);

      return {
        activeProjects,
        activePersonnel,
        pendingTasks,
        remainingBudget: Math.round(remainingBudget)
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Return default values on error
      return {
        activeProjects: 0,
        activePersonnel: 0,
        pendingTasks: 0,
        remainingBudget: 0
      };
    }
  }

  /**
   * Fetch recent projects for dashboard
   */
  async fetchRecentProjects(): Promise<DashboardProject[]> {
    try {
      const [projectsResponse, assignmentsResponse] = await Promise.all([
        apiClient.getProjects({ limit: 6 }),
        apiClient.getAssignments({ limit: 1000 })
      ]);

      const projects = projectsResponse.data || [];
      const assignments = assignmentsResponse.data || [];

      // Transform projects to dashboard format
      const dashboardProjects: DashboardProject[] = await Promise.all(
        projects.map(async (project: Project) => {
          // Get team members for this project
          const projectAssignments = assignments.filter(a => a.proyecto_id === project.id);
          const teamMembers: TeamMember[] = [];

          // Fetch personnel details for assignments
          for (const assignment of projectAssignments.slice(0, 4)) { // Limit to 4 team members
            try {
              const personnelResponse = await apiClient.getPersonnelMember(assignment.colaborador_id);
              if (personnelResponse.data) {
                const personnel = personnelResponse.data;
                teamMembers.push({
                  id: personnel.id,
                  name: personnel.nombres,
                  role: personnel.especialidad || 'Colaborador',
                  avatar: '',
                  status: this.mapPersonnelStatus('Activo'),
                  statusColor: TEAM_STATUS_COLORS[this.mapPersonnelStatus('Activo')]
                });
              }
            } catch (error) {
              console.error(`Error fetching personnel ${assignment.colaborador_id}:`, error);
            }
          }

          return {
            id: project.id,
            name: project.nombre,
            description: project.descripcion || 'Sin descripción',
            status: this.mapProjectStatus(project.estado),
            progress: project.avance_pct || 0,
            startDate: new Date(project.inicio_plan || Date.now()),
            endDate: new Date(project.fin_plan || Date.now()),
            teamMembers,
            statusColor: STATUS_COLORS[this.mapProjectStatus(project.estado)]
          };
        })
      );

      return dashboardProjects;
    } catch (error) {
      console.error('Error fetching recent projects:', error);
      return [];
    }
  }

  /**
   * Fetch pending tasks for dashboard
   */
  async fetchPendingTasks(): Promise<DashboardTask[]> {
    try {
      const [activitiesResponse, projectsResponse] = await Promise.all([
        apiClient.getActivities({ limit: 20 }),
        apiClient.getProjects({ limit: 1000 })
      ]);

      const activities = activitiesResponse.data || [];
      const projects = projectsResponse.data || [];

      // Create project lookup map
      const projectMap = new Map(projects.map(p => [p.id, p.nombre]));

      // Filter and transform activities to dashboard tasks
      const pendingTasks: DashboardTask[] = activities
        .filter(activity => activity.estado === 'Pendiente' || activity.estado === 'En progreso')
        .map(activity => ({
          id: activity.id,
          title: activity.titulo,
          project: projectMap.get(activity.proyecto_id) || 'Proyecto desconocido',
          priority: this.mapActivityPriority(activity.prioridad),
          dueDate: new Date(activity.fin_plan || Date.now()),
          status: activity.estado === 'Pendiente' ? 'Pendiente' : 'En progreso',
          priorityColor: PRIORITY_COLORS[this.mapActivityPriority(activity.prioridad)]
        }))
        .sort((a, b) => {
          // Sort by priority (Alta first) then by due date
          const priorityOrder = { 'Alta': 0, 'Media': 1, 'Baja': 2 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.dueDate.getTime() - b.dueDate.getTime();
        })
        .slice(0, 8); // Limit to 8 tasks

      return pendingTasks;
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      return [];
    }
  }

  /**
   * Fetch team availability for dashboard
   */
  async fetchTeamAvailability(): Promise<TeamMember[]> {
    try {
      const personnelResponse = await apiClient.getPersonnel({ limit: 10 });
      const personnel = personnelResponse.data || [];

      const teamMembers: TeamMember[] = personnel
        .filter(p => p.activo === true)
        .map(person => ({
          id: person.id,
          name: person.nombres,
          role: person.especialidad || 'Colaborador',
          avatar: '',
          status: this.mapPersonnelStatus('Activo'),
          availableFrom: this.generateAvailableTime(),
          statusColor: TEAM_STATUS_COLORS[this.mapPersonnelStatus('Activo')]
        }))
        .slice(0, 6); // Limit to 6 team members

      return teamMembers;
    } catch (error) {
      console.error('Error fetching team availability:', error);
      return [];
    }
  }

  /**
   * Fetch calendar events for dashboard
   */
  async fetchCalendarEvents(): Promise<CalendarEvent[]> {
    try {
      const [activitiesResponse, projectsResponse] = await Promise.all([
        apiClient.getActivities({ limit: 50 }),
        apiClient.getProjects({ limit: 1000 })
      ]);

      const activities = activitiesResponse.data || [];
      const projects = projectsResponse.data || [];

      // Create project lookup map
      const projectMap = new Map(projects.map(p => [p.id, p.nombre]));

      // Transform activities to calendar events
      const events: CalendarEvent[] = activities
        .filter(activity => {
          const activityDate = new Date(activity.fin_plan || activity.inicio_plan);
          const now = new Date();
          const futureLimit = new Date();
          futureLimit.setMonth(now.getMonth() + 2); // Show events up to 2 months ahead
          return activityDate >= now && activityDate <= futureLimit;
        })
        .map(activity => {
          const eventType = this.mapActivityToEventType(activity.titulo);
          return {
            id: activity.id,
            title: activity.titulo,
            project: projectMap.get(activity.proyecto_id) || 'Proyecto desconocido',
            date: new Date(activity.fin_plan || activity.inicio_plan),
            startTime: this.generateEventTime(),
            endTime: this.generateEventTime(true),
            type: eventType,
            icon: EVENT_ICONS[eventType],
            iconColor: EVENT_COLORS[eventType]
          };
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 10); // Limit to 10 events

      return events;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: string): Promise<boolean> {
    try {
      await apiClient.updateActivity(taskId, { estado: 'Completada' });
      return true;
    } catch (error) {
      console.error('Error completing task:', error);
      return false;
    }
  }

  // Helper methods for data transformation

  private mapProjectStatus(status: string): 'En progreso' | 'Planificación' | 'Diseño' | 'Completado' {
    switch (status?.toLowerCase()) {
      case 'en progreso':
      case 'activo':
        return 'En progreso';
      case 'planificación':
      case 'planificacion':
      case 'planeacion':
        return 'Planificación';
      case 'diseño':
      case 'diseno':
        return 'Diseño';
      case 'completado':
      case 'terminado':
      case 'finalizado':
        return 'Completado';
      default:
        return 'Planificación';
    }
  }

  private mapActivityPriority(priority: string): 'Alta' | 'Media' | 'Baja' {
    switch (priority?.toLowerCase()) {
      case 'alta':
      case 'high':
      case 'urgente':
        return 'Alta';
      case 'media':
      case 'medium':
      case 'normal':
        return 'Media';
      case 'baja':
      case 'low':
        return 'Baja';
      default:
        return 'Media';
    }
  }

  private mapPersonnelStatus(status: string): 'Disponible' | 'En reunión' | 'En obra' | 'No disponible' {
    // Since we don't have real-time status, we'll simulate based on the personnel status
    const statuses: ('Disponible' | 'En reunión' | 'En obra' | 'No disponible')[] = [
      'Disponible', 'En reunión', 'En obra'
    ];
    
    // Use a simple hash of the status to get consistent results
    const hash = status?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
    return statuses[hash % statuses.length];
  }

  private mapActivityToEventType(activityType: string): 'meeting' | 'delivery' | 'inspection' | 'review' {
    switch (activityType?.toLowerCase()) {
      case 'reunión':
      case 'reunion':
      case 'meeting':
        return 'meeting';
      case 'entrega':
      case 'delivery':
        return 'delivery';
      case 'inspección':
      case 'inspeccion':
      case 'inspection':
        return 'inspection';
      case 'revisión':
      case 'revision':
      case 'review':
        return 'review';
      default:
        // Default based on activity name keywords
        const name = activityType?.toLowerCase() || '';
        if (name.includes('reunión') || name.includes('reunion')) return 'meeting';
        if (name.includes('entrega')) return 'delivery';
        if (name.includes('inspección') || name.includes('inspeccion')) return 'inspection';
        return 'review';
    }
  }



  private generateAvailableTime(): string {
    // Generate random available time for demo purposes
    const hours = ['08:00', '09:00', '10:00', '10:30', '11:00', '14:00', '15:00'];
    return hours[Math.floor(Math.random() * hours.length)];
  }

  private generateEventTime(isEndTime = false): string {
    // Generate random event times for demo purposes
    const startTimes = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    const endTimes = ['09:30', '10:30', '11:30', '12:30', '15:30', '16:30', '17:30'];
    
    const times = isEndTime ? endTimes : startTimes;
    return times[Math.floor(Math.random() * times.length)];
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();