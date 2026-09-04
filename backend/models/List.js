const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  title: { type: String, required: true },
  order: { type: Number, required: true }, // Used for reordering lists
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

listSchema.index({ boardId: 1 });

module.exports = mongoose.model('List', listSchema);
