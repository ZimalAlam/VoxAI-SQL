const express = require('express');
const router = express.Router();
const { createChat, getChats, addMessage, getChatTitle, getChatById, updateChatTitle } = require('../controllers/chatController');
const { generateTitle } = require('../utils/aiService');
const { isAuthorized } = require('../middleware/auth');


router.post('/create', isAuthorized, createChat);

router.get('/', isAuthorized, getChats);

router.post('/message', isAuthorized, addMessage);

router.get('/:chatId/title', isAuthorized, getChatTitle);

router.get('/:chatId', isAuthorized, getChatById);

router.put('/:chatId/title', isAuthorized, updateChatTitle);

// Test endpoint for title generation
router.post('/test-title', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).send({ error: 'Text is required' });
        }
        
        console.log('🧪 Testing title generation with text:', text);
        const title = await generateTitle(text);
        console.log('✅ Generated title:', title);
        
        res.status(200).send({ title, originalText: text });
    } catch (error) {
        console.error('❌ Test title generation failed:', error);
        res.status(500).send({ error: error.message });
    }
});

module.exports = router;
