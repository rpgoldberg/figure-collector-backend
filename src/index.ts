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
import { createLogger } from './utils/logger';

const logger = createLogger('MAIN');
const registerLogger = createLogger('REGISTER');

dotenv.config();

// Initialize Express app
const app = express();
export { app };
const PORT = parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connect to MongoDB
connectDB();


// Routes
app.use('/auth', authRoutes);
app.use('/figures', figureRoutes);
app.use('/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Frontend registration proxy endpoint (Frontend can't hold SERVICE_AUTH_TOKEN)
// This is specifically for frontend only, as it runs in the browser
app.post('/register-frontend', async (req, res) => {
  try {
    const { version, name } = req.body;

    if (!version) {
      return res.status(400).json({ error: 'Version is required' });
    }

    const serviceAuthToken = process.env.SERVICE_AUTH_TOKEN;
    if (!serviceAuthToken) {
      return res.status(503).json({ error: 'Service registration is not configured' });
    }

    const versionManagerUrl = process.env.VERSION_MANAGER_URL || 'http://version-manager:3001';

    const registrationData = {
      serviceId: 'frontend',
      name: name || 'Figure Collector Frontend',
      version: version,
      endpoints: {
        root: 'http://frontend:80',
        static: 'http://frontend:80/static'
      },
      dependencies: {
        backend: '^2.0.0',
        versionManager: '^1.1.0'
      }
    };

    const response = await fetch(`${versionManagerUrl}/services/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceAuthToken}`
      },
      body: JSON.stringify(registrationData)
    });

    if (response.ok) {
      const result = await response.json();
      registerLogger.info(`Successfully registered frontend v${version} with version manager`);
      res.json({ success: true, message: 'Frontend registered successfully', service: result.service });
    } else {
      const error = await response.text();
      registerLogger.error(`Failed to register frontend: ${response.status} - ${error}`);
      res.status(response.status).json({ error: 'Failed to register frontend' });
    }
  } catch (error: any) {
    console.error('[BACKEND] Error registering frontend:', error.message);
    res.status(500).json({ error: 'Failed to register frontend with version manager' });
  }
});


// Version endpoint - queries Version-Manager for registered services (source of truth)
app.get('/version', async (req, res) => {
  try {
    const versionManagerUrl = process.env.VERSION_MANAGER_URL || 'http://version-manager:3001';

    // Step 1: Get application info
    let appInfo = {
      name: "figure-collector-services",
      version: "unknown",
      releaseDate: "unknown"
    };

    try {
      const appResponse = await fetch(`${versionManagerUrl}/app-version`);
      if (appResponse.ok) {
        const appData = await appResponse.json();
        appInfo = {
          name: appData.name || "figure-collector-services",
          version: appData.version || "unknown",
          releaseDate: appData.releaseDate || "unknown"
        };
      }
    } catch (error: any) {
      console.warn('[VERSION] Could not fetch app version:', error.message);
    }

    // Step 2: Get all registered services from Version-Manager (source of truth)
    let registeredServices: any = {};
    try {
      const servicesResponse = await fetch(`${versionManagerUrl}/services`);
      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json();
        // Convert array to object keyed by service id
        if (servicesData.services && Array.isArray(servicesData.services)) {
          servicesData.services.forEach((service: any) => {
            registeredServices[service.id] = {
              name: service.name,
              version: service.version,
              status: service.status || 'registered',
              lastSeen: service.registeredAt || service.lastUpdated
            };
          });
        }
      }
    } catch (error: any) {
      console.warn('[VERSION] Could not fetch registered services:', error.message);
    }

    // Step 3: Build response with registered versions (source of truth)
    const versionInfo: any = {
      application: appInfo,
      services: {
        backend: registeredServices['backend'] || {
          name: "figure-collector-backend",
          version: packageJson.version, // Fallback to our own version if not registered
          status: "not-registered"
        },
        frontend: registeredServices['frontend'] || {
          name: "figure-collector-frontend",
          version: "unknown",
          status: "not-registered"
        },
        scraper: registeredServices['page-scraper'] || registeredServices['scraper'] || {
          name: "page-scraper",
          version: "unknown",
          status: "not-registered"
        },
        versionManager: registeredServices['version-manager'] || {
          name: "figure-collector-version-manager",
          version: "unknown",
          status: "not-registered"
        }
      }
    };

    // Step 4: Validate the combination of registered versions
    const backend = versionInfo.services.backend?.version;
    const frontend = versionInfo.services.frontend?.version;
    const scraper = versionInfo.services.scraper?.version;

    if (backend !== 'unknown' && frontend !== 'unknown' && scraper !== 'unknown') {
      try {
        const validationUrl = `${versionManagerUrl}/validate-versions?backend=${backend}&frontend=${frontend}&scraper=${scraper}`;
        const validationResponse = await fetch(validationUrl);

        if (validationResponse.ok) {
          const validationData = await validationResponse.json();
          versionInfo.compatibility = {
            status: validationData.status, // 'tested', 'compatible', 'warning', 'invalid'
            valid: validationData.valid,
            message: validationData.message,
            verified: validationData.verified
          };
        }
      } catch (error: any) {
        console.warn('[VERSION] Could not validate version combination:', error.message);
      }
    } else {
      // If services aren't registered, mark as invalid
      versionInfo.compatibility = {
        status: 'invalid',
        valid: false,
        message: 'Not all services have registered their versions',
        missingRegistrations: Object.entries(versionInfo.services)
          .filter(([_, service]: [string, any]) => service.version === 'unknown')
          .map(([name]) => name)
      };
    }

    res.json(versionInfo);
  } catch (error: any) {
    console.error('[VERSION] Error in version endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch version information' });
  }
});

// Global error handling middleware (after all routes)
app.use(globalErrorHandler);

// Catch-all for unhandled routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Function to register with Version Manager
const registerWithVersionManager = async () => {
  const versionManagerUrl = process.env.VERSION_MANAGER_URL || 'http://version-manager:3001';

  const registrationData = {
    serviceId: 'backend',
    name: 'Figure Collector Backend',
    version: packageJson.version,
    endpoints: {
      health: `http://backend:${PORT}/health`,
      version: `http://backend:${PORT}/version`,
      api: `http://backend:${PORT}`
    },
    dependencies: {
      database: 'mongodb',
      scraper: 'page-scraper'
    }
  };

  try {
    const serviceAuthToken = process.env.SERVICE_AUTH_TOKEN;
    if (!serviceAuthToken) {
      console.warn('[BACKEND] SERVICE_AUTH_TOKEN not configured - skipping registration');
      return;
    }

    const response = await fetch(`${versionManagerUrl}/services/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceAuthToken}`
      },
      body: JSON.stringify(registrationData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`[BACKEND] Successfully registered with version manager:`, result.service);
    } else {
      const error = await response.text();
      console.warn(`[BACKEND] Failed to register with version manager: ${response.status} - ${error}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`[BACKEND] Version manager registration failed:`, errorMessage);
    console.warn(`[BACKEND] Service will continue without version manager registration`);
  }
};

// Start the server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Register with version manager after server starts
  console.log('[BACKEND] Attempting to register with version manager...');
  await registerWithVersionManager();
});
