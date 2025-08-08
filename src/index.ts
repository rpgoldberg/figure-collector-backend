import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import figureRoutes from './routes/figureRoutes';
import userRoutes from './routes/userRoutes';
import { connectDB } from './config/db';

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
    // TODO: Read version info from version.json (needs to be accessible to backend)
    const versionInfo: any = {
      application: {
        name: "figure-collector-services",
        version: "unknown",
        releaseDate: "unknown"
      },
      services: {
        backend: {
          name: "figure-collector-backend",
          version: "unknown",
          status: "version-unavailable"
        },
        frontend: {
          name: "figure-collector-frontend", 
          version: "unknown"
        },
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
