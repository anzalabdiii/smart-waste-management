const mongoose = require('mongoose');
const User = require('./models/user');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminEmail = process.argv[2] || 'admin@test.com';
    const adminPassword = process.argv[3] || 'admin123';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin with this email already exists!');
      console.log('Updating role to admin...');
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('✅ User updated to admin role');
      process.exit(0);
    }

    // Create new admin
    const admin = await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
    });

    console.log('✅ Admin created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('\nYou can now login with these credentials');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
