/**
 * Simplified API Client for ServesPlatform
 * Direct communication with Google Apps Script backend with standardized error handling
 * 
 * This API client provides a clean, simple interface for communicating with the
 * Google Apps Script backend. It includes comprehensive error handling, logging,
 * retry logic, and proper TypeScript types.
 * 
 * Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3
 * @fileoverview Simplified API client with comprehensive error handling
 * @author ServesPlatform Development Team
 * @version 2.1.0
 */

import { config } from './config';
import { getApiBaseUrl, getApiToken } from './emergency-config';
import { AppError, ErrorFactory, ErrorType } from './error-types';
import { logger, LogCategory } from './logger-types';
import { shouldUseMockData, logDevelopmentMode } from './development-mode';

/**
 * API Error class with standardized error handling
 * @deprecated Use AppError from error-types instead
 */
export class APIError extends AppError {
  constructor(
    message: string,
    public status: number = 0,
    public retryable: boolean = false
  ) {
    super(
      status >= 500 ? ErrorType.SERVER_ERROR : 
      status === 401 ? ErrorType.AUTHENTICATION_ERROR :
      status === 403 ? ErrorType.AUTHORIZATION_ERROR :
      status === 404 ? ErrorType.NOT_FOUND_ERROR :
      status === 409 ? ErrorType.CONFLICT_ERROR :
      status === 0 ? ErrorType.NETWORK_ERROR :
      ErrorType.UNKNOWN_ERROR,
      message,
      { status, retryable }
    );
    this.name = 'APIError';
  }
}

// Basic response interface
export interface APIResponse<T = any> {
  ok: boolean;
  data?: T;
  message?: string;
  timestamp?: string;
}

// Authentication response
export interface AuthResponse extends APIResponse {
  token?: string;
  user?: {
    id: string;
    email: string;
    nombre: string;
    rol: string;
  };
}

// Simple request options
interface RequestOptions {
  timeout?: number;
  retryAttempts?: number;
  requireAuth?: boolean;
}

/**
 * Simplified API Client
 * Direct communication with Google Apps Script without complex abstractions
 */
class SimpleAPIClient {
  private baseURL: string;
  private apiToken: string;
  private defaultTimeout: number = 30000; // 30 seconds
  private defaultRetryAttempts: number = 2;

  constructor() {
    // Use emergency config to ensure correct URL
    this.baseURL = getApiBaseUrl();
    this.apiToken = getApiToken();
    this.defaultTimeout = config.api.timeout;
    this.defaultRetryAttempts = config.api.retryAttempts;
    
    console.log('🔍 SimpleAPIClient initialized with URL:', this.baseURL);
    console.log('🔍 SimpleAPIClient initialized with token:', this.apiToken);
  }

