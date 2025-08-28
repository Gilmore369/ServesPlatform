import { 
  GoogleSheetsAPIService, 
  CRUDOperation, 
  EnhancedAPIResponse,
  RequestOptions 
} from './google-sheets-api-service';
import { EnhancedError } from './error-handler';
import { 
  APIResponse, 
  AuthResponse, 
  Project, 
  User, 
  Activity, 
  Material, 
  Personnel, 
  Client, 
  Checklist, 
  ActivityChecklist, 
  Evidence, 
  BOM, 
  Assignment, 
  TimeEntry 
} from './types';

/**
 * Enhanced API Client that wraps GoogleSheetsAPIService
 * Provides backward compatibility with existing APIClient while adding enhanced features
 */
export class EnhancedAPIClient {
  private apiService: GoogleSheetsAPIService;

  constructor() {
    this.apiService = new GoogleSheetsAPIService();
  }

  /**
   * Convert EnhancedAPIResponse to legacy APIResponse format for backward compatibility
   */
  private toLegacyResponse<T>(response: EnhancedAPIResponse<T>): APIResponse<T> {
    return {
      ok: response.ok,
      data: response.data,
      message: response.message,
      timestamp: response.timestamp
    };
  }

  /**
   * Execute a CRUD operation with enhanced error handling and retries
   */
  async executeOperation<T>(
    operation: CRUDOperation,
    options?: RequestOptions
  ): Promise<EnhancedAPIResponse<T>> {
    return this.apiService.executeOperation<T>(operation, options);
  }

  /**
   * Execute multiple operations in batch
   */
  async batchOperations<T>(
    operations: CRUDOperation[],
    options?: RequestOptions
  ): Promise<EnhancedAPIResponse<T>[]> {
    return this.apiService.batchOperations<T>(operations, options);
  }

  /**
   * Validate connection to Google Sheets API
   */
  async validateConnection(): Promise<boolean> {
    return this.apiService.validateConnection();
  }

  /**
   * Authentication endpoints
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const operation: CRUDOperation = {
        table: '',
        operation: 'create',
        data: { action: 'auth', email, password }
      };

      const response = await this.apiService.executeOperation<AuthResponse>(operation, {
        requireAuth: false
      });

      return response.data || { ok: false, message: 'Login failed' };
    } catch (error) {
      if (error instanceof EnhancedError) {
        return { ok: false, message: error.details.userMessage || error.details.message };
      }
      return { ok: false, message: 'Login failed due to unexpected error' };
    }
  }

  async whoami(): Promise<APIResponse> {
    try {
      const operation: CRUDOperation = {
        table: '',
        operation: 'get',
        data: { action: 'whoami' }
      };

      const response = await this.apiService.executeOperation(operation);
      return this.toLegacyResponse(response);
    } catch (error) {
      if (error instanceof EnhancedError) {
        return { ok: false, message: error.details.userMessage || error.details.message, timestamp: new Date().toISOString() };
      }
      return { ok: false, message: 'Whoami failed', timestamp: new Date().toISOString() };
    }
  }

  /**
   * Generic CRUD operations with enhanced features
   */
  async list<T>(
    table: string, 
    params?: { limit?: number; q?: string; page?: number },
    options?: RequestOptions
  ): Promise<APIResponse<T[]>> {
    try {
      const operation: CRUDOperation = {
        table,
        operation: 'list',
        filters: params?.q ? { q: params.q } : undefined,
        pagination: {
          page: params?.page || 1,
          limit: params?.limit || 50
        }
      };

      const response = await this.apiService.executeOperation<T[]>(operation, options);
      return this.toLegacyResponse(response);
    } catch (error) {
      if (error instanceof EnhancedError) {
        return { ok: false, message: error.details.userMessage || error.details.message, timestamp: new Date().toISOString() };
      }
      return { ok: false, message: 'List operation failed', timestamp: new Date().toISOString() };
    }
  }

