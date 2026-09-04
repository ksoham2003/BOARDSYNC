const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String },
    role: { type: String, enum: ['owner', 'member'], default: 'member' },
    status: { type: String, enum: ['active', 'pending'], default: 'pending' }
  }]
}, { timestamps: true });

// Index for fast query of user's active boards
boardSchema.index({ 'members.user': 1 });
boardSchema.index({ 'members.email': 1 });

module.exports = mongoose.model('Board', boardSchema);
