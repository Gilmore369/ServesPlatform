/**
 * Entity Validation Schemas for ServesPlatform
 * Standardized validation rules for all data models
 * Requirements: 6.1, 6.2, 6.3
 */

import { EntitySchema, ValidationRules } from './validation-types';

/**
 * User entity validation schema
 */
export const UserSchema: EntitySchema = {
  name: 'User',
  description: 'System user with role-based permissions',
  fields: [
    {
      name: 'id',
      label: 'ID',
      rules: [ValidationRules.required()],
      description: 'Unique identifier for the user'
    },
    {
      name: 'email',
      label: 'Email',
      rules: [
        ValidationRules.required(),
        ValidationRules.email(),
        ValidationRules.maxLength(255)
      ],
      description: 'User email address for login'
    },
    {
      name: 'nombre',
      label: 'Nombre',
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(2),
        ValidationRules.maxLength(100)
      ],
      description: 'Full name of the user'
    },
    {
      name: 'rol',
      label: 'Rol',
      rules: [
        ValidationRules.required(),
        ValidationRules.enum(['admin_lider', 'admin', 'editor', 'tecnico'])
      ],
      description: 'User role determining permissions'
    },
    {
      name: 'activo',
      label: 'Activo',
      rules: [ValidationRules.required()],
      defaultValue: true,
      description: 'Whether the user account is active'
    },
    {
      name: 'certificaciones_json',
      label: 'Certificaciones',
      rules: [],
      optional: true,
      description: 'JSON string containing user certifications'
    }
  ]
};

/**
 * Project entity validation schema
 */
export const ProjectSchema: EntitySchema = {
  name: 'Project',
  description: 'Project with timeline, budget, and resource management',
  fields: [
    {
      name: 'id',
      label: 'ID',
      rules: [ValidationRules.required()],
      description: 'Unique identifier for the project'
    },
    {
      name: 'codigo',
      label: 'Código',
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(3),
        ValidationRules.maxLength(20),
        ValidationRules.pattern('^[A-Z0-9-]+$', 'El código debe contener solo letras mayúsculas, números y guiones')
      ],
      description: 'Project code for identification'
    },
    {
      name: 'nombre',
      label: 'Nombre',
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(5),
        ValidationRules.maxLength(200)
      ],
      description: 'Project name'
    },
    {
      name: 'cliente_id',
      label: 'Cliente',
      rules: [ValidationRules.required()],
      description: 'Reference to client entity'
    },
    {
      name: 'responsable_id',
      label: 'Responsable',
      rules: [ValidationRules.required()],
      description: 'Reference to responsible user'
    },
    {
      name: 'ubicacion',
      label: 'Ubicación',
      rules: [
        ValidationRules.required(),
        ValidationRules.maxLength(500)
      ],
      description: 'Project location'
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      rules: [ValidationRules.maxLength(2000)],
      optional: true,
      description: 'Detailed project description'
    },
    {
      name: 'linea_servicio',
      label: 'Línea de Servicio',
      rules: [
        ValidationRules.required(),
        ValidationRules.enum(['Eléctrico', 'Civil', 'CCTV', 'Mantenimiento', 'Telecomunicaciones'])
      ],
      description: 'Service line category'
    },
    {
      name: 'inicio_plan',
      label: 'Fecha de Inicio',
      rules: [
        ValidationRules.required(),
        ValidationRules.date()
      ],
      description: 'Planned start date'
    },
    {
      name: 'fin_plan',
      label: 'Fecha de Fin',
      rules: [
        ValidationRules.required(),
        ValidationRules.date()
      ],
      description: 'Planned end date'
    },
    {
      name: 'presupuesto_total',
      label: 'Presupuesto Total',
      rules: [
        ValidationRules.required(),
        ValidationRules.number(),
        ValidationRules.minValue(0)
      ],
      description: 'Total project budget'
    },
    {
      name: 'moneda',
      label: 'Moneda',
      rules: [
        ValidationRules.required(),
        ValidationRules.enum(['PEN', 'USD'])
      ],
      defaultValue: 'PEN',
      description: 'Currency for budget'
    },
    {
      name: 'estado',
      label: 'Estado',
      rules: [
        ValidationRules.required(),
        ValidationRules.enum(['Planificación', 'En progreso', 'Pausado', 'Cerrado'])
      ],
      defaultValue: 'Planificación',
      description: 'Current project status'
    },
    {
      name: 'avance_pct',
      label: 'Avance (%)',
      rules: [
        ValidationRules.required(),
        ValidationRules.number(),
        ValidationRules.minValue(0),
        ValidationRules.maxValue(100)
      ],
      defaultValue: 0,
      description: 'Project completion percentage'
    }
  ],
  customRules: [
    {
      name: 'dateRange',
      validator: (data) => {
        if (data.inicio_plan && data.fin_plan) {
          const start = new Date(data.inicio_plan);
          const end = new Date(data.fin_plan);
          if (start >= end) {
            return {
              field: 'fin_plan',
              message: 'La fecha de fin debe ser posterior a la fecha de inicio',
              value: data.fin_plan,
              rule: 'dateRange'
            };
          }
        }
        return null;
      }
    }
  ]
};

