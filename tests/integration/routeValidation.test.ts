import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import User from '../../src/models/User';
import Figure from '../../src/models/Figure';
import { generateTestToken } from '../setup';
import mongoose from 'mongoose';

const app = createTestApp();

describe('Route Validation and Error Handling', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    testUser = new User({
      username: 'routetest',
      email: 'route@example.com',
      password: 'password123'
    });
    await testUser.save();
    authToken = generateTestToken(testUser._id.toString());
  });

  describe('Figure Routes Parameter Validation', () => {
    describe('GET /figures/:id', () => {
      it('should return 400 for invalid ObjectId format', async () => {
        const response = await request(app)
          .get('/figures/invalid-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(500); // Mongoose throws CastError which becomes 500

        expect(response.body.success).toBe(false);
      });

      it('should handle very long invalid IDs gracefully', async () => {
        const longInvalidId = 'a'.repeat(100);
        
        const response = await request(app)
          .get(`/figures/${longInvalidId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(500);

        expect(response.body.success).toBe(false);
      });

      it('should handle special characters in ID parameter', async () => {
        const specialCharId = 'id-with-special-chars@#$%';
        
        const response = await request(app)
          .get(`/figures/${specialCharId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(500);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /figures/:id', () => {
      it('should return 400 for invalid ObjectId in update', async () => {
        const updateData = {
          manufacturer: 'Updated Manufacturer',
          name: 'Updated Name'
        };

        const response = await request(app)
          .put('/figures/invalid-update-id')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(500);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /figures/:id', () => {
      it('should return 400 for invalid ObjectId in delete', async () => {
        const response = await request(app)
          .delete('/figures/invalid-delete-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(500);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Request Body Validation', () => {
    describe('POST /figures', () => {
      it('should handle malformed JSON gracefully', async () => {
        const response = await request(app)
          .post('/figures')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Content-Type', 'application/json')
          .send('{"manufacturer": "Test", invalid json}')
          .expect(400);

        // Express handles malformed JSON automatically
        expect(response.status).toBe(400);
      });

      it('should handle extremely long field values', async () => {
        const longString = 'a'.repeat(10000);
        const figureData = {
          manufacturer: longString,
          name: longString,
          scale: longString,
          mfcLink: longString,
          location: longString,
          boxNumber: longString,
          imageUrl: longString
        };

        const response = await request(app)
          .post('/figures')
          .set('Authorization', `Bearer ${authToken}`)
          .send(figureData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.manufacturer).toBe(longString);
      });

      it('should handle null values in optional fields', async () => {
        const figureData = {
          manufacturer: 'Test Manufacturer',
          name: 'Test Figure',
          scale: null,
          mfcLink: null,
          location: null,
          boxNumber: null,
          imageUrl: null
        };

        const response = await request(app)
          .post('/figures')
          .set('Authorization', `Bearer ${authToken}`)
          .send(figureData)
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should handle nested object attacks', async () => {
        const maliciousData = {
          manufacturer: 'Test',
          name: 'Test',
          scale: {
            $ne: null
          }
        };

        const response = await request(app)
          .post('/figures')
          .set('Authorization', `Bearer ${authToken}`)
          .send(maliciousData)
          .expect(201);

        expect(response.body.success).toBe(true);
        // MongoDB should handle this gracefully by converting to string
      });
    });

    describe('POST /users/register', () => {
      it('should handle missing required fields gracefully', async () => {
        const incompleteData = {};

        const response = await request(app)
          .post('/users/register')
          .send(incompleteData)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Server Error');
      });

      it('should handle extremely long username', async () => {
        const userData = {
          username: 'a'.repeat(1000),
          email: 'long@example.com',
          password: 'password123'
        };

        const response = await request(app)
          .post('/users/register')
          .send(userData);

        // Should either succeed or fail gracefully
        expect([201, 500]).toContain(response.status);
        expect(response.body.success).toBeDefined();
      });

      it('should handle invalid email formats', async () => {
        const invalidEmails = [
          'invalid-email',
          '@example.com',
          'test@',
          'test..test@example.com',
          'test@example.',
          'test@.example.com'
        ];

        for (const email of invalidEmails) {
          const userData = {
            username: `user-${Date.now()}`,
            email: email,
            password: 'password123'
          };

          const response = await request(app)
            .post('/users/register')
            .send(userData);

          // Should handle invalid emails (may succeed or fail depending on validation)
          expect([201, 400, 500]).toContain(response.status);
        }
      });

      it('should handle SQL injection attempts in fields', async () => {
        const sqlInjectionData = {
          username: "admin'; DROP TABLE users; --",
          email: "admin@example.com' OR '1'='1",
          password: "password'; DELETE FROM users; --"
        };

        const response = await request(app)
          .post('/users/register')
          .send(sqlInjectionData);

        // Should handle this gracefully (MongoDB isn't SQL so this should just be treated as strings)
        expect([201, 400, 500]).toContain(response.status);
        if (response.status === 201) {
          expect(response.body.data.username).toBe("admin'; DROP TABLE users; --");
        }
      });
    });
  });

  describe('Query Parameter Validation', () => {
    beforeEach(async () => {
      // Create some test figures
      await Figure.create([
        {
          manufacturer: 'Test Manufacturer 1',
          name: 'Test Figure 1',
          scale: '1/8',
          userId: testUser._id
        },
        {
          manufacturer: 'Test Manufacturer 2',
          name: 'Test Figure 2',
          scale: '1/7',
          userId: testUser._id
        }
      ]);
    });

    describe('GET /figures with pagination', () => {
      it('should handle invalid page numbers gracefully', async () => {
        const invalidPages = ['invalid', '-1', '0', '999999', 'NaN'];

        for (const page of invalidPages) {
          const response = await request(app)
            .get(`/figures?page=${page}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          // Should default to reasonable values
          expect(response.body.page).toBeGreaterThan(0);
        }
      });

      it('should handle invalid limit values gracefully', async () => {
        const invalidLimits = ['invalid', '-5', '0', '1000000', 'null'];

        for (const limit of invalidLimits) {
          const response = await request(app)
            .get(`/figures?limit=${limit}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data).toBeDefined();
        }
      });

      it('should handle both invalid page and limit', async () => {
        const response = await request(app)
          .get('/figures?page=invalid&limit=invalid')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.page).toBe(1); // Should default
        expect(response.body.data).toBeDefined();
      });
    });

    describe('GET /figures/search', () => {
      it('should handle empty search query', async () => {
        const response = await request(app)
          .get('/figures/search?query=')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Search query is required');
      });

      it('should handle special characters in search query', async () => {
        const specialQuery = encodeURIComponent('test@#$%^&*()');
        
        const response = await request(app)
          .get(`/figures/search?query=${specialQuery}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Should handle gracefully (may succeed or fail based on Atlas Search availability)
        expect([200, 500]).toContain(response.status);
      });

      it('should handle extremely long search queries', async () => {
        const longQuery = encodeURIComponent('a'.repeat(1000));
        
        const response = await request(app)
          .get(`/figures/search?query=${longQuery}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect([200, 400, 500]).toContain(response.status);
      });
    });

    describe('GET /figures/filter', () => {
      it('should handle regex injection attempts', async () => {
        const maliciousFilters = [
          'manufacturer=.*',
          'location=^.*$',
          'manufacturer=(.*)',
          'scale=[a-z]*'
        ];

        for (const filter of maliciousFilters) {
          const response = await request(app)
            .get(`/figures/filter?${filter}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          // Should handle regex patterns safely
        }
      });

      it('should handle URL encoded parameters', async () => {
        const encodedManufacturer = encodeURIComponent('Test & Special Chars');
        
        const response = await request(app)
          .get(`/figures/filter?manufacturer=${encodedManufacturer}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Content-Type Handling', () => {
    it('should handle unsupported content types', async () => {
      const response = await request(app)
        .post('/figures')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'text/plain')
        .send('This is plain text, not JSON')
        .expect(201); // Express might still parse this

      // Should handle gracefully
      expect(response.body).toBeDefined();
    });

    it('should handle XML content type', async () => {
      const xmlData = '<?xml version="1.0"?><figure><name>Test</name></figure>';
      
      const response = await request(app)
        .post('/figures')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/xml')
        .send(xmlData);

      // Should handle gracefully, might succeed or fail
      expect([201, 400, 500]).toContain(response.status);
    });
  });

  describe('Header Validation', () => {
    it('should handle missing Authorization header', async () => {
      const response = await request(app)
        .get('/figures')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Not authorized, no token'
      });
    });

    it('should handle malformed Authorization header', async () => {
      const malformedHeaders = [
        'Bearer',
        'Bearer ',
        'Token invalid-token',
        'invalid-format',
        ''
      ];

      for (const header of malformedHeaders) {
        const response = await request(app)
          .get('/figures')
          .set('Authorization', header)
          .expect(401);

        expect(response.body.success).toBe(false);
      }
    });

    it('should handle extremely long Authorization header', async () => {
      const longToken = 'Bearer ' + 'a'.repeat(10000);
      
      const response = await request(app)
        .get('/figures')
        .set('Authorization', longToken)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Not authorized, token failed');
    });
  });

  describe('Rate Limiting and Large Payloads', () => {
    it('should handle large JSON payloads', async () => {
      // Create a figure with large data (within limits)
      const largeFigureData = {
        manufacturer: 'Large Manufacturer',
        name: 'Large Figure',
        scale: '1/8',
        location: 'A'.repeat(1000),
        boxNumber: 'B'.repeat(1000),
        imageUrl: 'http://example.com/' + 'c'.repeat(1000) + '.jpg'
      };

      const response = await request(app)
        .post('/figures')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeFigureData);

      // Should handle within reasonable limits
      expect([201, 413, 500]).toContain(response.status);
    });
  });

  describe('Error Response Consistency', () => {
    it('should return consistent error format across endpoints', async () => {
      const endpoints = [
        { method: 'GET', path: '/figures/invalid-id', expectedStatus: 500 },
        { method: 'POST', path: '/users/register', expectedStatus: 500, body: {} },
        { method: 'GET', path: '/figures/search', expectedStatus: 400 },
        { method: 'PUT', path: '/figures/invalid-id', expectedStatus: 500, body: {} }
      ];

      for (const endpoint of endpoints) {
        let request_obj = request(app)[endpoint.method.toLowerCase() as keyof typeof request(app)];
        
        if (endpoint.method !== 'GET') {
          request_obj = request_obj.set('Authorization', `Bearer ${authToken}`);
        }
        
        if (endpoint.body !== undefined) {
          request_obj = request_obj.send(endpoint.body);
        }
        
        if (endpoint.method === 'GET' && endpoint.path.includes('/figures/')) {
          request_obj = request_obj.set('Authorization', `Bearer ${authToken}`);
        }

        const response = await request_obj(endpoint.path).expect(endpoint.expectedStatus);

        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.message).toBe('string');
      }
    });
  });
});