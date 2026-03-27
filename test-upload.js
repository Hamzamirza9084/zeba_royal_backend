require('dotenv').config();
const { cloudinary } = require('./config/cloudinary');

async function testUpload() {
  try {
    const result = await cloudinary.uploader.upload('dummy.pdf', {
      folder: 'zeba_royal_documents',
      // mimic what the multer storage is doing:
      format: 'pdf',
      public_id: `test-${Date.now()}`
    });
    console.log("Upload Success! URL:", result.secure_url);
    console.log("Resource Type:", result.resource_type);
  } catch (err) {
    console.error("Upload failed:", err.message);
  }
}

testUpload();