/**
 * Activity entity validation schema
 */
export const ActivitySchema: EntitySchema = {
  name: 'Activity',
  description: 'Project activity with timeline and progress tracking',
  fields: [
    {
      name: 'id',
      label: 'ID',
      rules: [ValidationRules.required()],
      description: 'Unique identifier for the activity'
    },
    {
      name: 'proyecto_id',
      label: 'Proyecto',
      rules: [ValidationRules.required()],
      description: 'Reference to parent project'
    },
    {
      name: 'codigo',
      label: 'Código',
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(3),
        ValidationRules.maxLength(20)
      ],
      description: 'Activity code for identification'
    },
    {
      name: 'titulo',
      label: 'Título',
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(5),
        ValidationRules.maxLength(200)
      ],
      description: 'Activity title'
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      rules: [ValidationRules.maxLength(2000)],
      optional: true,
      description: 'Detailed activity description'
    },
    {
      name: 'responsable_id',
      label: 'Responsable',
      rules: [ValidationRules.required()],
      description: 'Reference to responsible user'
    },
    {
      name: 'prioridad',
      label: 'Prioridad',
      rules: [
        ValidationRules.required(),
        ValidationRules.enum(['Baja', 'Media', 'Alta', 'Crítica'])
      ],
      defaultValue: 'Media',
      description: 'Activity priority level'
    },
    {
      name: 'estado',
      label: 'Estado',
      rules: [
        ValidationRules.required(),
        ValidationRules.enum(['Pendiente', 'En progreso', 'En revisión', 'Completada'])
      ],
      defaultValue: 'Pendiente',
      description: 'Current activity status'
    },
    {
      name: 'inicio_plan',
      label: 'Fecha de Inicio',
      rules: [
        ValidationRules.required(),
        ValidationRules.date()
      ],
      description: 'Planned start date'
    },
    {
      name: 'fin_plan',
      label: 'Fecha de Fin',
      rules: [
        ValidationRules.required(),
        ValidationRules.date()
      ],
      description: 'Planned end date'
    },
    {
      name: 'porcentaje_avance',
      label: 'Avance (%)',
      rules: [
        ValidationRules.required(),
        ValidationRules.number(),
        ValidationRules.minValue(0),
        ValidationRules.maxValue(100)
      ],
      defaultValue: 0,
      description: 'Activity completion percentage'
    }
  ]
};

/**
 * Material entity validation schema
 */
export const MaterialSchema: EntitySchema = {
  name: 'Material',
  description: 'Material/inventory item with stock management',
  fields: [
    {
      name: 'id',
      label: 'ID',
      rules: [ValidationRules.required()],
      description: 'Unique identifier for the material'
    },
    {
      name: 'sku',
      label: 'SKU',
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(3),
        ValidationRules.maxLength(50),
        ValidationRules.pattern('^[A-Z0-9-]+$', 'El SKU debe contener solo letras mayúsculas, números y guiones')
      ],
      description: 'Stock keeping unit code'
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(5),
        ValidationRules.maxLength(500)
      ],
      description: 'Material description'
    },
    {
      name: 'categoria',
      label: 'Categoría',
      rules: [
        ValidationRules.required(),
        ValidationRules.enum(['Cables', 'Conectores', 'Herramientas', 'Equipos', 'Consumibles', 'Seguridad'])
      ],
      description: 'Material category'
    },
    {
      name: 'unidad',
      label: 'Unidad',
      rules: [
        ValidationRules.required(),
        ValidationRules.enum(['Unidad', 'Metro', 'Kilogramo', 'Litro', 'Caja', 'Rollo', 'Par'])
      ],
      description: 'Unit of measurement'
    },
    {
      name: 'costo_ref',
      label: 'Costo de Referencia',
      rules: [
        ValidationRules.required(),
        ValidationRules.number(),
        ValidationRules.minValue(0)
      ],
      description: 'Reference cost per unit'
    },
    {
      name: 'stock_actual',
      label: 'Stock Actual',
      rules: [
        ValidationRules.required(),
        ValidationRules.number(),
        ValidationRules.minValue(0)
      ],
      defaultValue: 0,
      description: 'Current stock quantity'
    },
    {
      name: 'stock_minimo',
      label: 'Stock Mínimo',
      rules: [
        ValidationRules.required(),
        ValidationRules.number(),
        ValidationRules.minValue(0)
      ],
      description: 'Minimum stock threshold'
    },
    {
      name: 'proveedor_principal',
      label: 'Proveedor Principal',
      rules: [
        ValidationRules.required(),
        ValidationRules.maxLength(200)
      ],
      description: 'Primary supplier name'
    },
    {
      name: 'activo',
      label: 'Activo',
      rules: [ValidationRules.required()],
      defaultValue: true,
      description: 'Whether the material is active'
    }
  ]
};

