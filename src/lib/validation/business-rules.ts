// Business rules implementation for specific validation logic
import { ValidationContext } from './types';
import { googleSheetsAPIService } from '../google-sheets-api-service';

/**
 * Business rules for unique field validation
 */
export class UniqueFieldValidator {
  private static cache: Map<string, any[]> = new Map();
  private static cacheExpiry: Map<string, number> = new Map();
  private static readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  /**
   * Validate that a field value is unique in the table
   */
  static async validateUnique(
    tableName: string,
    fieldName: string,
    value: any,
    excludeId?: string
  ): Promise<boolean> {
    try {
      const records = await this.getTableData(tableName);
      
      const duplicates = records.filter(record => {
        // Skip the current record if updating
        if (excludeId && record.id === excludeId) {
          return false;
        }
        
        return record[fieldName] === value;
      });

      return duplicates.length === 0;
    } catch (error) {
      console.error(`Error validating unique field ${fieldName} in ${tableName}:`, error);
      return true; // Allow operation to proceed if validation fails
    }
  }

  /**
   * Get table data with caching
   */
  private static async getTableData(tableName: string): Promise<any[]> {
    const now = Date.now();
    const cacheKey = tableName;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (now < expiry) {
        return this.cache.get(cacheKey) || [];
      }
    }

    // Fetch fresh data
    const response = await googleSheetsAPIService.executeOperation({
      table: tableName,
      operation: 'list'
    });

    if (response.ok && response.data) {
      const data = Array.isArray(response.data) ? response.data : [response.data];
      this.cache.set(cacheKey, data);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);
      return data;
    }

    return [];
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

/**
 * Business rules for project-related validations
 */
export class ProjectBusinessRules {
  /**
   * Validate that activity dates are within project dates
   */
  static async validateActivityWithinProjectDates(
    activityData: any,
    context?: ValidationContext
  ): Promise<boolean> {
    try {
      const projectResponse = await googleSheetsAPIService.executeOperation({
        table: 'Proyectos',
        operation: 'get',
        id: activityData.proyecto_id
      });

      if (!projectResponse.ok || !projectResponse.data) {
        return false; // Project doesn't exist
      }

      const project = projectResponse.data;
      const projectStart = new Date(project.inicio_plan);
      const projectEnd = new Date(project.fin_plan);
      const activityStart = new Date(activityData.inicio_plan);
      const activityEnd = new Date(activityData.fin_plan);

      return activityStart >= projectStart && activityEnd <= projectEnd;
    } catch (error) {
      console.error('Error validating activity dates:', error);
      return true; // Allow operation if validation fails
    }
  }

  /**
   * Validate that user is active and has appropriate role
   */
  static async validateActiveUser(
    userId: string,
    requiredRoles?: string[]
  ): Promise<boolean> {
    try {
      const userResponse = await googleSheetsAPIService.executeOperation({
        table: 'Usuarios',
        operation: 'get',
        id: userId
      });

      if (!userResponse.ok || !userResponse.data) {
        return false;
      }

      const user = userResponse.data;
      
      // Check if user is active
      if (!user.activo) {
        return false;
      }

      // Check role if specified
      if (requiredRoles && !requiredRoles.includes(user.rol)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating user:', error);
      return true; // Allow operation if validation fails
    }
  }

  /**
   * Validate project budget allocation
   */
  static async validateProjectBudget(
    projectData: any,
    context?: ValidationContext
  ): Promise<boolean> {
    try {
      // Get all activities for this project
      const activitiesResponse = await googleSheetsAPIService.executeOperation({
        table: 'Actividades',
        operation: 'list',
        filters: { proyecto_id: projectData.id }
      });

      if (!activitiesResponse.ok) {
        return true; // Allow if we can't validate
      }

      const activities = Array.isArray(activitiesResponse.data) ? activitiesResponse.data : [];
      
      // Get BOM items for all activities
      const bomPromises = activities.map(activity =>
        googleSheetsAPIService.executeOperation({
          table: 'BOM',
          operation: 'list',
          filters: { actividad_id: activity.id }
        })
      );

      const bomResponses = await Promise.all(bomPromises);
      let totalEstimatedCost = 0;

      bomResponses.forEach(response => {
        if (response.ok && response.data) {
          const bomItems = Array.isArray(response.data) ? response.data : [response.data];
          bomItems.forEach(item => {
            totalEstimatedCost += (item.qty_requerida || 0) * (item.costo_unit_est || 0);
          });
        }
      });

      // Allow some buffer (20%) over estimated costs
      const budgetBuffer = projectData.presupuesto_total * 0.2;
      return totalEstimatedCost <= (projectData.presupuesto_total + budgetBuffer);
    } catch (error) {
      console.error('Error validating project budget:', error);
      return true; // Allow operation if validation fails
    }
  }
}

/**
 * Business rules for material and inventory management
 */
export class MaterialBusinessRules {
  /**
   * Validate material stock levels
   */
  static validateStockLevels(materialData: any): boolean {
    // Stock actual cannot be negative
    if (materialData.stock_actual < 0) {
      return false;
    }

    // Stock minimum should be reasonable (not negative, not too high)
    if (materialData.stock_minimo < 0 || materialData.stock_minimo > materialData.stock_actual * 10) {
      return false;
    }

    return true;
  }

