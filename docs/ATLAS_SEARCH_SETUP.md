# MongoDB Atlas Search Index Setup

This document provides instructions for creating the MongoDB Atlas Search index required for Issues #28 (Word Wheel Search) and #29 (Partial Word Matching).

## Prerequisites

- MongoDB Atlas cluster with M10+ tier (Atlas Search requires a paid tier)
- Access to Atlas UI with sufficient permissions to create search indexes

## Creating the Search Index

### Option 1: Using the Atlas UI (Recommended)

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Navigate to your cluster
3. Click on the "Search" tab
4. Click "Create Search Index"
5. Select "JSON Editor"
6. Choose your database and the `figures` collection
7. Copy the contents of `docs/ATLAS_SEARCH_INDEX.json` and paste into the JSON editor
8. Click "Create Search Index"
9. Wait for the index to finish building (this may take a few minutes)

### Option 2: Using the Atlas CLI

```bash
# Install Atlas CLI if not already installed
# https://www.mongodb.com/docs/atlas/cli/stable/install-atlas-cli/

# Create the search index using the JSON definition
atlas clusters search indexes create \
  --clusterName <your-cluster-name> \
  --file docs/ATLAS_SEARCH_INDEX.json
```

## Index Configuration Details

The `figures_search` index includes:

### Fields Indexed

- **name**: Figure name with autocomplete and n-gram support
- **manufacturer**: Manufacturer name with autocomplete and n-gram support
- **series**: Series name with autocomplete and n-gram support
- **userId**: User ID for filtering results per user

### Analyzers

- **Standard Analyzer** (`lucene.standard`): For general text search
- **Autocomplete Analyzer**: Edge n-grams (2-15 chars) for word-wheel search
- **N-gram Analyzer**: For partial word matching within strings

### Features Enabled

1. **Word Wheel Search (Issue #28)**
   - Uses `autocomplete` multi-analyzer
   - Edge n-grams from 2-15 characters
   - Provides suggestions as user types
   - Case-insensitive matching

2. **Partial Word Matching (Issue #29)**
   - Uses `ngram` multi-analyzer
   - Finds matches within words
   - Example: "kasa" matches "Mikasa"

## Verifying the Index

After creating the index, verify it's active:

1. In Atlas UI: Search tab should show "Active" status
2. Test with a sample query in the Search Tester
3. Run the integration tests: `npm run test:search`

## Index Performance

- **Build Time**: 1-5 minutes depending on collection size
- **Query Performance**: < 100ms for typical autocomplete queries
- **Storage**: Approximately 2-3x the size of indexed fields

## Troubleshooting

### Index not appearing
- Wait a few minutes for index to build
- Check that you selected the correct database and collection
- Verify your Atlas cluster tier supports Search (M10+)

### Search queries returning no results
- Verify index status is "Active" in Atlas UI
- Check that the index name matches: `figures_search`
- Ensure your query syntax is correct
- Test with the mockAtlasSearch function in test mode

### Performance issues
- Check index size in Atlas UI
- Consider increasing cluster tier for better performance
- Review query patterns and adjust index definition if needed

## Environment Variables

Ensure these are set in your `.env` file:

```bash
# Use Atlas Search in production
NODE_ENV=production

# For testing without Atlas Search
TEST_MODE=memory  # Uses regex fallback
```

## Related Documentation

- [MongoDB Atlas Search Documentation](https://www.mongodb.com/docs/atlas/atlas-search/)
- [Autocomplete Search Examples](https://www.mongodb.com/docs/atlas/atlas-search/autocomplete/)
- [N-gram Tokenization](https://www.mongodb.com/docs/atlas/atlas-search/analyzers/custom/#std-label-custom-analyzers)

## Support

For issues with Atlas Search setup, contact the backend team or refer to MongoDB Atlas support.
