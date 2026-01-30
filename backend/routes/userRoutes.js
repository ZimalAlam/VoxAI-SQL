const express = require('express');
const router = express.Router();
const { signup, login, getUserProfile, updateUserProfile } = require('../controllers/userController');
const { isAuthorized } = require('../middleware/auth');


router.post('/signup', signup);
router.post('/login', login)
router.get('/profile', isAuthorized, getUserProfile);
router.put('/profile', isAuthorized, updateUserProfile);

module.exports = router;
