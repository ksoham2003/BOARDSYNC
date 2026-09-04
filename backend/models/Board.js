const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'member'], default: 'member' }
  }]
}, { timestamps: true });

// Index for fast query of user's boards
boardSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Board', boardSchema);
