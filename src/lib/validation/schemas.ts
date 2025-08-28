// Validation schemas for all database tables
import { TableSchema, ValidationRule, RelationshipRule, BusinessRule } from './types';
import { businessRules } from './business-rules';

// Common validation rules
const commonRules = {
  id: {
    field: 'id',
    type: 'string' as const,
    message: 'ID debe ser una cadena válida'
  },
  createdAt: {
    field: 'created_at',
    type: 'date' as const,
    message: 'Fecha de creación debe ser válida'
  },
  updatedAt: {
    field: 'updated_at',
    type: 'date' as const,
    message: 'Fecha de actualización debe ser válida'
  },
  activo: {
    field: 'activo',
    type: 'boolean' as const,
    message: 'Campo activo debe ser verdadero o falso'
  }
};

// User validation schema
export const userSchema: TableSchema = {
  tableName: 'Usuarios',
  fields: [
    commonRules.id,
    {
      field: 'email',
      type: 'email',
      message: 'Email debe tener un formato válido'
    },
    {
      field: 'nombre',
      type: 'required',
      message: 'Nombre es requerido',
      min: 2,
      max: 100
    },
    {
      field: 'rol',
      type: 'enum',
      enumValues: ['admin_lider', 'admin', 'editor', 'tecnico'],
      message: 'Rol debe ser uno de: admin_lider, admin, editor, tecnico'
    },
    commonRules.activo,
    commonRules.createdAt,
    commonRules.updatedAt
  ],
  businessRules: [
    {
      name: 'unique_email',
      description: 'El email debe ser único en el sistema',
      validator: async (record, context) => {
        const excludeId = context?.operation === 'update' ? record.id : undefined;
        return await businessRules.unique.validateUnique('Usuarios', 'email', record.email, excludeId);
      },
      message: 'Ya existe un usuario con este email'
    }
  ]
};

// Material validation schema
export const materialSchema: TableSchema = {
  tableName: 'Materiales',
  fields: [
    commonRules.id,
    {
      field: 'sku',
      type: 'required',
      message: 'SKU es requerido',
      min: 3,
      max: 50
    },
    {
      field: 'descripcion',
      type: 'required',
      message: 'Descripción es requerida',
      min: 5,
      max: 200
    },
    {
      field: 'categoria',
      type: 'required',
      message: 'Categoría es requerida'
    },
    {
      field: 'unidad',
      type: 'required',
      message: 'Unidad es requerida'
    },
    {
      field: 'costo_ref',
      type: 'number',
      message: 'Costo de referencia debe ser un número válido',
      min: 0
    },
    {
      field: 'stock_actual',
      type: 'number',
      message: 'Stock actual debe ser un número válido',
      min: 0
    },
    {
      field: 'stock_minimo',
      type: 'number',
      message: 'Stock mínimo debe ser un número válido',
      min: 0
    },
    {
      field: 'proveedor_principal',
      type: 'string',
      message: 'Proveedor principal debe ser una cadena válida'
    },
    commonRules.activo,
    commonRules.createdAt,
    commonRules.updatedAt
  ],
  businessRules: [
    {
      name: 'unique_sku',
      description: 'El SKU debe ser único',
      validator: async (record, context) => {
        const excludeId = context?.operation === 'update' ? record.id : undefined;
        return await businessRules.unique.validateUnique('Materiales', 'sku', record.sku, excludeId);
      },
      message: 'Ya existe un material con este SKU'
    },
    {
      name: 'stock_validation',
      description: 'Validación de niveles de stock',
      validator: (record) => businessRules.material.validateStockLevels(record),
      message: 'Los niveles de stock no son válidos'
    }
  ]
};

