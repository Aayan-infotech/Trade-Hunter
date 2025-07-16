const mongoose = require('mongoose');
const { getSecrets } = require('../utils/awsSecrets');

const connectDB = async () => {
  try {
    const secrets = await getSecrets();

    const mongoURI = secrets.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MONGODB_URI not found in AWS Secrets");
    }

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB connected...');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
