import mongoose from 'mongoose';

export const connectDB = async () => {
  const connectWithRetry = async (retries = 5, delay = 5000) => {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/figure-collector');
      console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    } catch (err) {
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
