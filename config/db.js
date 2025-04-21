const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        // await mongoose.connect(process.env.MONGODB_URI);
        await mongoose.connect('mongodb+srv://anuragyadav:hs0PwDnmUexc7zn7@cluster0.3h4gs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

        console.log('MongoDB connected...');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1); 
    }
};

module.exports = connectDB; 
