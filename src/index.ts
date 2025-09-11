import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import figureRoutes from './routes/figureRoutes';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import { connectDB } from './config/db';
import { globalErrorHandler } from './middleware/validationMiddleware';
import * as packageJson from '../package.json';

dotenv.config();

// Initialize Express app
const app = express();
export { app };
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connect to MongoDB
connectDB();

// In-memory storage for service versions (could be moved to database if persistence needed)
let serviceVersions = {
  frontend: {
    name: "figure-collector-frontend",
    version: "unknown",
    status: "not-registered"
  }
};

// Routes
app.use('/auth', authRoutes);
app.use('/figures', figureRoutes);
app.use('/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Frontend service registration endpoint
app.post('/register-service', (req, res) => {
  try {
    const { serviceName, version, name } = req.body;
    
    if (!serviceName || version === undefined || version === null) {
      return res.status(400).json({ error: 'serviceName and version are required' });
    }
    
    if (serviceName === 'frontend') {
      serviceVersions.frontend = {
        name: name || "figure-collector-frontend",
        version: version,
        status: "ok"
      };
      console.log(`[REGISTER] Frontend registered: v${version}`);
      res.json({ success: true, message: 'Service registered successfully' });
    } else {
      res.status(400).json({ error: 'Only frontend service registration is currently supported' });
    }
  } catch (error: any) {
    console.error('[REGISTER] Error registering service:', error.message);
    res.status(500).json({ error: 'Failed to register service' });
  }
});

// Version endpoint
app.get('/version', async (req, res) => {
  try {
    // Fetch app info from version manager service
    let appInfo = {
      name: "figure-collector-services",
      version: "unknown",
      releaseDate: "unknown"
    };
    
    try {
      const versionManagerUrl = process.env.VERSION_MANAGER_URL || 'http://version-manager:3001';
      console.log(`[VERSION] Attempting to fetch app version from: ${versionManagerUrl}/app-version`);
      
      const appVersionResponse = await fetch(`${versionManagerUrl}/app-version`);
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
      console.warn(`[VERSION] Could not fetch app version from ${process.env.VERSION_MANAGER_URL || 'http://version-manager:3001'}: ${error.message}`);
    }

    const versionInfo: any = {
      application: appInfo,
      services: {
        backend: {
          name: "figure-collector-backend",
          version: packageJson.version,
          status: "ok"
        },
        frontend: serviceVersions.frontend,
        scraper: {
          name: "page-scraper",
          version: "unknown",
          status: "not-checked"
        }
      }
    };

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

    // Try to validate version combination
    try {
      const backend = versionInfo.services.backend?.version;
      const frontend = versionInfo.services.frontend?.version; 
      const scraper = versionInfo.services.scraper?.version;
      
      if (backend && frontend && scraper && 
          backend !== 'unknown' && frontend !== 'unknown' && scraper !== 'unknown') {
        
        const versionManagerUrl = process.env.VERSION_MANAGER_URL || 'http://version-manager:3001';
        const validationResponse = await fetch(`${versionManagerUrl}/validate-versions?backend=${backend}&frontend=${frontend}&scraper=${scraper}`);
        
        if (validationResponse.ok) {
          const validationData = await validationResponse.json();
          versionInfo.validation = validationData;
        }
      }
    } catch (error: any) {
      console.warn('[VERSION] Could not validate version combination:', error.message);
    }

    res.json(versionInfo);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch version information' });
  }
});

// Global error handling middleware (after all routes)
app.use(globalErrorHandler);

// Catch-all for unhandled routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
