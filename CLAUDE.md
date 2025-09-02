# Backend Service Claude Configuration

## Technology Stack
- Node.js/Express
- TypeScript
- MongoDB Atlas
- Jest for testing

## Service-Specific Testing Approaches

### Testing Configurations
- Use `tsconfig.test.json` for test configurations
- MongoDB Memory Server for isolated testing
- Atlas Search mocking with user isolation

### Test Modes
- `npm run test:memory`: CI/CD testing with in-memory MongoDB
- `npm run test:atlas`: Local development testing

## Development Workflow

### Key Development Commands
- `npm run dev`: Start development server
- `npm run test`: Run all tests
- `npm run test:unit`: Run unit tests
- `npm run test:integration`: Run integration tests
- `npm run lint`: Run TypeScript linter

## Available Sub-Agents

### Atomic Task Agents (Haiku Model)
- **`test-generator-backend`**: Jest + Supertest + MongoDB Memory Server test generation
  - API endpoint testing with authentication
  - Database integration with Atlas Search mocking
  - Controller, middleware, and model testing
  - Error handling and security validation
  
- **`documentation-manager`**: Documentation synchronization specialist
  - Updates README and API docs after code changes
  - Maintains documentation accuracy
  - Synchronizes docs with code modifications
  
- **`validation-gates`**: Testing and validation specialist
  - Runs comprehensive test suites
  - Validates code quality gates
  - Iterates on fixes until all tests pass
  - Ensures production readiness

## Agent Invocation Instructions

### Manual Orchestration Pattern (Required)
Use TodoWrite to plan tasks, then call sub-agents directly with proper Haiku configuration:

```
Task:
subagent_type: test-generator-backend
description: Generate comprehensive backend tests
prompt:
MODEL_OVERRIDE: claude-3-haiku-20240307
AGENT_MODEL: haiku

ATOMIC TASK: Create comprehensive Jest test suite for backend API

REQUIREMENTS:
- Generate tests for all API endpoints
- Mock MongoDB Atlas Search functionality
- Test authentication and authorization flows
- Achieve >85% code coverage
- Follow existing test patterns

Start with: I am using claude-3-haiku-20240307 to generate comprehensive tests for backend service.
```

### Post-Implementation Validation
Always call validation-gates after implementing features:

```
Task:
subagent_type: validation-gates
description: Validate backend implementation
prompt:
MODEL_OVERRIDE: claude-3-haiku-20240307

ATOMIC TASK: Validate all tests pass and quality gates are met

FEATURES IMPLEMENTED: [Specify what was implemented]
VALIDATION NEEDED: Run test suite, check coverage, ensure quality

Start with: I am using claude-3-haiku-20240307 to validate implementation quality.
```

### Documentation Updates
Call documentation-manager after code changes:

```
Task:
subagent_type: documentation-manager  
description: Update documentation after changes
prompt:
MODEL_OVERRIDE: claude-3-haiku-20240307

ATOMIC TASK: Synchronize documentation with code changes

FILES CHANGED: [List of modified files]
CHANGES MADE: [Brief description of changes]

Start with: I am using claude-3-haiku-20240307 to update documentation.
```

## MongoDB Atlas Search Configuration
```typescript
Figure.aggregate([{
  $search: {
    index: 'figures',
    compound: {
      must: [{
        text: {
          query: query,
          path: ['manufacturer', 'name', 'location', 'boxNumber']
        }
      }]
    }
  }
}])
```

## Atomic Task Principles
- Keep tests focused and atomic
- Test one specific behavior per test case
- Use mocking for external dependencies
- Maintain high test coverage

## File Structure

```
.claude/
├── agents/
│   ├── test-generator-backend.md
│   ├── documentation-manager.md
│   └── validation-gates.md
└── commands/
    └── primer.md
```

## Quality Assurance Workflow

1. **Implementation**: Write code changes
2. **Testing**: Call `test-generator-backend` if new tests needed
3. **Validation**: Call `validation-gates` to ensure quality
4. **Documentation**: Call `documentation-manager` to update docs
5. **Verification**: Confirm all tests pass and docs are current