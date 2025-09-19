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

## Security Best Practices

1. Never commit `.env` files (already in `.gitignore`)
2. Use placeholder values in example files
3. Document examples clearly as non-functional
4. Use secret scanning to catch accidental commits