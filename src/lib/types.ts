/**
 * Core type definitions for ServesPlatform
 * Standardized data models and API interfaces
 * 
 * This file contains all standardized TypeScript interfaces and types used throughout
 * the ServesPlatform application. All interfaces follow consistent naming conventions
 * and include comprehensive JSDoc documentation.
 * 
 * Requirements: 6.1, 6.2, 6.3
 * @fileoverview Comprehensive type definitions for ServesPlatform
 * @author ServesPlatform Development Team
 * @version 2.1.0
 */

// =============================================================================
// CORE API TYPES
// =============================================================================

/**
 * Standard API response format used across all endpoints
 * Provides consistent structure for all API responses with proper error handling
 * 
 * @template T - The type of data returned in the response
 * @example
 * ```typescript
 * const response: APIResponse<User[]> = await api.getUsers();
 * if (response.ok) {
 *   console.log(response.data); // User[]
 * }
 * ```
 */
export interface APIResponse<T = any> {
  /** Indicates if the operation was successful */
  ok: boolean;
  /** The actual data payload */
  data?: T;
  /** Human-readable message about the operation */
  message?: string;
  /** ISO timestamp of when the response was generated */
  timestamp: string;
}

// =============================================================================
// AUTHENTICATION TYPES
// =============================================================================

/**
 * Authentication response containing user data and JWT token
 * Returned by the login endpoint upon successful authentication
 * 
 * @example
 * ```typescript
 * const authResponse: AuthResponse = await api.login(email, password);
 * if (authResponse.ok) {
 *   localStorage.setItem('token', authResponse.token);
 *   setCurrentUser(authResponse.user);
 * }
 * ```
 */
export interface AuthResponse extends APIResponse<User> {
  /** JWT token for authenticated requests */
  token?: string;
  /** Authenticated user information */
  user?: User;
}

// =============================================================================
// CORE ENTITY TYPES
// =============================================================================

/**
 * User entity representing system users with roles and permissions
 * Central entity for authentication and authorization throughout the system
 * 
 * @example
 * ```typescript
 * const user: User = {
 *   id: 'user_001',
 *   email: 'admin@example.com',
 *   nombre: 'Administrator',
 *   rol: 'admin',
 *   activo: true,
 *   created_at: new Date(),
 *   updated_at: new Date()
 * };
 * ```
 */
export interface User {
  /** Unique identifier for the user (format: user_XXXXXXXXX) */
  id: string;
  /** User's email address (used for login, must be unique) */
  email: string;
  /** Full name of the user */
  nombre: string;
  /** User role determining system permissions */
  rol: UserRole;
  /** Whether the user account is active and can log in */
  activo: boolean;
  /** JSON string containing user certifications and qualifications */
  certificaciones_json?: string;
  /** Timestamp when the user account was created */
  created_at: Date;
  /** Timestamp when the user account was last updated */
  updated_at: Date;
}

/**
 * Available user roles in the system with hierarchical permissions
 * Each role inherits permissions from lower-level roles
 */
export type UserRole = 'admin_lider' | 'admin' | 'editor' | 'tecnico';

/**
 * User role definitions with descriptions
 */
export const USER_ROLES: Record<UserRole, { name: string; description: string; level: number }> = {
  admin_lider: {
    name: 'Administrador Líder',
    description: 'Acceso completo al sistema, gestión de usuarios y configuración',
    level: 4
  },
  admin: {
    name: 'Administrador',
    description: 'Gestión de proyectos, materiales y reportes',
    level: 3
  },
  editor: {
    name: 'Editor',
    description: 'Creación y edición de contenido, sin acceso administrativo',
    level: 2
  },
  tecnico: {
    name: 'Técnico',
    description: 'Acceso de solo lectura y actualización de actividades asignadas',
    level: 1
  }
};

/**
 * Project entity representing construction/service projects
 * Central entity for project management with complete lifecycle tracking
 * 
 * @example
 * ```typescript
 * const project: Project = {
 *   id: 'proj_001',
 *   codigo: 'ELEC-2024-001',
 *   nombre: 'Instalación Eléctrica Oficina Central',
 *   cliente_id: 'client_001',
 *   responsable_id: 'user_001',
 *   ubicacion: 'Lima, Perú',
 *   descripcion: 'Instalación completa del sistema eléctrico',
 *   linea_servicio: 'Eléctrico',
 *   inicio_plan: new Date('2024-01-15'),
 *   fin_plan: new Date('2024-03-15'),
 *   presupuesto_total: 50000,
 *   moneda: 'PEN',
 *   estado: 'En progreso',
 *   avance_pct: 45,
 *   created_at: new Date(),
 *   updated_at: new Date()
 * };
 * ```
 */
