'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';
import { apiClient, APIError } from '../apiClient';
import { APIResponse } from '../types';

// Generic fetcher function for SWR
const fetcher = async <T>(url: string): Promise<T> => {
  const [endpoint, params] = url.split('?');
  const searchParams = new URLSearchParams(params);
  
  // Parse the endpoint to determine the API call
  if (endpoint.startsWith('/list/')) {
    const table = endpoint.replace('/list/', '');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const q = searchParams.get('q') || undefined;
    
    // apiClient.list already processes the response and returns the data directly
    const data = await apiClient.list(table, { limit, q });
    return data as T;
  }
  
  if (endpoint.startsWith('/get/')) {
    const [, table, id] = endpoint.split('/');
    // apiClient.get already processes the response and returns the data directly
    const data = await apiClient.get(table, id);
    return data as T;
  }
  
  throw new APIError('Invalid endpoint', 0);
};

// Configuration for SWR
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error) => {
    // Don't retry on authentication errors
    if (error instanceof APIError && error.status === 401) {
      return false;
    }
    return true;
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
};

/**
 * Hook for fetching list data
 */
export function useList<T>(
  table: string,
  params?: { limit?: number; q?: string },
  config?: SWRConfiguration
) {
  const queryString = params 
    ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]).toString()}`
    : '';
  
  const key = `/list/${table}${queryString}`;
  
  const { data, error, isLoading, mutate: revalidate } = useSWR<T[]>(
    key,
    (url: string) => fetcher<T[]>(url),
    { ...defaultConfig, ...config }
  );

  return {
    data: data || [],
    error,
    isLoading,
    revalidate,
    isEmpty: !isLoading && !error && (!data || data.length === 0),
  };
}

/**
 * Hook for fetching single item data
 */
export function useGet<T>(
  table: string,
  id: string | null,
  config?: SWRConfiguration
) {
  const key = id ? `/get/${table}/${id}` : null;
  
  const { data, error, isLoading, mutate: revalidate } = useSWR<T>(
    key,
    key ? (url: string) => fetcher<T>(url) : null,
    { ...defaultConfig, ...config }
  );

  return {
    data,
    error,
    isLoading,
    revalidate,
  };
}

/**
 * Hook for mutations (create, update, delete)
 */
export function useMutation() {
  const create = async <T>(table: string, data: Partial<T>) => {
    try {
      // apiClient.create already processes the response and returns the data directly
      const result = await apiClient.create(table, data);
      
      // Revalidate list data
      mutate(`/list/${table}`);
      
      return result;
    } catch (error) {
      throw error;
    }
  };

  const update = async <T>(table: string, id: string, data: Partial<T>) => {
    try {
      // apiClient.update already processes the response and returns the data directly
      const result = await apiClient.update(table, id, data);
      
      // Revalidate both list and individual item data
      mutate(`/list/${table}`);
      mutate(`/get/${table}/${id}`);
      
      return result;
    } catch (error) {
      throw error;
    }
  };

  const remove = async (table: string, id: string) => {
    try {
      // apiClient.delete already processes the response and returns the data directly
      await apiClient.delete(table, id);
      
      // Revalidate list data
      mutate(`/list/${table}`);
      
      return true;
    } catch (error) {
      throw error;
    }
  };

  return {
    create,
    update,
    delete: remove,
  };
}

/**
 * Specific hooks for entities
 */
import { User, Project, Activity, Personnel, Material } from '../types';

// Users
export const useUsers = (params?: { limit?: number; q?: string }) => 
  useList<User>('Usuarios', params);

export const useUser = (id: string | null) => 
  useGet<User>('Usuarios', id);

// Projects
export const useProjects = (params?: { limit?: number; q?: string }) => 
  useList<Project>('Proyectos', params);

export const useProject = (id: string | null) => 
  useGet<Project>('Proyectos', id);

// Activities
export const useActivities = (params?: { limit?: number; q?: string }) => 
  useList<Activity>('Actividades', params);

export const useActivity = (id: string | null) => 
  useGet<Activity>('Actividades', id);

// Personnel
export const usePersonnel = (params?: { limit?: number; q?: string }) => 
  useList<Personnel>('Colaboradores', params);

export const usePersonnelMember = (id: string | null) => 
  useGet<Personnel>('Colaboradores', id);

// Materials
export const useMaterials = (params?: { limit?: number; q?: string }) => 
  useList<Material>('Materiales', params);

export const useMaterial = (id: string | null) => 
  useGet<Material>('Materiales', id);

/**
 * Simple hook that provides access to apiClient methods
 */
export function useApi() {
  return {
    get: apiClient.get.bind(apiClient),
    post: apiClient.create.bind(apiClient),
    put: apiClient.update.bind(apiClient),
    del: apiClient.delete.bind(apiClient),
    list: apiClient.list.bind(apiClient),
  };
}