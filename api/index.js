import connectDB from '../config/database.js';
import app from '../server.js';

connectDB().catch(console.error);

export default app;