// Project validation schema
export const projectSchema: TableSchema = {
  tableName: 'Proyectos',
  fields: [
    commonRules.id,
    {
      field: 'codigo',
      type: 'required',
      message: 'Código de proyecto es requerido',
      pattern: /^[A-Z]{2,3}-\d{4}$/
    },
    {
      field: 'nombre',
      type: 'required',
      message: 'Nombre del proyecto es requerido',
      min: 5,
      max: 150
    },
    {
      field: 'cliente_id',
      type: 'required',
      message: 'Cliente es requerido'
    },
    {
      field: 'responsable_id',
      type: 'required',
      message: 'Responsable es requerido'
    },
    {
      field: 'ubicacion',
      type: 'required',
      message: 'Ubicación es requerida'
    },
    {
      field: 'descripcion',
      type: 'string',
      message: 'Descripción debe ser una cadena válida',
      max: 500
    },
    {
      field: 'linea_servicio',
      type: 'required',
      message: 'Línea de servicio es requerida'
    },
    {
      field: 'sla_objetivo',
      type: 'number',
      message: 'SLA objetivo debe ser un número válido',
      min: 1,
      max: 8760 // Max hours in a year
    },
    {
      field: 'inicio_plan',
      type: 'date',
      message: 'Fecha de inicio planificada debe ser válida'
    },
    {
      field: 'fin_plan',
      type: 'date',
      message: 'Fecha de fin planificada debe ser válida'
    },
    {
      field: 'presupuesto_total',
      type: 'number',
      message: 'Presupuesto total debe ser un número válido',
      min: 0
    },
    {
      field: 'moneda',
      type: 'enum',
      enumValues: ['PEN', 'USD'],
      message: 'Moneda debe ser PEN o USD'
    },
    {
      field: 'estado',
      type: 'enum',
      enumValues: ['Planificación', 'En progreso', 'Pausado', 'Cerrado'],
      message: 'Estado debe ser uno de: Planificación, En progreso, Pausado, Cerrado'
    },
    {
      field: 'avance_pct',
      type: 'number',
      message: 'Porcentaje de avance debe ser un número válido',
      min: 0,
      max: 100
    },
    commonRules.createdAt,
    commonRules.updatedAt
  ],
  relationships: [
    {
      field: 'cliente_id',
      referencedTable: 'Clientes',
      referencedField: 'id',
      required: true,
      message: 'El cliente especificado no existe'
    },
    {
      field: 'responsable_id',
      referencedTable: 'Usuarios',
      referencedField: 'id',
      required: true,
      message: 'El responsable especificado no existe'
    }
  ],
  businessRules: [
    {
      name: 'unique_codigo',
      description: 'El código de proyecto debe ser único',
      validator: async (record, context) => {
        const excludeId = context?.operation === 'update' ? record.id : undefined;
        return await businessRules.unique.validateUnique('Proyectos', 'codigo', record.codigo, excludeId);
      },
      message: 'Ya existe un proyecto con este código'
    },
    {
      name: 'date_range_validation',
      description: 'Fecha de fin debe ser posterior a fecha de inicio',
      validator: (record) => {
        if (!record.inicio_plan || !record.fin_plan) return true;
        return new Date(record.fin_plan) > new Date(record.inicio_plan);
      },
      message: 'La fecha de fin debe ser posterior a la fecha de inicio'
    },
    {
      name: 'responsible_active_validation',
      description: 'El responsable debe estar activo',
      validator: async (record, context) => {
        return await businessRules.project.validateActiveUser(record.responsable_id, ['admin_lider', 'admin', 'editor']);
      },
      message: 'El responsable asignado no está activo o no tiene permisos suficientes'
    }
  ]
};

