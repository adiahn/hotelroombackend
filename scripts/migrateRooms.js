import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Room from '../models/Room.js';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const migrateRooms = async () => {
  try {
    await connectDB();

    console.log('Migrating rooms to add assignedAgentId field...');
    
    const result = await Room.updateMany(
      { assignedAgentId: { $exists: false } },
      { $set: { assignedAgentId: null } }
    );

    console.log(`✓ Migration complete!`);
    console.log(`  Rooms updated: ${result.modifiedCount}`);
    console.log(`  Rooms matched: ${result.matchedCount}`);

    const totalRooms = await Room.countDocuments();
    console.log(`  Total rooms in database: ${totalRooms}`);

    await mongoose.connection.close();
    console.log('\nMigration finished!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

migrateRooms();