  /**
   * Validate BOM material availability
   */
  static async validateMaterialAvailability(
    bomData: any,
    context?: ValidationContext
  ): Promise<boolean> {
    try {
      const materialResponse = await googleSheetsAPIService.executeOperation({
        table: 'Materiales',
        operation: 'get',
        id: bomData.material_id
      });

      if (!materialResponse.ok || !materialResponse.data) {
        return false; // Material doesn't exist
      }

      const material = materialResponse.data;
      
      // Check if material is active
      if (!material.activo) {
        return false;
      }

      // Check if there's enough stock (considering all BOM requirements)
      const allBomResponse = await googleSheetsAPIService.executeOperation({
        table: 'BOM',
        operation: 'list',
        filters: { material_id: bomData.material_id }
      });

      if (allBomResponse.ok && allBomResponse.data) {
        const allBomItems = Array.isArray(allBomResponse.data) ? allBomResponse.data : [allBomResponse.data];
        const totalRequired = allBomItems.reduce((sum, item) => sum + (item.qty_requerida || 0), 0);
        
        // Add current requirement if this is a new BOM item
        const currentRequirement = context?.operation === 'create' ? bomData.qty_requerida : 0;
        
        return material.stock_actual >= (totalRequired + currentRequirement);
      }

      return true;
    } catch (error) {
      console.error('Error validating material availability:', error);
      return true; // Allow operation if validation fails
    }
  }
}

/**
 * Business rules for time tracking
 */
export class TimeTrackingBusinessRules {
  /**
   * Validate daily hours limit per collaborator
   */
  static async validateDailyHoursLimit(
    timeEntryData: any,
    context?: ValidationContext
  ): Promise<boolean> {
    try {
      const date = new Date(timeEntryData.fecha);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Get all time entries for this collaborator on this date
      const timeEntriesResponse = await googleSheetsAPIService.executeOperation({
        table: 'RegistroHoras',
        operation: 'list',
        filters: { 
          colaborador_id: timeEntryData.colaborador_id,
          fecha: dateStr
        }
      });

      if (!timeEntriesResponse.ok) {
        return true; // Allow if we can't validate
      }

      const existingEntries = Array.isArray(timeEntriesResponse.data) ? timeEntriesResponse.data : [];
      let totalHours = timeEntryData.horas_trabajadas || 0;

      // Sum existing hours (excluding current entry if updating)
      existingEntries.forEach(entry => {
        if (context?.operation === 'update' && entry.id === timeEntryData.id) {
          return; // Skip current entry when updating
        }
        totalHours += entry.horas_trabajadas || 0;
      });

      // Maximum 12 hours per day
      return totalHours <= 12;
    } catch (error) {
      console.error('Error validating daily hours limit:', error);
      return true; // Allow operation if validation fails
    }
  }

  /**
   * Validate that collaborator is assigned to the project/activity
   */
  static async validateCollaboratorAssignment(
    timeEntryData: any,
    context?: ValidationContext
  ): Promise<boolean> {
    try {
      const assignmentResponse = await googleSheetsAPIService.executeOperation({
        table: 'Asignaciones',
        operation: 'list',
        filters: {
          colaborador_id: timeEntryData.colaborador_id,
          proyecto_id: timeEntryData.proyecto_id,
          actividad_id: timeEntryData.actividad_id
        }
      });

      if (!assignmentResponse.ok) {
        return true; // Allow if we can't validate
      }

      const assignments = Array.isArray(assignmentResponse.data) ? assignmentResponse.data : [];
      const activeAssignments = assignments.filter(assignment => assignment.activo);

      return activeAssignments.length > 0;
    } catch (error) {
      console.error('Error validating collaborator assignment:', error);
      return true; // Allow operation if validation fails
    }
  }
}

/**
 * Business rules for client management
 */
export class ClientBusinessRules {
  /**
   * Validate RUC format and check digit (Peru specific)
   */
  static validateRUC(ruc: string): boolean {
    if (!ruc || ruc.length !== 11) {
      return false;
    }

    // Check if all characters are digits
    if (!/^\d{11}$/.test(ruc)) {
      return false;
    }

    // Basic format validation - RUC should start with 10, 15, 17, or 20
    const firstTwoDigits = ruc.substring(0, 2);
    if (!['10', '15', '17', '20'].includes(firstTwoDigits)) {
      return false;
    }

    // RUC check digit validation (simplified)
    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;

    for (let i = 0; i < 10; i++) {
      sum += parseInt(ruc[i]) * weights[i];
    }

    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;

    return checkDigit === parseInt(ruc[10]);
  }

  /**
   * Validate DNI format (Peru specific)
   */
  static validateDNI(dni: string): boolean {
    if (!dni || dni.length !== 8) {
      return false;
    }

    // Check if all characters are digits
    return /^\d{8}$/.test(dni);
  }
}

/**
 * Export all business rule validators
 */
export const businessRules = {
  unique: UniqueFieldValidator,
  project: ProjectBusinessRules,
  material: MaterialBusinessRules,
  timeTracking: TimeTrackingBusinessRules,
  client: ClientBusinessRules
};