import express from 'express';
import cors from 'cors';
import figureRoutes from '../../src/routes/figureRoutes';
import userRoutes from '../../src/routes/userRoutes';
import authRoutes from '../../src/routes/authRoutes';

// Create test app
export const createTestApp = () => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Routes
  app.use('/auth', authRoutes);
  app.use('/figures', figureRoutes);
  app.use('/users', userRoutes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Service registration and version endpoints for integration tests
  let serviceVersions = {
    frontend: {
      name: "figure-collector-frontend",
      version: "unknown",
      status: "not-registered"
    }
  };

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
        return res.json({ success: true, message: 'Service registered successfully' });
      } else {
        return res.status(400).json({ error: 'Only frontend service registration is currently supported' });
      }
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to register service' });
    }
  });

  // Add endpoint to reset service state for test isolation
  app.post('/test-reset-services', (req, res) => {
    serviceVersions = {
      frontend: {
        name: "figure-collector-frontend",
        version: "unknown", 
        status: "not-registered"
      }
    };
    return res.json({ success: true, message: 'Service state reset' });
  });

  app.get('/version', async (req, res) => {
    try {
      const versionInfo: any = {
        application: {
          name: "figure-collector-services",
          version: "1.0.0-test",
          releaseDate: "2024-01-01"
        },
        services: {
          backend: {
            name: "figure-collector-backend",
            version: "1.0.0-test",
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

      res.json(versionInfo);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch version information' });
    }
  });

  return app;
};