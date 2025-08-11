# Figure Collector Backend API

Backend API service for the Figure Collector application. Provides endpoints for user authentication, figure management, and acts as the orchestrator for microservices version management. Includes comprehensive test coverage with Jest and Supertest.

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
- **Testing**: Jest + Supertest + ts-jest

## Version Management Architecture

The backend acts as the central orchestrator for version management:

- **Service Registration**: Provides `/register-service` endpoint for frontend self-registration
- **Version Aggregation**: Collects versions from all services (frontend via registration, scraper via API call)
- **Version Validation**: Integrates with version-service to validate service version combinations
- **Unified API**: Provides single `/version` endpoint with all service information and validation status

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Testing in Development

```bash
# Run tests in watch mode
npm run test:watch

# Test specific functionality
npx jest tests/integration/figures.test.ts --watch

# Check test coverage
npm run test:coverage
```

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

## 🧪 Testing

The backend includes comprehensive test coverage with 200+ test cases across 15 test suites.

### Test Coverage

- **Unit Tests**: Models, controllers, middleware, utilities
- **Integration Tests**: API endpoints with database operations
- **Performance Tests**: Database queries and API response times
- **Authentication Tests**: JWT handling, user registration/login
- **Version Management Tests**: Service registration and validation
- **Error Handling Tests**: Various failure scenarios

### Test Structure

```
tests/
├── unit/
│   ├── models/           # User and Figure model tests
│   ├── controllers/      # Business logic tests
│   ├── middleware/       # Auth and validation middleware
│   └── utils/           # Utility function tests
├── integration/
│   ├── auth.test.ts     # Authentication flow tests
│   ├── figures.test.ts  # Figure CRUD operations
│   ├── users.test.ts    # User management tests
│   └── version.test.ts  # Version management tests
└── performance/
    ├── database.test.ts # Database performance tests
    └── api.test.ts     # API response time tests
```

### Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (development)
npm run test:watch

# Run specific test suite
npx jest tests/integration/auth.test.ts

# Run tests matching pattern
npx jest --testNamePattern="user authentication"
```

### Test Configuration

The backend uses Jest with TypeScript support:

- **Framework**: Jest 29.7.0
- **TypeScript**: ts-jest for TypeScript compilation
- **HTTP Testing**: Supertest for API endpoint testing
- **Database**: In-memory MongoDB for isolated testing
- **Coverage**: Configured for >90% code coverage

### Mocking Strategy

- **External Services**: Page Scraper and Version Service APIs mocked
- **Database**: Uses in-memory MongoDB instance
- **JWT**: Mocked JWT tokens for authentication tests
- **Environment**: Test-specific environment variables

### Test Data

Tests use consistent fixtures:

```javascript
// Example test user
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  username: 'testuser'
};

// Example test figure
const testFigure = {
  name: 'Test Figure',
  manufacturer: 'Test Company',
  series: 'Test Series',
  scale: '1/8',
  price: 15000
};
```

### CI/CD Integration

```bash
# CI test command (no watch mode)
NODE_ENV=test npm test -- --watchAll=false

# Coverage for CI reporting
NODE_ENV=test npm test -- --coverage --watchAll=false
```
