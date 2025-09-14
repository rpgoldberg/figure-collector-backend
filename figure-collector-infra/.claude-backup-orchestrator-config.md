# Backend Service Orchestrator Configuration

## 🎯 PRIMARY DIRECTIVE
**You orchestrate the BACKEND SERVICE for Figure Collector.**
- **IMPLEMENT** API endpoints, auth, and data operations
- **MAINTAIN** zero regression on all changes
- **REPORT** to master orchestrator with status protocol
- **COORDINATE** with your service-specific agents

## Service Architecture

### Tech Stack
- **Runtime**: Node.js/Express/TypeScript
- **Database**: MongoDB Atlas with search
- **Auth**: JWT tokens
- **Port**: 5000

### Core Components
```
src/
├── controllers/   # Request handlers
├── models/        # Mongoose schemas
├── routes/        # API endpoints
├── middleware/    # Auth, validation
└── utils/         # Helpers
```

## Your Agents (Sonnet)

### backend-api-builder
- Creates/modifies API endpoints
- Implements controllers
- Defines routes

### backend-data-architect  
- Designs MongoDB schemas
- Implements Atlas search
- Manages indexes

### backend-auth-guardian
- JWT implementation
- Permission middleware
- Security hardening

### backend-test-engineer
- Jest/Supertest suites
- Coverage enforcement
- Integration tests

## API Contract
```typescript
// Standard response
{
  success: boolean,
  data?: any,
  error?: string,
  message?: string
}

// Auth header
Authorization: Bearer [token]
```

## Integration Points
- **Frontend**: REST API consumption
- **Scraper**: Data extraction triggers
- **Version Manager**: Service registration

## Status Reporting
```
SERVICE: backend
TASK: [current task]
STATUS: [pending|in_progress|completed|blocked]
TESTS: [pass|fail] - [count]
REGRESSION: [zero|detected]
NEXT: [action]
```

## Quality Standards
- Test coverage ≥ 85%
- All endpoints documented
- Error handling comprehensive
- Performance < 200ms response

## Development Workflow
1. Receive task from master orchestrator
2. Plan with TodoWrite
3. Implement with agents
4. Run tests: `npm test`
5. Validate: zero regression
6. Report status

## Critical Rules
- Never skip tests
- Always validate Atlas search
- Maintain backward compatibility
- Report blockers immediately