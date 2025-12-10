import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Room from '../models/Room.js';
import Guest from '../models/Guest.js';

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

const deleteRoom = async () => {
  try {
    await connectDB();

    const roomNumber = '230';
    console.log(`\nSearching for room ${roomNumber}...\n`);
    
    const room = await Room.findOne({ number: roomNumber });

    if (!room) {
      console.log(`Room ${roomNumber} not found.`);
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('Room found:');
    console.log(`  Room ID: ${room._id}`);
    console.log(`  Number: ${room.number}`);
    console.log(`  Capacity: ${room.capacity}`);
    console.log(`  Occupied Beds: ${room.occupiedBeds}`);
    console.log(`  Assigned Agent: ${room.assignedAgentId || 'None'}`);
    console.log();

    const activeGuests = await Guest.find({
      roomId: room._id,
      checkedOut: false
    });

    if (activeGuests.length > 0) {
      console.log(`⚠️  Warning: Room has ${activeGuests.length} active guest(s):`);
      activeGuests.forEach(guest => {
        console.log(`  - ${guest.name} (Guest ID: ${guest._id})`);
      });
      console.log();
      console.log('Room will be deleted anyway. Active guests will remain but room reference will be invalid.');
    }

    await Room.findByIdAndDelete(room._id);
    console.log(`✓ Room ${roomNumber} deleted successfully!`);

    await mongoose.connection.close();
    console.log('\nDeletion complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

deleteRoom();


