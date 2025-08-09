# Figure Collector Backend API

Backend API service for the Figure Collector application. Provides endpoints for user authentication, figure management, and acts as the orchestrator for microservices version management.

## Features

- User authentication (register, login, profile)
- Complete figure management (CRUD operations)
- Search functionality with MongoDB Atlas Search
- Filtering and statistics
- Service version orchestration and aggregation
- Frontend service registration endpoint
- Version validation with version-service integration

## Technology Stack

- TypeScript
- Node.js/Express
- MongoDB Atlas
- JWT Authentication

## Version Management Architecture

The backend acts as the central orchestrator for version management:

- **Service Registration**: Provides `/register-service` endpoint for frontend self-registration
- **Version Aggregation**: Collects versions from all services (frontend via registration, scraper via API call)
- **Version Validation**: Integrates with version-service to validate service version combinations
- **Unified API**: Provides single `/version` endpoint with all service information and validation status

## API Endpoints

**Infrastructure Endpoints** (accessed directly via nginx proxy)
- `POST /register-service` - Service registration (used by frontend)
- `GET /version` - Aggregated version info with validation
- `GET /health` - Service health check

**Business Logic APIs** (accessed via `/api` prefix through nginx)
- `/figures/*` - Figure management endpoints
- `/users/*` - User authentication endpoints  
- `/figures/scrape-mfc` - MFC scraping proxy endpoint

Note: The nginx frontend proxy strips `/api` prefix, so backend endpoints don't include `/api` in their paths.

### Environment Variables

**Required:**
- `MONGODB_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: Secret for JWT token signing
- `SCRAPER_SERVICE_URL`: URL to page-scraper service (e.g., `http://page-scraper-dev:3010`)
- `VERSION_SERVICE_URL`: URL to version-service (e.g., `http://version-service-dev:3011`)
- `PORT`: Port for backend service (default: 5000)
- `NODE_ENV`: Environment (development/production)

**No longer required:**
- `FRONTEND_HOST`, `FRONTEND_PORT`: Removed due to self-registration architecture
