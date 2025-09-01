import { config } from './config';
import { getApiBaseUrl, getApiToken } from './emergency-config';
import { JWTManager } from './jwt';
import { APIResponse, AuthResponse, Project, User, Activity, Material, Personnel, Client, Checklist, ActivityChecklist, Evidence, BOM, Assignment, TimeEntry, EnhancedAPIResponse, CRUDOperation } from './types';
import { googleSheetsAPIService, GoogleSheetsAPIService } from './google-sheets-api-service';
import { optimizedSheetsService } from './optimized-sheets-service';
import { performanceMonitor, monitorPerformance } from './performance-monitor';
import { queueRequest } from './request-queue';
import { logger } from './logger';

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  requireAuth?: boolean;
}

class APIClient {
  private baseURL: string;
  private apiToken: string;
  private enhancedService: GoogleSheetsAPIService;

  constructor() {
    // Use emergency config to ensure correct URL
    this.baseURL = getApiBaseUrl();
    this.apiToken = getApiToken();
    this.enhancedService = googleSheetsAPIService;
    
    logger.info('APIClient initialized with enhanced Google Sheets service', {
      baseURL: this.baseURL,
      hasEnhancedService: !!this.enhancedService
    });
  }

  /**
   * Make HTTP request to the API using GET with query parameters to avoid CORS
   * Enhanced with performance monitoring and request queuing
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      body,
      requireAuth = true,
    } = options;

    const operation = `api-request-${body?.action || 'unknown'}`;
    const endTiming = performanceMonitor.startTiming(operation);

    // For Google Apps Script, we need to send everything as GET with query parameters
    const requestData: any = {
      token: this.apiToken,
      ...body,
    };

    // Add JWT token if authentication is required - TEMPORALMENTE DESHABILITADO
    // if (requireAuth) {
    //   const token = JWTManager.getToken();
    //   if (token) {
    //     requestData.jwt = token;
    //   }
    // }

    // Build URL with query parameters
    const params = new URLSearchParams();
    Object.keys(requestData).forEach(key => {
      if (requestData[key] !== undefined && requestData[key] !== null) {
        params.append(key, typeof requestData[key] === 'object' ? JSON.stringify(requestData[key]) : requestData[key]);
      }
    });

    const url = `${this.baseURL}?${params.toString()}`;
    
    console.log('🔗 APIClient: URL de petición:', url);

    try {
      // Use request queue for better performance
      const requestKey = `api-${body?.action}-${body?.table}-${JSON.stringify(body)}`;
      
      const result = await queueRequest(requestKey, async () => {
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
        });
        
        console.log('📡 APIClient: Status de respuesta:', response.status);
        
        // Parse response
        let data: T;
        try {
          data = await response.json();
        } catch {
          throw new APIError('Invalid JSON response', response.status);
        }

        // Check if response indicates success
        const apiResponse = data as any;
        if (!apiResponse.ok) {
          const errorMessage = apiResponse.message || 'API request failed';
          throw new APIError(errorMessage, response.status);
        }

        // Return the data portion of the response
        return apiResponse.data || apiResponse;
      });

      endTiming(true, undefined, { url, body });
      return result;
    } catch (error) {
      const errorMessage = error instanceof APIError ? error.message : 
        error instanceof TypeError && error.message.includes('fetch') ? 
        'Network error - check your connection' : 'Unexpected error occurred';
      
      endTiming(false, errorMessage, { url, body });

      if (error instanceof APIError) {
        throw error;
      }

      // Network or other errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new APIError('Network error - check your connection', 0);
      }

      throw new APIError('Unexpected error occurred', 0);
    }
  }

  /**
   * Authentication endpoints
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    console.log('🌐 APIClient: Enviando petición de login...');
    const result = await this.request<AuthResponse>('', {
      body: { action: 'auth', email, password },
      requireAuth: false,
    });
    console.log('🌐 APIClient: Respuesta recibida:', result);
    return result;
  }

  async whoami(): Promise<APIResponse> {
    return this.request<APIResponse>('', {
      body: { action: 'whoami' },
    });
  }

  /**
   * Generic CRUD operations using enhanced Google Sheets service
   */
  async list<T>(table: string, params?: { limit?: number; q?: string }): Promise<APIResponse<T[]>> {
    try {
      const operation: CRUDOperation = {
        table,
        operation: 'list',
        filters: params?.q ? { search: params.q } : undefined,
        pagination: params?.limit ? { page: 1, limit: params.limit } : undefined
      };

      const response = await this.enhancedService.executeOperation<T[]>(operation);
      
      // Convert enhanced response to legacy format for backward compatibility
      return {
        ok: response.ok,
        data: response.data,
        message: response.message,
        timestamp: response.timestamp
      };
    } catch (error) {
      logger.error(`Failed to list ${table}`, error);
      
      // Fallback to legacy request method if enhanced service fails
      return this.request<APIResponse<T[]>>('', {
        body: { 
          action: 'crud',
          table,
          operation: 'list',
          ...params
        },
      });
    }
  }

