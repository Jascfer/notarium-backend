const express = require('express');
const router = express.Router();
const { createSupportRequest, getUserRequests, getAllRequests, respondToRequest } = require('../models/SupportRequest');
const { ensureAuthenticated } = require('../middleware/auth');

// Talep oluştur
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: 'Konu ve mesaj zorunludur.' });
    }
    const supportRequest = await createSupportRequest({
      userId: req.user.id,
      userName: req.user.first_name + ' ' + req.user.last_name,
      subject,
      message
    });
    res.status(201).json(supportRequest);
  } catch (err) {
    res.status(500).json({ message: 'Talep oluşturulamadı', error: err.message });
  }
});

// Kendi taleplerini listele
router.get('/mine', ensureAuthenticated, async (req, res) => {
  try {
    const requests = await getUserRequests(req.user.id);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Talepler alınamadı', error: err.message });
  }
});

// Tüm talepleri listele (admin/kurucu)
router.get('/all', ensureAuthenticated, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'founder') {
    return res.status(403).json({ message: 'Yetkisiz.' });
  }
  try {
    const requests = await getAllRequests();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Talepler alınamadı', error: err.message });
  }
});

// Talebe cevap ver (admin/kurucu)
router.post('/:id/respond', ensureAuthenticated, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'founder') {
    return res.status(403).json({ message: 'Yetkisiz.' });
  }
  try {
    const { response } = req.body;
    if (!response) return res.status(400).json({ message: 'Cevap zorunludur.' });
    const updated = await respondToRequest({
      requestId: req.params.id,
      responderId: req.user.id,
      responderName: req.user.first_name + ' ' + req.user.last_name,
      response
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Cevap verilemedi', error: err.message });
  }
});

module.exports = router; 