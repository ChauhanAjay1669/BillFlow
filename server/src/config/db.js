import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/billflow';
  
  // Mask credentials for clean logging
  const maskedUri = uri.replace(/\/\/(.*):(.*)@/, '//***:***@');
  
  try {
    const conn = await mongoose.connect(uri);
    const isCloud = uri.includes('mongodb+srv') || !uri.includes('127.0.0.1') && !uri.includes('localhost');
    console.log(`[MongoDB] Connected successfully to ${isCloud ? 'Cloud Atlas' : 'Local'}: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error to ${maskedUri}: ${error.message}`);
    if (uri.includes('mongodb+srv')) {
      console.error('[MongoDB Atlas Tip] Ensure your IP address is whitelisted in Atlas Network Access (e.g. 0.0.0.0/0) and credentials are valid.');
    }
    process.exit(1);
  }
};
