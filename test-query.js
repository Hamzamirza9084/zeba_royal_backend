const mongoose = require('mongoose');
const dotenv = require('dotenv').config();
const connectDB = require('./config/db');
const University = require('./models/University');
const Institution = require('./models/Institution');

async function runTest() {
  await connectDB();
  console.log("Database connected!");

  console.time('fetchInstitutions');
  const institutions = await Institution.find()
    .populate('destinationId')
    .lean();
  console.timeEnd('fetchInstitutions');
  console.log("Institutions count:", institutions.length);

  console.time('fetchUniversities');
  const universities = await University.find({}).sort({ _id: -1 }).lean();
  console.timeEnd('fetchUniversities');
  console.log("Universities count:", universities.length);

  await mongoose.connection.close();
  console.log("Database connection closed");
}

runTest().catch(console.error);
