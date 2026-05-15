require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Hash password once manually
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('Rajesh2005', salt);

    // Use updateOne to bypass the pre-save hook (avoids double-hashing)
    const result = await User.updateOne(
      { $or: [{ email: 'rajeshlrajeshl88@gmail.com' }, { username: 'rajesh' }] },
      { $set: { password: hashed, role: 'admin', username: 'rajesh' } }
    );

    if (result.matchedCount > 0) {
      console.log('✅ Admin password reset successfully!');
    } else {
      // No existing user — create new
      await User.collection.insertOne({
        username: 'rajesh',
        email: 'rajeshlrajeshl88@gmail.com',
        password: hashed,
        role: 'admin',
        restores: 2,
        lastResetDate: new Date().toDateString(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Admin user created!');
    }

    // Verify login works
    const admin = await User.findOne({ username: 'rajesh' });
    const ok = await bcrypt.compare('Rajesh2005', admin.password);
    console.log(`🔐 Password verification: ${ok ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`   Role: ${admin.role}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}
seed();
