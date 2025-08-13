/**
 * @jest-environment node
 */

// Skip global test setup for this pure unit test
process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';

// Simple mock implementation for testing (copy of the function we want to test)
const testMockAtlasSearch = (searchQuery: string, documents: any[], userId: mongoose.Types.ObjectId) => {
  // Simulate Atlas Search behavior
  const query = searchQuery.toLowerCase();
  const searchFields = ['manufacturer', 'name', 'location', 'boxNumber'];
  
  // Filter documents by userId first (matches Atlas Search filter)
  const userDocuments = documents.filter(doc => 
    doc.userId && doc.userId.toString() === userId.toString()
  );
  
  // Perform text search simulation
  const results = userDocuments.filter(doc => {
    return searchFields.some(field => {
      const fieldValue = doc[field]?.toLowerCase() || '';
      // Simulate fuzzy matching (exact match, starts with, or contains)
      return fieldValue === query || 
             fieldValue.startsWith(query) || 
             fieldValue.includes(query) ||
             // Simulate fuzzy matching with 1 edit distance
             (query.length > 2 && fieldValue.includes(query.substring(0, query.length - 1)));
    });
  });
  
  // Transform to match Atlas Search response format
  return results.map(doc => ({
    _id: doc._id,
    manufacturer: doc.manufacturer,
    name: doc.name,
    scale: doc.scale,
    mfcLink: doc.mfcLink,
    location: doc.location,
    boxNumber: doc.boxNumber,
    imageUrl: doc.imageUrl,
    userId: doc.userId
  }));
};

