const express = require('express');
const router = express.Router();
const ragPipeline = require('../utils/ragPipeline');

// Refresh news articles
router.post('/refresh-news', async (req, res) => {
    try {
        await ragPipeline.refreshArticles();
        res.json({ message: 'News articles refreshed successfully' });
    } catch (error) {
        console.error('Error refreshing news:', error);
        res.status(500).json({ error: 'Error refreshing news articles' });
    }
});

module.exports = router;
