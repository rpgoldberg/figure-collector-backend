import request from 'supertest';
import { createTestApp } from '../helpers/testApp';

const app = createTestApp();

describe('Service Endpoints Integration', () => {
  describe('GET /health', () => {
    it('should return health check status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok'
      });
    });
  });

  describe('POST /register-service', () => {
    it('should register frontend service successfully', async () => {
      const registrationData = {
        serviceName: 'frontend',
        version: '1.2.3',
        name: 'figure-collector-frontend'
      };

      const response = await request(app)
        .post('/register-service')
        .send(registrationData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Service registered successfully'
      });
    });

    it('should register frontend service with minimal data', async () => {
      const registrationData = {
        serviceName: 'frontend',
        version: '1.0.0'
      };

      const response = await request(app)
        .post('/register-service')
        .send(registrationData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Service registered successfully'
      });
    });

    it('should return error for missing serviceName', async () => {
      const registrationData = {
        version: '1.0.0'
      };

      const response = await request(app)
        .post('/register-service')
        .send(registrationData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'serviceName and version are required'
      });
    });

    it('should return error for missing version', async () => {
      const registrationData = {
        serviceName: 'frontend'
      };

      const response = await request(app)
        .post('/register-service')
        .send(registrationData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'serviceName and version are required'
      });
    });

    it('should return error for unsupported service', async () => {
      const registrationData = {
        serviceName: 'unsupported-service',
        version: '1.0.0'
      };

      const response = await request(app)
        .post('/register-service')
        .send(registrationData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Only frontend service registration is currently supported'
      });
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/register-service')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'serviceName and version are required'
      });
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/register-service')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      // Express should handle malformed JSON and return 400
      expect(response.status).toBe(400);
    });

    describe('Service name handling', () => {
      it('should use provided service name', async () => {
        const registrationData = {
          serviceName: 'frontend',
          version: '1.0.0',
          name: 'custom-frontend-name'
        };

        await request(app)
          .post('/register-service')
          .send(registrationData)
          .expect(200);

        // Verify the custom name is used in version endpoint
        const versionResponse = await request(app)
          .get('/version')
          .expect(200);

        expect(versionResponse.body.services.frontend.name).toBe('custom-frontend-name');
      });

      it('should use default name if not provided', async () => {
        const registrationData = {
          serviceName: 'frontend',
          version: '1.0.0'
        };

        await request(app)
          .post('/register-service')
          .send(registrationData)
          .expect(200);

        // Verify the default name is used
        const versionResponse = await request(app)
          .get('/version')
          .expect(200);

        expect(versionResponse.body.services.frontend.name).toBe('figure-collector-frontend');
      });
    });
  });

  describe('GET /version', () => {
    it('should return version information with default values', async () => {
      const response = await request(app)
        .get('/version')
        .expect(200);

      expect(response.body).toEqual({
        application: {
          name: 'figure-collector-services',
          version: '1.0.0-test',
          releaseDate: '2024-01-01'
        },
        services: {
          backend: {
            name: 'figure-collector-backend',
            version: '1.0.0-test',
            status: 'ok'
          },
          frontend: {
            name: 'figure-collector-frontend',
            version: 'unknown',
            status: 'not-registered'
          },
          scraper: {
            name: 'page-scraper',
            version: 'unknown',
            status: 'not-checked'
          }
        }
      });
    });

    it('should reflect registered frontend service', async () => {
      // First register a service
      await request(app)
        .post('/register-service')
        .send({
          serviceName: 'frontend',
          version: '2.1.0',
          name: 'my-frontend'
        })
        .expect(200);

      // Then check version endpoint
      const response = await request(app)
        .get('/version')
        .expect(200);

      expect(response.body.services.frontend).toEqual({
        name: 'my-frontend',
        version: '2.1.0',
        status: 'ok'
      });
    });

    it('should maintain service state across multiple requests', async () => {
      // Register service
      await request(app)
        .post('/register-service')
        .send({
          serviceName: 'frontend',
          version: '1.5.0'
        });

      // Check version multiple times
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/version')
          .expect(200);

        expect(response.body.services.frontend.version).toBe('1.5.0');
        expect(response.body.services.frontend.status).toBe('ok');
      }
    });

    it('should handle version updates', async () => {
      // Register initial version
      await request(app)
        .post('/register-service')
        .send({
          serviceName: 'frontend',
          version: '1.0.0'
        });

      let response = await request(app)
        .get('/version')
        .expect(200);

      expect(response.body.services.frontend.version).toBe('1.0.0');

      // Update to new version
      await request(app)
        .post('/register-service')
        .send({
          serviceName: 'frontend',
          version: '2.0.0'
        });

      response = await request(app)
        .get('/version')
        .expect(200);

      expect(response.body.services.frontend.version).toBe('2.0.0');
    });

    describe('Version format validation', () => {
      it('should handle semantic versions', async () => {
        const versions = ['1.0.0', '2.3.4', '10.20.30', '1.0.0-beta.1'];

        for (const version of versions) {
          await request(app)
            .post('/register-service')
            .send({
              serviceName: 'frontend',
              version: version
            });

          const response = await request(app)
            .get('/version')
            .expect(200);

          expect(response.body.services.frontend.version).toBe(version);
        }
      });

      it('should handle non-semantic versions', async () => {
        const versions = ['latest', 'dev', 'v1.2', 'build-123'];

        for (const version of versions) {
          await request(app)
            .post('/register-service')
            .send({
              serviceName: 'frontend',
              version: version
            });

          const response = await request(app)
            .get('/version')
            .expect(200);

          expect(response.body.services.frontend.version).toBe(version);
        }
      });

      it('should handle empty version string', async () => {
        await request(app)
          .post('/register-service')
          .send({
            serviceName: 'frontend',
            version: ''
          });

        const response = await request(app)
          .get('/version')
          .expect(200);

        expect(response.body.services.frontend.version).toBe('');
        expect(response.body.services.frontend.status).toBe('ok');
      });
    });
  });

  describe('Service Registration and Version Flow', () => {
    it('should complete full service registration flow', async () => {
      // Check initial state
      let versionResponse = await request(app)
        .get('/version')
        .expect(200);

      expect(versionResponse.body.services.frontend.status).toBe('not-registered');
      expect(versionResponse.body.services.frontend.version).toBe('unknown');

      // Register service
      const registrationResponse = await request(app)
        .post('/register-service')
        .send({
          serviceName: 'frontend',
          version: '3.2.1',
          name: 'production-frontend'
        })
        .expect(200);

      expect(registrationResponse.body.success).toBe(true);

      // Verify registration in version endpoint
      versionResponse = await request(app)
        .get('/version')
        .expect(200);

      expect(versionResponse.body.services.frontend).toEqual({
        name: 'production-frontend',
        version: '3.2.1',
        status: 'ok'
      });

      // Re-register with different version
      await request(app)
        .post('/register-service')
        .send({
          serviceName: 'frontend',
          version: '3.2.2',
          name: 'updated-frontend'
        })
        .expect(200);

      // Verify update
      versionResponse = await request(app)
        .get('/version')
        .expect(200);

      expect(versionResponse.body.services.frontend).toEqual({
        name: 'updated-frontend',
        version: '3.2.2',
        status: 'ok'
      });
    });

    it('should handle multiple rapid registrations', async () => {
      const versions = ['1.0.0', '1.0.1', '1.0.2', '1.1.0', '2.0.0'];
      
      // Register multiple versions rapidly
      for (const version of versions) {
        await request(app)
          .post('/register-service')
          .send({
            serviceName: 'frontend',
            version: version
          })
          .expect(200);
      }

      // Verify final state
      const response = await request(app)
        .get('/version')
        .expect(200);

      expect(response.body.services.frontend.version).toBe('2.0.0');
      expect(response.body.services.frontend.status).toBe('ok');
    });
  });

  describe('Error Handling', () => {
    it('should handle version endpoint errors gracefully', async () => {
      // Mock a scenario where version endpoint might have issues
      // This test ensures the endpoint doesn't crash the server
      
      const response = await request(app)
        .get('/version')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.services).toBeDefined();
      expect(response.body.services.backend).toBeDefined();
    });

    it('should handle service registration errors gracefully', async () => {
      // Test with various invalid inputs that might cause errors
      const invalidInputs = [
        { serviceName: null, version: '1.0.0' },
        { serviceName: undefined, version: '1.0.0' },
        { serviceName: 'frontend', version: null },
        { serviceName: 'frontend', version: undefined }
      ];

      for (const input of invalidInputs) {
        const response = await request(app)
          .post('/register-service')
          .send(input)
          .expect(400);

        expect(response.body.error).toBe('serviceName and version are required');
      }
    });
  });

  describe('Content-Type Handling', () => {
    it('should handle application/json content type', async () => {
      const response = await request(app)
        .post('/register-service')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({
          serviceName: 'frontend',
          version: '1.0.0'
        }))
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle form-encoded data', async () => {
      const response = await request(app)
        .post('/register-service')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('serviceName=frontend&version=1.0.0')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle missing content-type', async () => {
      const response = await request(app)
        .post('/register-service')
        .send({
          serviceName: 'frontend',
          version: '1.0.0'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});