// Activity validation schema
export const activitySchema: TableSchema = {
  tableName: 'Actividades',
  fields: [
    commonRules.id,
    {
      field: 'proyecto_id',
      type: 'required',
      message: 'Proyecto es requerido'
    },
    {
      field: 'codigo',
      type: 'required',
      message: 'Código de actividad es requerido',
      pattern: /^[A-Z]{2,3}-\d{4}-\d{3}$/
    },
    {
      field: 'titulo',
      type: 'required',
      message: 'Título es requerido',
      min: 5,
      max: 100
    },
    {
      field: 'descripcion',
      type: 'string',
      message: 'Descripción debe ser una cadena válida',
      max: 500
    },
    {
      field: 'responsable_id',
      type: 'required',
      message: 'Responsable es requerido'
    },
    {
      field: 'prioridad',
      type: 'enum',
      enumValues: ['Baja', 'Media', 'Alta', 'Crítica'],
      message: 'Prioridad debe ser: Baja, Media, Alta o Crítica'
    },
    {
      field: 'estado',
      type: 'enum',
      enumValues: ['Pendiente', 'En progreso', 'En revisión', 'Completada'],
      message: 'Estado debe ser: Pendiente, En progreso, En revisión o Completada'
    },
    {
      field: 'inicio_plan',
      type: 'date',
      message: 'Fecha de inicio planificada debe ser válida'
    },
    {
      field: 'fin_plan',
      type: 'date',
      message: 'Fecha de fin planificada debe ser válida'
    },
    {
      field: 'porcentaje_avance',
      type: 'number',
      message: 'Porcentaje de avance debe ser un número válido',
      min: 0,
      max: 100
    },
    commonRules.createdAt,
    commonRules.updatedAt
  ],
  relationships: [
    {
      field: 'proyecto_id',
      referencedTable: 'Proyectos',
      referencedField: 'id',
      required: true,
      message: 'El proyecto especificado no existe'
    },
    {
      field: 'responsable_id',
      referencedTable: 'Usuarios',
      referencedField: 'id',
      required: true,
      message: 'El responsable especificado no existe'
    },
    {
      field: 'checklist_id',
      referencedTable: 'Checklists',
      referencedField: 'id',
      required: false,
      message: 'El checklist especificado no existe'
    }
  ],
  businessRules: [
    {
      name: 'activity_within_project_dates',
      description: 'La actividad debe estar dentro de las fechas del proyecto',
      validator: async (record, context) => {
        return await businessRules.project.validateActivityWithinProjectDates(record, context);
      },
      message: 'Las fechas de la actividad deben estar dentro del rango del proyecto'
    },
    {
      name: 'completion_percentage_validation',
      description: 'Porcentaje debe ser 100% si estado es Completada',
      validator: (record) => {
        if (record.estado === 'Completada') {
          return record.porcentaje_avance === 100;
        }
        return true;
      },
      message: 'Una actividad completada debe tener 100% de avance'
    }
  ]
};

// Client validation schema
export const clientSchema: TableSchema = {
  tableName: 'Clientes',
  fields: [
    commonRules.id,
    {
      field: 'ruc',
      type: 'required',
      message: 'RUC es requerido',
      pattern: /^\d{11}$/
    },
    {
      field: 'razon_social',
      type: 'required',
      message: 'Razón social es requerida',
      min: 3,
      max: 150
    },
    {
      field: 'nombre_comercial',
      type: 'string',
      message: 'Nombre comercial debe ser una cadena válida',
      max: 100
    },
    {
      field: 'direccion',
      type: 'required',
      message: 'Dirección es requerida',
      max: 200
    },
    {
      field: 'telefono',
      type: 'string',
      message: 'Teléfono debe ser una cadena válida',
      pattern: /^[\d\s\-\+\(\)]+$/
    },
    {
      field: 'email',
      type: 'email',
      message: 'Email debe tener un formato válido'
    },
    {
      field: 'contacto_principal',
      type: 'required',
      message: 'Contacto principal es requerido',
      max: 100
    },
    commonRules.activo,
    commonRules.createdAt,
    commonRules.updatedAt
  ],
  businessRules: [
    {
      name: 'unique_ruc',
      description: 'El RUC debe ser único y válido',
      validator: async (record, context) => {
        // Validate RUC format first
        if (!businessRules.client.validateRUC(record.ruc)) {
          return false;
        }
        // Then check uniqueness
        const excludeId = context?.operation === 'update' ? record.id : undefined;
        return await businessRules.unique.validateUnique('Clientes', 'ruc', record.ruc, excludeId);
      },
      message: 'El RUC debe ser válido y único en el sistema'
    }
  ]
};

