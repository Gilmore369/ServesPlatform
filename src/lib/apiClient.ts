import { config } from './config';
import { JWTManager } from './jwt';
import { APIResponse, AuthResponse, Project, User, Activity, Material, Personnel, Client, Checklist, ActivityChecklist, Evidence, BOM, Assignment, TimeEntry } from './types';

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

  constructor() {
    this.baseURL = config.apiBaseUrl;
    this.apiToken = config.apiToken;
  }

  /**
   * Make HTTP request to the API using GET with query parameters to avoid CORS
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      body,
      requireAuth = true,
    } = options;

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

    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
      });
      
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
    } catch (error) {
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
    return this.request<AuthResponse>('', {
      body: { action: 'auth', email, password },
      requireAuth: false,
    });
  }

  async whoami(): Promise<APIResponse> {
    return this.request<APIResponse>('', {
      body: { action: 'whoami' },
    });
  }

  /**
   * Generic CRUD operations
   */
  async list<T>(table: string, params?: { limit?: number; q?: string }): Promise<APIResponse<T[]>> {
    return this.request<APIResponse<T[]>>('', {
      body: { 
        action: 'crud',
        table,
        operation: 'list',
        ...params
      },
    });
  }

  async get<T>(table: string, id: string): Promise<APIResponse<T>> {
    return this.request<APIResponse<T>>('', {
      body: { 
        action: 'crud',
        table,
        operation: 'get',
        id
      },
    });
  }

  async create<T>(table: string, data: Partial<T>): Promise<APIResponse<T>> {
    return this.request<APIResponse<T>>('', {
      body: { 
        action: 'crud',
        table,
        operation: 'create',
        ...data
      },
    });
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<APIResponse<T>> {
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

  async delete(table: string, id: string): Promise<APIResponse> {
    return this.request<APIResponse>('', {
      body: { 
        action: 'crud',
        table,
        operation: 'delete',
        id
      },
    });
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
}

// Export singleton instance
export const apiClient = new APIClient();