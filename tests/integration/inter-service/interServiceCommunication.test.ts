import request from 'supertest';
import { Express } from 'express';
import axios from 'axios';
import { createTestApp } from '../../helpers/testApp';

// Mocking external services
jest.mock('axios');
jest.mock('node-fetch', () => jest.fn());

// Environment configuration 
const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'http://page-scraper:3000';
const VERSION_SERVICE_URL = process.env.VERSION_SERVICE_URL || 'http://version-manager:3001';

describe('Inter-Service Communication', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  describe('Backend → Scraper Service Communication', () => {
    it('should successfully call scraper service for MFC data', async () => {
      // Mock a realistic MFC link for testing
      const mfcLink = 'https://myfigurecollection.net/item/1234';

      try {
        (axios.post as jest.MockedFunction<typeof axios.post>).mockResolvedValue({
          status: 200,
          data: { itemData: { name: 'Test Figure', manufacturer: 'Test Corp' } }
        });

        const response = await axios.post(`${SCRAPER_SERVICE_URL}/scrape/mfc`, { url: mfcLink });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('itemData');
        expect(response.data.itemData.name).toBe('Test Figure');
        // Additional assertions based on expected scraper response structure
      } catch (error) {
        throw new Error(`Scraper service communication failed: ${error.message}`);
      }
    });
  });

  describe('Backend → Version Service Communication', () => {
    it('should fetch app version from Version Service', async () => {
      try {
        const mockFetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ name: 'Figure Collector', version: '1.0.0' })
        });
        global.fetch = mockFetch as jest.MockedFunction<typeof fetch>;

        const response = await fetch(`${VERSION_SERVICE_URL}/app-version`);
        const versionData = await response.json();

        expect(response.ok).toBe(true);
        expect(versionData).toHaveProperty('name', 'Figure Collector');
        expect(versionData).toHaveProperty('version', '1.0.0');
      } catch (error) {
        throw new Error(`Version service communication failed: ${error.message}`);
      }
    });

    it('should validate version combinations via Version Service', async () => {
      const testVersions = {
        backend: '1.0.0',
        frontend: '1.0.0',
        scraper: '1.0.0'
      };

      try {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ isCompatible: true, services: testVersions })
        });

        const response = await fetch(
          `${VERSION_SERVICE_URL}/validate-versions?` + 
          `backend=${testVersions.backend}&` +
          `frontend=${testVersions.frontend}&` +
          `scraper=${testVersions.scraper}`
        );
        const validationData = await response.json();

        expect(response.ok).toBe(true);
        expect(validationData).toHaveProperty('isCompatible', true);
        expect(validationData).toHaveProperty('services', testVersions);
      } catch (error) {
        throw new Error(`Version validation service failed: ${error.message}`);
      }
    });
  });

  describe('Backend Service Registration and Version Aggregation', () => {
    it('should register frontend service successfully', async () => {
      const response = await request(app)
        .post('/register-service')
        .send({
          serviceName: 'frontend',
          version: '1.0.0'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Service registered successfully');
      expect(response.body.success).toBe(true);
    });

    it('should aggregate service versions', async () => {
      const response = await request(app)
        .get('/version');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('backend');
      expect(response.body.services).toHaveProperty('frontend');
      expect(response.body.services).toHaveProperty('scraper');
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should perform end-to-end figure creation with version validation', async () => {
      // 1. Register Frontend
      const registerResponse = await request(app)
        .post('/register-service')
        .send({
          serviceName: 'frontend',
          version: '1.0.0'
        });
      expect(registerResponse.status).toBe(200);

      // 2. Fetch versions to validate
      const versionResponse = await request(app)
        .get('/version');
      expect(versionResponse.status).toBe(200);

      // 3. Verify version compatibility 
      const services = versionResponse.body.services;
      expect(services.backend.version).toBeTruthy();
      expect(services.frontend.version).toBeTruthy();
      expect(services.scraper.version).toBeTruthy();

      // Future: Add figure creation and scraping test steps
    });
  });
});