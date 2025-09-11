# Figure Collector Backend API

Backend API service for the Figure Collector application. Provides endpoints for user authentication, figure management, and acts as the orchestrator for microservices version management. Includes comprehensive test coverage with Jest and Supertest.

## Features

- User authentication (register, login, profile)
- Complete figure management (CRUD operations)
- Search functionality with MongoDB Atlas Search
- Filtering and statistics
- Service version orchestration and aggregation
- Frontend service registration endpoint
- Version validation with version-manager integration

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
- **Version Validation**: Integrates with version-manager to validate service version combinations
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
- `/figures` - Figure management endpoints (with `page` and `limit` query parameters only)
- `/auth/*` - Authentication and session management endpoints
- `/figures/scrape-mfc` - MFC scraping proxy endpoint

### Authentication Endpoints

Authentication is managed through dedicated `/auth` endpoints:
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and receive access/refresh tokens
- `POST /auth/refresh` - Obtain a new access token using a refresh token
- `POST /auth/logout` - Logout current session
- `POST /auth/logout-all` - Logout from all active sessions
- `GET /auth/sessions` - Retrieve all active sessions for the user

**Note**: All authentication endpoints now return responses in the `data.data` structure

Note: The nginx frontend proxy strips `/api` prefix, so backend endpoints don't include `/api` in their paths.

### Environment Variables

**Required:**
- `MONGODB_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: Secret for JWT token signing
- `JWT_REFRESH_SECRET`: Secret for refresh token signing
- `JWT_ACCESS_TOKEN_EXPIRY`: Access token expiration time (default: 15m)
- `JWT_REFRESH_TOKEN_EXPIRY`: Refresh token expiration time (default: 7d)
- `SCRAPER_SERVICE_URL`: URL to page-scraper service (e.g., `http://page-scraper-dev:3010`)
- `VERSION_MANAGER_URL`: URL to version-manager (e.g., `http://version-manager-dev:3011`)
- `PORT`: Port for backend service (default: 5000)
- `NODE_ENV`: Environment (development/production)

**No longer required:**
- `FRONTEND_HOST`, `FRONTEND_PORT`: Removed due to self-registration architecture

### Token Management

The authentication system uses a two-token strategy:
- **Access Token**: Short-lived token for API access (15 minutes expiry)
- **Refresh Token**: Long-lived token (7 days expiry) stored securely in MongoDB

Token Features:
- Returns both `accessToken` and `refreshToken` on successful login
- Session tracking allows users to manage and revoke active sessions
- Automatic token refresh prevents unnecessary re-authentication
- Enhanced security with device and location tracking for sessions

Token Response Structure:
```json
{
  "data": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

## 🧪 Testing

The backend includes extensive test infrastructure with enhanced Docker testing, comprehensive test suites, and robust automation scripts. We now have 309/309 tests passing, covering multiple dimensions of application functionality across multiple test configurations. The enhanced MongoDB Memory Server provides robust, isolated testing capabilities. All tests now pass without any skipped tests, focusing on essential database connection and API functionality.

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
│   ├── models/           # User, Figure, and RefreshToken model tests
│   ├── controllers/      # Authentication and business logic tests
│   ├── middleware/       # Auth and validation middleware
│   └── utils/           # Utility function tests
├── integration/
│   ├── auth/             # Comprehensive authentication test suite
│   │   ├── login.test.ts           # Login flow tests
│   │   ├── registration.test.ts    # User registration tests
│   │   ├── token-refresh.test.ts   # Token refresh tests
│   │   ├── logout.test.ts          # Logout and session management tests
│   │   └── sessions.test.ts        # Session tracking tests
│   ├── figures.test.ts  # Figure CRUD operations
│   ├── users.test.ts    # User profile management tests
│   └── version.test.ts  # Version management tests
└── performance/
    ├── database.test.ts # Database performance tests
    ├── auth-performance.test.ts # Authentication performance tests
    └── api.test.ts     # API response time tests
```

### Authentication Test Coverage

Enhanced authentication test suite now covers:
- Multiple login scenarios (successful, failed)
- Token generation and validation
- Refresh token lifecycle
- Session management
- Logout mechanisms (single session and all sessions)
- Device and location tracking
- Token revocation and security edge cases

### Running Tests

**WSL Setup Required**: Install Node.js via NVM (see [WSL_TEST_FIX_SOLUTION.md](../WSL_TEST_FIX_SOLUTION.md))

```bash
# Install dependencies
npm install

# Run all tests (memory mode)
npm run test:memory

# Run with coverage report
npm run test:coverage

# Run in watch mode (development)
npm run test:watch

# Run Docker-based test suite
npm run test:docker

# Run specific test suite
npx jest tests/integration/auth.test.ts

# Run performance stress tests
npx jest tests/performance/stress.test.ts

# Run tests matching pattern
npx jest --testNamePattern="user authentication"
```

### Docker Testing Infrastructure

- Comprehensive Docker test containers for isolated testing
- Automated test scripts for containerized environment
- Supports both CI/CD and local development testing modes
- Performance and stress testing via dedicated Docker configurations
- Cross-platform compatibility with WSL and native Linux environments

### Test Configuration

**TypeScript Test Configuration (`tsconfig.test.json`):**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "strict": false,           // Relaxed type checking for tests
    "noImplicitAny": false,    // Allow implicit 'any' types
    "strictNullChecks": false, // More flexible null handling
    "skipLibCheck": true,      // Skip type checking of declaration files
    "types": ["jest", "node"]  // Include Jest and Node types
  },
  "include": [
    "src/**/__tests__/**/*",   // Include all test files
    "src/**/__mocks__/**/*"    // Include mock implementations
  ]
}
```

The backend uses Jest with TypeScript support:

- **Framework**: Jest 29.7.0
- **TypeScript**: ts-jest for TypeScript compilation
- **HTTP Testing**: Supertest for API endpoint testing
- **Database**: In-memory MongoDB for isolated testing
- **Coverage**: Configured for >90% code coverage

**Key Testing Improvements:**
- Introduced `tsconfig.test.json` for more flexible test compilation
- Relaxed TypeScript strict mode for easier test writing
- Added comprehensive type configuration for Jest and Node.js
- Improved mock type handling to reduce compilation friction
- Enhanced test file discovery and coverage reporting
- Implemented Docker-based testing infrastructure
- Added comprehensive middleware and configuration tests
- Enhanced controller validation and error handling test coverage
- Introduced performance and stress testing modules
- Improved API route validation testing
- Added database connection and isolation testing
- Implemented enhanced MongoDB Memory Server for robust testing
- Completed SHALLTEAR PROTOCOL: Comprehensive test validation across all scenarios

### Mocking Strategy

- **External Services**: Page Scraper and Version Service APIs mocked
- **Database**: Uses in-memory MongoDB instance
- **JWT**: Mocked JWT tokens for authentication tests
- **Environment**: Test-specific environment variables
- **Validation**: Mocked input validation middleware with test scenarios for edge cases

### Security Enhancements

Implemented tactical security improvements:
- Enhanced Joi-based validation middleware
- Input sanitization for nested object attacks
- Proper HTTP status codes for validation errors
- Improved authentication response handling
- Comprehensive input validation across all endpoints

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