  async get<T>(table: string, id: string, options?: RequestOptions): Promise<APIResponse<T>> {
    try {
      const operation: CRUDOperation = {
        table,
        operation: 'get',
        id
      };

      const response = await this.apiService.executeOperation<T>(operation, options);
      return this.toLegacyResponse(response);
    } catch (error) {
      if (error instanceof EnhancedError) {
        return { ok: false, message: error.details.userMessage || error.details.message, timestamp: new Date().toISOString() };
      }
      return { ok: false, message: 'Get operation failed', timestamp: new Date().toISOString() };
    }
  }

  async create<T>(table: string, data: Partial<T>, options?: RequestOptions): Promise<APIResponse<T>> {
    try {
      const operation: CRUDOperation = {
        table,
        operation: 'create',
        data
      };

      const response = await this.apiService.executeOperation<T>(operation, options);
      return this.toLegacyResponse(response);
    } catch (error) {
      if (error instanceof EnhancedError) {
        return { ok: false, message: error.details.userMessage || error.details.message, timestamp: new Date().toISOString() };
      }
      return { ok: false, message: 'Create operation failed', timestamp: new Date().toISOString() };
    }
  }

  async update<T>(table: string, id: string, data: Partial<T>, options?: RequestOptions): Promise<APIResponse<T>> {
    try {
      const operation: CRUDOperation = {
        table,
        operation: 'update',
        id,
        data
      };

      const response = await this.apiService.executeOperation<T>(operation, options);
      return this.toLegacyResponse(response);
    } catch (error) {
      if (error instanceof EnhancedError) {
        return { ok: false, message: error.details.userMessage || error.details.message, timestamp: new Date().toISOString() };
      }
      return { ok: false, message: 'Update operation failed', timestamp: new Date().toISOString() };
    }
  }

  async delete(table: string, id: string, options?: RequestOptions): Promise<APIResponse> {
    try {
      const operation: CRUDOperation = {
        table,
        operation: 'delete',
        id
      };

      const response = await this.apiService.executeOperation(operation, options);
      return this.toLegacyResponse(response);
    } catch (error) {
      if (error instanceof EnhancedError) {
        return { ok: false, message: error.details.userMessage || error.details.message, timestamp: new Date().toISOString() };
      }
      return { ok: false, message: 'Delete operation failed', timestamp: new Date().toISOString() };
    }
  }

  /**
   * Enhanced specific entity methods with improved error handling
   */
  
  // Users
  async getUsers(params?: { limit?: number; q?: string; page?: number }, options?: RequestOptions) {
    return this.list<User>('Usuarios', params, options);
  }

  async getUser(id: string, options?: RequestOptions) {
    return this.get<User>('Usuarios', id, options);
  }

  async createUser(userData: Partial<User>, options?: RequestOptions) {
    return this.create<User>('Usuarios', userData, options);
  }

  async updateUser(id: string, userData: Partial<User>, options?: RequestOptions) {
    return this.update<User>('Usuarios', id, userData, options);
  }

  // Projects
  async getProjects(params?: { limit?: number; q?: string; page?: number }, options?: RequestOptions) {
    return this.list<Project>('Proyectos', params, options);
  }

  async getProject(id: string, options?: RequestOptions) {
    return this.get<Project>('Proyectos', id, options);
  }

  async createProject(projectData: Partial<Project>, options?: RequestOptions) {
    return this.create<Project>('Proyectos', projectData, options);
  }

  async updateProject(id: string, projectData: Partial<Project>, options?: RequestOptions) {
    return this.update<Project>('Proyectos', id, projectData, options);
  }

  // Activities
  async getActivities(params?: { limit?: number; q?: string; page?: number }, options?: RequestOptions) {
    return this.list<Activity>('Actividades', params, options);
  }

  async getActivity(id: string, options?: RequestOptions) {
    return this.get<Activity>('Actividades', id, options);
  }

  async createActivity(activityData: Partial<Activity>, options?: RequestOptions) {
    return this.create<Activity>('Actividades', activityData, options);
  }

  async updateActivity(id: string, activityData: Partial<Activity>, options?: RequestOptions) {
    return this.update<Activity>('Actividades', id, activityData, options);
  }

  // Personnel
  async getPersonnel(params?: { limit?: number; q?: string; page?: number }, options?: RequestOptions) {
    return this.list<Personnel>('Colaboradores', params, options);
  }

