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
      const versionServiceUrl = process.env.VERSION_SERVICE_URL || 'http://version-service:3020';
      const appVersionResponse = await fetch(`${versionServiceUrl}/app-version`);
      
      if (appVersionResponse.ok) {
        const appVersionData = await appVersionResponse.json();
        appInfo = {
          name: appVersionData.name || "figure-collector-services",
          version: appVersionData.version || "unknown",
          releaseDate: appVersionData.releaseDate || "unknown"
        };
      }
    } catch (error) {
      console.warn('Could not fetch app version from infra service:', error.message);
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
      const frontendUrl = process.env.FRONTEND_URL || `http://${process.env.BACKEND_HOST || 'frontend'}:${process.env.FRONTEND_PORT || 3000}`;
      const frontendResponse = await fetch(`${frontendUrl}/frontend-version`);
      
      if (frontendResponse.ok) {
        const frontendVersion = await frontendResponse.json();
        versionInfo.services.frontend = {
          name: "figure-collector-frontend",
          version: frontendVersion.version || "unknown",
          status: "ok"
        };
      } else {
        versionInfo.services.frontend.status = "unreachable";
      }
    } catch (error) {
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
    } catch (error) {
      versionInfo.services.scraper = {
        name: "page-scraper",
        version: "unknown", 
        status: "error"
      };
    }

    res.json(versionInfo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch version information' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
