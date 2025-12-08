import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Room from '../models/Room.js';
import Agent from '../models/Agent.js';
import User from '../models/User.js';

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

const listRoomsWithAgents = async () => {
  try {
    await connectDB();

    console.log('\nFetching rooms with assigned agents...\n');
    
    const rooms = await Room.find({})
      .populate('assignedAgentId', 'name')
      .populate('userId', 'email')
      .sort({ createdAt: -1 });

    if (rooms.length === 0) {
      console.log('No rooms found in the database.');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('='.repeat(80));
    console.log('ROOMS AND ASSIGNED AGENTS');
    console.log('='.repeat(80));
    console.log();

    rooms.forEach((room, index) => {
      console.log(`${index + 1}. Room Number: ${room.number}`);
      console.log(`   Capacity: ${room.capacity}`);
      console.log(`   Occupied Beds: ${room.occupiedBeds}`);
      console.log(`   User Email: ${room.userId?.email || 'N/A'}`);
      
      if (room.assignedAgentId) {
        console.log(`   Assigned Agent: ${room.assignedAgentId.name} (ID: ${room.assignedAgentId._id})`);
      } else {
        console.log(`   Assigned Agent: None (Not assigned)`);
      }
      
      console.log(`   Room ID: ${room._id}`);
      console.log(`   Created: ${room.createdAt}`);
      console.log();
    });

    console.log('='.repeat(80));
    console.log(`Total Rooms: ${rooms.length}`);
    const assignedRooms = rooms.filter(r => r.assignedAgentId).length;
    const unassignedRooms = rooms.length - assignedRooms;
    console.log(`Assigned Rooms: ${assignedRooms}`);
    console.log(`Unassigned Rooms: ${unassignedRooms}`);
    console.log('='.repeat(80));

    await mongoose.connection.close();
    console.log('\nQuery complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

listRoomsWithAgents();

