import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import User from '../../src/models/User';
import Figure from '../../src/models/Figure';
import { generateTestToken } from '../setup';
import mongoose from 'mongoose';

const app = createTestApp();

describe('Performance and Stress Tests', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    testUser = new User({
      username: 'perfuser',
      email: 'perf@example.com',
      password: 'password123'
    });
    await testUser.save();
    authToken = generateTestToken(testUser._id.toString());
  });

  describe('Database Performance Tests', () => {
    it('should handle bulk figure creation efficiently', async () => {
      if (mongoose.connection.readyState !== 1) {
        console.log('Skipping performance test - no database connection');
        return;
      }

      const figureCount = 100;
      const figures = [];
      
      for (let i = 0; i < figureCount; i++) {
        figures.push({
          manufacturer: `Manufacturer ${i % 10}`,
          name: `Figure ${i}`,
          scale: i % 3 === 0 ? '1/8' : i % 3 === 1 ? '1/7' : '1/6',
          location: `Shelf ${String.fromCharCode(65 + (i % 5))}`,
          boxNumber: `Box ${Math.floor(i / 10) + 1}`,
          imageUrl: `https://example.com/image-${i}.jpg`,
          userId: testUser._id
        });
      }

      const startTime = Date.now();
      const createdFigures = await Figure.insertMany(figures);
      const bulkInsertTime = Date.now() - startTime;

      expect(createdFigures).toHaveLength(figureCount);
      expect(bulkInsertTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      console.log(`Bulk inserted ${figureCount} figures in ${bulkInsertTime}ms`);
    });

    it('should handle complex aggregation queries efficiently', async () => {
      if (mongoose.connection.readyState !== 1) {
        console.log('Skipping aggregation performance test - no database connection');
        return;
      }

      // Ensure we have data to aggregate
      const figureCount = 200;
      const figures = [];
      
      for (let i = 0; i < figureCount; i++) {
        figures.push({
          manufacturer: `Manufacturer ${i % 20}`,
          name: `Figure ${i}`,
          scale: i % 4 === 0 ? '1/8' : i % 4 === 1 ? '1/7' : i % 4 === 2 ? '1/6' : '1/10',
          location: `Shelf ${String.fromCharCode(65 + (i % 8))}`,
          userId: testUser._id
        });
      }

      await Figure.insertMany(figures);

      const startTime = Date.now();
      const aggregationResult = await Figure.aggregate([
        { $match: { userId: testUser._id } },
        {
          $group: {
            _id: {
              manufacturer: '$manufacturer',
              scale: '$scale'
            },
            count: { $sum: 1 },
            figures: {
              $push: {
                name: '$name',
                location: '$location'
              }
            }
          }
        },
        { $sort: { count: -1 } },
        {
          $group: {
            _id: '$_id.manufacturer',
            scales: {
              $push: {
                scale: '$_id.scale',
                count: '$count',
                figures: '$figures'
              }
            },
            totalCount: { $sum: '$count' }
          }
        },
        { $sort: { totalCount: -1 } }
      ]);
      const aggregationTime = Date.now() - startTime;

      expect(aggregationResult).toBeDefined();
      expect(aggregationResult.length).toBeGreaterThan(0);
      expect(aggregationTime).toBeLessThan(3000); // Should complete within 3 seconds

      console.log(`Complex aggregation completed in ${aggregationTime}ms`);
    });

    it('should handle concurrent database operations', async () => {
      if (mongoose.connection.readyState !== 1) {
        console.log('Skipping concurrent operations test - no database connection');
        return;
      }

      const concurrentOperations = 50;
      const promises = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentOperations; i++) {
        const figure = {
          manufacturer: `Concurrent Manufacturer ${i}`,
          name: `Concurrent Figure ${i}`,
          scale: '1/8',
          userId: testUser._id
        };

        promises.push(Figure.create(figure));
      }

      const results = await Promise.all(promises);
      const concurrentTime = Date.now() - startTime;

      expect(results).toHaveLength(concurrentOperations);
      expect(results.every(result => result._id)).toBe(true);
      expect(concurrentTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`${concurrentOperations} concurrent operations completed in ${concurrentTime}ms`);
    });
  });

  describe('API Endpoint Performance Tests', () => {
    beforeEach(async () => {
      // Create test data for API performance tests
      const figures = [];
      for (let i = 0; i < 50; i++) {
        figures.push({
          manufacturer: `API Manufacturer 0`,
          name: `API Figure ${i}`,
          scale: '1/8',
          location: `Shelf ${i % 3}`,
          userId: testUser._id
        });
      }
      await Figure.insertMany(figures);
    });

    it('should handle GET /figures with pagination efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/figures?page=1&limit=20')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(20);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second

      console.log(`GET /figures with pagination responded in ${responseTime}ms`);
    });

    it('should handle multiple concurrent GET requests', async () => {
      const concurrentRequests = 20;
      const promises = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/figures')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(concurrentRequests);
      expect(responses.every(response => response.body.success === true)).toBe(true);
      expect(totalTime).toBeLessThan(5000); // All requests should complete within 5 seconds

      console.log(`${concurrentRequests} concurrent GET requests completed in ${totalTime}ms`);
    });

    it('should handle rapid POST requests efficiently', async () => {
      const requestCount = 20;
      const promises = [];

      const startTime = Date.now();

      for (let i = 0; i < requestCount; i++) {
        const figureData = {
          manufacturer: `Rapid Manufacturer ${i}`,
          name: `Rapid Figure ${i}`,
          scale: '1/8'
        };

        promises.push(
          request(app)
            .post('/figures')
            .set('Authorization', `Bearer ${authToken}`)
            .send(figureData)
            .expect(201)
        );
      }

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(requestCount);
      expect(responses.every(response => response.body.success === true)).toBe(true);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`${requestCount} rapid POST requests completed in ${totalTime}ms`);
    });

    it('should handle filter queries efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/figures/filter?manufacturer=API Manufacturer 0&scale=1/8')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second

      console.log(`Filter query responded in ${responseTime}ms`);
    });

    it('should handle stats calculation efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/figures/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalCount).toBeGreaterThan(0);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds

      console.log(`Stats calculation responded in ${responseTime}ms`);
    });
  });

  describe('Memory and Resource Usage Tests', () => {
    it('should handle large JSON payloads without memory issues', async () => {
      const largeData = {
        manufacturer: 'A'.repeat(1000),
        name: 'B'.repeat(1000),
        scale: '1/8',
        location: 'C'.repeat(1000),
        boxNumber: 'D'.repeat(1000),
        imageUrl: 'http://example.com/' + 'E'.repeat(1000) + '.jpg',
        mfcLink: 'http://myfigurecollection.net/item/' + '1'.repeat(100)
      };

      const response = await request(app)
        .post('/figures')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeData);

      expect([201, 413, 422]).toContain(response.status); // Either succeeds, payload too large, or validation error
      
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.manufacturer).toBe(largeData.manufacturer);
      }
    });

    it('should handle rapid authentication cycles', async () => {
      const cycles = 50;
      const promises = [];

      for (let i = 0; i < cycles; i++) {
        // Simulate authentication followed by a request
        promises.push(
          request(app)
            .get('/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(cycles);
      expect(responses.every(response => response.body.success === true)).toBe(true);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`${cycles} authentication cycles completed in ${totalTime}ms`);
    });
  });

  describe('Error Handling Under Load', () => {
    it('should handle concurrent invalid requests gracefully', async () => {
      const invalidRequests = 30;
      const promises = [];

      for (let i = 0; i < invalidRequests; i++) {
        // Mix of different types of invalid requests
        if (i % 3 === 0) {
          // Invalid token
          promises.push(
            request(app)
              .get('/figures')
              .set('Authorization', 'Bearer invalid-token')
              .expect(401)
          );
        } else if (i % 3 === 1) {
          // Invalid figure ID
          promises.push(
            request(app)
              .get('/figures/invalid-id')
              .set('Authorization', `Bearer ${authToken}`)
              .expect(422) // Updated to match validation middleware
          );
        } else {
          // Invalid figure data
          promises.push(
            request(app)
              .post('/figures')
              .set('Authorization', `Bearer ${authToken}`)
              .send({ invalidField: 'invalid' })
              .expect(422) // Expect validation error for invalid data
          );
        }
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(invalidRequests);
      expect(totalTime).toBeLessThan(5000); // Should handle errors efficiently

      console.log(`${invalidRequests} invalid requests handled in ${totalTime}ms`);
    });

    it('should maintain performance under mixed valid/invalid load', async () => {
      const totalRequests = 40;
      const promises = [];

      const startTime = Date.now();

      for (let i = 0; i < totalRequests; i++) {
        if (i % 4 === 0) {
          // Valid figure creation
          promises.push(
            request(app)
              .post('/figures')
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                manufacturer: `Mixed Manufacturer ${i}`,
                name: `Mixed Figure ${i}`,
                scale: '1/8'
              })
              .expect(201)
          );
        } else if (i % 4 === 1) {
          // Valid figure retrieval
          promises.push(
            request(app)
              .get('/figures')
              .set('Authorization', `Bearer ${authToken}`)
              .expect(200)
          );
        } else if (i % 4 === 2) {
          // Invalid authentication
          promises.push(
            request(app)
              .get('/figures')
              .set('Authorization', 'Bearer invalid')
              .expect(401)
          );
        } else {
          // Invalid figure ID
          promises.push(
            request(app)
              .get('/figures/invalid')
              .set('Authorization', `Bearer ${authToken}`)
              .expect(422) // Updated to match validation middleware
          );
        }
      }

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(totalRequests);
      expect(totalTime).toBeLessThan(8000); // Should handle mixed load efficiently

      console.log(`${totalRequests} mixed valid/invalid requests handled in ${totalTime}ms`);
    });
  });

  describe('Scalability Tests', () => {
    it('should maintain response times as data grows', async () => {
      if (mongoose.connection.readyState !== 1) {
        console.log('Skipping scalability test - no database connection');
        return;
      }

      const dataSizes = [10, 50, 100];
      const responseTimes: number[] = [];

      for (const size of dataSizes) {
        // Clean up previous data
        await Figure.deleteMany({ userId: testUser._id });

        // Create test data
        const figures = [];
        for (let i = 0; i < size; i++) {
          figures.push({
            manufacturer: `Scale Manufacturer ${i % 5}`,
            name: `Scale Figure ${i}`,
            scale: '1/8',
            userId: testUser._id
          });
        }
        await Figure.insertMany(figures);

        // Measure response time
        const startTime = Date.now();
        const response = await request(app)
          .get('/figures')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        const responseTime = Date.now() - startTime;

        responseTimes.push(responseTime);
        expect(response.body.success).toBe(true);
        expect(response.body.total).toBe(size);

        console.log(`Response time for ${size} figures: ${responseTime}ms`);
      }

      // Response times shouldn't grow dramatically
      // (This is a basic check - in practice, you'd want more sophisticated analysis)
      for (let i = 1; i < responseTimes.length; i++) {
        const growthFactor = responseTimes[i] / responseTimes[i - 1];
        expect(growthFactor).toBeLessThan(3); // Response time shouldn't triple
      }
    });
  });
});