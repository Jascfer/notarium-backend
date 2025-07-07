const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');

// Kanal mesajlarını getir
router.get('/:channel', async (req, res) => {
  try {
    const messages = await ChatMessage.find({ channel: req.params.channel }).populate('user', 'firstName lastName email');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Mesajlar alınamadı', error: err.message });
  }
});

// Mesaj gönder
router.post('/', async (req, res) => {
  try {
    const { channel, user, message } = req.body;
    const chatMessage = await ChatMessage.create({ channel, user, message });
    res.status(201).json(chatMessage);
  } catch (err) {
    res.status(500).json({ message: 'Mesaj gönderilemedi', error: err.message });
  }
});

module.exports = router; 