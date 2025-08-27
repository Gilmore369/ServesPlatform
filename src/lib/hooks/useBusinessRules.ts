/**
 * React hooks for business rule validation
 */

import { useMemo } from 'react';
import { useAuth } from '../auth';
import {
  validateActivityCompletion,
  validateAssignmentOverlap,
  validateRoleBasedOperation,
  validateProjectAssignment,
  validateTimeEntry,
  validateMaterialStock,
  validateChecklistCompletion,
  validateActivityStateChange,
  ValidationResult
} from '../businessRules';
import { 
  Activity, 
  Assignment, 
  Evidence, 
  ActivityChecklist, 
  User 
} from '../types';

/**
 * Hook to validate activity completion
 */
export function useActivityCompletionValidation(
  activity: Activity | null,
  checklist?: ActivityChecklist,
  evidence?: Evidence[]
): ValidationResult {
  return useMemo(() => {
    if (!activity) {
      return { isValid: false, errors: ['Actividad no encontrada'] };
    }
    
    return validateActivityCompletion(activity, checklist, evidence);
  }, [activity, checklist, evidence]);
}

/**
 * Hook to validate assignment overlap
 */
export function useAssignmentOverlapValidation(
  newAssignment: Omit<Assignment, 'id' | 'created_at' | 'updated_at'> | null,
  existingAssignments: Assignment[]
): ValidationResult {
  return useMemo(() => {
    if (!newAssignment) {
      return { isValid: false, errors: ['Datos de asignación no válidos'] };
    }
    
    return validateAssignmentOverlap(newAssignment, existingAssignments);
  }, [newAssignment, existingAssignments]);
}

/**
 * Hook to validate role-based operations
 */
export function useRoleBasedValidation(
  operation: string,
  targetResource?: any,
  targetUser?: User
): ValidationResult {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user) {
      return { isValid: false, errors: ['Usuario no autenticado'] };
    }
    
    return validateRoleBasedOperation(user, operation, targetResource, targetUser);
  }, [user, operation, targetResource, targetUser]);
}

/**
 * Hook to validate project assignment access
 */
export function useProjectAssignmentValidation(
  projectId: string,
  userAssignments?: Assignment[]
): ValidationResult {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user) {
      return { isValid: false, errors: ['Usuario no autenticado'] };
    }
    
    return validateProjectAssignment(user, projectId, userAssignments);
  }, [user, projectId, userAssignments]);
}

/**
 * Hook to validate time entry
 */
export function useTimeEntryValidation(
  assignment: Assignment | null,
  date: Date | null,
  hours: number
): ValidationResult {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user) {
      return { isValid: false, errors: ['Usuario no autenticado'] };
    }
    
    if (!assignment || !date) {
      return { isValid: false, errors: ['Datos de entrada de tiempo no válidos'] };
    }
    
    return validateTimeEntry(user, assignment, date, hours);
  }, [user, assignment, date, hours]);
}

/**
 * Hook to validate material stock
 */
export function useMaterialStockValidation(
  materialId: string,
  requiredQuantity: number,
  currentStock: number,
  reservedQuantity: number = 0
): ValidationResult {
  return useMemo(() => {
    return validateMaterialStock(materialId, requiredQuantity, currentStock, reservedQuantity);
  }, [materialId, requiredQuantity, currentStock, reservedQuantity]);
}

/**
 * Hook to validate checklist completion
 */
export function useChecklistCompletionValidation(
  checklist: ActivityChecklist | null,
  requiredItemsOnly: boolean = false
): ValidationResult {
  return useMemo(() => {
    if (!checklist) {
      return { isValid: false, errors: ['Checklist no encontrado'] };
    }
    
    return validateChecklistCompletion(checklist, requiredItemsOnly);
  }, [checklist, requiredItemsOnly]);
}

/**
 * Hook to validate activity state changes
 */
export function useActivityStateChangeValidation(
  activity: Activity | null,
  newState: Activity['estado'],
  checklist?: ActivityChecklist,
  evidence?: Evidence[],
  assignments?: Assignment[]
): ValidationResult {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user) {
      return { isValid: false, errors: ['Usuario no autenticado'] };
    }
    
    if (!activity) {
      return { isValid: false, errors: ['Actividad no encontrada'] };
    }
    
    return validateActivityStateChange(
      activity, 
      newState, 
      user, 
      checklist, 
      evidence, 
      assignments
    );
  }, [activity, newState, user, checklist, evidence, assignments]);
}

/**
 * Hook that returns all business rule validation functions
 */
export function useBusinessRules() {
  const { user } = useAuth();
  
  return useMemo(() => ({
    validateActivityCompletion: (
      activity: Activity,
      checklist?: ActivityChecklist,
      evidence?: Evidence[]
    ) => validateActivityCompletion(activity, checklist, evidence),
    
    validateAssignmentOverlap: (
      newAssignment: Omit<Assignment, 'id' | 'created_at' | 'updated_at'>,
      existingAssignments: Assignment[]
    ) => validateAssignmentOverlap(newAssignment, existingAssignments),
    
    validateRoleBasedOperation: (
      operation: string,
      targetResource?: any,
      targetUser?: User
    ) => user ? validateRoleBasedOperation(user, operation, targetResource, targetUser) : 
      { isValid: false, errors: ['Usuario no autenticado'] },
    
    validateProjectAssignment: (
      projectId: string,
      userAssignments?: Assignment[]
    ) => user ? validateProjectAssignment(user, projectId, userAssignments) : 
      { isValid: false, errors: ['Usuario no autenticado'] },
    
    validateTimeEntry: (
      assignment: Assignment,
      date: Date,
      hours: number
    ) => user ? validateTimeEntry(user, assignment, date, hours) : 
      { isValid: false, errors: ['Usuario no autenticado'] },
    
    validateMaterialStock: (
      materialId: string,
      requiredQuantity: number,
      currentStock: number,
      reservedQuantity?: number
    ) => validateMaterialStock(materialId, requiredQuantity, currentStock, reservedQuantity),
    
    validateChecklistCompletion: (
      checklist: ActivityChecklist,
      requiredItemsOnly?: boolean
    ) => validateChecklistCompletion(checklist, requiredItemsOnly),
    
    validateActivityStateChange: (
      activity: Activity,
      newState: Activity['estado'],
      checklist?: ActivityChecklist,
      evidence?: Evidence[],
      assignments?: Assignment[]
    ) => user ? validateActivityStateChange(activity, newState, user, checklist, evidence, assignments) : 
      { isValid: false, errors: ['Usuario no autenticado'] }
  }), [user]);
}