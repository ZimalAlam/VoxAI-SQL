const express = require('express');
const router = express.Router();
const { convertTextToSQL } = require('../controllers/textToSQLController');
const { isAuthorized } = require('../middleware/auth');


router.post('/convert', isAuthorized, convertTextToSQL);

module.exports = router;
