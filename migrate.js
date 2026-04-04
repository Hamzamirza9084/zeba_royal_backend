const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Destination = require('./models/Destination');
const Institution = require('./models/Institution');
const University = require('./models/University');

const migrate = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected!');

    const universities = await University.find({});
    console.log(`Found ${universities.length} programs to process...`);

    let updatedCount = 0;

    for (const uni of universities) {
      if (!uni.country || !uni.name) {
        console.log(`Skipping program ${uni._id} due to missing country or name.`);
        continue;
      }

      // Step 1: Ensure Destination Exists
      let destination = await Destination.findOne({ name: uni.country });
      if (!destination) {
        destination = await Destination.create({ name: uni.country });
        console.log(`Created Destination: ${uni.country}`);
      }

      // Step 2: Ensure Institution Exists
      let institution = await Institution.findOne({ name: uni.name, destinationId: destination._id });
      if (!institution) {
        institution = await Institution.create({
          name: uni.name,
          destinationId: destination._id,
          city: uni.city || "",
          ranking: uni.ranking || "",
          website: uni.website || "",
          logo: uni.logo || "",
          mapLocation: "" // Placeholder
        });
        console.log(`Created Institution: ${uni.name} in ${uni.country}`);
      }

      // Step 3: Link Institution to University Program
      if (!uni.institutionId || uni.institutionId.toString() !== institution._id.toString()) {
        uni.institutionId = institution._id;
        await uni.save();
        updatedCount++;
      }
    }

    console.log(`\nMigration completed successfully. Updated ${updatedCount} programs with institutionId.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
