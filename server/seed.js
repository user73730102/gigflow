// server/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Gig = require('./models/Gig');
const Bid = require('./models/Bid');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🌱 MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const seedData = async () => {
  await connectDB();

  console.log('🧹 Clearing existing data...');
  await User.deleteMany({});
  await Gig.deleteMany({});
  await Bid.deleteMany({});

  console.log('👤 Creating Users...');
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash('123456', salt); // Same password for everyone

  const users = await User.create([
    { name: 'Alice Client', email: 'alice@example.com', password },
    { name: 'Bob Freelancer', email: 'bob@example.com', password },
    { name: 'Charlie Designer', email: 'charlie@example.com', password },
  ]);

  const [alice, bob, charlie] = users;

  console.log('💼 Creating Gigs...');
  const gigs = await Gig.create([
    {
      title: 'Full Stack React E-commerce',
      description: 'Looking for an expert to build a MERN stack shop with Stripe integration. Must be completed in 2 weeks.',
      budget: 1500,
      ownerId: alice._id,
      status: 'open'
    },
    {
      title: 'Company Logo & Branding',
      description: 'Need a modern, minimalist logo for a tech startup. Vector files required.',
      budget: 300,
      ownerId: alice._id,
      status: 'open'
    },
    {
      title: 'Fix MongoDB Aggregate Query',
      description: 'I have a slow API endpoint. Need someone to optimize the indexing and aggregation pipeline.',
      budget: 100,
      ownerId: bob._id, // Bob acts as a client here!
      status: 'open'
    },
    {
      title: 'Mobile App UI Design (Completed)',
      description: 'Design 5 screens for a fitness app. Figma preferred.',
      budget: 600,
      ownerId: alice._id,
      status: 'assigned' // Already hired someone
    }
  ]);

  const [reactGig, designGig, mongoGig, closedGig] = gigs;

  console.log('🙋 Placing Bids...');
  const bids = await Bid.create([
    // Bids on the React Gig
    {
      gigId: reactGig._id,
      freelancerId: bob._id,
      message: 'I have built 5 e-commerce sites. I can start today.',
      price: 1500,
      status: 'pending'
    },
    {
      gigId: reactGig._id,
      freelancerId: charlie._id,
      message: 'I can do the frontend, but I might need help with backend.',
      price: 1200, // Undercutting price
      status: 'pending'
    },

    // Bids on the Design Gig
    {
      gigId: designGig._id,
      freelancerId: charlie._id,
      message: 'Check my portfolio. I specialize in minimalism.',
      price: 300,
      status: 'pending'
    },

    // Closed Gig History
    {
      gigId: closedGig._id,
      freelancerId: charlie._id,
      message: 'This sounds fun!',
      price: 600,
      status: 'hired'
    }
  ]);

  console.log('✅ Data Seeded Successfully!');
  console.log('---------------------------------');
  console.log('🔑 Login Credentials (Password: 123456):');
  console.log('1. alice@example.com (Has Gigs with Bids)');
  console.log('2. bob@example.com   (Developer Bidder)');
  console.log('3. charlie@example.com (Designer Bidder)');
  console.log('---------------------------------');
  process.exit();
};

seedData();