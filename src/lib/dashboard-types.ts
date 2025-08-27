// Dashboard-specific TypeScript interfaces and types
// Based on the dashboard redesign specification

import { User } from './types';

// Dashboard Metrics/KPI Types
export interface DashboardMetrics {
  activeProjects: number;
  activePersonnel: number;
  pendingTasks: number;
  remainingBudget: number;
}

export interface KPICard {
  id: string;
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    description: string;
  };
}

// Project Types for Dashboard
export interface DashboardProject {
  id: string;
  name: string;
  description: string;
  status: 'En progreso' | 'Planificación' | 'Diseño' | 'Completado';
  progress: number;
  startDate: Date;
  endDate: Date;
  teamMembers: TeamMember[];
  statusColor: string;
}

// Task Types for Dashboard
export interface DashboardTask {
  id: string;
  title: string;
  project: string;
  priority: 'Alta' | 'Media' | 'Baja';
  dueDate: Date;
  status: 'Pendiente' | 'En progreso' | 'Completada';
  priorityColor: string;
}

// Team Member Types for Dashboard
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: 'Disponible' | 'En reunión' | 'En obra' | 'No disponible';
  availableFrom?: string;
  statusColor: string;
}

// Calendar Event Types for Dashboard
export interface CalendarEvent {
  id: string;
  title: string;
  project: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'meeting' | 'delivery' | 'inspection' | 'review';
  icon: string;
  iconColor: string;
}

// Notification Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

// Component Props Interfaces

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export interface TopBarProps {
  title: string;
  onToggleSidebar: () => void;
  user: User;
  notifications: Notification[];
}

export interface KPICardsProps {
  metrics: DashboardMetrics;
  isLoading?: boolean;
}

export interface RecentProjectsProps {
  projects: DashboardProject[];
  onViewDetails: (projectId: string) => void;
  onNewProject: () => void;
  isLoading?: boolean;
}

export interface PendingTasksProps {
  tasks: DashboardTask[];
  onCompleteTask: (taskId: string) => void;
  onAddTask: () => void;
  isLoading?: boolean;
}

export interface TeamAvailabilityProps {
  teamMembers: TeamMember[];
  onViewAllPersonnel: () => void;
  isLoading?: boolean;
}

export interface ScheduleProps {
  events: CalendarEvent[];
  currentMonth: Date;
  onNavigateMonth: (direction: 'prev' | 'next') => void;
  isLoading?: boolean;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  user: User;
}

// Utility Types
export type Priority = 'Alta' | 'Media' | 'Baja';
export type ProjectStatus = 'En progreso' | 'Planificación' | 'Diseño' | 'Completado';
export type TaskStatus = 'Pendiente' | 'En progreso' | 'Completada';
export type TeamMemberStatus = 'Disponible' | 'En reunión' | 'En obra' | 'No disponible';
export type EventType = 'meeting' | 'delivery' | 'inspection' | 'review';

// Color mapping utilities
export const PRIORITY_COLORS: Record<Priority, string> = {
  'Alta': 'bg-blue-100 text-blue-800 border-blue-200',
  'Media': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Baja': 'bg-green-100 text-green-800 border-green-200',
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  'En progreso': 'bg-blue-100 text-blue-800',
  'Planificación': 'bg-yellow-100 text-yellow-800',
  'Diseño': 'bg-purple-100 text-purple-800',
  'Completado': 'bg-green-100 text-green-800',
};

export const TEAM_STATUS_COLORS: Record<TeamMemberStatus, string> = {
  'Disponible': 'bg-green-500',
  'En reunión': 'bg-yellow-500',
  'En obra': 'bg-blue-500',
  'No disponible': 'bg-red-500',
};

export const EVENT_ICONS: Record<EventType, string> = {
  'meeting': '👥',
  'delivery': '📦',
  'inspection': '🔍',
  'review': '📋',
};

export const EVENT_COLORS: Record<EventType, string> = {
  'meeting': 'text-blue-600',
  'delivery': 'text-green-600',
  'inspection': 'text-yellow-600',
  'review': 'text-purple-600',
};