// Personnel validation schema
export const personnelSchema: TableSchema = {
  tableName: 'Personal',
  fields: [
    commonRules.id,
    {
      field: 'dni_ruc',
      type: 'required',
      message: 'DNI/RUC es requerido',
      pattern: /^(\d{8}|\d{11})$/
    },
    {
      field: 'nombres',
      type: 'required',
      message: 'Nombres son requeridos',
      min: 3,
      max: 100
    },
    {
      field: 'telefono',
      type: 'string',
      message: 'Teléfono debe ser una cadena válida',
      pattern: /^[\d\s\-\+\(\)]+$/
    },
    {
      field: 'email',
      type: 'email',
      message: 'Email debe tener un formato válido'
    },
    {
      field: 'especialidad',
      type: 'required',
      message: 'Especialidad es requerida'
    },
    {
      field: 'tarifa_hora',
      type: 'number',
      message: 'Tarifa por hora debe ser un número válido',
      min: 0
    },
    {
      field: 'zona',
      type: 'string',
      message: 'Zona debe ser una cadena válida'
    },
    commonRules.activo,
    commonRules.createdAt,
    commonRules.updatedAt
  ],
  businessRules: [
    {
      name: 'unique_dni_ruc',
      description: 'El DNI/RUC debe ser único y válido',
      validator: async (record, context) => {
        // Validate format first
        const isValidDNI = businessRules.client.validateDNI(record.dni_ruc);
        const isValidRUC = businessRules.client.validateRUC(record.dni_ruc);
        
        if (!isValidDNI && !isValidRUC) {
          return false;
        }
        
        // Then check uniqueness
        const excludeId = context?.operation === 'update' ? record.id : undefined;
        return await businessRules.unique.validateUnique('Personal', 'dni_ruc', record.dni_ruc, excludeId);
      },
      message: 'El DNI/RUC debe ser válido y único en el sistema'
    }
  ]
};

// BOM validation schema
export const bomSchema: TableSchema = {
  tableName: 'BOM',
  fields: [
    commonRules.id,
    {
      field: 'actividad_id',
      type: 'required',
      message: 'Actividad es requerida'
    },
    {
      field: 'proyecto_id',
      type: 'required',
      message: 'Proyecto es requerido'
    },
    {
      field: 'material_id',
      type: 'required',
      message: 'Material es requerido'
    },
    {
      field: 'qty_requerida',
      type: 'number',
      message: 'Cantidad requerida debe ser un número válido',
      min: 0.01
    },
    {
      field: 'qty_asignada',
      type: 'number',
      message: 'Cantidad asignada debe ser un número válido',
      min: 0
    },
    {
      field: 'costo_unit_est',
      type: 'number',
      message: 'Costo unitario estimado debe ser un número válido',
      min: 0
    },
    {
      field: 'lead_time_dias',
      type: 'number',
      message: 'Lead time debe ser un número válido',
      min: 0
    },
    {
      field: 'estado_abastecimiento',
      type: 'enum',
      enumValues: ['Por pedir', 'Pedido', 'En tránsito', 'Recibido', 'Entregado'],
      message: 'Estado debe ser: Por pedir, Pedido, En tránsito, Recibido o Entregado'
    },
    {
      field: 'fecha_requerida',
      type: 'date',
      message: 'Fecha requerida debe ser válida'
    },
    commonRules.createdAt,
    commonRules.updatedAt
  ],
  relationships: [
    {
      field: 'actividad_id',
      referencedTable: 'Actividades',
      referencedField: 'id',
      required: true,
      message: 'La actividad especificada no existe'
    },
    {
      field: 'proyecto_id',
      referencedTable: 'Proyectos',
      referencedField: 'id',
      required: true,
      message: 'El proyecto especificado no existe'
    },
    {
      field: 'material_id',
      referencedTable: 'Materiales',
      referencedField: 'id',
      required: true,
      message: 'El material especificado no existe'
    }
  ],
  businessRules: [
    {
      name: 'assigned_not_exceed_required',
      description: 'Cantidad asignada no puede exceder la requerida',
      validator: (record) => record.qty_asignada <= record.qty_requerida,
      message: 'La cantidad asignada no puede ser mayor a la requerida'
    },
    {
      name: 'activity_belongs_to_project',
      description: 'La actividad debe pertenecer al proyecto especificado',
      validator: async (record, context) => {
        // This will be validated through relationship validation
        return true;
      },
      message: 'La actividad no pertenece al proyecto especificado'
    },
    {
      name: 'material_availability',
      description: 'El material debe estar disponible y activo',
      validator: async (record, context) => {
        return await businessRules.material.validateMaterialAvailability(record, context);
      },
      message: 'El material no está disponible o no hay suficiente stock'
    }
  ]
};

