const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Auto-resolve Google Profile Picture for any account
const autoResolveAvatar = (name, email, currentAvatar) => {
  if (currentAvatar && currentAvatar.startsWith('http') && !currentAvatar.includes('ui-avatars.com')) {
    return currentAvatar;
  }
  if (email && (email.includes('@gmail.com') || email.includes('@google.com'))) {
    // Gravatar/Unavatar automatic Google Profile Picture URL
    return `https://unavatar.io/google/${encodeURIComponent(email)}?fallback=https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=18181b&color=ffffff&bold=true`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=18181b&color=ffffff&bold=true`;
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;
    
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ 
      name, 
      email, 
      password: hashedPassword,
      avatar: autoResolveAvatar(name, email, avatar)
    });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Auto update avatar if missing
    if (!user.avatar || user.avatar.includes('ui-avatars.com')) {
      user.avatar = autoResolveAvatar(user.name, user.email, user.avatar);
      await user.save();
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Google Login / Auth
router.post('/google', async (req, res) => {
  try {
    const { name, email, avatar, googleId } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required from Google payload' });

    let user = await User.findOne({ email });
    const profilePic = avatar || autoResolveAvatar(name, email);

    if (!user) {
      user = new User({
        name: name || email.split('@')[0],
        email,
        avatar: profilePic,
        googleId: googleId || ''
      });
      await user.save();
    } else {
      let updated = false;
      if (avatar && user.avatar !== avatar) {
        user.avatar = avatar;
        updated = true;
      }
      if (googleId && !user.googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (!user.avatar) {
        user.avatar = profilePic;
        updated = true;
      }
      if (updated) await user.save();
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ message: 'Google authentication failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (user && (!user.avatar || user.avatar.includes('ui-avatars.com'))) {
      user.avatar = autoResolveAvatar(user.name, user.email, user.avatar);
      await user.save();
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search users by email (for invites)
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.json([]);
    const users = await User.find({ email: new RegExp(email, 'i') }).select('name email avatar _id').limit(5);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
