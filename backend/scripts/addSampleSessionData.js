// Script to add sample session data to the database
// Run with: node scripts/addSampleSessionData.js

require('dotenv').config();
const mongoose = require('mongoose');
const SessionData = require('../src/models/SessionData');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://192.168.2.11:27017/zeon_db';
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected to:', mongoURI);
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const addSampleData = async () => {
  try {
    // Clear existing data (optional)
    // await SessionData.deleteMany({});
    // console.log('Cleared existing session data');

    // Create sample data for February 2026
    const sampleData = [];
    
    // Add data for Feb 23-27, 2026
    for (let day = 23; day <= 27; day++) {
      for (let hour = 0; hour < 3; hour++) {
        sampleData.push({
          date: new Date(2026, 1, day, hour + 8, 0, 0), // Feb is month 1 (0-indexed)
          data: {
            sessionId: `session_${day}_${hour}`,
            chargePointId: `CP00${day}`,
            energyConsumed: Math.floor(Math.random() * 50) + 10,
            duration: Math.floor(Math.random() * 120) + 30,
            cost: (Math.random() * 100 + 20).toFixed(2),
            userId: `user_${Math.floor(Math.random() * 100)}`,
            status: ['completed', 'in-progress', 'stopped'][Math.floor(Math.random() * 3)]
          }
        });
      }
    }

    // Add some data for March 2026
    for (let day = 1; day <= 5; day++) {
      for (let hour = 0; hour < 2; hour++) {
        sampleData.push({
          date: new Date(2026, 2, day, hour + 9, 0, 0), // March is month 2 (0-indexed)
          data: {
            sessionId: `session_mar_${day}_${hour}`,
            chargePointId: `CP00${day + 30}`,
            energyConsumed: Math.floor(Math.random() * 50) + 10,
            duration: Math.floor(Math.random() * 120) + 30,
            cost: (Math.random() * 100 + 20).toFixed(2),
            userId: `user_${Math.floor(Math.random() * 100)}`,
            status: ['completed', 'in-progress', 'stopped'][Math.floor(Math.random() * 3)]
          }
        });
      }
    }

    const result = await SessionData.insertMany(sampleData);
    console.log(`✅ Successfully added ${result.length} sample session records`);
    console.log(`Date range: Feb 23, 2026 - Mar 5, 2026`);
    
  } catch (error) {
    console.error('Error adding sample data:', error);
  }
};

const main = async () => {
  await connectDB();
  await addSampleData();
  await mongoose.connection.close();
  console.log('Database connection closed');
};

main();
