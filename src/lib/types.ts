// Core type definitions for ServesPlatform

export interface APIResponse<T = any> {
  ok: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin_lider' | 'admin' | 'editor' | 'tecnico';
  activo: boolean;
  certificaciones_json?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: string;
  codigo: string;
  nombre: string;
  cliente_id: string;
  responsable_id: string;
  ubicacion: string;
  descripcion: string;
  linea_servicio: string;
  sla_objetivo: number;
  inicio_plan: Date;
  fin_plan: Date;
  presupuesto_total: number;
  moneda: 'PEN' | 'USD';
  estado: 'Planificación' | 'En progreso' | 'Pausado' | 'Cerrado';
  avance_pct: number;
  created_at: Date;
  updated_at: Date;
}

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

// API Response types
export interface APIResponse<T = unknown> {
  ok: boolean;
  data?: T;
  message?: string;
}

// Enhanced API Response with metadata and pagination
export interface EnhancedAPIResponse<T = any> {
  ok: boolean;
  data?: T;
  message?: string;
  status: number;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
  metadata?: {
    executionTime: number;
    cacheHit: boolean;
    version: string;
  };
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