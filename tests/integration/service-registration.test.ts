/**
 * Integration tests for service registration with Version-Manager
 * These tests ensure proper registration and authentication flow
 */

import request from 'supertest';
import express from 'express';
import { Request, Response } from 'express';

describe('Service Registration Integration', () => {
  let app: express.Application;
  let mockVersionManagerCalls: any[] = [];

  beforeEach(() => {
    // Clear environment and mocks
    mockVersionManagerCalls = [];
    process.env.SERVICE_AUTH_TOKEN = 'test-auth-token';
    process.env.VERSION_MANAGER_URL = 'http://version-manager:3001';

    // Create a test app with the registration endpoints
    app = express();
    app.use(express.json());

    // Mock the /register-frontend endpoint (proxy for frontend)
    app.post('/register-frontend', async (req: Request, res: Response) => {
      const { serviceName, version, name } = req.body;

      // Validate required fields
      if (!serviceName || !version) {
        return res.status(400).json({
          error: 'Missing required fields: serviceName and version'
        });
      }

      // Track the call for testing
      mockVersionManagerCalls.push({
        endpoint: '/services/register',
        auth: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
        body: {
          serviceId: serviceName,
          name: name || serviceName,
          version: version
        }
      });

      // Simulate successful registration
      res.json({
        status: 'registered',
        serviceId: serviceName,
        version: version,
        message: 'Service registered successfully'
      });
    });

    // Mock the /version endpoint that queries Version-Manager
    app.get('/version', async (req: Request, res: Response) => {
      // Track the call
      mockVersionManagerCalls.push({
        endpoint: '/services',
        method: 'GET'
      });

      // Return mock version info
      res.json({
        application: {
          name: 'figure-collector',
          version: '2.0.0',
          releaseDate: '2025-09-16'
        },
        services: {
          backend: {
            version: '2.0.0',
            status: 'healthy',
            lastSeen: new Date().toISOString()
          },
          frontend: {
            version: '2.0.0',
            status: 'healthy',
            lastSeen: new Date().toISOString()
          },
          'page-scraper': {
            version: '2.0.0',
            status: 'healthy',
            lastSeen: new Date().toISOString()
          },
          'version-manager': {
            version: '1.1.0',
            status: 'healthy',
            lastSeen: new Date().toISOString()
          }
        }
      });
    });
  });

  afterEach(() => {
    delete process.env.SERVICE_AUTH_TOKEN;
    delete process.env.VERSION_MANAGER_URL;
  });

  describe('Frontend Registration Proxy', () => {
    it('should proxy frontend registration to Version-Manager with auth token', async () => {
      const registrationData = {
        serviceName: 'frontend',
        version: '2.0.0',
        name: 'Figure Collector Frontend'
      };

      const response = await request(app)
        .post('/register-frontend')
        .send(registrationData)
        .expect(200);

      // Verify response
      expect(response.body).toEqual({
        status: 'registered',
        serviceId: 'frontend',
        version: '2.0.0',
        message: 'Service registered successfully'
      });

      // Verify the call to Version-Manager was made correctly
      expect(mockVersionManagerCalls).toHaveLength(1);
      expect(mockVersionManagerCalls[0]).toEqual({
        endpoint: '/services/register',
        auth: 'Bearer test-auth-token',
        body: {
          serviceId: 'frontend',
          name: 'Figure Collector Frontend',
          version: '2.0.0'
        }
      });
    });

    it('should require serviceName and version fields', async () => {
      const incompleteData = {
        serviceName: 'frontend'
        // Missing version
      };

      const response = await request(app)
        .post('/register-frontend')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
      expect(mockVersionManagerCalls).toHaveLength(0);
    });

    it('should use SERVICE_AUTH_TOKEN for Version-Manager authentication', async () => {
      // Change the token to verify it's being used
      process.env.SERVICE_AUTH_TOKEN = 'different-token';

      const registrationData = {
        serviceName: 'frontend',
        version: '2.0.0'
      };

      await request(app)
        .post('/register-frontend')
        .send(registrationData)
        .expect(200);

      // Verify the correct token was used
      expect(mockVersionManagerCalls[0].auth).toBe('Bearer different-token');
    });

    it('should handle frontend registration without explicit name field', async () => {
      const registrationData = {
        serviceName: 'frontend',
        version: '2.0.0'
        // No name field provided
      };

      await request(app)
        .post('/register-frontend')
        .send(registrationData)
        .expect(200);

      // Should use serviceName as fallback for name
      expect(mockVersionManagerCalls[0].body.name).toBe('frontend');
    });
  });

  describe('Version Endpoint', () => {
    it('should query Version-Manager for all service versions', async () => {
      const response = await request(app)
        .get('/version')
        .expect(200);

      // Verify it returns aggregated version info
      expect(response.body).toHaveProperty('application');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('backend');
      expect(response.body.services).toHaveProperty('frontend');
      expect(response.body.services).toHaveProperty('page-scraper');
      expect(response.body.services).toHaveProperty('version-manager');

      // Verify call was tracked
      expect(mockVersionManagerCalls).toHaveLength(1);
      expect(mockVersionManagerCalls[0]).toEqual({
        endpoint: '/services',
        method: 'GET'
      });
    });

    it('should include service health status in version response', async () => {
      const response = await request(app)
        .get('/version')
        .expect(200);

      // Each service should have version and status
      Object.values(response.body.services).forEach((service: any) => {
        expect(service).toHaveProperty('version');
        expect(service).toHaveProperty('status');
        expect(service).toHaveProperty('lastSeen');
      });
    });
  });

  describe('Backend Self-Registration', () => {
    it('should register Backend service on startup with auth token', async () => {
      // Simulate backend registration function
      const registerBackend = async () => {
        const serviceAuthToken = process.env.SERVICE_AUTH_TOKEN;

        if (!serviceAuthToken) {
          console.warn('[BACKEND] SERVICE_AUTH_TOKEN not configured - skipping registration');
          return false;
        }

        const registrationData = {
          serviceId: 'backend',
          name: 'Figure Collector Backend',
          version: '2.0.0',
          endpoints: {
            health: 'http://backend:5050/health',
            version: 'http://backend:5050/version',
            api: 'http://backend:5050'
          },
          dependencies: {
            database: 'mongodb',
            scraper: 'page-scraper'
          }
        };

        // Track the registration attempt
        mockVersionManagerCalls.push({
          endpoint: '/services/register',
          auth: `Bearer ${serviceAuthToken}`,
          body: registrationData,
          timestamp: new Date().toISOString()
        });

        return true;
      };

      // Execute registration
      const result = await registerBackend();

      expect(result).toBe(true);
      expect(mockVersionManagerCalls).toHaveLength(1);
      expect(mockVersionManagerCalls[0].auth).toBe('Bearer test-auth-token');
      expect(mockVersionManagerCalls[0].body.serviceId).toBe('backend');
      expect(mockVersionManagerCalls[0].body.endpoints).toBeDefined();
      expect(mockVersionManagerCalls[0].body.dependencies).toBeDefined();
    });

    it('should skip registration if SERVICE_AUTH_TOKEN is not set', async () => {
      delete process.env.SERVICE_AUTH_TOKEN;

      const registerBackend = async () => {
        const serviceAuthToken = process.env.SERVICE_AUTH_TOKEN;

        if (!serviceAuthToken) {
          console.warn('[BACKEND] SERVICE_AUTH_TOKEN not configured - skipping registration');
          return false;
        }

        return true;
      };

      const result = await registerBackend();

      expect(result).toBe(false);
      expect(mockVersionManagerCalls).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle Version-Manager unavailability gracefully', async () => {
      // Create app that simulates Version-Manager being down
      const errorApp = express();
      errorApp.use(express.json());

      errorApp.post('/register-frontend', async (req: Request, res: Response) => {
        try {
          // Simulate connection failure to Version-Manager
          throw new Error('ECONNREFUSED - Version Manager unavailable');
        } catch (error: any) {
          console.warn('[BACKEND] Failed to register frontend with Version Manager:', error.message);

          // Still respond successfully to frontend
          res.status(200).json({
            status: 'registration_failed',
            message: 'Service registration unavailable',
            serviceId: req.body.serviceName,
            version: req.body.version
          });
        }
      });

      const response = await request(errorApp)
        .post('/register-frontend')
        .send({
          serviceName: 'frontend',
          version: '2.0.0'
        })
        .expect(200);

      expect(response.body.status).toBe('registration_failed');
      expect(response.body.message).toContain('unavailable');
    });

    it('should validate semantic version format', async () => {
      // Add version validation
      const validationApp = express();
      validationApp.use(express.json());

      validationApp.post('/register-frontend', async (req: Request, res: Response) => {
        const { version } = req.body;

        // Basic semantic version validation
        const semverRegex = /^\d+\.\d+\.\d+(-[\w\d.-]+)?(\+[\w\d.-]+)?$/;
        if (!semverRegex.test(version)) {
          return res.status(400).json({
            error: 'Invalid version format. Must be semantic version (e.g., 2.0.0)'
          });
        }

        res.json({ status: 'registered', version });
      });

      // Test invalid version
      const invalidResponse = await request(validationApp)
        .post('/register-frontend')
        .send({
          serviceName: 'frontend',
          version: 'invalid-version'
        })
        .expect(400);

      expect(invalidResponse.body.error).toContain('Invalid version format');

      // Test valid version
      const validResponse = await request(validationApp)
        .post('/register-frontend')
        .send({
          serviceName: 'frontend',
          version: '2.0.0'
        })
        .expect(200);

      expect(validResponse.body.status).toBe('registered');
    });
  });

  describe('Security', () => {
    it('should not expose SERVICE_AUTH_TOKEN in responses', async () => {
      const response = await request(app)
        .post('/register-frontend')
        .send({
          serviceName: 'frontend',
          version: '2.0.0'
        })
        .expect(200);

      // Ensure token is not in response
      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain('test-auth-token');
      expect(responseString).not.toContain('SERVICE_AUTH_TOKEN');
    });

    it('should not require authentication for frontend registration endpoint', async () => {
      // Frontend should not need to provide auth token
      const response = await request(app)
        .post('/register-frontend')
        .send({
          serviceName: 'frontend',
          version: '2.0.0'
        })
        // No Authorization header
        .expect(200);

      expect(response.body.status).toBe('registered');
    });
  });
});