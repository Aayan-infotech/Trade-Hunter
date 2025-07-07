const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        if (!mongoURI) {
            throw new Error("MONGODB_URI not found in environment variables");
        }

        await mongoose.connect(mongoURI); 

        console.log('MongoDB connected...');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