  async get<T>(table: string, id: string): Promise<APIResponse<T>> {
    try {
      const operation: CRUDOperation = {
        table,
        operation: 'get',
        id
      };

      const response = await this.enhancedService.executeOperation<T>(operation);
      
      return {
        ok: response.ok,
        data: response.data,
        message: response.message,
        timestamp: response.timestamp
      };
    } catch (error) {
      logger.error(`Failed to get ${table} with id ${id}`, error);
      
      // Fallback to legacy request method
      return this.request<APIResponse<T>>('', {
        body: { 
          action: 'crud',
          table,
          operation: 'get',
          id
        },
      });
    }
  }

  async create<T>(table: string, data: Partial<T>): Promise<APIResponse<T>> {
    try {
      // Validate data before creating
      const { validateRecord } = await import('./validation');
      const validationResult = await validateRecord(table, data, 'create');
      
      if (!validationResult.isValid) {
        logger.warn(`Validation failed for ${table} creation`, {
          errors: validationResult.errors,
          data
        });
        
        return {
          ok: false,
          message: `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
          timestamp: new Date().toISOString()
        };
      }

      const operation: CRUDOperation = {
        table,
        operation: 'create',
        data
      };

      const response = await this.enhancedService.executeOperation<T>(operation);
      
      return {
        ok: response.ok,
        data: response.data,
        message: response.message,
        timestamp: response.timestamp
      };
    } catch (error) {
      logger.error(`Failed to create ${table}`, error);
      
      // Fallback to legacy request method
      return this.request<APIResponse<T>>('', {
        body: { 
          action: 'crud',
          table,
          operation: 'create',
          ...data
        },
      });
    }
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<APIResponse<T>> {
    try {
      // Get existing record for validation context
      const existingRecord = await this.get<T>(table, id);
      
      // Validate data before updating
      const { validateRecord } = await import('./validation');
      const validationResult = await validateRecord(table, data, 'update');
      
      if (!validationResult.isValid) {
        logger.warn(`Validation failed for ${table} update`, {
          id,
          errors: validationResult.errors,
          data
        });
        
        return {
          ok: false,
          message: `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
          timestamp: new Date().toISOString()
        };
      }

      const operation: CRUDOperation = {
        table,
        operation: 'update',
        id,
        data: {
          ...data,
          // Include existing record data for business rule validation
          _existingRecord: existingRecord.data
        }
      };

      const response = await this.enhancedService.executeOperation<T>(operation);
      
      return {
        ok: response.ok,
        data: response.data,
        message: response.message,
        timestamp: response.timestamp
      };
    } catch (error) {
      logger.error(`Failed to update ${table} with id ${id}`, error);
      
      // Fallback to legacy request method
      return this.request<APIResponse<T>>('', {
        body: { 
          action: 'crud',
          table,
          operation: 'update',
          id,
          ...data
        },
      });
    }
  }

  async delete(table: string, id: string): Promise<APIResponse> {
    try {
      const operation: CRUDOperation = {
        table,
        operation: 'delete',
        id
      };

      const response = await this.enhancedService.executeOperation(operation);
      
      return {
        ok: response.ok,
        data: response.data,
        message: response.message,
        timestamp: response.timestamp
      };
    } catch (error) {
      logger.error(`Failed to delete ${table} with id ${id}`, error);
      
      // Fallback to legacy request method
      return this.request<APIResponse>('', {
        body: { 
          action: 'crud',
          table,
          operation: 'delete',
          id
        },
      });
    }
  }

