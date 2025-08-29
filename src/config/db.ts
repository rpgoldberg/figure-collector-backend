import mongoose from 'mongoose';

export const connectDB = async () => {
  const connectWithRetry = async (retries = 5, delay = 5000) => {
    try {
      // Use test MongoDB URI if available (for testing)
      const connectionString = process.env.TEST_MONGODB_URI || 
                               process.env.MONGODB_URI || 
                               'mongodb://localhost:27017/figure-collector';
      
      await mongoose.connect(connectionString);
      console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    } catch (err) {
      if (process.env.NODE_ENV === 'test') {
        // In test environment, just log the error without exiting
        console.error('MongoDB connection failed during testing', err);
        return;
      }

      if (retries === 0) {
        console.error('MongoDB connection failed after multiple attempts', err);
        process.exit(1);
      }
      
      console.log(`MongoDB connection failed, retrying in ${delay}ms...`);
      setTimeout(() => connectWithRetry(retries - 1, delay), delay);
    }
  };
  
  await connectWithRetry();
};
