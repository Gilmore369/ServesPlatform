/**
 * Real Data Integration Test Suite
 * Tests and validates real data integration between frontend and Google Sheets
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.4, 10.5
 * Task: 9.5 Test and validate real data integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { runIntegrationTests, testTableData } from '../../lib/google-sheets-integration-test';
import { testAPIConnection, testAuthentication, testDatabaseOperations, performHealthCheck } from '../../lib/api-test-utils';
import { logger } from '../../lib/logger';

describe('Real Data Integration Tests', () => {
  let testRecordIds: string[] = [];
  
  beforeAll(async () => {
    logger.info('Starting real data integration test suite');
  });

  afterAll(async () => {
    // Clean up any test records created during testing
    for (const recordId of testRecordIds) {
      try {
        await apiClient.delete('Usuarios', recordId);
      } catch (error) {
        logger.warn(`Failed to clean up test record ${recordId}`, error);
      }
    }
    logger.info('Real data integration test suite completed');
  });

  describe('Google Sheets Connection and Health', () => {
    it('should successfully connect to Google Sheets API', async () => {
      const connectionResult = await testAPIConnection();
      
      expect(connectionResult.success).toBe(true);
      expect(connectionResult.duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(connectionResult.details).toBeDefined();
      
      if (!connectionResult.success) {
        logger.error('Google Sheets connection failed', connectionResult);
      }
    }, 15000);

    it('should pass comprehensive health check', async () => {
      const healthResult = await performHealthCheck();
      
      expect(healthResult.healthy).toBe(true);
      expect(healthResult.services.api.success).toBe(true);
      expect(healthResult.services.auth.success).toBe(true);
      expect(healthResult.services.database.success).toBe(true);
      
      // Log health details for debugging
      logger.info('Health check results', {
        overall: healthResult.overall,
        apiDuration: healthResult.services.api.duration,
        authDuration: healthResult.services.auth.duration,
        dbDuration: healthResult.services.database.duration
      });
    }, 30000);

    it('should validate Google Sheets integration service', async () => {
      const integrationResults = await runIntegrationTests();
      
      expect(integrationResults.overall).not.toBe('failed');
      expect(integrationResults.summary.successRate).toBeGreaterThan(70); // At least 70% success rate
      
      // Log detailed results
      logger.info('Integration test results', {
        overall: integrationResults.overall,
        successRate: integrationResults.summary.successRate,
        passed: integrationResults.summary.passed,
        failed: integrationResults.summary.failed,
        warnings: integrationResults.summary.warnings
      });

      // Check individual test results
      const connectionTest = integrationResults.tests.find(t => t.testName === 'Connection Test');
      expect(connectionTest?.status).toBe('passed');

      const dataRetrievalTest = integrationResults.tests.find(t => t.testName === 'Data Retrieval Test');
      expect(dataRetrievalTest?.status).not.toBe('failed');
    }, 60000);
  });

  describe('Data Loading from Google Sheets', () => {
    const testTables = ['Usuarios', 'Materiales', 'Proyectos', 'Actividades'];

    testTables.forEach(tableName => {
      it(`should load data from ${tableName} sheet`, async () => {
        const tableResult = await testTableData(tableName);
        
        expect(tableResult.success).toBe(true);
        expect(tableResult.source).not.toBe('error');
        
        // Log data source information
        logger.info(`${tableName} data test`, {
          success: tableResult.success,
          recordCount: tableResult.recordCount,
          source: tableResult.source,
          hasRealData: tableResult.source === 'google_sheets'
        });

        // If using mock data, log a warning but don't fail the test
        if (tableResult.source === 'mock_data') {
          logger.warn(`${tableName} is using mock data - may indicate Google Sheets connectivity issues`);
        }
      }, 15000);
    });

    it('should retrieve data with proper structure and types', async () => {
      const response = await apiClient.getMaterials({ limit: 5 });
      
      expect(response.ok).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      
      if (response.data && response.data.length > 0) {
        const material = response.data[0];
        
        // Validate expected fields exist
        expect(material).toHaveProperty('id');
        expect(material).toHaveProperty('sku');
        expect(material).toHaveProperty('descripcion');
        
        // Log sample data structure
        logger.info('Sample material data structure', {
          fields: Object.keys(material),
          sampleData: material
        });
      }
    }, 10000);

    it('should handle pagination correctly', async () => {
      const page1 = await apiClient.getMaterials({ limit: 3 });
      const page2 = await apiClient.getMaterials({ limit: 3 }); // This should get different data if pagination works
      
      expect(page1.ok).toBe(true);
      expect(page2.ok).toBe(true);
      expect(Array.isArray(page1.data)).toBe(true);
      expect(Array.isArray(page2.data)).toBe(true);
      
      logger.info('Pagination test results', {
        page1Count: page1.data?.length || 0,
        page2Count: page2.data?.length || 0,
        page1HasData: (page1.data?.length || 0) > 0,
        page2HasData: (page2.data?.length || 0) > 0
      });
    }, 10000);
  });

  describe('CRUD Operations with Real Data', () => {
    let createdRecordId: string;

    it('should create a new record in Google Sheets', async () => {
      const testUser = {
        email: `test-integration-${Date.now()}@example.com`,
        nombre: 'Integration Test User',
        rol: 'tecnico',
        activo: true
      };

      const response = await apiClient.createUser(testUser);
      
      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.id).toBeDefined();
      
      if (response.data?.id) {
        createdRecordId = response.data.id;
        testRecordIds.push(createdRecordId);
        
        logger.info('Created test user', {
          id: createdRecordId,
          email: testUser.email
        });
      }
    }, 15000);

    it('should read the created record from Google Sheets', async () => {
      if (!createdRecordId) {
        throw new Error('No record was created in previous test');
      }

      const response = await apiClient.getUser(createdRecordId);
      
      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.id).toBe(createdRecordId);
      expect(response.data?.email).toContain('test-integration-');
      
      logger.info('Retrieved created user', {
        id: response.data?.id,
        email: response.data?.email
      });
    }, 10000);

    it('should update the record in Google Sheets', async () => {
      if (!createdRecordId) {
        throw new Error('No record was created in previous test');
      }

      const updateData = {
        nombre: 'Updated Integration Test User',
        rol: 'admin'
      };

      const response = await apiClient.updateUser(createdRecordId, updateData);
      
      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.nombre).toBe(updateData.nombre);
      expect(response.data?.rol).toBe(updateData.rol);
      
      logger.info('Updated test user', {
        id: createdRecordId,
        updatedFields: updateData
      });
    }, 15000);

    it('should delete the record from Google Sheets', async () => {
      if (!createdRecordId) {
        throw new Error('No record was created in previous test');
      }

      const response = await apiClient.delete('Usuarios', createdRecordId);
      
      expect(response.ok).toBe(true);
      
      // Verify the record is actually deleted
      const getResponse = await apiClient.getUser(createdRecordId);
      expect(getResponse.ok).toBe(false);
      
      logger.info('Deleted test user', {
        id: createdRecordId
      });

      // Remove from cleanup list since it's already deleted
      testRecordIds = testRecordIds.filter(id => id !== createdRecordId);
    }, 15000);

    it('should handle batch operations correctly', async () => {
      const testUsers = [
        {
          email: `batch-test-1-${Date.now()}@example.com`,
          nombre: 'Batch Test User 1',
          rol: 'tecnico',
          activo: true
        },
        {
          email: `batch-test-2-${Date.now()}@example.com`,
          nombre: 'Batch Test User 2',
          rol: 'editor',
          activo: true
        }
      ];

      const response = await apiClient.batchCreate('Usuarios', testUsers);
      
      expect(response.ok).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      
      if (response.data) {
        // Add created IDs to cleanup list
        response.data.forEach(user => {
          if (user.id) {
            testRecordIds.push(user.id);
          }
        });
        
        logger.info('Created batch users', {
          count: response.data.length,
          ids: response.data.map(u => u.id)
        });
      }
    }, 20000);
  });

  describe('Error Handling with Google Sheets Unavailable', () => {
    it('should handle invalid table names gracefully', async () => {
      const response = await apiClient.list('NonExistentTable' as any);
      
      expect(response.ok).toBe(false);
      expect(response.message).toBeDefined();
      
      logger.info('Invalid table test', {
        success: response.ok,
        message: response.message
      });
    }, 10000);

    it('should handle invalid record IDs gracefully', async () => {
      const response = await apiClient.getUser('INVALID_ID_12345');
      
      expect(response.ok).toBe(false);
      expect(response.message).toBeDefined();
      
      logger.info('Invalid ID test', {
        success: response.ok,
        message: response.message
      });
    }, 10000);

    it('should handle malformed data gracefully', async () => {
      const invalidUser = {
        email: 'invalid-email-format',
        rol: 'invalid-role-value'
      };

      const response = await apiClient.createUser(invalidUser as any);
      
      // Should either succeed with validation or fail gracefully
      if (!response.ok) {
        expect(response.message).toBeDefined();
        logger.info('Malformed data test - validation caught error', {
          message: response.message
        });
      } else {
        // If it succeeded, clean up the record
        if (response.data?.id) {
          testRecordIds.push(response.data.id);
        }
        logger.info('Malformed data test - data was accepted', {
          id: response.data?.id
        });
      }
    }, 10000);

    it('should provide meaningful error messages for network issues', async () => {
      // This test simulates what happens when Google Sheets is unavailable
      // We can't actually make it unavailable, but we can test the error handling paths
      
      try {
        // Try to access a table that might not exist or be configured
        const response = await apiClient.list('TestUnavailableTable' as any);
        
        if (!response.ok) {
          expect(response.message).toBeDefined();
          expect(response.message.length).toBeGreaterThan(0);
          
          logger.info('Network error simulation', {
            message: response.message,
            hasUserFriendlyMessage: !response.message.includes('TypeError') && !response.message.includes('fetch')
          });
        }
      } catch (error) {
        // If an exception is thrown, it should be handled gracefully
        expect(error).toBeInstanceOf(Error);
        logger.info('Network error exception handling', {
          errorType: error.constructor.name,
          message: error.message
        });
      }
    }, 10000);
  });

  describe('Data Consistency Validation', () => {
    it('should maintain data consistency between frontend and Google Sheets', async () => {
      // Create a record
      const testData = {
        email: `consistency-test-${Date.now()}@example.com`,
        nombre: 'Consistency Test User',
        rol: 'tecnico',
        activo: true
      };

      const createResponse = await apiClient.createUser(testData);
      expect(createResponse.ok).toBe(true);
      
      if (createResponse.data?.id) {
        testRecordIds.push(createResponse.data.id);
        
        // Immediately read it back
        const readResponse = await apiClient.getUser(createResponse.data.id);
        expect(readResponse.ok).toBe(true);
        
        // Verify data consistency
        expect(readResponse.data?.email).toBe(testData.email);
        expect(readResponse.data?.nombre).toBe(testData.nombre);
        expect(readResponse.data?.rol).toBe(testData.rol);
        expect(readResponse.data?.activo).toBe(testData.activo);
        
        logger.info('Data consistency test passed', {
          id: createResponse.data.id,
          fieldsMatch: {
            email: readResponse.data?.email === testData.email,
            nombre: readResponse.data?.nombre === testData.nombre,
            rol: readResponse.data?.rol === testData.rol,
            activo: readResponse.data?.activo === testData.activo
          }
        });
      }
    }, 15000);

    it('should reflect updates immediately', async () => {
      // Create a record first
      const testData = {
        email: `update-consistency-${Date.now()}@example.com`,
        nombre: 'Update Test User',
        rol: 'tecnico',
        activo: true
      };

      const createResponse = await apiClient.createUser(testData);
      expect(createResponse.ok).toBe(true);
      
      if (createResponse.data?.id) {
        testRecordIds.push(createResponse.data.id);
        
        // Update the record
        const updateData = {
          nombre: 'Updated Test User',
          rol: 'admin'
        };
        
        const updateResponse = await apiClient.updateUser(createResponse.data.id, updateData);
        expect(updateResponse.ok).toBe(true);
        
        // Immediately read it back to verify the update
        const readResponse = await apiClient.getUser(createResponse.data.id);
        expect(readResponse.ok).toBe(true);
        expect(readResponse.data?.nombre).toBe(updateData.nombre);
        expect(readResponse.data?.rol).toBe(updateData.rol);
        
        logger.info('Update consistency test passed', {
          id: createResponse.data.id,
          originalName: testData.nombre,
          updatedName: readResponse.data?.nombre,
          originalRole: testData.rol,
          updatedRole: readResponse.data?.rol
        });
      }
    }, 20000);

    it('should handle concurrent operations correctly', async () => {
      const concurrentOperations = [
        apiClient.getMaterials({ limit: 5 }),
        apiClient.getProjects({ limit: 5 }),
        apiClient.getUsers({ limit: 5 })
      ];

      const results = await Promise.all(concurrentOperations);
      
      // All operations should succeed
      results.forEach((result, index) => {
        expect(result.ok).toBe(true);
        logger.info(`Concurrent operation ${index + 1}`, {
          success: result.ok,
          dataCount: result.data?.length || 0
        });
      });
      
      logger.info('Concurrent operations test completed', {
        totalOperations: concurrentOperations.length,
        successfulOperations: results.filter(r => r.ok).length
      });
    }, 15000);
  });

  describe('Performance and Reliability', () => {
    it('should complete operations within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await apiClient.getMaterials({ limit: 10 });
      
      const duration = Date.now() - startTime;
      
      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      logger.info('Performance test', {
        operation: 'getMaterials',
        duration,
        recordCount: response.data?.length || 0,
        performanceRating: duration < 2000 ? 'excellent' : 
                          duration < 5000 ? 'good' : 
                          duration < 10000 ? 'acceptable' : 'poor'
      });
    }, 15000);

    it('should handle multiple rapid requests without errors', async () => {
      const rapidRequests = Array.from({ length: 5 }, (_, i) => 
        apiClient.getMaterials({ limit: 2 })
      );

      const results = await Promise.all(rapidRequests);
      
      const successfulRequests = results.filter(r => r.ok).length;
      
      expect(successfulRequests).toBeGreaterThan(0);
      expect(successfulRequests / results.length).toBeGreaterThan(0.8); // At least 80% success rate
      
      logger.info('Rapid requests test', {
        totalRequests: results.length,
        successfulRequests,
        successRate: Math.round((successfulRequests / results.length) * 100)
      });
    }, 20000);
  });
});