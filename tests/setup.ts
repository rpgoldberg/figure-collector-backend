import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

// Mock environment variables for tests
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/figure-collector-test';

// Setup test database before all tests
beforeAll(async () => {
  // Create MongoDB memory server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(mongoUri, {
        retryWrites: true,
        socketTimeoutMS: 30000,
        serverSelectionTimeoutMS: 30000
      });
      console.log('Connected to in-memory test database');
    } catch (error) {
      console.error('Failed to connect to in-memory database', error);
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});

// Clean up after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections as Record<string, mongoose.Collection>;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Close database connection after all tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Helper function to generate test JWT tokens
export const generateTestToken = (userId: string) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h'
  });
};

// Helper function to create test user
export const createTestUser = () => {
  return {
    _id: new mongoose.Types.ObjectId().toString(),
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    isAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// Atlas Search Mock Functions
export const getTestMode = () => {
  return process.env.NODE_ENV || 'test';
};

export const isUsingRealAtlasSearch = () => {
  return process.env.ATLAS_SEARCH_ENABLED === 'true';
};

export const mockAtlasSearch = (searchQuery: string, documents: any[], userId: any) => {
  if (!searchQuery || !documents) {
    return [];
  }

  // Filter documents by user first for user isolation
  const userDocuments = documents.filter(doc => 
    doc.userId && doc.userId.toString() === userId.toString()
  );

  const query = searchQuery.toLowerCase().trim();
  
  return userDocuments.filter(doc => {
    // Search across multiple fields: name, manufacturer, location, boxNumber, scale
    const searchableFields = [
      doc.name || '',
      doc.manufacturer || '',
      doc.location || '',
      doc.boxNumber || '',
      doc.scale || ''
    ];
    
    // Check if any field contains the search query (case-insensitive, partial match)
    return searchableFields.some(field => 
      field.toLowerCase().includes(query)
    );
  });
};

// Mock Figure.aggregate for Atlas Search operations
const Figure = require('../src/models/Figure').default;

if (Figure && Figure.aggregate) {
  const originalAggregate = Figure.aggregate.bind(Figure);
  
  Figure.aggregate = function(pipeline: any[]) {
    // Check if pipeline contains $search stage
    const searchStage = pipeline.find(stage => stage.$search);
    
    if (searchStage && searchStage.$search) {
      // Mock Atlas Search behavior
      let searchQuery = '';
      let userId = null;
      
      // Handle compound query structure
      if (searchStage.$search.compound) {
        const compound = searchStage.$search.compound;
        
        // Extract search query from compound.must[].text.query
        if (compound.must && compound.must.length > 0) {
          const textSearch = compound.must.find((item: any) => item.text);
          if (textSearch && textSearch.text) {
            searchQuery = textSearch.text.query || '';
          }
        }
        
        // Extract userId from compound.filter[].equals.value
        if (compound.filter && compound.filter.length > 0) {
          const userFilter = compound.filter.find((item: any) => item.equals && item.equals.path === 'userId');
          if (userFilter && userFilter.equals) {
            userId = userFilter.equals.value;
          }
        }
      } else {
        // Handle simple text search
        searchQuery = searchStage.$search.text?.query || '';
      }
      
      // Return a Promise that resolves to filtered documents
      return Promise.resolve().then(async () => {
        // Get all documents
        const allDocs = await Figure.find({}).lean();
        
        // Filter documents by user and search query
        const filteredDocs = mockAtlasSearch(searchQuery, allDocs, userId)
          .map(doc => ({
            ...doc,
            score: { searchScore: Math.random() * 10 } // Simulate Atlas Search score
          }));
        
        return filteredDocs;
      });
    }
    
    // Fall back to original aggregate for non-search operations
    return originalAggregate(pipeline);
  };
}
