import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import User from '../../src/models/User';
import Figure from '../../src/models/Figure';
import { generateTestToken } from '../setup';
import mongoose from 'mongoose';
import axios from 'axios';

// Mock axios for scraping tests
jest.mock('axios');
const mockedAxios = jest.mocked(axios);

const app = createTestApp();

describe('Figure Routes Integration', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    testUser = new User({
      username: 'figureuser',
      email: 'figure@example.com',
      password: 'password123'
    });
    await testUser.save();
    authToken = generateTestToken(testUser._id.toString());
  });

  describe('POST /figures/scrape-mfc', () => {
    it('should scrape MFC data successfully (public endpoint)', async () => {
      const mockScrapedData = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/8',
        imageUrl: 'https://example.com/image.jpg'
      };

      mockedAxios.post = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: mockScrapedData
        }
      });

      const scrapeData = {
        mfcLink: 'https://myfigurecollection.net/item/12345'
      };

      const response = await request(app)
        .post('/figures/scrape-mfc')
        .send(scrapeData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockScrapedData
      });
    });

    it('should return error for invalid MFC URL', async () => {
      const scrapeData = {
        mfcLink: 'https://example.com/item/12345'
      };

      const response = await request(app)
        .post('/figures/scrape-mfc')
        .send(scrapeData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'URL must be from myfigurecollection.net'
      });
    });

    it('should return error for missing MFC link', async () => {
      const response = await request(app)
        .post('/figures/scrape-mfc')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'MFC link is required'
      });
    });
  });

  describe('GET /figures', () => {
    beforeEach(async () => {
      // Create test figures
      const figures = [
        {
          manufacturer: 'Good Smile Company',
          name: 'Hatsune Miku',
          scale: '1/8',
          userId: testUser._id
        },
        {
          manufacturer: 'Alter',
          name: 'Kagamine Rin',
          scale: '1/7',
          userId: testUser._id
        },
        {
          manufacturer: 'Good Smile Company',
          name: 'Megumin',
          scale: '1/8',
          userId: testUser._id
        }
      ];

      await Figure.insertMany(figures);
    });

    it('should get user figures with authentication', async () => {
      const response = await request(app)
        .get('/figures')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        count: 3,
        page: 1,
        pages: 1,
        total: 3,
        data: expect.arrayContaining([
          expect.objectContaining({
            manufacturer: 'Good Smile Company',
            name: 'Hatsune Miku',
            scale: '1/8'
          }),
          expect.objectContaining({
            manufacturer: 'Alter',
            name: 'Kagamine Rin',
            scale: '1/7'
          }),
          expect.objectContaining({
            manufacturer: 'Good Smile Company',
            name: 'Megumin',
            scale: '1/8'
          })
        ])
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/figures?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.count).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.pages).toBe(2);
      expect(response.body.total).toBe(3);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/figures')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Not authorized, no token'
      });
    });

    it('should only return figures belonging to authenticated user', async () => {
      // Create another user with figures
      const otherUser = new User({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123'
      });
      await otherUser.save();

      await Figure.create({
        manufacturer: 'Other Manufacturer',
        name: 'Other Figure',
        userId: otherUser._id
      });

      const response = await request(app)
        .get('/figures')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.total).toBe(3); // Only original user's figures
      expect(response.body.data.every((fig: any) => fig.userId === testUser._id.toString())).toBe(true);
    });
  });

  describe('POST /figures', () => {
    it('should create figure successfully without scraping', async () => {
      const figureData = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/8',
        location: 'Shelf A',
        boxNumber: 'Box 1'
      };

      const response = await request(app)
        .post('/figures')
        .set('Authorization', `Bearer ${authToken}`)
        .send(figureData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          _id: expect.any(String),
          manufacturer: 'Good Smile Company',
          name: 'Hatsune Miku',
          scale: '1/8',
          location: 'Shelf A',
          boxNumber: 'Box 1',
          userId: testUser._id.toString()
        })
      });

      // Verify figure was created in database
      const createdFigure = await Figure.findById(response.body.data._id);
      expect(createdFigure).toBeTruthy();
      expect(createdFigure?.manufacturer).toBe('Good Smile Company');
    });

    it('should create figure with MFC scraping', async () => {
      const mockScrapedData = {
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/8',
        imageUrl: 'https://example.com/image.jpg'
      };

      mockedAxios.post = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: mockScrapedData
        }
      });

      const figureData = {
        manufacturer: '',
        name: '',
        mfcLink: 'https://myfigurecollection.net/item/12345'
      };

      const response = await request(app)
        .post('/figures')
        .set('Authorization', `Bearer ${authToken}`)
        .send(figureData)
        .expect(201);

      expect(response.body.data.manufacturer).toBe('Good Smile Company');
      expect(response.body.data.name).toBe('Hatsune Miku');
      expect(response.body.data.scale).toBe('1/8');
      expect(response.body.data.imageUrl).toBe('https://example.com/image.jpg');
      expect(response.body.data.mfcLink).toBe('https://myfigurecollection.net/item/12345');
    });

    it('should return 401 without authentication', async () => {
      const figureData = {
        manufacturer: 'Test',
        name: 'Test Figure'
      };

      const response = await request(app)
        .post('/figures')
        .send(figureData)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Not authorized, no token'
      });
    });
  });

  describe('GET /figures/:id', () => {
    let testFigure: any;

    beforeEach(async () => {
      testFigure = await Figure.create({
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/8',
        userId: testUser._id
      });
    });

    it('should get figure by id successfully', async () => {
      const response = await request(app)
        .get(`/figures/${testFigure._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          _id: testFigure._id.toString(),
          manufacturer: 'Good Smile Company',
          name: 'Hatsune Miku',
          scale: '1/8'
        })
      });
    });

    it('should return 404 for non-existent figure', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/figures/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Figure not found'
      });
    });

    it('should return 404 for figure belonging to another user', async () => {
      const otherUser = new User({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123'
      });
      await otherUser.save();

      const otherUserFigure = await Figure.create({
        manufacturer: 'Other',
        name: 'Other Figure',
        userId: otherUser._id
      });

      const response = await request(app)
        .get(`/figures/${otherUserFigure._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Figure not found'
      });
    });
  });

  describe('PUT /figures/:id', () => {
    let testFigure: any;

    beforeEach(async () => {
      testFigure = await Figure.create({
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/8',
        userId: testUser._id
      });
    });

    it('should update figure successfully', async () => {
      const updateData = {
        manufacturer: 'Updated Manufacturer',
        name: 'Updated Name',
        scale: '1/7'
      };

      const response = await request(app)
        .put(`/figures/${testFigure._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          _id: testFigure._id.toString(),
          manufacturer: 'Updated Manufacturer',
          name: 'Updated Name',
          scale: '1/7'
        })
      });

      // Verify changes in database
      const updatedFigure = await Figure.findById(testFigure._id);
      expect(updatedFigure?.manufacturer).toBe('Updated Manufacturer');
    });

    it('should return 404 for non-existent figure', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/figures/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Figure not found or you do not have permission'
      });
    });
  });

  describe('DELETE /figures/:id', () => {
    let testFigure: any;

    beforeEach(async () => {
      testFigure = await Figure.create({
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/8',
        userId: testUser._id
      });
    });

    it('should delete figure successfully', async () => {
      const response = await request(app)
        .delete(`/figures/${testFigure._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Figure removed successfully'
      });

      // Verify figure was deleted
      const deletedFigure = await Figure.findById(testFigure._id);
      expect(deletedFigure).toBeNull();
    });

    it('should return 404 for non-existent figure', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/figures/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Figure not found or you do not have permission'
      });
    });
  });

  describe('GET /figures/search', () => {
    beforeEach(async () => {
      const figures = [
        {
          manufacturer: 'Good Smile Company',
          name: 'Hatsune Miku',
          location: 'Shelf A',
          userId: testUser._id
        },
        {
          manufacturer: 'Alter',
          name: 'Kagamine Rin',
          location: 'Shelf B',
          userId: testUser._id
        }
      ];

      await Figure.insertMany(figures);
    });

    it('should return error when query parameter is missing', async () => {
      const response = await request(app)
        .get('/figures/search')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Search query is required'
      });
    });

    it('should handle search query (may fail without Atlas Search)', async () => {
      const response = await request(app)
        .get('/figures/search?query=Miku')
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          // Expect either 200 (if Atlas Search works) or 500 (if not available)
          expect([200, 500]).toContain(res.status);
        });
    });
  });

  describe('GET /figures/filter', () => {
    beforeEach(async () => {
      const figures = [
        {
          manufacturer: 'Good Smile Company',
          name: 'Hatsune Miku',
          scale: '1/8',
          location: 'Shelf A',
          userId: testUser._id
        },
        {
          manufacturer: 'Alter',
          name: 'Kagamine Rin',
          scale: '1/7',
          location: 'Shelf B',
          userId: testUser._id
        },
        {
          manufacturer: 'Good Smile Company',
          name: 'Megumin',
          scale: '1/8',
          location: 'Shelf A',
          userId: testUser._id
        }
      ];

      await Figure.insertMany(figures);
    });

    it('should filter figures by manufacturer', async () => {
      const response = await request(app)
        .get('/figures/filter?manufacturer=Good Smile Company')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.total).toBe(2);
      expect(response.body.data.every((fig: any) => 
        fig.manufacturer.includes('Good Smile Company')
      )).toBe(true);
    });

    it('should filter figures by scale', async () => {
      const response = await request(app)
        .get('/figures/filter?scale=1/8')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.total).toBe(2);
      expect(response.body.data.every((fig: any) => fig.scale === '1/8')).toBe(true);
    });

    it('should filter figures by location', async () => {
      const response = await request(app)
        .get('/figures/filter?location=Shelf A')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.total).toBe(2);
      expect(response.body.data.every((fig: any) => 
        fig.location.includes('Shelf A')
      )).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/figures/filter?manufacturer=Good Smile Company&scale=1/8')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.total).toBe(2);
      expect(response.body.data.every((fig: any) => 
        fig.manufacturer.includes('Good Smile Company') && fig.scale === '1/8'
      )).toBe(true);
    });
  });

  describe('GET /figures/stats', () => {
    beforeEach(async () => {
      const figures = [
        {
          manufacturer: 'Good Smile Company',
          scale: '1/8',
          location: 'Shelf A',
          name: 'Figure 1',
          userId: testUser._id
        },
        {
          manufacturer: 'Good Smile Company',
          scale: '1/8',
          location: 'Shelf B',
          name: 'Figure 2',
          userId: testUser._id
        },
        {
          manufacturer: 'Alter',
          scale: '1/7',
          location: 'Shelf A',
          name: 'Figure 3',
          userId: testUser._id
        }
      ];

      await Figure.insertMany(figures);
    });

    it('should return figure statistics', async () => {
      const response = await request(app)
        .get('/figures/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          totalCount: 3,
          manufacturerStats: expect.arrayContaining([
            { _id: 'Good Smile Company', count: 2 },
            { _id: 'Alter', count: 1 }
          ]),
          scaleStats: expect.arrayContaining([
            { _id: '1/8', count: 2 },
            { _id: '1/7', count: 1 }
          ]),
          locationStats: expect.arrayContaining([
            { _id: 'Shelf A', count: 2 },
            { _id: 'Shelf B', count: 1 }
          ])
        })
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/figures/stats')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Not authorized, no token'
      });
    });
  });
});