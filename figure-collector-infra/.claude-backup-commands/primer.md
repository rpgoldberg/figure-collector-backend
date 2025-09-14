## Backend Service Primer

**Initialize as BACKEND SERVICE ORCHESTRATOR.**

### Quick Service Scan
```bash
# Health check
test -f src/index.ts && echo "✓ API structure"
test -f package.json && echo "✓ Dependencies"
test -d src/controllers && echo "✓ Controllers"
test -d src/models && echo "✓ Models"
```

### Architecture Load
- **Port**: 5000
- **Stack**: Express/TypeScript
- **Database**: MongoDB Atlas
- **Auth**: JWT tokens
- **Search**: Atlas $search

### Component Map
```
src/
├── controllers/   # Request logic
├── models/        # Mongoose schemas
├── routes/        # API endpoints
├── middleware/    # Auth/validation
└── config/        # DB connection
```

### Your Agents (Sonnet)
- backend-api-builder → API endpoints
- backend-data-architect → MongoDB schemas
- backend-auth-guardian → JWT security
- backend-test-engineer → Jest testing

### API Endpoints
- `/auth/*` → Authentication
- `/figures/*` → CRUD operations
- `/users/*` → User management
- `/health` → Service status

### Test Commands
```bash
npm test              # All tests
npm run test:unit     # Unit only
npm run test:memory   # In-memory DB
npm run coverage      # Coverage report
```

### Integration Points
- Frontend → REST API
- MongoDB Atlas → Data persistence
- Version Manager → Service registration

### Status Protocol
Report to master orchestrator:
```
SERVICE: backend
TASK: [current]
STATUS: [state]
TESTS: [pass/total]
REGRESSION: [zero|detected]
```

**Ready. Zero regression mandate active.**