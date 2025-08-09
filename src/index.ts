import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import figureRoutes from './routes/figureRoutes';
import userRoutes from './routes/userRoutes';
import { connectDB } from './config/db';
import * as packageJson from '../package.json';

dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connect to MongoDB
connectDB();

// Routes
app.use('/figures', figureRoutes);
app.use('/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Version endpoint
app.get('/version', async (req, res) => {
  try {
    // Fetch app info from infra version service
    let appInfo = {
      name: "figure-collector-services",
      version: "unknown",
      releaseDate: "unknown"
    };
    
    try {
      const versionServiceUrl = process.env.VERSION_SERVICE_URL || 'http://version-service:3001';
      console.log(`[VERSION] Attempting to fetch app version from: ${versionServiceUrl}/app-version`);
      
      const appVersionResponse = await fetch(`${versionServiceUrl}/app-version`);
      console.log(`[VERSION] Version service response status: ${appVersionResponse.status}`);
      
      if (appVersionResponse.ok) {
        const appVersionData = await appVersionResponse.json();
        console.log(`[VERSION] Version service data:`, appVersionData);
        appInfo = {
          name: appVersionData.name || "figure-collector-services",
          version: appVersionData.version || "unknown",
          releaseDate: appVersionData.releaseDate || "unknown"
        };
      } else {
        console.warn(`[VERSION] Version service returned non-OK status: ${appVersionResponse.status}`);
      }
    } catch (error: any) {
      console.warn(`[VERSION] Could not fetch app version from ${process.env.VERSION_SERVICE_URL || 'http://version-service:3001'}: ${error.message}`);
    }

    const versionInfo: any = {
      application: appInfo,
      services: {
        backend: {
          name: "figure-collector-backend",
          version: packageJson.version,
          status: "ok"
        },
        frontend: {
          name: "figure-collector-frontend", 
          version: "unknown",
          status: "not-checked"
        },
        scraper: {
          name: "page-scraper",
          version: "unknown",
          status: "not-checked"
        }
      }
    };

    // Try to fetch frontend version
    try {
      const frontendUrl = process.env.FRONTEND_URL || `http://${process.env.FRONTEND_HOST || 'figure-collector-frontend'}:${process.env.FRONTEND_PORT || 5051}`;
      console.log(`[VERSION] Attempting to fetch frontend version from: ${frontendUrl}/frontend-version`);
      
      const frontendResponse = await fetch(`${frontendUrl}/frontend-version`);
      console.log(`[VERSION] Frontend response status: ${frontendResponse.status}`);
      
      if (frontendResponse.ok) {
        const frontendVersion = await frontendResponse.json();
        console.log(`[VERSION] Frontend data:`, frontendVersion);
        versionInfo.services.frontend = {
          name: "figure-collector-frontend",
          version: frontendVersion.version || "unknown",
          status: "ok"
        };
      } else {
        console.warn(`[VERSION] Frontend returned non-OK status: ${frontendResponse.status}`);
        versionInfo.services.frontend.status = "unreachable";
      }
    } catch (error: any) {
      console.warn(`[VERSION] Could not fetch frontend version: ${error.message}`);
      versionInfo.services.frontend.status = "error";
    }

    // Try to fetch scraper version
    try {
      const scraperUrl = process.env.SCRAPER_SERVICE_URL || 'http://page-scraper:3000';
      const scraperResponse = await fetch(`${scraperUrl}/version`);
      
      if (scraperResponse.ok) {
        const scraperVersion = await scraperResponse.json();
        versionInfo.services.scraper = {
          name: "page-scraper",
          version: scraperVersion.version || "unknown",
          status: "ok"
        };
      } else {
        versionInfo.services.scraper = {
          name: "page-scraper", 
          version: "unknown",
          status: "unreachable"
        };
      }
    } catch (error: any) {
      versionInfo.services.scraper = {
        name: "page-scraper",
        version: "unknown", 
        status: "error"
      };
    }

    res.json(versionInfo);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch version information' });
  }
});

// Network connectivity test
const testConnectivity = async () => {
  console.log('[NETWORK] Testing connectivity...');
  
  // Test version service
  try {
    const versionServiceUrl = process.env.VERSION_SERVICE_URL || 'http://version-service:3001';
    console.log(`[NETWORK] Testing version service: ${versionServiceUrl}/health`);
    const versionTest = await fetch(`${versionServiceUrl}/health`);
    console.log(`[NETWORK] Version service status: ${versionTest.status}`);
  } catch (error: any) {
    console.log(`[NETWORK] Version service failed: ${error.message}`);
  }
  
  // Test frontend
  try {
    const frontendUrl = `http://${process.env.FRONTEND_HOST || 'figure-collector-frontend'}:${process.env.FRONTEND_PORT || 5051}`;
    console.log(`[NETWORK] Testing frontend: ${frontendUrl}/health`);
    const frontendTest = await fetch(`${frontendUrl}/health`);
    console.log(`[NETWORK] Frontend status: ${frontendTest.status}`);
  } catch (error: any) {
    console.log(`[NETWORK] Frontend failed: ${error.message}`);
  }
  
  // Test scraper (this works, so good baseline)
  try {
    const scraperUrl = process.env.SCRAPER_SERVICE_URL || 'http://page-scraper:3000';
    console.log(`[NETWORK] Testing scraper: ${scraperUrl}/health`);
    const scraperTest = await fetch(`${scraperUrl}/health`);
    console.log(`[NETWORK] Scraper status: ${scraperTest.status}`);
  } catch (error: any) {
    console.log(`[NETWORK] Scraper failed: ${error.message}`);
  }
};

// Start the server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Wait a moment for other services to start, then test connectivity
  setTimeout(testConnectivity, 10000);
});