  async getPersonnelMember(id: string, options?: RequestOptions) {
    return this.get<Personnel>('Colaboradores', id, options);
  }

  async createPersonnelMember(personnelData: Partial<Personnel>, options?: RequestOptions) {
    return this.create<Personnel>('Colaboradores', personnelData, options);
  }

  async updatePersonnelMember(id: string, personnelData: Partial<Personnel>, options?: RequestOptions) {
    return this.update<Personnel>('Colaboradores', id, personnelData, options);
  }

  // Materials
  async getMaterials(params?: { limit?: number; q?: string; page?: number }, options?: RequestOptions) {
    return this.list<Material>('Materiales', params, options);
  }

  async getMaterial(id: string, options?: RequestOptions) {
    return this.get<Material>('Materiales', id, options);
  }

  async createMaterial(materialData: Partial<Material>, options?: RequestOptions) {
    return this.create<Material>('Materiales', materialData, options);
  }

  async updateMaterial(id: string, materialData: Partial<Material>, options?: RequestOptions) {
    return this.update<Material>('Materiales', id, materialData, options);
  }

  // BOM (Bill of Materials)
  async getBOMs(params?: { limit?: number; q?: string; page?: number }, options?: RequestOptions) {
    return this.list<BOM>('BOM', params, options);
  }

  async getBOM(id: string, options?: RequestOptions) {
    return this.get<BOM>('BOM', id, options);
  }

  async createBOM(bomData: Partial<BOM>, options?: RequestOptions) {
    return this.create<BOM>('BOM', bomData, options);
  }

  async updateBOM(id: string, bomData: Partial<BOM>, options?: RequestOptions) {
    return this.update<BOM>('BOM', id, bomData, options);
  }

  async deleteBOM(id: string, options?: RequestOptions) {
    return this.delete('BOM', id, options);
  }

  // Get BOM items for a specific project
  async getProjectBOMs(projectId: string, options?: RequestOptions) {
    return this.list<BOM>('BOM', { q: `proyecto_id:${projectId}` }, options);
  }

  // Get BOM items for a specific activity
  async getActivityBOMs(activityId: string, options?: RequestOptions) {
    return this.list<BOM>('BOM', { q: `actividad_id:${activityId}` }, options);
  }

  // Clients
  async getClients(params?: { limit?: number; q?: string; page?: number }, options?: RequestOptions) {
    return this.list<Client>('Clientes', params, options);
  }

  async getClient(id: string, options?: RequestOptions) {
    return this.get<Client>('Clientes', id, options);
  }

  async createClient(clientData: Partial<Client>, options?: RequestOptions) {
    return this.create<Client>('Clientes', clientData, options);
  }

  async updateClient(id: string, clientData: Partial<Client>, options?: RequestOptions) {
    return this.update<Client>('Clientes', id, clientData, options);
  }

  // Checklists
  async getChecklists(params?: { limit?: number; q?: string; page?: number }, options?: RequestOptions) {
    return this.list<Checklist>('Checklists', params, options);
  }

  async getChecklist(id: string, options?: RequestOptions) {
    return this.get<Checklist>('Checklists', id, options);
  }

  async createChecklist(checklistData: Partial<Checklist>, options?: RequestOptions) {
    return this.create<Checklist>('Checklists', checklistData, options);
  }

  async updateChecklist(id: string, checklistData: Partial<Checklist>, options?: RequestOptions) {
    return this.update<Checklist>('Checklists', id, checklistData, options);
  }

  // Activity Checklists
  async getActivityChecklists(activityId: string, options?: RequestOptions) {
    return this.list<ActivityChecklist>('ActivityChecklists', { q: `actividad_id:${activityId}` }, options);
  }

  async getActivityChecklist(id: string, options?: RequestOptions) {
    return this.get<ActivityChecklist>('ActivityChecklists', id, options);
  }

  async createActivityChecklist(checklistData: Partial<ActivityChecklist>, options?: RequestOptions) {
    return this.create<ActivityChecklist>('ActivityChecklists', checklistData, options);
  }