// Time Entry validation schema
export const timeEntrySchema: TableSchema = {
  tableName: 'RegistroHoras',
  fields: [
    commonRules.id,
    {
      field: 'colaborador_id',
      type: 'required',
      message: 'Colaborador es requerido'
    },
    {
      field: 'proyecto_id',
      type: 'required',
      message: 'Proyecto es requerido'
    },
    {
      field: 'actividad_id',
      type: 'required',
      message: 'Actividad es requerida'
    },
    {
      field: 'fecha',
      type: 'date',
      message: 'Fecha debe ser válida'
    },
    {
      field: 'horas_trabajadas',
      type: 'number',
      message: 'Horas trabajadas debe ser un número válido',
      min: 0.25,
      max: 24
    },
    {
      field: 'descripcion',
      type: 'string',
      message: 'Descripción debe ser una cadena válida',
      max: 500
    },
    {
      field: 'aprobado',
      type: 'boolean',
      message: 'Campo aprobado debe ser verdadero o falso'
    },
    commonRules.createdAt,
    commonRules.updatedAt
  ],
  relationships: [
    {
      field: 'colaborador_id',
      referencedTable: 'Personal',
      referencedField: 'id',
      required: true,
      message: 'El colaborador especificado no existe'
    },
    {
      field: 'proyecto_id',
      referencedTable: 'Proyectos',
      referencedField: 'id',
      required: true,
      message: 'El proyecto especificado no existe'
    },
    {
      field: 'actividad_id',
      referencedTable: 'Actividades',
      referencedField: 'id',
      required: true,
      message: 'La actividad especificada no existe'
    }
  ],
  businessRules: [
    {
      name: 'no_future_dates',
      description: 'No se pueden registrar horas en fechas futuras',
      validator: (record) => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return new Date(record.fecha) <= today;
      },
      message: 'No se pueden registrar horas en fechas futuras'
    },
    {
      name: 'daily_hours_limit',
      description: 'No se pueden registrar más de 12 horas por día por colaborador',
      validator: async (record, context) => {
        return await businessRules.timeTracking.validateDailyHoursLimit(record, context);
      },
      message: 'No se pueden registrar más de 12 horas por día'
    },
    {
      name: 'collaborator_assignment',
      description: 'El colaborador debe estar asignado al proyecto/actividad',
      validator: async (record, context) => {
        return await businessRules.timeTracking.validateCollaboratorAssignment(record, context);
      },
      message: 'El colaborador no está asignado a este proyecto/actividad'
    }
  ]
};

// Export all schemas
export const validationSchemas: Record<string, TableSchema> = {
  'Usuarios': userSchema,
  'Materiales': materialSchema,
  'Proyectos': projectSchema,
  'Actividades': activitySchema,
  'Clientes': clientSchema,
  'Personal': personnelSchema,
  'BOM': bomSchema,
  'RegistroHoras': timeEntrySchema
};

// Helper function to get schema by table name
export function getSchemaByTable(tableName: string): TableSchema | undefined {
  return validationSchemas[tableName];
}

// Helper function to get all table names
export function getAllTableNames(): string[] {
  return Object.keys(validationSchemas);
}