  /**
   * Specific entity methods
   */
  
  // Users
  async getUsers(params?: { limit?: number; q?: string }) {
    return this.list<User>('Usuarios', params);
  }

  async getUser(id: string) {
    return this.get<User>('Usuarios', id);
  }

  async createUser(userData: Partial<User>) {
    return this.create<User>('Usuarios', userData);
  }

  async updateUser(id: string, userData: Partial<User>) {
    return this.update<User>('Usuarios', id, userData);
  }

  // Projects
  async getProjects(params?: { limit?: number; q?: string }) {
    return this.list<Project>('Proyectos', params);
  }

  async getProject(id: string) {
    return this.get<Project>('Proyectos', id);
  }

  async createProject(projectData: Partial<Project>) {
    return this.create<Project>('Proyectos', projectData);
  }

  async updateProject(id: string, projectData: Partial<Project>) {
    return this.update<Project>('Proyectos', id, projectData);
  }

  // Activities
  async getActivities(params?: { limit?: number; q?: string }) {
    return this.list<Activity>('Actividades', params);
  }

  async getActivity(id: string) {
    return this.get<Activity>('Actividades', id);
  }

  async createActivity(activityData: Partial<Activity>) {
    return this.create<Activity>('Actividades', activityData);
  }

  async updateActivity(id: string, activityData: Partial<Activity>) {
    return this.update<Activity>('Actividades', id, activityData);
  }

  // Personnel
  async getPersonnel(params?: { limit?: number; q?: string }) {
    return this.list<Personnel>('Colaboradores', params);
  }

  async getPersonnelMember(id: string) {
    return this.get<Personnel>('Colaboradores', id);
  }

  async createPersonnelMember(personnelData: Partial<Personnel>) {
    return this.create<Personnel>('Colaboradores', personnelData);
  }

  async updatePersonnelMember(id: string, personnelData: Partial<Personnel>) {
    return this.update<Personnel>('Colaboradores', id, personnelData);
  }

  // Materials
  async getMaterials(params?: { limit?: number; q?: string }) {
    return this.list<Material>('Materiales', params);
  }

  async getMaterial(id: string) {
    return this.get<Material>('Materiales', id);
  }

  async createMaterial(materialData: Partial<Material>) {
    return this.create<Material>('Materiales', materialData);
  }

  async updateMaterial(id: string, materialData: Partial<Material>) {
    return this.update<Material>('Materiales', id, materialData);
  }

  // BOM (Bill of Materials)
  async getBOMs(params?: { limit?: number; q?: string }) {
    return this.list<BOM>('BOM', params);
  }

  async getBOM(id: string) {
    return this.get<BOM>('BOM', id);
  }

  async createBOM(bomData: Partial<BOM>) {
    return this.create<BOM>('BOM', bomData);
  }

  async updateBOM(id: string, bomData: Partial<BOM>) {
    return this.update<BOM>('BOM', id, bomData);
  }

  async deleteBOM(id: string) {
    return this.delete('BOM', id);
  }

  // Get BOM items for a specific project
  async getProjectBOMs(projectId: string) {
    return this.list<BOM>('BOM', { q: `proyecto_id:${projectId}` });
  }

  // Get BOM items for a specific activity
  async getActivityBOMs(activityId: string) {
    return this.list<BOM>('BOM', { q: `actividad_id:${activityId}` });
  }

  // Clients
  async getClients(params?: { limit?: number; q?: string }) {
    return this.list<Client>('Clientes', params);
  }

  async getClient(id: string) {
    return this.get<Client>('Clientes', id);
  }

  async createClient(clientData: Partial<Client>) {
    return this.create<Client>('Clientes', clientData);
  }

  async updateClient(id: string, clientData: Partial<Client>) {
    return this.update<Client>('Clientes', id, clientData);
  }

  // Checklists
  async getChecklists(params?: { limit?: number; q?: string }) {
    return this.list<Checklist>('Checklists', params);
  }

  async getChecklist(id: string) {
    return this.get<Checklist>('Checklists', id);
  }

  async createChecklist(checklistData: Partial<Checklist>) {
    return this.create<Checklist>('Checklists', checklistData);
  }

  async updateChecklist(id: string, checklistData: Partial<Checklist>) {
    return this.update<Checklist>('Checklists', id, checklistData);
  }

