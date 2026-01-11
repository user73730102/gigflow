require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./config/db');

// Models
const User = require('./models/User');
const Gig = require('./models/Gig');
const Bid = require('./models/Bid');

// Middleware
const auth = require('./middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  process.env.CLIENT_URL // We will set this in Render dashboard later
];

// CORS Config for Cookie Support
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

connectDB();

// --- Socket.io Setup (Bonus 2) ---
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ["GET", "POST"] }
});

// Map userId to socketId for private messaging
const onlineUsers = new Map();

io.on('connection', (socket) => {
  // Client sends "join" event with userId on login
  socket.on('join', (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  socket.on('disconnect', () => {
    // Cleanup logic if needed
  });
});

// --- API Routes ---

// 1. Auth: Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const user = await User.create({ name, email, password: hashedPassword });
  res.json({ msg: 'User registered' });
});

// 2. Auth: Login
// Inside server.js - /api/auth/login

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ msg: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user._id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  // --- COPY THIS EXACT COOKIE CONFIGURATION ---
  res.cookie('token', token, {
    httpOnly: true,
    // Production (HTTPS) requires secure: true and sameSite: none
    secure: process.env.NODE_ENV === 'production', 
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }).json({ user: { id: user._id, name: user.name, email: user.email } });
  // ---------------------------------------------
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token').json({ msg: 'Logged out' });
});

// 3. Get User (Persistence)
app.get('/api/auth/me', auth, async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');
  res.json(user);
});

// 4. Get Open Gigs (with Search)
app.get('/api/gigs', async (req, res) => {
  const { search } = req.query;
  const query = { status: 'open' };
  if (search) query.title = { $regex: search, $options: 'i' };
  
  const gigs = await Gig.find(query).sort({ createdAt: -1 }).populate('ownerId', 'name');
  res.json(gigs);
});

// 5. Post a Gig
app.post('/api/gigs', auth, async (req, res) => {
  const { title, description, budget } = req.body;
  const gig = await Gig.create({
    title, description, budget, ownerId: req.user.userId
  });
  res.json(gig);
});

// 6. Submit a Bid
app.post('/api/bids', auth, async (req, res) => {
  const { gigId, message, price } = req.body;
  // Prevent double bidding
  const existingBid = await Bid.findOne({ gigId, freelancerId: req.user.userId });
  if (existingBid) return res.status(400).json({ msg: 'Already bid on this gig' });

  const bid = await Bid.create({
    gigId, freelancerId: req.user.userId, message, price
  });
  res.json(bid);
});

// server.js

// Add this NEW route ABOVE the app.get('/api/bids/:gigId'...) route
app.get('/api/bids/my-bids', auth, async (req, res) => {
  try {
    // Find all bids by this freelancer and only return the gig IDs
    const bids = await Bid.find({ freelancerId: req.user.userId }).select('gigId');
    // Return array of strings: ['gigId1', 'gigId2']
    res.json(bids.map(b => b.gigId));
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

// 7. Get Bids for a Gig (Owner Only)
app.get('/api/bids/:gigId', auth, async (req, res) => {
  const gig = await Gig.findById(req.params.gigId);
  if (!gig) return res.status(404).json({ msg: 'Gig not found' });
  if (gig.ownerId.toString() !== req.user.userId) return res.status(403).json({ msg: 'Unauthorized' });

  const bids = await Bid.find({ gigId: req.params.gigId }).populate('freelancerId', 'name email');
  res.json(bids);
});

// 8. HIRE LOGIC (Atomic Transaction + Race Condition Handling) -- BONUS 1
app.patch('/api/bids/:bidId/hire', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bidToHire = await Bid.findById(req.params.bidId).session(session);
    if (!bidToHire) throw new Error('Bid not found');

    const gig = await Gig.findById(bidToHire.gigId).session(session);
    
    // Auth Check
    if (gig.ownerId.toString() !== req.user.userId) {
      throw new Error('Unauthorized action');
    }

    // RACE CONDITION CHECK: Is gig already assigned?
    if (gig.status === 'assigned') {
      await session.abortTransaction();
      return res.status(400).json({ msg: 'Gig is already assigned to someone else!' });
    }

    // 1. Update the chosen bid
    bidToHire.status = 'hired';
    await bidToHire.save({ session });

    // 2. Update Gig status
    gig.status = 'assigned';
    await gig.save({ session });

    // 3. Reject all other bids for this gig
    await Bid.updateMany(
      { gigId: gig._id, _id: { $ne: bidToHire._id } },
      { $set: { status: 'rejected' } },
      { session }
    );

    await session.commitTransaction();

    // --- BONUS 2: Real-time Notification ---
    const freelancerSocketId = onlineUsers.get(bidToHire.freelancerId.toString());
    if (freelancerSocketId) {
      io.to(freelancerSocketId).emit('notification', {
        message: `You have been hired for the project: "${gig.title}"!`,
        gigId: gig._id
      });
    }

    res.json({ msg: 'Freelancer hired successfully', bid: bidToHire });

  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    res.status(500).json({ msg: err.message || 'Server Error' });
  } finally {
    session.endSession();
  }
});

server.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));