describe('Atlas Search Mock Validation', () => {
  let testUserId: mongoose.Types.ObjectId;
  let otherUserId: mongoose.Types.ObjectId;
  let testDocuments: any[];

  beforeEach(() => {
    testUserId = new mongoose.Types.ObjectId();
    otherUserId = new mongoose.Types.ObjectId();
    
    testDocuments = [
      {
        _id: new mongoose.Types.ObjectId(),
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        location: 'Shelf A',
        boxNumber: 'Box 001',
        scale: '1/8',
        mfcLink: 'https://mfc.com/item/1',
        imageUrl: 'https://example.com/miku.jpg',
        userId: testUserId
      },
      {
        _id: new mongoose.Types.ObjectId(),
        manufacturer: 'Alter',
        name: 'Kagamine Rin',
        location: 'Shelf B', 
        boxNumber: 'Box 002',
        scale: '1/7',
        mfcLink: 'https://mfc.com/item/2',
        imageUrl: 'https://example.com/rin.jpg',
        userId: testUserId
      },
      {
        _id: new mongoose.Types.ObjectId(),
        manufacturer: 'Good Smile Company',
        name: 'Megumin',
        location: 'Display Cabinet',
        boxNumber: 'Box 003',
        scale: '1/8',
        mfcLink: 'https://mfc.com/item/3',
        imageUrl: 'https://example.com/megumin.jpg',
        userId: testUserId
      },
      {
        _id: new mongoose.Types.ObjectId(),
        manufacturer: 'Kotobukiya',
        name: 'Mikasa Ackerman',
        location: 'Shelf A',
        boxNumber: 'Box 004',
        scale: '1/8',
        mfcLink: 'https://mfc.com/item/4',
        imageUrl: 'https://example.com/mikasa.jpg',
        userId: testUserId
      },
      {
        _id: new mongoose.Types.ObjectId(),
        manufacturer: 'Other User Manufacturer',
        name: 'Other User Figure',
        location: 'Other Location',
        boxNumber: 'Other Box',
        scale: '1/10',
        mfcLink: 'https://mfc.com/item/5',
        imageUrl: 'https://example.com/other.jpg',
        userId: otherUserId
      }
    ];
  });

  describe('Basic Search Functionality', () => {
    it('should find exact matches by name', () => {
      const results = testMockAtlasSearch('Hatsune Miku', testDocuments, testUserId);
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Hatsune Miku');
      expect(results[0].manufacturer).toBe('Good Smile Company');
    });

    it('should find matches by manufacturer', () => {
      const results = testMockAtlasSearch('Good Smile Company', testDocuments, testUserId);
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.manufacturer === 'Good Smile Company')).toBe(true);
      
      const names = results.map(r => r.name);
      expect(names).toContain('Hatsune Miku');
      expect(names).toContain('Megumin');
    });

    it('should find matches by location', () => {
      const results = testMockAtlasSearch('Shelf A', testDocuments, testUserId);
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.location === 'Shelf A')).toBe(true);
    });

    it('should find matches by box number', () => {
      const results = testMockAtlasSearch('Box 001', testDocuments, testUserId);
      
      expect(results).toHaveLength(1);
      expect(results[0].boxNumber).toBe('Box 001');
      expect(results[0].name).toBe('Hatsune Miku');
    });

    it('should perform case-insensitive search', () => {
      const results = testMockAtlasSearch('good smile company', testDocuments, testUserId);
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.manufacturer === 'Good Smile Company')).toBe(true);
    });

    it('should perform partial matching', () => {
      const results = testMockAtlasSearch('Mik', testDocuments, testUserId);
      
      expect(results.length).toBeGreaterThanOrEqual(2);
      const names = results.map(r => r.name);
      expect(names.some(name => name.includes('Miku'))).toBe(true);
      expect(names.some(name => name.includes('Mikasa'))).toBe(true);
    });

    it('should return empty array for no matches', () => {
      const results = testMockAtlasSearch('NonexistentTerm', testDocuments, testUserId);
      
      expect(results).toHaveLength(0);
    });
  });

  describe('User Isolation', () => {
    it('should only return results for the specified user', () => {
      // Search for a term that appears in documents for both users
      const results = testMockAtlasSearch('Box', testDocuments, testUserId);
      
      // Should only return boxes for testUserId
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.userId.toString() === testUserId.toString())).toBe(true);
    });

    it('should not return results for other users', () => {
      // Search for something that only exists in other user's documents
      const results = testMockAtlasSearch('Other User', testDocuments, testUserId);
      
      expect(results).toHaveLength(0);
    });

    it('should return results for the correct user', () => {
      // Search as the other user
      const results = testMockAtlasSearch('Other User', testDocuments, otherUserId);
      
      expect(results).toHaveLength(1);
      expect(results[0].manufacturer).toBe('Other User Manufacturer');
    });
  });

  describe('Response Format Validation', () => {
    it('should return correct response format', () => {
      const results = testMockAtlasSearch('Miku', testDocuments, testUserId);
      
      expect(results).toHaveLength(1);
      const result = results[0];
      
      // Check all required fields are present
      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('manufacturer');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('scale');
      expect(result).toHaveProperty('mfcLink');
      expect(result).toHaveProperty('location');
      expect(result).toHaveProperty('boxNumber');
      expect(result).toHaveProperty('imageUrl');
      expect(result).toHaveProperty('userId');
      
      // Check types
      expect(result._id).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(typeof result.manufacturer).toBe('string');
      expect(typeof result.name).toBe('string');
      expect(typeof result.scale).toBe('string');
      expect(typeof result.location).toBe('string');
      expect(typeof result.boxNumber).toBe('string');
      expect(result.userId).toBeInstanceOf(mongoose.Types.ObjectId);
    });
  });

  describe('Multi-field Search', () => {
    it('should search across all specified fields', () => {
      // Test that search looks in manufacturer field
      let results = testMockAtlasSearch('Alter', testDocuments, testUserId);
      expect(results).toHaveLength(1);
      expect(results[0].manufacturer).toBe('Alter');

      // Test that search looks in name field
      results = testMockAtlasSearch('Kagamine', testDocuments, testUserId);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Kagamine Rin');

      // Test that search looks in location field
      results = testMockAtlasSearch('Display', testDocuments, testUserId);
      expect(results).toHaveLength(1);
      expect(results[0].location).toBe('Display Cabinet');

      // Test that search looks in boxNumber field
      results = testMockAtlasSearch('003', testDocuments, testUserId);
      expect(results).toHaveLength(1);
      expect(results[0].boxNumber).toBe('Box 003');
    });
  });

  describe('Fuzzy Matching Simulation', () => {
    it('should match with substring search', () => {
      const results = testMockAtlasSearch('Rin', testDocuments, testUserId);
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Kagamine Rin');
    });

    it('should match with prefix search', () => {
      const results = testMockAtlasSearch('Hatsune', testDocuments, testUserId);
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Hatsune Miku');
    });

    it('should simulate 1-character edit distance', () => {
      // This tests the fuzzy logic with shortened queries
      const results = testMockAtlasSearch('Hat', testDocuments, testUserId);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('Hatsune Miku');
    });
  });
});
