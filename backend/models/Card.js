const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  listId: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true },
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  order: { type: Number, required: true }, // Used for vertical reordering
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

cardSchema.index({ listId: 1 });
cardSchema.index({ boardId: 1 });

module.exports = mongoose.model('Card', cardSchema);