  /**
   * Make HTTP request with standardized error handling and logging
   * @param params - Request parameters
   * @param options - Request options
   * @returns Promise resolving to API response
   */
  private async request<T>(
    params: Record<string, any>,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    // In development mode, prevent API calls to avoid CORS issues
    if (shouldUseMockData()) {
      logDevelopmentMode('API Client', `${params.action}/${params.table}/${params.operation}`);
      
      // Return a mock error response to trigger fallback to mock data
      throw ErrorFactory.network('Development mode: API calls disabled to prevent CORS issues');
    }
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const startTime = performance.now();
    
    const {
      timeout = this.defaultTimeout,
      retryAttempts = this.defaultRetryAttempts,
      requireAuth = true
    } = options;

    // Log request start
    logger.debug(`Starting API request`, {
      requestId,
      action: params.action,
      table: params.table,
      operation: params.operation
    }, LogCategory.API);

    // Build request data
    const requestData = {
      token: this.apiToken,
      ...params
    };

    // Add JWT token if authentication is required
    if (requireAuth) {
      const token = this.getStoredToken();
      if (token) {
        requestData.jwt = token;
      }
    }

    // Build URL with query parameters (Google Apps Script requirement)
    const urlParams = new URLSearchParams();
    Object.keys(requestData).forEach(key => {
      if (requestData[key] !== undefined && requestData[key] !== null) {
        const value = typeof requestData[key] === 'object' 
          ? JSON.stringify(requestData[key]) 
          : String(requestData[key]);
        urlParams.append(key, value);
      }
    });

    const url = `${this.baseURL}?${urlParams.toString()}`;
    
    // Debug: Log the request details
    console.log('🔍 API Request Details:');
    console.log('  URL:', url);
    console.log('  Request Data:', requestData);
    console.log('  URL Params:', urlParams.toString());
    
    let lastError: AppError | null = null;
    
    // Retry logic with exponential backoff
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Try POST with FormData first, then fallback to GET
        let response: Response;
        
        try {
          // Method 1: POST with FormData
          const formData = new FormData();
          Object.keys(requestData).forEach(key => {
            if (requestData[key] !== undefined && requestData[key] !== null) {
              const value = typeof requestData[key] === 'object' 
                ? JSON.stringify(requestData[key]) 
                : String(requestData[key]);
              formData.append(key, value);
            }
          });
          
          console.log('🔄 Trying POST with FormData...');
          response = await fetch(this.baseURL, {
            method: 'POST',
            mode: 'cors',
            signal: controller.signal,
            body: formData,
            headers: {
              'Accept': 'application/json',
            }
          });
          
          // If POST fails, try GET
          if (!response.ok) {
            console.log('🔄 POST failed, trying GET with query params...');
            response = await fetch(url, {
              method: 'GET',
              mode: 'cors',
              signal: controller.signal,
              headers: {
                'Accept': 'application/json',
              }
            });
          }
        } catch (postError) {
          console.log('🔄 POST failed, trying GET with query params...');
          response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
            }
          });
        }

        clearTimeout(timeoutId);
        const duration = Math.round(performance.now() - startTime);

        // Parse response
        let data: any;
        try {
          data = await response.json();
        } catch (parseError) {
          const error = ErrorFactory.server('Invalid JSON response from server');
          logger.error(`Failed to parse response`, error, {
            requestId,
            status: response.status,
            duration
          }, LogCategory.API);
          throw error;
        }

        // Check HTTP status
        if (!response.ok) {
          const error = new APIError(
            data.message || `HTTP ${response.status}`,
            response.status,
            response.status >= 500
          );
          
          logger.error(`HTTP error response`, error, {
            requestId,
            status: response.status,
            duration,
            responseData: data
          }, LogCategory.API);
          
          throw error;
        }

        // Check API response format
        if (!data.ok) {
          const error = new APIError(
            data.message || 'Request failed',
            response.status,
            false
          );
          
          logger.warn(`API request failed`, undefined, {
            requestId,
            status: response.status,
            duration,
            message: data.message
          }, LogCategory.API);
          
          throw error;
        }

        // Log successful request
        logger.api('GET', url, response.status, duration, {
          requestId,
          action: params.action,
          dataSize: JSON.stringify(data).length
        });

        return {
          ok: true,
          data: data.data || data,
          message: data.message,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        const duration = Math.round(performance.now() - startTime);
        
        // Handle different error types
        if (error instanceof AppError) {
          lastError = error;
        } else if (error.name === 'AbortError') {
          lastError = ErrorFactory.timeout(`API request to ${params.action}`, timeout);
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
          lastError = ErrorFactory.network('Network connection failed');
        } else {
          lastError = ErrorFactory.server(error.message || 'Unknown error occurred');
        }
        
        // Log the error
        logger.error(`API request attempt ${attempt + 1} failed`, lastError, {
          requestId,
          attempt: attempt + 1,
          duration,
          url: url.substring(0, 200) + '...' // Truncate long URLs
        }, LogCategory.API);
        
        // Don't retry on non-retryable errors or last attempt
        if (!lastError.retryable || attempt === retryAttempts) {
          break;
        }

        // Exponential backoff with jitter
        const baseDelay = 1000 * Math.pow(2, attempt);
        const jitter = Math.random() * 0.1 * baseDelay;
        const delay = Math.min(baseDelay + jitter, 5000);
        
        logger.debug(`Retrying request after ${delay}ms`, {
          requestId,
          attempt: attempt + 1,
          delay
        }, LogCategory.API);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    const totalDuration = Math.round(performance.now() - startTime);
    logger.error(`API request failed after ${retryAttempts + 1} attempts`, lastError!, {
      requestId,
      totalDuration,
      totalAttempts: retryAttempts + 1
    }, LogCategory.API);
    
    throw lastError!;
  }

  /**
   * Get stored JWT token
   */
  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  /**
   * Authentication
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>({
      action: 'auth',
      email,
      password
    }, { requireAuth: false });
  }

  async whoami(): Promise<APIResponse> {
    return this.request({
      action: 'whoami'
    });
  }

  /**
   * Generic CRUD operations
   */
  async list<T>(table: string, params?: { limit?: number; q?: string }): Promise<APIResponse<T[]>> {
    return this.request<T[]>({
      action: 'crud',
      table,
      operation: 'list',
      ...params
    });
  }

  async get<T>(table: string, id: string): Promise<APIResponse<T>> {
    return this.request<T>({
      action: 'crud',
      table,
      operation: 'get',
      id
    });
  }

  async create<T>(table: string, data: Partial<T>): Promise<APIResponse<T>> {
    // Basic client-side validation
    if (!data || Object.keys(data).length === 0) {
      return {
        ok: false,
        message: 'No data provided for create operation',
        timestamp: new Date().toISOString()
      };
    }

    return this.request<T>({
      action: 'crud',
      table,
      operation: 'create',
      ...data
    });
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<APIResponse<T>> {
    // Basic client-side validation
    if (!id || id.trim() === '') {
      return {
        ok: false,
        message: 'ID is required for update operation',
        timestamp: new Date().toISOString()
      };
    }

    if (!data || Object.keys(data).length === 0) {
      return {
        ok: false,
        message: 'No data provided for update operation',
        timestamp: new Date().toISOString()
      };
    }

    return this.request<T>({
      action: 'crud',
      table,
      operation: 'update',
      id,
      ...data
    });
  }

  async delete(table: string, id: string): Promise<APIResponse> {
    return this.request({
      action: 'crud',
      table,
      operation: 'delete',
      id
    });
  }

  /**
   * Batch operations (simplified)
   */
  async batchCreate<T>(table: string, records: Partial<T>[]): Promise<APIResponse<T[]>> {
    const results: T[] = [];
    const errors: string[] = [];

    for (const record of records) {
      try {
        const response = await this.create<T>(table, record);
        if (response.ok && response.data) {
          results.push(response.data);
        } else {
          errors.push(response.message || 'Create failed');
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return {
      ok: errors.length === 0,
      data: results,
      message: errors.length > 0 ? `${errors.length} operations failed` : 'All operations completed',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Entity-specific methods (simplified)
   */
  
  // Users
  getUsers = (params?: { limit?: number; q?: string }) => this.list('Usuarios', params);
  getUser = (id: string) => this.get('Usuarios', id);
  createUser = (data: any) => this.create('Usuarios', data);
  updateUser = (id: string, data: any) => this.update('Usuarios', id, data);

  // Projects
  getProjects = (params?: { limit?: number; q?: string }) => this.list('Proyectos', params);
  getProject = (id: string) => this.get('Proyectos', id);
  createProject = (data: any) => this.create('Proyectos', data);
  updateProject = (id: string, data: any) => this.update('Proyectos', id, data);

  // Activities
  getActivities = (params?: { limit?: number; q?: string }) => this.list('Actividades', params);
  getActivity = (id: string) => this.get('Actividades', id);
  createActivity = (data: any) => this.create('Actividades', data);
  updateActivity = (id: string, data: any) => this.update('Actividades', id, data);

  // Materials
  getMaterials = (params?: { limit?: number; q?: string }) => this.list('Materiales', params);
  getMaterial = (id: string) => this.get('Materiales', id);
  createMaterial = (data: any) => this.create('Materiales', data);
  updateMaterial = (id: string, data: any) => this.update('Materiales', id, data);

  // Personnel
  getPersonnel = (params?: { limit?: number; q?: string }) => this.list('Colaboradores', params);
  getPersonnelMember = (id: string) => this.get('Colaboradores', id);
  createPersonnelMember = (data: any) => this.create('Colaboradores', data);
  updatePersonnelMember = (id: string, data: any) => this.update('Colaboradores', id, data);

  // Clients
  getClients = (params?: { limit?: number; q?: string }) => this.list('Clientes', params);
  getClient = (id: string) => this.get('Clientes', id);
  createClient = (data: any) => this.create('Clientes', data);
  updateClient = (id: string, data: any) => this.update('Clientes', id, data);

  // BOM
  getBOMs = (params?: { limit?: number; q?: string }) => this.list('BOM', params);
  getBOM = (id: string) => this.get('BOM', id);
  createBOM = (data: any) => this.create('BOM', data);
  updateBOM = (id: string, data: any) => this.update('BOM', id, data);
  deleteBOM = (id: string) => this.delete('BOM', id);

  // Assignments
  getAssignments = (params?: { limit?: number; q?: string }) => this.list('Asignaciones', params);
  getAssignment = (id: string) => this.get('Asignaciones', id);
  createAssignment = (data: any) => this.create('Asignaciones', data);
  updateAssignment = (id: string, data: any) => this.update('Asignaciones', id, data);
  deleteAssignment = (id: string) => this.delete('Asignaciones', id);

  // Time Entries
  getTimeEntries = (params?: { limit?: number; q?: string }) => this.list('Horas', params);
  getTimeEntry = (id: string) => this.get('Horas', id);
  createTimeEntry = (data: any) => this.create('Horas', data);
  updateTimeEntry = (id: string, data: any) => this.update('Horas', id, data);
  deleteTimeEntry = (id: string) => this.delete('Horas', id);

  // Evidence
  getActivityEvidence = (activityId: string) => this.list('Evidencias', { q: `actividad_id:${activityId}` });
  getEvidence = (id: string) => this.get('Evidencias', id);
  createEvidence = (data: any) => this.create('Evidencias', data);
  updateEvidence = (id: string, data: any) => this.update('Evidencias', id, data);
  deleteEvidence = (id: string) => this.delete('Evidencias', id);

  // Checklists
  getChecklists = (params?: { limit?: number; q?: string }) => this.list('Checklists', params);
  getChecklist = (id: string) => this.get('Checklists', id);
  createChecklist = (data: any) => this.create('Checklists', data);
  updateChecklist = (id: string, data: any) => this.update('Checklists', id, data);

  // Activity Checklists
  getActivityChecklists = (activityId: string) => this.list('ActivityChecklists', { q: `actividad_id:${activityId}` });
  getActivityChecklist = (id: string) => this.get('ActivityChecklists', id);
  createActivityChecklist = (data: any) => this.create('ActivityChecklists', data);
  updateActivityChecklist = (id: string, data: any) => this.update('ActivityChecklists', id, data);


}

// Export singleton instance
export const api = new SimpleAPIClient();