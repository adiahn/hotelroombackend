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

const checkRooms = async () => {
  try {
    await connectDB();

    console.log('\nChecking rooms in database...\n');
    
    const totalRooms = await Room.countDocuments({});
    console.log(`Total number of rooms: ${totalRooms}`);
    console.log();

    const room101 = await Room.findOne({ number: '101' });
    const room102 = await Room.findOne({ number: '102' });

    console.log('='.repeat(60));
    console.log('ROOM 101:');
    console.log('='.repeat(60));
    if (room101) {
      console.log('✓ Room 101 EXISTS');
      console.log(`  Room ID: ${room101._id}`);
      console.log(`  Capacity: ${room101.capacity}`);
      console.log(`  Occupied Beds: ${room101.occupiedBeds}`);
      console.log(`  Assigned Agent ID: ${room101.assignedAgentId || 'None'}`);
      console.log(`  User ID: ${room101.userId}`);
      console.log(`  Created: ${room101.createdAt}`);
    } else {
      console.log('✗ Room 101 NOT FOUND');
    }
    console.log();

    console.log('='.repeat(60));
    console.log('ROOM 102:');
    console.log('='.repeat(60));
    if (room102) {
      console.log('✓ Room 102 EXISTS');
      console.log(`  Room ID: ${room102._id}`);
      console.log(`  Capacity: ${room102.capacity}`);
      console.log(`  Occupied Beds: ${room102.occupiedBeds}`);
      console.log(`  Assigned Agent ID: ${room102.assignedAgentId || 'None'}`);
      console.log(`  User ID: ${room102.userId}`);
      console.log(`  Created: ${room102.createdAt}`);
    } else {
      console.log('✗ Room 102 NOT FOUND');
    }
    console.log();

    await mongoose.connection.close();
    console.log('Query complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

checkRooms();

