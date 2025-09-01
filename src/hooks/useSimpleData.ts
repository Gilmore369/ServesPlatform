/**
 * Simplified data fetching hooks using SWR
 * Replaces complex caching and state management systems
 */

import useSWR from 'swr';
import { api } from '@/lib/api';

// Generic data fetcher
const fetcher = async (key: string) => {
  const [table, params] = key.split('|');
  const queryParams = params ? JSON.parse(params) : {};
  
  const response = await api.list(table, queryParams);
  if (!response.ok) {
    throw new Error(response.message || 'Failed to fetch data');
  }
  return response.data;
};

// Generic single item fetcher
const itemFetcher = async (key: string) => {
  const [table, id] = key.split('|');
  
  const response = await api.get(table, id);
  if (!response.ok) {
    throw new Error(response.message || 'Failed to fetch item');
  }
  return response.data;
};

// Hook for fetching lists of data
export function useSimpleData<T>(
  table: string, 
  params?: { limit?: number; q?: string },
  options?: { refreshInterval?: number }
) {
  const key = params ? `${table}|${JSON.stringify(params)}` : table;
  
  const { data, error, mutate, isLoading } = useSWR<T[]>(
    key,
    fetcher,
    {
      refreshInterval: options?.refreshInterval || 0,
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 2,
      errorRetryInterval: 1000
    }
  );

  return {
    data: data || [],
    loading: isLoading,
    error,
    refresh: mutate
  };
}

// Hook for fetching single items
export function useSimpleItem<T>(table: string, id: string | null) {
  const key = id ? `${table}|${id}` : null;
  
  const { data, error, mutate, isLoading } = useSWR<T>(
    key,
    itemFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      errorRetryCount: 2
    }
  );

  return {
    data,
    loading: isLoading,
    error,
    refresh: mutate
  };
}

// Specific entity hooks
export const useUsers = (params?: { limit?: number; q?: string }) => 
  useSimpleData<any>('Usuarios', params);

export const useProjects = (params?: { limit?: number; q?: string }) => 
  useSimpleData<any>('Proyectos', params);

export const useActivities = (params?: { limit?: number; q?: string }) => 
  useSimpleData<any>('Actividades', params);

export const useMaterials = (params?: { limit?: number; q?: string }) => 
  useSimpleData<any>('Materiales', params);

export const usePersonnel = (params?: { limit?: number; q?: string }) => 
  useSimpleData<any>('Colaboradores', params);

export const useClients = (params?: { limit?: number; q?: string }) => 
  useSimpleData<any>('Clientes', params);

export const useBOMs = (params?: { limit?: number; q?: string }) => 
  useSimpleData<any>('BOM', params);

export const useAssignments = (params?: { limit?: number; q?: string }) => 
  useSimpleData<any>('Asignaciones', params);

export const useTimeEntries = (params?: { limit?: number; q?: string }) => 
  useSimpleData<any>('Horas', params);

export const useEvidence = (params?: { limit?: number; q?: string }) => 
  useSimpleData<any>('Evidencias', params);

export const useChecklists = (params?: { limit?: number; q?: string }) => 
  useSimpleData<any>('Checklists', params);

// Single item hooks
export const useUser = (id: string | null) => useSimpleItem<any>('Usuarios', id);
export const useProject = (id: string | null) => useSimpleItem<any>('Proyectos', id);
export const useActivity = (id: string | null) => useSimpleItem<any>('Actividades', id);
export const useMaterial = (id: string | null) => useSimpleItem<any>('Materiales', id);
export const usePersonnelMember = (id: string | null) => useSimpleItem<any>('Colaboradores', id);
export const useClient = (id: string | null) => useSimpleItem<any>('Clientes', id);

// Simple mutation helpers
export async function createItem<T>(table: string, data: Partial<T>) {
  const response = await api.create(table, data);
  if (!response.ok) {
    throw new Error(response.message || 'Failed to create item');
  }
  return response.data;
}

export async function updateItem<T>(table: string, id: string, data: Partial<T>) {
  const response = await api.update(table, id, data);
  if (!response.ok) {
    throw new Error(response.message || 'Failed to update item');
  }
  return response.data;
}

export async function deleteItem(table: string, id: string) {
  const response = await api.delete(table, id);
  if (!response.ok) {
    throw new Error(response.message || 'Failed to delete item');
  }
  return true;
}