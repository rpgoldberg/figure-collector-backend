# Security Policy

## Reporting Security Vulnerabilities

Please report security vulnerabilities to the repository maintainer through GitHub's security advisory feature.

## False Positive Secret Scanning Alerts

The following patterns detected by secret scanning are **false positives** (placeholder values in documentation):

### Documentation Placeholders
- `.env.example`: Contains template MongoDB URI with `<username>:<password>` placeholders
- `tests/README_ATLAS_SEARCH_TESTING.md`: Contains example MongoDB URIs with generic placeholders:
  - `mongodb+srv://user:pass@cluster.mongodb.net/test-db` (example)
  - `mongodb+srv://username:password@cluster.mongodb.net/database` (example)

These are intentional documentation examples showing users the correct URI format. They do not contain actual credentials.

## Actual Secrets

Real credentials should:
- Never be committed to the repository
- Be stored in `.env` files (which are gitignored)
- Use environment variables in production
- Be rotated regularly

## Base Image Security

### Container Scanning Scope
Security scanners (Grype, Trivy, Syft) examine the **entire container**, including:
- Application dependencies (`node_modules/`)
- Base image binaries and their dependencies (npm, apk packages, etc.)
- System libraries (OpenSSL, glibc, etc.)

### Example: npm Vulnerability (GHSA-3xgq-45jj-v275)
The `node:20-alpine` base image ships with npm 10.8.2, which includes vulnerable cross-spawn 7.0.3 in npm's own global dependencies. Even though our application didn't use cross-spawn directly, security scanners flagged it because npm is part of the container.

**Mitigation**: Upgrade npm in Dockerfile:
```dockerfile
RUN npm install -g npm@latest
```

### Alpine Package Security
Alpine packages should be upgraded during build to get latest security patches:
```dockerfile
RUN apk update && \
    apk upgrade --no-cache libssl3 libcrypto3
```

### Best Practices
1. Keep base image packages up to date (npm, apk packages)
2. Use multi-stage builds to exclude build tools from production
3. Run security scans on final production image, not just source code
4. Check security scan results carefully - vulnerabilities may come from base image, not your code

## Security Best Practices

1. Never commit `.env` files (already in `.gitignore`)
2. Use placeholder values in example files
3. Document examples clearly as non-functional
4. Use secret scanning to catch accidental commits