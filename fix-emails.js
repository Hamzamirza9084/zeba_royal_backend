/**
 * One-time migration script to normalize all existing user emails to lowercase.
 * Run with: node fix-emails.js
 * 
 * This fixes the root cause of "invalid credentials" for users who registered
 * with mixed-case emails (e.g., "John@Gmail.COM") but try to login with
 * lowercase (e.g., "john@gmail.com").
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv').config();
const User = require('./models/User');

const fixEmails = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({});
    let fixedCount = 0;

    for (const user of users) {
      const normalizedEmail = user.email.trim().toLowerCase();
      if (user.email !== normalizedEmail) {
        console.log(`Fixing: "${user.email}" → "${normalizedEmail}"`);
        user.email = normalizedEmail;
        await user.save();
        fixedCount++;
      }
    }

    console.log(`\nDone! Fixed ${fixedCount} out of ${users.length} users.`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

fixEmails();
