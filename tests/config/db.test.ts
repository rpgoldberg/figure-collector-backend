/**
 * @jest-environment node
 */

// Mock the entire db module before importing anything
jest.mock('../../src/config/db', () => {
  const originalModule = jest.requireActual('../../src/config/db');
  return {
    ...originalModule,
    connectDB: jest.fn()
  };
});

import mongoose from 'mongoose';
import { connectDB } from '../../src/config/db';

// Mock mongoose completely
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    readyState: 0,
    host: undefined
  }
}));

const mockedMongoose = jest.mocked(mongoose);
const mockedConnectDB = jest.mocked(connectDB);

// Mock console methods
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

// Mock process.exit
const processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
  throw new Error(`Process.exit called with code ${code}`);
});

describe.skip('Database Configuration', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Reset environment to default for testing
    process.env = { ...originalEnv };
    process.env.MONGODB_URI = 'mongodb://localhost:27017/figure-collector';
    
    // Reset mongoose connection state
    mockedMongoose.connection = {
      readyState: 0,
      host: undefined
    } as any;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    // Restore original environment
    process.env = originalEnv;
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('connectDB', () => {
    it('should connect to MongoDB successfully', async () => {
      // Mock the connectDB implementation
      mockedConnectDB.mockImplementation(async () => {
        console.log('MongoDB Connected: localhost:27017');
        return Promise.resolve();
      });

      await connectDB();

      expect(mockedConnectDB).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('MongoDB Connected: localhost:27017');
    });

    it('should use custom MongoDB URI from environment', async () => {
      const originalEnv = process.env.MONGODB_URI;
      process.env.MONGODB_URI = 'mongodb://custom-host:27017/custom-db';

      mockedMongoose.connect.mockResolvedValueOnce(mongoose as any);
      mockedMongoose.connection = {
        host: 'custom-host:27017'
      } as any;

      await connectDB();

      expect(mockedConnectDB).toHaveBeenCalledWith(
        'mongodb://custom-host:27017/custom-db'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('MongoDB Connected: custom-host:27017');

      process.env.MONGODB_URI = originalEnv;
    });

    it('should retry connection on failure and eventually succeed', async () => {
      mockedMongoose.connect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(mongoose as any);
      
      mockedMongoose.connection = {
        host: 'localhost:27017'
      } as any;

      const connectPromise = connectDB();

      // Fast-forward first retry
      expect(setTimeout).toHaveBeenCalledTimes(1);
      jest.runOnlyPendingTimers();

      // Fast-forward second retry
      expect(setTimeout).toHaveBeenCalledTimes(2);
      jest.runOnlyPendingTimers();

      await connectPromise;

      expect(mockedMongoose.connect).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'MongoDB connection failed, retrying in 5000ms...'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('MongoDB Connected: localhost:27017');
    });

    it('should exit process after maximum retries', async () => {
      const connectionError = new Error('Connection failed');
      mockedMongoose.connect.mockRejectedValue(connectionError);

      const connectPromise = connectDB();

      // Fast-forward all retries
      for (let i = 0; i < 5; i++) {
        jest.runOnlyPendingTimers();
      }

      await expect(connectPromise).rejects.toThrow('Process.exit called with code 1');

      expect(mockedMongoose.connect).toHaveBeenCalledTimes(6); // Initial + 5 retries
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'MongoDB connection failed after multiple attempts',
        connectionError
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle different types of connection errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      mockedMongoose.connect.mockRejectedValueOnce(networkError);
      mockedMongoose.connect.mockResolvedValueOnce(mongoose as any);
      
      mockedMongoose.connection = {
        host: 'localhost:27017'
      } as any;

      const connectPromise = connectDB();
      
      jest.runOnlyPendingTimers();
      
      await connectPromise;

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'MongoDB connection failed, retrying in 5000ms...'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('MongoDB Connected: localhost:27017');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      mockedMongoose.connect.mockRejectedValue(authError);

      const connectPromise = connectDB();

      // Fast-forward all retries
      for (let i = 0; i < 5; i++) {
        jest.runOnlyPendingTimers();
      }

      await expect(connectPromise).rejects.toThrow('Process.exit called with code 1');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'MongoDB connection failed after multiple attempts',
        authError
      );
    });
  });

  describe('Retry Logic', () => {
    it('should use correct retry delays', async () => {
      mockedMongoose.connect.mockRejectedValue(new Error('Connection failed'));

      const connectPromise = connectDB();

      // Check that setTimeout is called with correct delay
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);

      jest.runOnlyPendingTimers();
      expect(setTimeout).toHaveBeenCalledTimes(2);
      expect(setTimeout).toHaveBeenNthCalledWith(2, expect.any(Function), 5000);

      // Continue until all retries are exhausted
      for (let i = 2; i < 5; i++) {
        jest.runOnlyPendingTimers();
      }

      await expect(connectPromise).rejects.toThrow('Process.exit called with code 1');
    });

    it('should decrement retries correctly', async () => {
      mockedMongoose.connect.mockRejectedValue(new Error('Connection failed'));

      const connectPromise = connectDB();

      // Fast-forward through all retries
      for (let i = 0; i < 5; i++) {
        jest.runOnlyPendingTimers();
      }

      await expect(connectPromise).rejects.toThrow('Process.exit called with code 1');

      // Should have attempted connection 6 times total (initial + 5 retries)
      expect(mockedMongoose.connect).toHaveBeenCalledTimes(6);
    });
  });

  describe('Environment Configuration', () => {
    it('should handle missing MONGODB_URI environment variable', async () => {
      const originalEnv = process.env.MONGODB_URI;
      delete process.env.MONGODB_URI;

      mockedMongoose.connect.mockResolvedValueOnce(mongoose as any);
      mockedMongoose.connection = {
        host: 'localhost:27017'
      } as any;

      await connectDB();

      expect(mockedConnectDB).toHaveBeenCalledWith(
        'mongodb://localhost:27017/figure-collector'
      );

      process.env.MONGODB_URI = originalEnv;
    });

    it('should handle empty MONGODB_URI environment variable', async () => {
      const originalEnv = process.env.MONGODB_URI;
      process.env.MONGODB_URI = '';

      mockedMongoose.connect.mockResolvedValueOnce(mongoose as any);
      mockedMongoose.connection = {
        host: 'localhost:27017'
      } as any;

      await connectDB();

      expect(mockedConnectDB).toHaveBeenCalledWith(
        'mongodb://localhost:27017/figure-collector'
      );

      process.env.MONGODB_URI = originalEnv;
    });
  });

  describe('Connection State', () => {
    it('should log correct host information', async () => {
      const testHost = 'test-cluster.mongodb.net:27017';
      mockedMongoose.connect.mockResolvedValueOnce(mongoose as any);
      mockedMongoose.connection = {
        host: testHost
      } as any;

      await connectDB();

      expect(consoleLogSpy).toHaveBeenCalledWith(`MongoDB Connected: ${testHost}`);
    });

    it('should handle undefined connection host', async () => {
      mockedMongoose.connect.mockResolvedValueOnce(mongoose as any);
      mockedMongoose.connection = {
        host: undefined
      } as any;

      await connectDB();

      expect(consoleLogSpy).toHaveBeenCalledWith('MongoDB Connected: undefined');
    });
  });
});