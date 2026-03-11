// Seed script to create admin accounts
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');

const ADMIN_EMAILS = [
  'madhan@zeoncharging.com',
  'techcrivo@gmail.com'
];

async function seedAdminAccounts() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zeon_auth');
    console.log('✅ Connected to MongoDB');

    // Check and create admin accounts
    for (const email of ADMIN_EMAILS) {
      const existingUser = await User.findOne({ email });
      
      if (existingUser) {
        console.log(`ℹ️  Admin already exists: ${email}`);
        
        // Update to ensure admin role
        if (existingUser.role !== 'admin') {
          existingUser.role = 'admin';
          existingUser.isActive = true;
          await existingUser.save();
          console.log(`   ✅ Updated ${email} to admin role`);
        }
      } else {
        // Create new admin
        await User.create({
          email,
          role: 'admin',
          addedBy: 'System',
          isActive: true
        });
        console.log(`✅ Created admin account: ${email}`);
      }
    }

    console.log('\n🎉 Admin seeding completed successfully!');
    console.log('\nAdmin accounts:');
    ADMIN_EMAILS.forEach(email => console.log(`   - ${email}`));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin accounts:', error);
    process.exit(1);
  }
}

seedAdminAccounts();
