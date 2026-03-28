const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Destination = require('./models/Destination');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const seedDestinations = async () => {
  await connectDB();

  const defaultCountries = [
    "United States of America",
    "Canada",
    "United Kingdom",
    "Australia",
    "Ireland",
    "Germany",
    "France",
    "Singapore",
    "New Zealand",
    "Netherlands"
  ];

  try {
    for (const country of defaultCountries) {
      const exists = await Destination.findOne({ name: country });
      if (!exists) {
        await Destination.create({ name: country });
        console.log(`Added ${country}`);
      } else {
        console.log(`${country} already exists`);
      }
    }
    console.log('Seed completed successfully');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedDestinations();
