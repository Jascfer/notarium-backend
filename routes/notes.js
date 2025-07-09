const express = require('express');
const router = express.Router();
const { createNote, getNotes, getNoteById, deleteNote } = require('../models/Note');

// Tüm notları getir
router.get('/', async (req, res) => {
  try {
    const notes = await getNotes();
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: 'Notlar alınamadı', error: err.message });
  }
});

// Tek bir notu getir
router.get('/:id', async (req, res) => {
  try {
    const note = await getNoteById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Not bulunamadı' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: 'Not alınamadı', error: err.message });
  }
});

// Not ekle
router.post('/', async (req, res) => {
  try {
    const note = await createNote(req.body);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: 'Not eklenemedi', error: err.message });
  }
});

// Not sil
router.delete('/:id', async (req, res) => {
  try {
    await deleteNote(req.params.id);
    res.json({ message: 'Not silindi' });
  } catch (err) {
    res.status(500).json({ message: 'Not silinemedi', error: err.message });
  }
});

module.exports = router;