const express = require('express');
const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();

// Middleware to check if user is an ACTIVE member of the board
const checkBoardMembership = async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.body.boardId;
    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    const member = board.members.find(m => 
      (m.user && m.user.toString() === req.user.userId) || 
      (m.email && m.email.toLowerCase() === req.user.email?.toLowerCase())
    );

    if (!member) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this board.' });
    }

    req.board = board;
    req.boardMember = member;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- BOARDS ---

// Get all active boards for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const userEmail = user?.email?.toLowerCase();

    const boards = await Board.find({
      members: {
        $elemMatch: {
          $or: [
            { user: req.user.userId },
            { email: userEmail }
          ]
        }
      }
    })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar');

    res.json(boards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new board (creator is automatically active owner)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;
    const user = await User.findById(req.user.userId);

    const board = new Board({
      title,
      owner: req.user.userId,
      members: [{ 
        user: req.user.userId, 
        email: user?.email, 
        role: 'owner', 
        status: 'active' 
      }]
    });
    await board.save();
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single board with its lists and cards
router.get('/:boardId', authMiddleware, checkBoardMembership, async (req, res) => {
  try {
    const board = await Board.findById(req.params.boardId)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');
      
    const lists = await List.find({ boardId: req.params.boardId })
      .populate('createdBy', 'name email avatar')
      .sort('order');
      
    const cards = await Card.find({ boardId: req.params.boardId })
      .populate('createdBy', 'name email avatar')
      .sort('order');
    
    res.json({ board: board.toObject(), lists, cards });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add member directly to board by email
router.post('/:boardId/invite', authMiddleware, checkBoardMembership, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();
    const userToAdd = await User.findOne({ email: normalizedEmail });
    
    // Check if already a member
    const existingMember = req.board.members.find(m => 
      (m.email && m.email.toLowerCase() === normalizedEmail) ||
      (userToAdd && m.user && m.user.toString() === userToAdd._id.toString())
    );

    if (existingMember) {
      if (existingMember.status === 'active') {
        return res.status(400).json({ message: 'User is already a member of this board' });
      } else {
        existingMember.status = 'active';
        if (userToAdd) existingMember.user = userToAdd._id;
      }
    } else {
      req.board.members.push({ 
        user: userToAdd ? userToAdd._id : null, 
        email: normalizedEmail,
        role: 'member',
        status: 'active' // Directly active!
      });
    }

    await req.board.save();
    const updatedBoard = await Board.findById(req.params.boardId)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json({
      board: updatedBoard,
      message: `${normalizedEmail} added to board successfully!`
    });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ message: 'Failed to add member to board' });
  }
});

// --- LISTS ---

// Create list
router.post('/:boardId/lists', authMiddleware, checkBoardMembership, async (req, res) => {
  try {
    const { title } = req.body;
    const lastList = await List.findOne({ boardId: req.params.boardId }).sort('-order');
    const order = lastList ? lastList.order + 65536 : 65536;

    let list = new List({ 
      boardId: req.params.boardId, 
      title, 
      order,
      createdBy: req.user.userId 
    });
    await list.save();
    list = await list.populate('createdBy', 'name email avatar');

    req.app.get('io').to(req.params.boardId).emit('list-created', list);

    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update list (rename)
router.put('/:boardId/lists/:listId', authMiddleware, checkBoardMembership, async (req, res) => {
  try {
    const { title } = req.body;
    let list = await List.findById(req.params.listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    if (title !== undefined) list.title = title;
    await list.save();
    list = await list.populate('createdBy', 'name email avatar');

    req.app.get('io').to(req.params.boardId).emit('list-updated', list);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete list (and its cards)
router.delete('/:boardId/lists/:listId', authMiddleware, checkBoardMembership, async (req, res) => {
  try {
    const list = await List.findById(req.params.listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    await Card.deleteMany({ listId: req.params.listId });
    await List.findByIdAndDelete(req.params.listId);

    req.app.get('io').to(req.params.boardId).emit('list-deleted', { listId: req.params.listId });
    res.json({ message: 'List and associated cards deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- CARDS ---

// Create card
router.post('/:boardId/cards', authMiddleware, checkBoardMembership, async (req, res) => {
  try {
    const { title, listId, description } = req.body;
    const lastCard = await Card.findOne({ listId }).sort('-order');
    const order = lastCard ? lastCard.order + 65536 : 65536;

    let card = new Card({ 
      boardId: req.params.boardId, 
      listId, 
      title, 
      description: description || '',
      order,
      createdBy: req.user.userId
    });
    await card.save();
    card = await card.populate('createdBy', 'name email avatar');

    req.app.get('io').to(req.params.boardId).emit('card-created', card);
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update card (move, rename, description)
router.put('/:boardId/cards/:cardId', authMiddleware, checkBoardMembership, async (req, res) => {
  try {
    const { title, description, listId, order } = req.body;
    let card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    if (title !== undefined) card.title = title;
    if (description !== undefined) card.description = description;
    if (listId !== undefined) card.listId = listId;
    if (order !== undefined) card.order = order;

    await card.save();
    card = await card.populate('createdBy', 'name email avatar');
    
    req.app.get('io').to(req.params.boardId).emit('card-updated', card);
    res.json(card);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete card
router.delete('/:boardId/cards/:cardId', authMiddleware, checkBoardMembership, async (req, res) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    await Card.findByIdAndDelete(req.params.cardId);

    req.app.get('io').to(req.params.boardId).emit('card-deleted', { cardId: req.params.cardId });
    res.json({ message: 'Card deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
