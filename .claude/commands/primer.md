## Figure Collector Backend Primer Command

**IMPORTANT**: This is the figure-collector-backend service - a Node.js/Express/TypeScript API service with MongoDB Atlas integration for the Figure Collector application.

### Step 1: Service Configuration
1. Read `CLAUDE.md` for service-specific configuration and agent instructions
2. Understand this service's role as the primary API layer for the Figure Collector application

### Step 2: Service Structure Analysis

**Core API Structure**:
- Read `src/index.ts` for Express server setup and middleware configuration
- Read `src/routes/` to understand API endpoint organization (figures, users)
- Read `src/controllers/` for business logic and request handling
- Read `src/models/` for MongoDB/Mongoose schemas and data models
- Read `src/middleware/` for authentication, validation, and error handling

**Database Integration**:
- Review `src/config/db.ts` for MongoDB Atlas connection setup
- Understand Atlas Search integration for figure search functionality
- Check database models and relationships

**Testing Structure**:
- Examine `tests/` directory for current test coverage patterns
- Review Jest configuration in `jest.config.js`
- Check TypeScript test configuration in `tsconfig.test.json`

**Build and Development**:
- Review `package.json` for dependencies and npm scripts
- Check TypeScript configuration in `tsconfig.json`
- Review Docker configuration in `Dockerfile` and `Dockerfile.test`

### Step 3: Service Understanding

**API Endpoints**:
- Figure management: CRUD operations, search, filtering
- User management: Registration, authentication, profile management
- Authentication: JWT token-based authentication system
- Search functionality: MongoDB Atlas Search integration

**Key Dependencies**:
- Express.js for web framework
- TypeScript for type safety
- MongoDB/Mongoose for database operations
- Jest/Supertest for testing
- JWT for authentication

**Integration Points**:
- MongoDB Atlas for data persistence and search
- Authentication token validation
- Cross-service communication patterns
- Error handling and logging

### Step 4: Available Tools and Agents

**Available Sub-Agents**:
- `test-generator-backend` (Haiku) - Jest + Supertest + MongoDB Memory Server test generation
- `documentation-manager` (Haiku) - Documentation synchronization
- `validation-gates` - Testing and validation specialist

**Development Commands**:
- `npm run dev` - Development server with hot reload
- `npm run build` - TypeScript compilation
- `npm run test` - Jest test execution
- `npm run test:coverage` - Test coverage reporting
- `npm run lint` - ESLint code linting
- `npm run typecheck` - TypeScript type checking

### Step 5: Summary Report

After analysis, provide:
- **Service Purpose**: Primary API layer for Figure Collector application
- **Technology Stack**: Node.js, Express, TypeScript, MongoDB Atlas, JWT
- **Key Functionality**: Figure/user CRUD, search, authentication, data validation
- **API Surface**: All REST endpoints and their responsibilities
- **Database Schema**: MongoDB collections and relationships
- **Authentication Flow**: JWT token-based auth system
- **Test Coverage**: Current testing approach and coverage levels
- **Atlas Search**: MongoDB Atlas Search integration for figure search
- **Development Workflow**: Setup, testing, and deployment processes

**Remember**: This service handles sensitive user data and authentication - security and data validation are critical considerations for all changes.