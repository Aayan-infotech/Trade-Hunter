const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://tradehunter:Rs908422@cluster0.ecbzb4r.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
        
        console.log('MongoDB connected...');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1); 
    }
};

module.exports = connectDB; 
