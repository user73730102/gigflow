const mongoose = require('mongoose');

const GigSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  budget: { type: Number, required: true }, // Mongoose will auto-convert strings like "500" to number 500
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['open', 'assigned'], default: 'open' }
}, { timestamps: true });

module.exports = mongoose.model('Gig', GigSchema);