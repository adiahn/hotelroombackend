import mongoose from 'mongoose';
import dotenv from 'dotenv';
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

const updateEmail = async () => {
  try {
    await connectDB();

    console.log('Updating user email...');
    
    const user = await User.findOne({ email: 'mustafaismail6302@gmail.com' });
    
    if (!user) {
      console.log('User not found!');
      await mongoose.connection.close();
      process.exit(1);
    }

    user.email = 'mustafaismail630@gmail.com';
    await user.save();

    console.log('✓ Email updated successfully!');
    console.log(`  Old Email: mustafaismail6302@gmail.com`);
    console.log(`  New Email: ${user.email}`);
    console.log(`  User ID: ${user._id}`);

    await mongoose.connection.close();
    console.log('\nUpdate complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

updateEmail();

