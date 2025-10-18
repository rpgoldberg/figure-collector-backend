#!/bin/bash

# Simple containerized test runner - uses existing working test setup
# Just runs it in container to avoid WSL issues and extract coverage

echo "🧪 Running tests in container (simple approach)..."

# Build container
docker build -f Dockerfile.test-simple -t backend-test-simple .

# Run tests and extract coverage
docker run --rm \
  -v $(pwd)/coverage:/app/coverage \
  backend-test-simple npm run test:coverage

echo "✅ Tests completed! Coverage available at: ./coverage/lcov-report/index.html"

# Open coverage if possible
if command -v xdg-open &> /dev/null && [ -n "$DISPLAY" ]; then
    xdg-open ./coverage/lcov-report/index.html 2>/dev/null || true
fi