  async updateActivityChecklist(id: string, checklistData: Partial<ActivityChecklist>, options?: RequestOptions) {
    return this.update<ActivityChecklist>('ActivityChecklists', id, checklistData, options);
  }

  // Evidence
  async getActivityEvidence(activityId: string, options?: RequestOptions) {
    return this.list<Evidence>('Evidencias', { q: `actividad_id:${activityId}` }, options);
  }

  async getEvidence(id: string, options?: RequestOptions) {
    return this.get<Evidence>('Evidencias', id, options);
  }

  async createEvidence(evidenceData: Partial<Evidence>, options?: RequestOptions) {
    return this.create<Evidence>('Evidencias', evidenceData, options);
  }

  async updateEvidence(id: string, evidenceData: Partial<Evidence>, options?: RequestOptions) {
    return this.update<Evidence>('Evidencias', id, evidenceData, options);
  }

  async deleteEvidence(id: string, options?: RequestOptions) {
    return this.delete('Evidencias', id, options);
  }

  // Assignments
  async getAssignments(params?: { limit?: number; q?: string; page?: number }, options?: RequestOptions) {
    return this.list<Assignment>('Asignaciones', params, options);
  }

  async getAssignment(id: string, options?: RequestOptions) {
    return this.get<Assignment>('Asignaciones', id, options);
  }

  async createAssignment(assignmentData: Partial<Assignment>, options?: RequestOptions) {
    return this.create<Assignment>('Asignaciones', assignmentData, options);
  }

  async updateAssignment(id: string, assignmentData: Partial<Assignment>, options?: RequestOptions) {
    return this.update<Assignment>('Asignaciones', id, assignmentData, options);
  }

  async deleteAssignment(id: string, options?: RequestOptions) {
    return this.delete('Asignaciones', id, options);
  }

  // Get assignments for a specific personnel member
  async getPersonnelAssignments(personnelId: string, options?: RequestOptions) {
    return this.list<Assignment>('Asignaciones', { q: `colaborador_id:${personnelId}` }, options);
  }

  // Get assignments for a specific project
  async getProjectAssignments(projectId: string, options?: RequestOptions) {
    return this.list<Assignment>('Asignaciones', { q: `proyecto_id:${projectId}` }, options);
  }

  // Time Entries
  async getTimeEntries(params?: { limit?: number; q?: string; page?: number }, options?: RequestOptions) {
    return this.list<TimeEntry>('Horas', params, options);
  }

  async getTimeEntry(id: string, options?: RequestOptions) {
    return this.get<TimeEntry>('Horas', id, options);
  }

  async createTimeEntry(timeEntryData: Partial<TimeEntry>, options?: RequestOptions) {
    return this.create<TimeEntry>('Horas', timeEntryData, options);
  }

  async updateTimeEntry(id: string, timeEntryData: Partial<TimeEntry>, options?: RequestOptions) {
    return this.update<TimeEntry>('Horas', id, timeEntryData, options);
  }

  async deleteTimeEntry(id: string, options?: RequestOptions) {
    return this.delete('Horas', id, options);
  }

  // Get time entries for a specific personnel member
  async getPersonnelTimeEntries(
    personnelId: string, 
    params?: { limit?: number; fecha_inicio?: string; fecha_fin?: string },
    options?: RequestOptions
  ) {
    let query = `colaborador_id:${personnelId}`;
    if (params?.fecha_inicio) query += ` AND fecha>=${params.fecha_inicio}`;
    if (params?.fecha_fin) query += ` AND fecha<=${params.fecha_fin}`;
    
    return this.list<TimeEntry>('Horas', { 
      q: query,
      limit: params?.limit 
    }, options);
  }

  // Get time entries for a specific project
  async getProjectTimeEntries(projectId: string, options?: RequestOptions) {
    return this.list<TimeEntry>('Horas', { q: `proyecto_id:${projectId}` }, options);
  }

  /**
   * Get the underlying API service for advanced operations
   */
  getAPIService(): GoogleSheetsAPIService {
    return this.apiService;
  }
}

// Export singleton instance
export const enhancedAPIClient = new EnhancedAPIClient();