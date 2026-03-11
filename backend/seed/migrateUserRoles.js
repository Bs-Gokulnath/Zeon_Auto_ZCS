require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const ADMIN_EMAILS = ['madhan@zeoncharging.com', 'techcrivo@gmail.com'];

async function migrateUserRoles() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const allUsers = await User.find({});
    console.log(`📊 Found ${allUsers.length} users in database\n`);

    let updatedCount = 0;
    let alreadySetCount = 0;

    for (const user of allUsers) {
      const email = user.email.toLowerCase();
      const isAdmin = ADMIN_EMAILS.includes(email);
      const targetRole = isAdmin ? 'admin' : 'user';

      // Check if user already has the correct role
      if (user.role === targetRole) {
        console.log(`ℹ️  User already has correct role: ${email} (${targetRole})`);
        alreadySetCount++;
        continue;
      }

      // Update user role
      user.role = targetRole;
      
      // Set addedBy for admins if not set
      if (isAdmin && !user.addedBy) {
        user.addedBy = 'System';
      }
      
      // Ensure isActive is set
      if (user.isActive === undefined) {
        user.isActive = true;
      }

      await user.save();
      console.log(`✅ Updated: ${email} → role: ${targetRole}${isAdmin ? ', addedBy: System' : ''}`);
      updatedCount++;
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Migration completed successfully!');
    console.log('='.repeat(50));
    console.log(`📊 Summary:`);
    console.log(`   - Total users: ${allUsers.length}`);
    console.log(`   - Updated: ${updatedCount}`);
    console.log(`   - Already set: ${alreadySetCount}`);
    console.log(`\n👥 Admin accounts:`);
    ADMIN_EMAILS.forEach(email => console.log(`   - ${email}`));
    console.log('='.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

migrateUserRoles();
