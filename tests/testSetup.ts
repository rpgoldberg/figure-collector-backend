import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../src/models/User';
import Figure from '../src/models/Figure';

let mongoServer: MongoMemoryServer;

// Global testing setup
beforeAll(async () => {
  // Set environment to test
  process.env.NODE_ENV = 'test';

  // If already connected, disconnect first
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  // Create MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.TEST_MONGODB_URI = mongoUri;

  // Ensure only one connection
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000
    });
  }
});

afterAll(async () => {
  // Disconnect if still connected
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  // Stop MongoDB Memory Server
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Clear database between tests
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Utility function to generate test token
export const generateTestToken = (userId: string) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'defaultTestSecret', {
    expiresIn: '30d'
  });
};

// Utility function to create a test user
export const createTestUser = async () => {
  const user = new User({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  });
  await user.save();
  return user;
};

// Utility function to create test figures for a user
export const createTestFigures = async (userId: string, count = 2) => {
  // Convert userId to mongoose ObjectId if it's a string
  const userObjectId = mongoose.Types.ObjectId.createFromHexString(userId);

  const figures = Array.from({ length: count }, (_, index) => ({
    name: `Figure ${index + 1}`,
    manufacturer: `Manufacturer ${index + 1}`,
    userId: userObjectId,
    location: `Location ${index + 1}`,
    boxNumber: `Box ${index + 1}`,
    scale: 'Standard',
    mfcLink: `https://mfc.example.com/figure-${index + 1}`
  }));
  return await Figure.create(figures);
};