export interface Project {
  /** Unique identifier for the project (format: proj_XXXXXXXXX) */
  id: string;
  /** Project code following company standards (e.g., ELEC-2024-001) */
  codigo: string;
  /** Project name/title */
  nombre: string;
  /** Reference to the client entity */
  cliente_id: string;
  /** Reference to the responsible user/project manager */
  responsable_id: string;
  /** Physical location where the project takes place */
  ubicacion: string;
  /** Detailed project description */
  descripcion: string;
  /** Service line/category of the project */
  linea_servicio: ServiceLine;
  /** Planned start date */
  inicio_plan: Date;
  /** Planned end date */
  fin_plan: Date;
  /** Total project budget */
  presupuesto_total: number;
  /** Currency for budget and costs */
  moneda: Currency;
  /** Current project status */
  estado: ProjectStatus;
  /** Project completion percentage (0-100) */
  avance_pct: number;
  /** Timestamp when the project was created */
  created_at: Date;
  /** Timestamp when the project was last updated */
  updated_at: Date;
}

/**
 * Available project statuses with workflow progression
 */
export type ProjectStatus = 'Planificación' | 'En progreso' | 'Pausado' | 'Cerrado';

/**
 * Available service lines for projects
 */
export type ServiceLine = 'Eléctrico' | 'Civil' | 'CCTV' | 'Mantenimiento' | 'Telecomunicaciones';

/**
 * Supported currencies in the system
 */
export type Currency = 'PEN' | 'USD';

/**
 * Project status definitions with descriptions
 */
export const PROJECT_STATUSES: Record<ProjectStatus, { name: string; description: string; color: string }> = {
  'Planificación': {
    name: 'Planificación',
    description: 'Proyecto en fase de planificación y preparación',
    color: '#fbbf24'
  },
  'En progreso': {
    name: 'En Progreso',
    description: 'Proyecto activo en ejecución',
    color: '#3b82f6'
  },
  'Pausado': {
    name: 'Pausado',
    description: 'Proyecto temporalmente suspendido',
    color: '#f59e0b'
  },
  'Cerrado': {
    name: 'Cerrado',
    description: 'Proyecto completado y cerrado',
    color: '#10b981'
  }
};

export interface Activity {
  id: string;
  proyecto_id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  responsable_id: string;
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  estado: 'Pendiente' | 'En progreso' | 'En revisión' | 'Completada';
  inicio_plan: Date;
  fin_plan: Date;
  checklist_id?: string;
  porcentaje_avance: number;
  created_at: Date;
  updated_at: Date;
}

export interface Checklist {
  id: string;
  nombre: string;
  descripcion?: string;
  items_json: string; // JSON array of checklist items
  created_at: Date;
  updated_at: Date;
}

export interface ChecklistItem {
  id: string;
  texto: string;
  completado: boolean;
  requerido: boolean;
}