  // Activity Checklists
  async getActivityChecklists(activityId: string) {
    return this.list<ActivityChecklist>('ActivityChecklists', { q: `actividad_id:${activityId}` });
  }

  async getActivityChecklist(id: string) {
    return this.get<ActivityChecklist>('ActivityChecklists', id);
  }

  async createActivityChecklist(checklistData: Partial<ActivityChecklist>) {
    return this.create<ActivityChecklist>('ActivityChecklists', checklistData);
  }

  async updateActivityChecklist(id: string, checklistData: Partial<ActivityChecklist>) {
    return this.update<ActivityChecklist>('ActivityChecklists', id, checklistData);
  }

  // Evidence
  async getActivityEvidence(activityId: string) {
    return this.list<Evidence>('Evidencias', { q: `actividad_id:${activityId}` });
  }

  async getEvidence(id: string) {
    return this.get<Evidence>('Evidencias', id);
  }

  async createEvidence(evidenceData: Partial<Evidence>) {
    return this.create<Evidence>('Evidencias', evidenceData);
  }

  async updateEvidence(id: string, evidenceData: Partial<Evidence>) {
    return this.update<Evidence>('Evidencias', id, evidenceData);
  }

  async deleteEvidence(id: string) {
    return this.delete('Evidencias', id);
  }

  // Assignments
  async getAssignments(params?: { limit?: number; q?: string }) {
    return this.list<Assignment>('Asignaciones', params);
  }

  async getAssignment(id: string) {
    return this.get<Assignment>('Asignaciones', id);
  }

  async createAssignment(assignmentData: Partial<Assignment>) {
    return this.create<Assignment>('Asignaciones', assignmentData);
  }

  async updateAssignment(id: string, assignmentData: Partial<Assignment>) {
    return this.update<Assignment>('Asignaciones', id, assignmentData);
  }

  async deleteAssignment(id: string) {
    return this.delete('Asignaciones', id);
  }

  // Get assignments for a specific personnel member
  async getPersonnelAssignments(personnelId: string) {
    return this.list<Assignment>('Asignaciones', { q: `colaborador_id:${personnelId}` });
  }

  // Get assignments for a specific project
  async getProjectAssignments(projectId: string) {
    return this.list<Assignment>('Asignaciones', { q: `proyecto_id:${projectId}` });
  }

  // Time Entries
  async getTimeEntries(params?: { limit?: number; q?: string }) {
    return this.list<TimeEntry>('Horas', params);
  }

  async getTimeEntry(id: string) {
    return this.get<TimeEntry>('Horas', id);
  }

  async createTimeEntry(timeEntryData: Partial<TimeEntry>) {
    return this.create<TimeEntry>('Horas', timeEntryData);
  }

  async updateTimeEntry(id: string, timeEntryData: Partial<TimeEntry>) {
    return this.update<TimeEntry>('Horas', id, timeEntryData);
  }

  async deleteTimeEntry(id: string) {
    return this.delete('Horas', id);
  }

  // Get time entries for a specific personnel member
  async getPersonnelTimeEntries(personnelId: string, params?: { limit?: number; fecha_inicio?: string; fecha_fin?: string }) {
    let query = `colaborador_id:${personnelId}`;
    if (params?.fecha_inicio) query += ` AND fecha>=${params.fecha_inicio}`;
    if (params?.fecha_fin) query += ` AND fecha<=${params.fecha_fin}`;
    
    return this.list<TimeEntry>('Horas', { 
      q: query,
      limit: params?.limit 
    });
  }

  // Get time entries for a specific project
  async getProjectTimeEntries(projectId: string) {
    return this.list<TimeEntry>('Horas', { q: `proyecto_id:${projectId}` });
  }

  /**
   * Enhanced operations using the improved Google Sheets service
   */

