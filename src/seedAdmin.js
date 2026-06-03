const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('./models/User');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fa';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Placement Officer';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const ADMIN_ROLE = process.env.ADMIN_ROLE || 'placement_officer';

const main = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    const existingUser = await User.findOne({ email: ADMIN_EMAIL }).select('+password');
    if (existingUser) {
      existingUser.name = ADMIN_NAME;
      existingUser.role = ADMIN_ROLE;
      existingUser.password = ADMIN_PASSWORD;
      await existingUser.save();
      console.log(`Updated existing admin user ${ADMIN_EMAIL}`);
    } else {
      await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: ADMIN_ROLE });
      console.log(`Created admin user ${ADMIN_EMAIL}`);
    }
    process.exit(0);
  } catch (error) {
    console.error('Seed failed', error);
    process.exit(1);
  }
};

main();
