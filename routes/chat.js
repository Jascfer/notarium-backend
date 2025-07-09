const express = require('express');
const router = express.Router();
const { createChatMessage, getMessagesByChannel } = require('../models/ChatMessage');

// Kanal mesajlarını getir
router.get('/:channel', async (req, res) => {
  try {
    const messages = await getMessagesByChannel(req.params.channel);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Mesajlar alınamadı', error: err.message });
  }
});

// Mesaj gönder
router.post('/', async (req, res) => {
  try {
    const { channel, user, message } = req.body;
    const chatMessage = await createChatMessage({ channel, user, message });
    res.status(201).json(chatMessage);
  } catch (err) {
    res.status(500).json({ message: 'Mesaj gönderilemedi', error: err.message });
  }
});

module.exports = router; 