  // Batch operations for bulk data processing with performance optimization
  async batchCreate<T>(table: string, records: Partial<T>[]): Promise<APIResponse<T[]>> {
    const endTiming = performanceMonitor.startTiming(`batch-create-${table}`);
    
    try {
      // Use optimized sheets service for better performance
      const response = await optimizedSheetsService.bulkCreate<T>(table, records);
      
      endTiming(true, undefined, { table, recordCount: records.length });
      
      return {
        ok: response.ok,
        data: response.data,
        message: response.message || (response.ok ? 'All operations completed successfully' : 'Some operations failed'),
        timestamp: response.timestamp
      };
    } catch (error) {
      endTiming(false, error instanceof Error ? error.message : 'Unknown error', { table, recordCount: records.length });
      logger.error(`Failed to batch create ${table}`, error);
      
      // Fallback to individual operations
      try {
        const operations: CRUDOperation[] = records.map(data => ({
          table,
          operation: 'create',
          data
        }));

        const responses = await this.enhancedService.batchOperations<T>(operations);
        
        const successfulResults = responses.filter(r => r.ok).map(r => r.data).filter(Boolean);
        const hasErrors = responses.some(r => !r.ok);
        
        return {
          ok: !hasErrors,
          data: successfulResults,
          message: hasErrors ? 'Some operations failed' : 'All operations completed successfully',
          timestamp: new Date().toISOString()
        };
      } catch (fallbackError) {
        throw error;
      }
    }
  }

  async batchUpdate<T>(table: string, updates: Array<{ id: string; data: Partial<T> }>): Promise<APIResponse<T[]>> {
    const endTiming = performanceMonitor.startTiming(`batch-update-${table}`);
    
    try {
      // Use optimized sheets service for better performance
      const response = await optimizedSheetsService.bulkUpdate<T>(table, updates);
      
      endTiming(true, undefined, { table, updateCount: updates.length });
      
      return {
        ok: response.ok,
        data: response.data,
        message: response.message || (response.ok ? 'All updates completed successfully' : 'Some updates failed'),
        timestamp: response.timestamp
      };
    } catch (error) {
      endTiming(false, error instanceof Error ? error.message : 'Unknown error', { table, updateCount: updates.length });
      logger.error(`Failed to batch update ${table}`, error);
      
      // Fallback to individual operations
      try {
        const operations: CRUDOperation[] = updates.map(({ id, data }) => ({
          table,
          operation: 'update',
          id,
          data
        }));

        const responses = await this.enhancedService.batchOperations<T>(operations);
        
        const successfulResults = responses.filter(r => r.ok).map(r => r.data).filter(Boolean);
        const hasErrors = responses.some(r => !r.ok);
        
        return {
          ok: !hasErrors,
          data: successfulResults,
          message: hasErrors ? 'Some updates failed' : 'All updates completed successfully',
          timestamp: new Date().toISOString()
        };
      } catch (fallbackError) {
        throw error;
      }
    }
  }

  // Advanced filtering and search
  async searchRecords<T>(
    table: string, 
    filters: Record<string, any>, 
    options?: { 
      limit?: number; 
      page?: number; 
      sortBy?: string; 
      sortOrder?: 'asc' | 'desc' 
    }
  ): Promise<APIResponse<T[]>> {
    try {
      const operation: CRUDOperation = {
        table,
        operation: 'list',
        filters,
        pagination: options?.limit ? { 
          page: options.page || 1, 
          limit: options.limit 
        } : undefined
      };

      const response = await this.enhancedService.executeOperation<T[]>(operation);
      
      return {
        ok: response.ok,
        data: response.data,
        message: response.message,
        timestamp: response.timestamp
      };
    } catch (error) {
      logger.error(`Failed to search ${table}`, error);
      throw error;
    }
  }

  // Get service health and performance metrics
  async getServiceHealth(): Promise<APIResponse<any>> {
    try {
      const isHealthy = await this.enhancedService.validateConnection();
      const config = this.enhancedService.getConfig();
      
      return {
        ok: true,
        data: {
          healthy: isHealthy,
          config: {
            timeout: config.timeout,
            retryAttempts: config.retryAttempts,
            cacheEnabled: config.cacheEnabled
          },
          timestamp: new Date().toISOString()
        },
        message: isHealthy ? 'Service is healthy' : 'Service has connectivity issues',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get service health', error);
      return {
        ok: false,
        message: 'Failed to check service health',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Configure enhanced service settings
  updateServiceConfig(config: {
    timeout?: number;
    retryAttempts?: number;
    cacheEnabled?: boolean;
  }): void {
    this.enhancedService.updateConfig(config);
    logger.info('APIClient service configuration updated', config);
  }
}

// Export singleton instance
export const apiClient = new APIClient();