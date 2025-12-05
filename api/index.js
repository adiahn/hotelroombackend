import connectDB from '../config/database.js';
import app from '../server.js';

let connectionPromise = null;

export default async (req, res) => {
  if (!connectionPromise) {
    connectionPromise = connectDB().catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }
  
  try {
    await connectionPromise;
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({ error: 'Database connection failed' });
  }
  
  return app(req, res);
};

