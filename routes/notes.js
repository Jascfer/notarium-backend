const express = require('express');
const router = express.Router();
const Note = require('../models/Note');

// Tüm notları listele
router.get('/', async (req, res) => {
  try {
    const notes = await Note.find().populate('author', 'firstName lastName email');
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: 'Notlar alınamadı', error: err.message });
  }
});

// Yeni not ekle
router.post('/', async (req, res) => {
  try {
    const { title, content, author } = req.body;
    if (!title || !content || !author) {
      return res.status(400).json({ message: 'Başlık, içerik ve yazar zorunlu.' });
    }
    const note = await Note.create({ title, content, author });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: 'Not eklenemedi', error: err.message });
  }
});

// Not sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Note.findByIdAndDelete(id);
    res.json({ message: 'Not silindi' });
  } catch (err) {
    res.status(500).json({ message: 'Not silinemedi', error: err.message });
  }
});

module.exports = router;