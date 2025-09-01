/**
 * Dashboard Components Export
 * Centralized exports for all dashboard components
 */

export { DashboardLayout } from './DashboardLayout';
export { DashboardSidebar } from './DashboardSidebar';
export { DashboardTopBar } from './DashboardTopBar';
export { default as KPICards } from './KPICards';
export { default as RecentProjects } from './RecentProjects';
export { default as PendingTasks } from './PendingTasks';
export { default as TeamAvailability } from './TeamAvailability';
export { default as Schedule } from './Schedule';

// Re-export types for convenience
export type {
  DashboardLayoutProps,
  SidebarProps,
  TopBarProps,
  KPICardsProps,
  RecentProjectsProps,
  PendingTasksProps,
  TeamAvailabilityProps,
  ScheduleProps
} from '@/lib/dashboard-types';