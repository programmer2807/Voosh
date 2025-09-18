const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Create new session
router.post('/session', chatController.createSession);

// Get session history
router.get('/session/:sessionId', chatController.getSessionHistory);

// Process message
router.post('/message', chatController.processMessage);

// Clear session
router.delete('/session/:sessionId', chatController.clearSession);

module.exports = router;
