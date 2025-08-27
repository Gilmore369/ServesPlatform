import type { User, Project, Activity, Personnel } from '@/lib/types'

export const mockUsers: User[] = [
  {
    id: 'user_1',
    email: 'admin@serves.com',
    nombre: 'Admin Principal',
    rol: 'admin_lider',
    activo: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: 'user_2',
    email: 'editor@serves.com',
    nombre: 'Editor Test',
    rol: 'editor',
    activo: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: 'user_3',
    email: 'tecnico@serves.com',
    nombre: 'Técnico Test',
    rol: 'tecnico',
    activo: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  }
]

export const mockProjects: Project[] = [
  {
    id: 'proj_1',
    codigo: 'PROJ-001',
    nombre: 'Instalación Eléctrica Oficina Central',
    cliente_id: 'client_1',
    responsable_id: 'user_1',
    ubicacion: 'Lima, Perú',
    descripcion: 'Instalación completa del sistema eléctrico',
    linea_servicio: 'Eléctrico',
    sla_objetivo: 30,
    inicio_plan: new Date('2024-02-01'),
    fin_plan: new Date('2024-03-01'),
    presupuesto_total: 50000,
    moneda: 'PEN',
    estado: 'En progreso',
    avance_pct: 65,
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-02-15')
  },
  {
    id: 'proj_2',
    codigo: 'PROJ-002',
    nombre: 'Sistema CCTV Almacén',
    cliente_id: 'client_2',
    responsable_id: 'user_2',
    ubicacion: 'Callao, Perú',
    descripcion: 'Instalación de sistema de videovigilancia',
    linea_servicio: 'CCTV',
    sla_objetivo: 15,
    inicio_plan: new Date('2024-02-15'),
    fin_plan: new Date('2024-03-01'),
    presupuesto_total: 25000,
    moneda: 'PEN',
    estado: 'Planificación',
    avance_pct: 10,
    created_at: new Date('2024-02-01'),
    updated_at: new Date('2024-02-10')
  }
]

export const mockActivities: Activity[] = [
  {
    id: 'act_1',
    proyecto_id: 'proj_1',
    codigo: 'ACT-001',
    titulo: 'Instalación de tableros eléctricos',
    descripcion: 'Instalación y conexión de tableros principales',
    responsable_id: 'user_3',
    prioridad: 'Alta',
    estado: 'En progreso',
    inicio_plan: new Date('2024-02-01'),
    fin_plan: new Date('2024-02-10'),
    checklist_id: 'check_1',
    porcentaje_avance: 75,
    created_at: new Date('2024-01-20'),
    updated_at: new Date('2024-02-05')
  },
  {
    id: 'act_2',
    proyecto_id: 'proj_1',
    codigo: 'ACT-002',
    titulo: 'Cableado estructurado',
    descripcion: 'Tendido de cables y conexiones',
    responsable_id: 'user_3',
    prioridad: 'Media',
    estado: 'Pendiente',
    inicio_plan: new Date('2024-02-11'),
    fin_plan: new Date('2024-02-20'),
    porcentaje_avance: 0,
    created_at: new Date('2024-01-20'),
    updated_at: new Date('2024-01-20')
  }
]

export const mockPersonnel: Personnel[] = [
  {
    id: 'pers_1',
    dni_ruc: '12345678',
    nombres: 'Juan Pérez Técnico',
    telefono: '+51987654321',
    email: 'juan.perez@serves.com',
    especialidad: 'Electricista',
    tarifa_hora: 25,
    zona: 'Lima Norte',
    certificaciones_json: JSON.stringify([
      { tipo: 'Electricista Certificado', vencimiento: '2025-12-31' }
    ]),
    activo: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: 'pers_2',
    dni_ruc: '87654321',
    nombres: 'María García Supervisora',
    telefono: '+51987654322',
    email: 'maria.garcia@serves.com',
    especialidad: 'Supervisora CCTV',
    tarifa_hora: 35,
    zona: 'Lima Centro',
    certificaciones_json: JSON.stringify([
      { tipo: 'Técnico CCTV', vencimiento: '2025-06-30' }
    ]),
    activo: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  }
]