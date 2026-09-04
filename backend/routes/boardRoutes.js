const express = require('express');
const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();

// Middleware to check if user is a member of the board
const checkBoardMembership = async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.body.boardId;
    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    const isMember = board.members.some(m => m.user.toString() === req.user.userId);
    if (!isMember) return res.status(403).json({ message: 'Not authorized for this board' });

    req.board = board;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- BOARDS ---

// Get all boards for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const boards = await Board.find({ 'members.user': req.user.userId }).populate('owner', 'name email');
    res.json(boards);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new board
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;
    const board = new Board({
      title,
      owner: req.user.userId,
      members: [{ user: req.user.userId, role: 'owner' }]
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
    
    res.json({ board, lists, cards });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Invite member to board
router.post('/:boardId/invite', authMiddleware, checkBoardMembership, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const userToInvite = await User.findOne({ email });
    const inviter = await User.findById(req.user.userId);
    
    if (userToInvite) {
      const isAlreadyMember = req.board.members.some(m => m.user.toString() === userToInvite._id.toString());
      if (isAlreadyMember) return res.status(400).json({ message: 'User is already a member of this board' });

      req.board.members.push({ user: userToInvite._id, role: 'member' });
      await req.board.save();
    }

    const boardUrl = `http://localhost:5173/b/${req.board._id}`;
    
    // Send real invitation email
    const emailResult = await sendEmail({
      to: email,
      subject: `🎯 You've been invited to join "${req.board.title}" on BoardSync`,
      text: `Hello,\n\n${inviter ? inviter.name : 'A teammate'} has invited you to collaborate on the board "${req.board.title}".\n\nAccess the board here: ${boardUrl}\n\nHappy collaborating!\nBoardSync Team`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 10px; max-width: 600px; margin: auto;">
          <h2 style="color: #6366f1;">BoardSync Invitation</h2>
          <p style="font-size: 16px;">Hello,</p>
          <p style="font-size: 16px;"><strong>${inviter ? inviter.name : 'A teammate'}</strong> has invited you to collaborate on the board <strong style="color: #818cf8;">"${req.board.title}"</strong>.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${boardUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Open Board</a>
          </div>
          <p style="font-size: 14px; color: #94a3b8;">If you don't have an account yet, simply sign up with this email address to view your shared boards.</p>
          <hr style="border: 1px solid rgba(255,255,255,0.1); margin-top: 30px;" />
          <p style="font-size: 12px; color: #64748b; text-align: center;">BoardSync Real-Time Task Manager</p>
        </div>
      `
    });

    res.json({
      board: req.board,
      message: `Invitation email sent successfully to ${email}`,
      emailPreview: emailResult.previewUrl || null
    });
  } catch (err) {
    console.error('Invite error:', err);
    res.status(500).json({ message: 'Failed to process board invitation' });
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
    card = await card.populate('createdBy', 'name email');

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
    card = await card.populate('createdBy', 'name email');
    
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
