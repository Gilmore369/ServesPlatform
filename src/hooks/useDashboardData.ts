import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '@/lib/dashboard-service';
import { 
  DashboardMetrics, 
  DashboardProject, 
  DashboardTask, 
  TeamMember, 
  CalendarEvent 
} from '@/lib/dashboard-types';
import { useAuth } from '@/lib/auth';

interface DashboardData {
  metrics: DashboardMetrics;
  projects: DashboardProject[];
  tasks: DashboardTask[];
  teamMembers: TeamMember[];
  events: CalendarEvent[];
}

interface LoadingStates {
  metrics: boolean;
  projects: boolean;
  tasks: boolean;
  teamMembers: boolean;
  events: boolean;
}

interface ErrorStates {
  metrics: string | null;
  projects: string | null;
  tasks: string | null;
  teamMembers: string | null;
  events: string | null;
}

interface UseDashboardDataReturn {
  data: DashboardData;
  loading: LoadingStates;
  errors: ErrorStates;
  isAnyLoading: boolean;
  hasAnyError: boolean;
  refetch: {
    all: () => Promise<void>;
    metrics: () => Promise<void>;
    projects: () => Promise<void>;
    tasks: () => Promise<void>;
    teamMembers: () => Promise<void>;
    events: () => Promise<void>;
  };
  completeTask: (taskId: string) => Promise<boolean>;
}

const initialData: DashboardData = {
  metrics: {
    activeProjects: 0,
    activePersonnel: 0,
    pendingTasks: 0,
    remainingBudget: 0,
  },
  projects: [],
  tasks: [],
  teamMembers: [],
  events: [],
};

const initialLoadingStates: LoadingStates = {
  metrics: true,
  projects: true,
  tasks: true,
  teamMembers: true,
  events: true,
};

const initialErrorStates: ErrorStates = {
  metrics: null,
  projects: null,
  tasks: null,
  teamMembers: null,
  events: null,
};

export function useDashboardData(): UseDashboardDataReturn {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState<LoadingStates>(initialLoadingStates);
  const [errors, setErrors] = useState<ErrorStates>(initialErrorStates);

  // Helper function to update loading state for a specific section
  const setLoadingState = useCallback((section: keyof LoadingStates, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [section]: isLoading }));
  }, []);

  // Helper function to update error state for a specific section
  const setErrorState = useCallback((section: keyof ErrorStates, error: string | null) => {
    setErrors(prev => ({ ...prev, [section]: error }));
  }, []);

  // Helper function to update data for a specific section
  const setDataSection = useCallback(<K extends keyof DashboardData>(
    section: K, 
    newData: DashboardData[K]
  ) => {
    setData(prev => ({ ...prev, [section]: newData }));
  }, []);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoadingState('metrics', true);
    setErrorState('metrics', null);

    try {
      const metrics = await dashboardService.fetchMetrics();
      setDataSection('metrics', metrics);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching metrics';
      setErrorState('metrics', errorMessage);
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setLoadingState('metrics', false);
    }
  }, [isAuthenticated, setLoadingState, setErrorState, setDataSection]);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoadingState('projects', true);
    setErrorState('projects', null);

    try {
      const projects = await dashboardService.fetchRecentProjects();
      setDataSection('projects', projects);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching projects';
      setErrorState('projects', errorMessage);
      console.error('Error fetching dashboard projects:', error);
    } finally {
      setLoadingState('projects', false);
    }
  }, [isAuthenticated, setLoadingState, setErrorState, setDataSection]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoadingState('tasks', true);
    setErrorState('tasks', null);

    try {
      const tasks = await dashboardService.fetchPendingTasks();
      setDataSection('tasks', tasks);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching tasks';
      setErrorState('tasks', errorMessage);
      console.error('Error fetching dashboard tasks:', error);
    } finally {
      setLoadingState('tasks', false);
    }
  }, [isAuthenticated, setLoadingState, setErrorState, setDataSection]);

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoadingState('teamMembers', true);
    setErrorState('teamMembers', null);

    try {
      const teamMembers = await dashboardService.fetchTeamAvailability();
      setDataSection('teamMembers', teamMembers);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching team members';
      setErrorState('teamMembers', errorMessage);
      console.error('Error fetching dashboard team members:', error);
    } finally {
      setLoadingState('teamMembers', false);
    }
  }, [isAuthenticated, setLoadingState, setErrorState, setDataSection]);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoadingState('events', true);
    setErrorState('events', null);

    try {
      const events = await dashboardService.fetchCalendarEvents();
      setDataSection('events', events);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching events';
      setErrorState('events', errorMessage);
      console.error('Error fetching dashboard events:', error);
    } finally {
      setLoadingState('events', false);
    }
  }, [isAuthenticated, setLoadingState, setErrorState, setDataSection]);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    if (!isAuthenticated) return;

    // Fetch all data in parallel for better performance
    await Promise.all([
      fetchMetrics(),
      fetchProjects(),
      fetchTasks(),
      fetchTeamMembers(),
      fetchEvents(),
    ]);
  }, [isAuthenticated, fetchMetrics, fetchProjects, fetchTasks, fetchTeamMembers, fetchEvents]);

  // Complete task function
  const completeTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const success = await dashboardService.completeTask(taskId);
      if (success) {
        // Update local state to reflect the change
        setData(prev => ({
          ...prev,
          tasks: prev.tasks.map(task => 
            task.id === taskId 
              ? { ...task, status: 'Completada' as const }
              : task
          )
        }));
        
        // Optionally refetch metrics to update counts
        fetchMetrics();
      }
      return success;
    } catch (error) {
      console.error('Error completing task:', error);
      return false;
    }
  }, [fetchMetrics]);

  // Initial data fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAll();
    } else {
      // Reset data when not authenticated
      setData(initialData);
      setLoading(initialLoadingStates);
      setErrors(initialErrorStates);
    }
  }, [isAuthenticated, fetchAll]);

  // Auto-refresh data every 5 minutes when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchAll();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchAll]);

  // Computed values
  const isAnyLoading = Object.values(loading).some(Boolean);
  const hasAnyError = Object.values(errors).some(Boolean);

  return {
    data,
    loading,
    errors,
    isAnyLoading,
    hasAnyError,
    refetch: {
      all: fetchAll,
      metrics: fetchMetrics,
      projects: fetchProjects,
      tasks: fetchTasks,
      teamMembers: fetchTeamMembers,
      events: fetchEvents,
    },
    completeTask,
  };
}