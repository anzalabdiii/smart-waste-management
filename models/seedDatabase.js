const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/user.js');
const Collection = require('../models/Collection');
const Report = require('../models/Report');

// Load env vars
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Collection.deleteMany();
    await Report.deleteMany();

    console.log('🗑️  Data cleared...');

    // Create Admin User
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@waste.com',
      password: 'admin123',
      role: 'admin',
      phone: '+254712345678',
      address: {
        street: '123 Admin Street',
        city: 'Nairobi',
        state: 'Nairobi',
        zipCode: '00100',
      },
      zone: 'Central',
      isActive: true,
    });

    // Create Collectors
    const collector1 = await User.create({
      name: 'John Collector',
      email: 'collector1@waste.com',
      password: 'collector123',
      role: 'collector',
      phone: '+254723456789',
      address: {
        street: '456 Collector Avenue',
        city: 'Nairobi',
        state: 'Nairobi',
        zipCode: '00200',
      },
      zone: 'Zone-A',
      isActive: true,
    });

    const collector2 = await User.create({
      name: 'Jane Collector',
      email: 'collector2@waste.com',
      password: 'collector123',
      role: 'collector',
      phone: '+254734567890',
      address: {
        street: '789 Waste Drive',
        city: 'Nairobi',
        state: 'Nairobi',
        zipCode: '00300',
      },
      zone: 'Zone-B',
      isActive: true,
    });

    // Create Residents
    const resident1 = await User.create({
      name: 'Alice Resident',
      email: 'resident1@waste.com',
      password: 'resident123',
      role: 'resident',
      phone: '+254745678901',
      address: {
        street: '321 Resident Road',
        city: 'Nairobi',
        state: 'Nairobi',
        zipCode: '00400',
      },
      zone: 'Zone-A',
      isActive: true,
    });

    const resident2 = await User.create({
      name: 'Bob Resident',
      email: 'resident2@waste.com',
      password: 'resident123',
      role: 'resident',
      phone: '+254756789012',
      address: {
        street: '654 Home Lane',
        city: 'Nairobi',
        state: 'Nairobi',
        zipCode: '00500',
      },
      zone: 'Zone-B',
      isActive: true,
    });

    const resident3 = await User.create({
      name: 'Charlie Resident',
      email: 'resident3@waste.com',
      password: 'resident123',
      role: 'resident',
      phone: '+254767890123',
      address: {
        street: '987 Park Street',
        city: 'Nairobi',
        state: 'Nairobi',
        zipCode: '00600',
      },
      zone: 'Zone-A',
      isActive: true,
    });

    console.log('✅ Users created...');

    // Create Collections
    const collection1 = await Collection.create({
      resident: resident1._id,
      collector: collector1._id,
      address: resident1.address,
      zone: 'Zone-A',
      wasteType: 'general',
      status: 'completed',
      priority: 'medium',
      scheduledDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      description: 'Weekly general waste collection',
    });

    const collection2 = await Collection.create({
      resident: resident2._id,
      collector: collector2._id,
      address: resident2.address,
      zone: 'Zone-B',
      wasteType: 'recyclable',
      status: 'in-progress',
      priority: 'high',
      scheduledDate: new Date(),
      description: 'Recyclable materials pickup',
    });

    const collection3 = await Collection.create({
      resident: resident3._id,
      address: resident3.address,
      zone: 'Zone-A',
      wasteType: 'organic',
      status: 'pending',
      priority: 'low',
      scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      description: 'Garden waste collection',
    });

    const collection4 = await Collection.create({
      resident: resident1._id,
      collector: collector1._id,
      address: resident1.address,
      zone: 'Zone-A',
      wasteType: 'hazardous',
      status: 'assigned',
      priority: 'high',
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      description: 'Electronic waste disposal',
    });

    console.log('✅ Collections created...');

    // Create Reports
    const report1 = await Report.create({
      reportedBy: resident1._id,
      type: 'full-bin',
      title: 'Overflowing waste bin',
      description: 'The communal bin on Resident Road is overflowing and needs immediate attention.',
      location: {
        street: '321 Resident Road',
        city: 'Nairobi',
      },
      zone: 'Zone-A',
      status: 'resolved',
      priority: 'high',
      resolvedBy: collector1._id,
      resolvedDate: new Date(),
      resolution: 'Bin emptied and cleaned',
    });

    const report2 = await Report.create({
      reportedBy: resident2._id,
      type: 'missed-collection',
      title: 'Missed scheduled pickup',
      description: 'Scheduled collection on Tuesday was missed. Waste still waiting.',
      location: {
        street: '654 Home Lane',
        city: 'Nairobi',
      },
      zone: 'Zone-B',
      status: 'in-progress',
      priority: 'medium',
    });

    const report3 = await Report.create({
      reportedBy: collector1._id,
      type: 'damaged-bin',
      title: 'Damaged waste container',
      description: 'Large container on Park Street is damaged and leaking.',
      location: {
        street: '987 Park Street',
        city: 'Nairobi',
      },
      zone: 'Zone-A',
      status: 'open',
      priority: 'high',
    });

    const report4 = await Report.create({
      reportedBy: resident3._id,
      type: 'illegal-dumping',
      title: 'Illegal waste dumping',
      description: 'Construction waste dumped illegally near the community center.',
      location: {
        street: 'Community Center Parking',
        city: 'Nairobi',
      },
      zone: 'Zone-A',
      status: 'open',
      priority: 'urgent',
    });

    console.log('✅ Reports created...');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📧 Login Credentials:');
    console.log('Admin: admin@waste.com / admin123');
    console.log('Collector 1: collector1@waste.com / collector123');
    console.log('Collector 2: collector2@waste.com / collector123');
    console.log('Resident 1: resident1@waste.com / resident123');
    console.log('Resident 2: resident2@waste.com / resident123');
    console.log('Resident 3: resident3@waste.com / resident123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();