export interface ActivityChecklist {
  id: string;
  actividad_id: string;
  checklist_id: string;
  items_estado_json: string; // JSON object with item completion status
  completado: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Evidence {
  id: string;
  actividad_id: string;
  tipo: 'foto' | 'documento' | 'video' | 'otro';
  titulo: string;
  descripcion?: string;
  url: string;
  usuario_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Material {
  id: string;
  sku: string;
  descripcion: string;
  categoria: string;
  unidad: string;
  costo_ref: number;
  stock_actual: number;
  stock_minimo: number;
  proveedor_principal: string;
  ubicacion_almacen: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BOM {
  id: string;
  actividad_id: string;
  proyecto_id: string;
  material_id: string;
  qty_requerida: number;
  qty_asignada: number;
  proveedor_sugerido: string;
  costo_unit_est: number;
  lead_time_dias: number;
  estado_abastecimiento: 'Por pedir' | 'Pedido' | 'En tránsito' | 'Recibido' | 'Entregado';
  fecha_requerida: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseRequest {
  id: string;
  proyecto_id: string;
  solicitante_id: string;
  fecha_solicitud: Date;
  estado: 'Borrador' | 'Enviado' | 'Aprobado' | 'Rechazado' | 'Completado';
  items_json: string; // JSON array of purchase request items
  observaciones?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Personnel {
  id: string;
  dni_ruc: string;
  nombres: string;
  telefono: string;
  email: string;
  especialidad: string;
  tarifa_hora: number;
  zona: string;
  certificaciones_json?: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Client {
  id: string;
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion: string;
  telefono: string;
  email: string;
  contacto_principal: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Assignment {
  id: string;
  colaborador_id: string;
  proyecto_id: string;
  actividad_id: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  horas_planificadas: number;
  rol_asignacion: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TimeEntry {
  id: string;
  colaborador_id: string;
  proyecto_id: string;
  actividad_id: string;
  fecha: Date;
  horas_trabajadas: number;
  descripcion?: string;
  aprobado: boolean;
  aprobado_por?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Enhanced API Response with metadata and pagination support
 * Extends the basic APIResponse with additional metadata for performance monitoring
 * and pagination information for large datasets
 * 
 * @template T - The type of data returned in the response
 */
export interface EnhancedAPIResponse<T = any> {
  /** Indicates if the operation was successful */
  ok: boolean;
  /** The actual data payload */
  data?: T;
  /** Human-readable message about the operation */
  message?: string;
  /** HTTP status code */
  status: number;
  /** ISO timestamp of when the response was generated */
  timestamp: string;
  /** Pagination information for list responses */
  pagination?: PaginationInfo;
  /** Additional metadata about the request/response */
  metadata?: ResponseMetadata;
}

/**
 * Pagination information for paginated API responses
 */
export interface PaginationInfo {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items available */
  total: number;
  /** Whether there are more pages available */
  hasNext: boolean;
  /** Whether there are previous pages available */
  hasPrevious: boolean;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Response metadata for performance monitoring and debugging
 */
export interface ResponseMetadata {
  /** Request execution time in milliseconds */
  executionTime: number;
  /** Whether the response was served from cache */
  cacheHit: boolean;
  /** API version that handled the request */
  version: string;
  /** Unique request identifier for tracing */
  requestId?: string;
  /** Data source (e.g., 'google_sheets', 'cache', 'mock') */
  source?: string;
}

export interface AuthResponse {
  ok: boolean;
  jwt?: string;
  user?: User;
  message?: string;
}

// System Configuration
export interface SystemConfig {
  id: string;
  timezone: string;
  default_currency: 'PEN' | 'USD';
  project_code_format: string;
  activity_code_format: string;
  default_sla_hours: number;
  backup_frequency_days: number;
  session_timeout_minutes: number;
  max_file_size_mb: number;
  created_at: Date;
  updated_at: Date;
}

// Service Lines
export interface ServiceLine {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

// Documentation types
export interface Document {
  id: string;
  titulo: string;
  tipo: 'SOP' | 'Manual' | 'Procedimiento' | 'Política' | 'Otro';
  categoria: string;
  contenido_markdown: string;
  tags: string[];
  autor_id: string;
  version: string;
  estado: 'Borrador' | 'Revisión' | 'Aprobado' | 'Obsoleto';
  fecha_aprobacion?: Date;
  aprobado_por?: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectDocument {
  id: string;
  proyecto_id: string;
  titulo: string;
  descripcion?: string;
  tipo: 'Contrato' | 'Plano' | 'Especificación' | 'Certificado' | 'Foto' | 'Reporte' | 'Otro';
  url: string;
  fecha_documento?: Date;
  usuario_id: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentCategory {
  id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  icono?: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

// Audit Log types
export interface AuditLogEntry {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  accion: string;
  recurso_tipo: string;
  recurso_id?: string;
  recurso_nombre?: string;
  detalles_json: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
  created_at: Date;
  updated_at: Date;
}

// Environment configuration
export interface AppConfig {
  apiBaseUrl: string;
  apiToken: string;
  appName: string;
  appVersion: string;
}

// Enhanced API Service Configuration
export interface APIServiceConfig {
  baseUrl: string;
  token: string;
  timeout: number;
  retryAttempts: number;
  cacheEnabled: boolean;
  retryDelay: number;
  maxRetryDelay: number;
  backoffMultiplier: number;
}

// CRUD Operation Interface
export interface CRUDOperation {
  table: string;
  operation: 'list' | 'get' | 'create' | 'update' | 'delete';
  data?: any;
  filters?: Record<string, any>;
  pagination?: { page: number; limit: number };
  id?: string;
}

// Error Classification
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  DATA_CONFLICT = 'DATA_CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

export interface APIError {
  type: ErrorType;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: string;
  status?: number;
}

// Retry Configuration
export interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

// Request Options
export interface RequestOptions {
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
  requireAuth?: boolean;
  skipCache?: boolean;
}