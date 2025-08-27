/**
 * Business rule validation for ServesPlatform
 * Implements business logic validation as per requirements 3.4, 4.2, 7.5
 */

import { User, Activity, Assignment, Evidence, ActivityChecklist } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Validate if an activity can be completed
 * Requirement 3.4: Activity completion requires checklist OK and at least 1 evidence
 */
export function validateActivityCompletion(
  activity: Activity,
  checklist?: ActivityChecklist,
  evidence?: Evidence[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if activity has a checklist requirement
  if (activity.checklist_id) {
    if (!checklist) {
      errors.push('La actividad requiere un checklist pero no se encontró ninguno asociado');
    } else if (!checklist.completado) {
      errors.push('El checklist de la actividad debe estar completado antes de marcar la actividad como completada');
    }
  }

  // Check if activity has evidence
  if (!evidence || evidence.length === 0) {
    errors.push('La actividad debe tener al menos una evidencia antes de ser completada');
  }

  // Check if activity progress is 100%
  if (activity.porcentaje_avance < 100) {
    warnings.push('El porcentaje de avance de la actividad no es 100%. ¿Está seguro de que desea completarla?');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate assignment overlap prevention
 * Requirement 4.2: Prevent assignment overlap for the same collaborator
 */
export function validateAssignmentOverlap(
  newAssignment: Omit<Assignment, 'id' | 'created_at' | 'updated_at'>,
  existingAssignments: Assignment[]
): ValidationResult {
  const errors: string[] = [];

  // Filter active assignments for the same collaborator
  const collaboratorAssignments = existingAssignments.filter(
    assignment => 
      assignment.colaborador_id === newAssignment.colaborador_id &&
      assignment.activo &&
      assignment.id !== (newAssignment as any).id // Exclude current assignment if editing
  );

  // Check for date overlaps
  const newStart = new Date(newAssignment.fecha_inicio);
  const newEnd = new Date(newAssignment.fecha_fin);

  for (const existing of collaboratorAssignments) {
    const existingStart = new Date(existing.fecha_inicio);
    const existingEnd = new Date(existing.fecha_fin);

    // Check if dates overlap
    const hasOverlap = (
      (newStart >= existingStart && newStart <= existingEnd) ||
      (newEnd >= existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd)
    );

    if (hasOverlap) {
      errors.push(
        `El colaborador ya tiene una asignación activa en el período del ${existingStart.toLocaleDateString()} al ${existingEnd.toLocaleDateString()}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate role-based operation restrictions
 * Requirement 7.5: Role-based operation restrictions
 */
export function validateRoleBasedOperation(
  currentUser: User,
  operation: string,
  targetResource?: any,
  targetUser?: User
): ValidationResult {
  const errors: string[] = [];

  switch (operation) {
    case 'create_user':
      if (currentUser.rol !== 'admin_lider' && currentUser.rol !== 'admin') {
        errors.push('Solo los administradores pueden crear usuarios');
      }
      break;

    case 'edit_user':
      if (targetUser) {
        // Users can edit their own profile
        if (currentUser.id === targetUser.id) {
          // Allow self-editing with restrictions
          break;
        }

        // Admin líder can edit anyone
        if (currentUser.rol === 'admin_lider') {
          break;
        }

        // Admin can edit editors and technicians only
        if (currentUser.rol === 'admin' && 
            (targetUser.rol === 'editor' || targetUser.rol === 'tecnico')) {
          break;
        }

        errors.push('No tienes permisos para editar este usuario');
      }
      break;

    case 'delete_user':
      // Cannot delete self
      if (targetUser && currentUser.id === targetUser.id) {
        errors.push('No puedes eliminar tu propio usuario');
      }

      // Same rules as edit_user for deletion
      if (targetUser && currentUser.id !== targetUser.id) {
        const editValidation = validateRoleBasedOperation(currentUser, 'edit_user', undefined, targetUser);
        if (!editValidation.isValid) {
          errors.push('No tienes permisos para eliminar este usuario');
        }
      }
      break;

    case 'assign_admin_lider_role':
      if (currentUser.rol !== 'admin_lider') {
        errors.push('Solo un Admin Líder puede asignar el rol de Admin Líder');
      }
      break;

    case 'edit_project':
      // Editors can only edit projects they're assigned to
      if (currentUser.rol === 'editor' || currentUser.rol === 'tecnico') {
        // This would need project assignment data to validate properly
        // For now, we'll assume this check is done at the component level
      }
      break;

    case 'complete_activity':
      // Only assigned users or admins can complete activities
      if (currentUser.rol === 'tecnico') {
        // Technicians can only complete activities they're assigned to
        // This would need assignment data to validate properly
      }
      break;

    default:
      // Unknown operation, allow by default but log warning
      console.warn(`Unknown operation for role validation: ${operation}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate project assignment restrictions
 */
export function validateProjectAssignment(
  currentUser: User,
  projectId: string,
  userAssignments?: Assignment[]
): ValidationResult {
  const errors: string[] = [];

  // Admin líder and admin can access all projects
  if (currentUser.rol === 'admin_lider' || currentUser.rol === 'admin') {
    return { isValid: true, errors: [] };
  }

  // Editors and technicians can only access assigned projects
  if (currentUser.rol === 'editor' || currentUser.rol === 'tecnico') {
    if (!userAssignments || userAssignments.length === 0) {
      errors.push('No tienes asignaciones activas en este proyecto');
    } else {
      const hasActiveAssignment = userAssignments.some(
        assignment => 
          assignment.proyecto_id === projectId &&
          assignment.colaborador_id === currentUser.id &&
          assignment.activo
      );

      if (!hasActiveAssignment) {
        errors.push('No tienes una asignación activa en este proyecto');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate time entry restrictions
 */
export function validateTimeEntry(
  currentUser: User,
  assignment: Assignment,
  date: Date,
  hours: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if user is assigned to the project/activity
  if (assignment.colaborador_id !== currentUser.id) {
    errors.push('Solo puedes registrar horas en actividades donde estás asignado');
  }

  // Check if assignment is active
  if (!assignment.activo) {
    errors.push('No puedes registrar horas en una asignación inactiva');
  }

  // Check if date is within assignment period
  const assignmentStart = new Date(assignment.fecha_inicio);
  const assignmentEnd = new Date(assignment.fecha_fin);
  
  if (date < assignmentStart || date > assignmentEnd) {
    errors.push('La fecha debe estar dentro del período de asignación');
  }

  // Check reasonable hours (0-24 per day)
  if (hours <= 0 || hours > 24) {
    errors.push('Las horas deben estar entre 0.1 y 24');
  }

  // Warn if more than 8 hours per day
  if (hours > 8) {
    warnings.push('Registraste más de 8 horas en un día. ¿Es correcto?');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate material stock before BOM assignment
 */
export function validateMaterialStock(
  materialId: string,
  requiredQuantity: number,
  currentStock: number,
  reservedQuantity: number = 0
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const availableStock = currentStock - reservedQuantity;

  if (requiredQuantity > availableStock) {
    errors.push(`Stock insuficiente. Disponible: ${availableStock}, Requerido: ${requiredQuantity}`);
  }

  // Warn if this would leave stock below minimum
  const remainingStock = availableStock - requiredQuantity;
  if (remainingStock < 0) {
    warnings.push('Esta asignación dejará el stock por debajo del mínimo recomendado');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate checklist completion
 */
export function validateChecklistCompletion(
  checklist: ActivityChecklist,
  requiredItemsOnly: boolean = false
): ValidationResult {
  const errors: string[] = [];

  try {
    const itemsStatus = JSON.parse(checklist.items_estado_json);
    
    // If checking required items only, we need the checklist definition
    // For now, we'll assume all items are required
    const incompleteItems = Object.entries(itemsStatus)
      .filter(([_, completed]) => !completed)
      .map(([itemId]) => itemId);

    if (incompleteItems.length > 0) {
      errors.push(`Hay ${incompleteItems.length} elementos del checklist sin completar`);
    }
  } catch (error) {
    errors.push('Error al validar el estado del checklist');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Comprehensive validation for activity state changes
 */
export function validateActivityStateChange(
  activity: Activity,
  newState: Activity['estado'],
  currentUser: User,
  checklist?: ActivityChecklist,
  evidence?: Evidence[],
  assignments?: Assignment[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate state transition logic
  const validTransitions: Record<Activity['estado'], Activity['estado'][]> = {
    'Pendiente': ['En progreso'],
    'En progreso': ['En revisión', 'Completada', 'Pendiente'],
    'En revisión': ['Completada', 'En progreso'],
    'Completada': [] // Cannot change from completed
  };

  if (!validTransitions[activity.estado].includes(newState)) {
    errors.push(`No se puede cambiar el estado de "${activity.estado}" a "${newState}"`);
  }

  // Special validation for completion
  if (newState === 'Completada') {
    const completionValidation = validateActivityCompletion(activity, checklist, evidence);
    errors.push(...completionValidation.errors);
    if (completionValidation.warnings) {
      warnings.push(...completionValidation.warnings);
    }
  }

  // Role-based validation
  const roleValidation = validateRoleBasedOperation(currentUser, 'complete_activity', activity);
  errors.push(...roleValidation.errors);

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}