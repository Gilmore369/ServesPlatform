/**
 * Integration tests for dashboard authentication and data fetching
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dashboardService } from '@/lib/dashboard-service';
import { apiClient } from '@/lib/apiClient';

// Mock the API client
vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    getProjects: vi.fn(),
    getPersonnel: vi.fn(),
    getActivities: vi.fn(),
    getAssignments: vi.fn(),
    getPersonnelMember: vi.fn(),
    updateActivity: vi.fn(),
  },
}));

const mockApiClient = apiClient as any;

describe('Dashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dashboard Service', () => {
    it('should fetch metrics successfully', async () => {
      // Mock API responses
      mockApiClient.getProjects.mockResolvedValue({
        ok: true,
        data: [
          { id: '1', estado: 'En progreso', presupuesto_total: 100000, avance_pct: 50 },
          { id: '2', estado: 'Planificación', presupuesto_total: 200000, avance_pct: 10 },
        ],
        timestamp: new Date().toISOString(),
      });

      mockApiClient.getPersonnel.mockResolvedValue({
        ok: true,
        data: [
          { id: '1', activo: true },
          { id: '2', activo: true },
          { id: '3', activo: false },
        ],
        timestamp: new Date().toISOString(),
      });

      mockApiClient.getActivities.mockResolvedValue({
        ok: true,
        data: [
          { id: '1', estado: 'Pendiente' },
          { id: '2', estado: 'En progreso' },
          { id: '3', estado: 'Completada' },
        ],
        timestamp: new Date().toISOString(),
      });

      const metrics = await dashboardService.fetchMetrics();

      expect(metrics).toEqual({
        activeProjects: 2,
        activePersonnel: 2,
        pendingTasks: 2,
        remainingBudget: 230000, // (100000 - 50000) + (200000 - 20000)
      });
    });

    it('should handle API errors gracefully', async () => {
      mockApiClient.getProjects.mockRejectedValue(new Error('API Error'));
      mockApiClient.getPersonnel.mockRejectedValue(new Error('API Error'));
      mockApiClient.getActivities.mockRejectedValue(new Error('API Error'));

      const metrics = await dashboardService.fetchMetrics();

      expect(metrics).toEqual({
        activeProjects: 0,
        activePersonnel: 0,
        pendingTasks: 0,
        remainingBudget: 0,
      });
    });

    it('should complete tasks successfully', async () => {
      mockApiClient.updateActivity.mockResolvedValue({
        ok: true,
        data: { id: '1', estado: 'Completada' },
        timestamp: new Date().toISOString(),
      });

      const result = await dashboardService.completeTask('1');

      expect(result).toBe(true);
      expect(mockApiClient.updateActivity).toHaveBeenCalledWith('1', { estado: 'Completada' });
    });

    it('should handle task completion errors', async () => {
      mockApiClient.updateActivity.mockRejectedValue(new Error('Update failed'));

      const result = await dashboardService.completeTask('1');

      expect(result).toBe(false);
    });
  });

  describe('Data Transformation', () => {
    it('should map project status correctly', async () => {
      mockApiClient.getProjects.mockResolvedValue({
        ok: true,
        data: [
          {
            id: '1',
            nombre: 'Test Project',
            descripcion: 'Test Description',
            estado: 'En progreso',
            avance_pct: 75,
            inicio_plan: '2024-01-01',
            fin_plan: '2024-12-31',
          },
        ],
        timestamp: new Date().toISOString(),
      });

      mockApiClient.getAssignments.mockResolvedValue({
        ok: true,
        data: [],
        timestamp: new Date().toISOString(),
      });

      const projects = await dashboardService.fetchRecentProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0]).toMatchObject({
        id: '1',
        name: 'Test Project',
        description: 'Test Description',
        status: 'En progreso',
        progress: 75,
        statusColor: 'bg-blue-100 text-blue-800',
      });
    });

    it('should map activity priority correctly', async () => {
      mockApiClient.getActivities.mockResolvedValue({
        ok: true,
        data: [
          {
            id: '1',
            titulo: 'High Priority Task',
            proyecto_id: 'proj1',
            prioridad: 'Alta',
            estado: 'Pendiente',
            fin_plan: '2024-12-31',
          },
        ],
        timestamp: new Date().toISOString(),
      });

      mockApiClient.getProjects.mockResolvedValue({
        ok: true,
        data: [{ id: 'proj1', nombre: 'Test Project' }],
        timestamp: new Date().toISOString(),
      });

      const tasks = await dashboardService.fetchPendingTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({
        id: '1',
        title: 'High Priority Task',
        priority: 'Alta',
        priorityColor: 'bg-blue-100 text-blue-800 border-blue-200',
      });
    });
  });
});