/**
 * Personnel entity validation schema
 */
export const PersonnelSchema: EntitySchema = {
  name: 'Personnel',
  description: 'Personnel/collaborator with skills and rates',
  fields: [
    {
      name: 'id',
      label: 'ID',
      rules: [ValidationRules.required()],
      description: 'Unique identifier for the personnel'
    },
    {
      name: 'dni_ruc',
      label: 'DNI/RUC',
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(8),
        ValidationRules.maxLength(11),
        ValidationRules.pattern('^[0-9]+$', 'DNI/RUC debe contener solo números')
      ],
      description: 'National ID or tax ID number'
    },
    {
      name: 'nombres',
      label: 'Nombres',
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(2),
        ValidationRules.maxLength(200)
      ],
      description: 'Full name'
    },
    {
      name: 'telefono',
      label: 'Teléfono',
      rules: [
        ValidationRules.required(),
        ValidationRules.phone()
      ],
      description: 'Phone number'
    },
    {
      name: 'email',
      label: 'Email',
      rules: [
        ValidationRules.required(),
        ValidationRules.email(),
        ValidationRules.maxLength(255)
      ],
      description: 'Email address'
    },
    {
      name: 'especialidad',
      label: 'Especialidad',
      rules: [
        ValidationRules.required(),
        ValidationRules.enum(['Electricista', 'Técnico Civil', 'Técnico CCTV', 'Mantenimiento', 'Supervisor', 'Ingeniero'])
      ],
      description: 'Professional specialty'
    },
    {
      name: 'tarifa_hora',
      label: 'Tarifa por Hora',
      rules: [
        ValidationRules.required(),
        ValidationRules.number(),
        ValidationRules.minValue(0)
      ],
      description: 'Hourly rate'
    },
    {
      name: 'zona',
      label: 'Zona',
      rules: [
        ValidationRules.required(),
        ValidationRules.enum(['Lima Norte', 'Lima Sur', 'Lima Este', 'Lima Centro', 'Callao', 'Provincias'])
      ],
      description: 'Work zone'
    },
    {
      name: 'activo',
      label: 'Activo',
      rules: [ValidationRules.required()],
      defaultValue: true,
      description: 'Whether the personnel is active'
    }
  ]
};

/**
 * Client entity validation schema
 */
export const ClientSchema: EntitySchema = {
  name: 'Client',
  description: 'Client company information',
  fields: [
    {
      name: 'id',
      label: 'ID',
      rules: [ValidationRules.required()],
      description: 'Unique identifier for the client'
    },
    {
      name: 'ruc',
      label: 'RUC',
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(11),
        ValidationRules.maxLength(11),
        ValidationRules.pattern('^[0-9]{11}$', 'RUC debe tener exactamente 11 dígitos')
      ],
      description: 'Tax identification number'
    },
    {
      name: 'razon_social',
      label: 'Razón Social',
      rules: [
        ValidationRules.required(),
        ValidationRules.minLength(3),
        ValidationRules.maxLength(300)
      ],
      description: 'Legal company name'
    },
    {
      name: 'nombre_comercial',
      label: 'Nombre Comercial',
      rules: [ValidationRules.maxLength(200)],
      optional: true,
      description: 'Commercial/trade name'
    },
    {
      name: 'direccion',
      label: 'Dirección',
      rules: [
        ValidationRules.required(),
        ValidationRules.maxLength(500)
      ],
      description: 'Company address'
    },
    {
      name: 'telefono',
      label: 'Teléfono',
      rules: [
        ValidationRules.required(),
        ValidationRules.phone()
      ],
      description: 'Phone number'
    },
    {
      name: 'email',
      label: 'Email',
      rules: [
        ValidationRules.required(),
        ValidationRules.email(),
        ValidationRules.maxLength(255)
      ],
      description: 'Email address'
    },
    {
      name: 'contacto_principal',
      label: 'Contacto Principal',
      rules: [
        ValidationRules.required(),
        ValidationRules.maxLength(200)
      ],
      description: 'Primary contact person'
    },
    {
      name: 'activo',
      label: 'Activo',
      rules: [ValidationRules.required()],
      defaultValue: true,
      description: 'Whether the client is active'
    }
  ]
};

/**
 * Export all schemas for easy access
 */
export const EntitySchemas = {
  User: UserSchema,
  Project: ProjectSchema,
  Activity: ActivitySchema,
  Material: MaterialSchema,
  Personnel: PersonnelSchema,
  Client: ClientSchema
};

/**
 * Get schema by entity name
 */
export function getEntitySchema(entityName: string): EntitySchema | null {
  return EntitySchemas[entityName as keyof typeof EntitySchemas] || null;
}