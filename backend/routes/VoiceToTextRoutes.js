const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadVoiceFile } = require('../controllers/VoiceToTextController');
const { isAuthorized } = require('../middleware/auth');


const upload = multer({ dest: 'uploads/' });


router.post('/upload', isAuthorized, upload.single('voiceFile'), uploadVoiceFile);

module.exports = router;
