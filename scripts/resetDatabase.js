import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Agent from '../models/Agent.js';
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

const resetDatabase = async () => {
  try {
    await connectDB();

    console.log('Clearing database...');
    
    await Guest.deleteMany({});
    console.log('✓ Guests cleared');
    
    await Room.deleteMany({});
    console.log('✓ Rooms cleared');
    
    await Agent.deleteMany({});
    console.log('✓ Agents cleared');
    
    await User.deleteMany({});
    console.log('✓ Users cleared');

    console.log('\nCreating new user...');
    
    const user = await User.create({
      email: 'mustafaismail6302@gmail.com',
      password: 'M21454678'
    });

    console.log('✓ User created successfully!');
    console.log(`  Email: ${user.email}`);
    console.log(`  ID: ${user._id}`);

    await mongoose.connection.close();
    console.log('\nDatabase reset complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

resetDatabase();

