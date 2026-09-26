const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Ensure all existing university records default to '$' currency
    try {
      const University = require('../models/University');
      await University.updateMany(
        { $or: [{ currency: { $exists: false } }, { currency: null }, { currency: '' }] },
        { $set: { currency: '$' } }
      );
    } catch (migErr) {
      console.error('Currency migration note:', migErr.message);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;