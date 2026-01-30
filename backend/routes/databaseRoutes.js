const express = require('express');
const router = express.Router();
const { 
    addDatabase, 
    getDatabases, 
    updateDatabase, 
    deleteDatabase, 
    connectToDatabase,
    disconnectDatabase,
    getActiveDatabase,
    executeQuery
} = require('../controllers/databaseController');
const { isAuthorized } = require('../middleware/auth');


router.post('/add', isAuthorized, addDatabase);


router.get('/getAll', isAuthorized, getDatabases);


router.post('/connect/:id', isAuthorized, connectToDatabase);


router.post('/disconnect/:id', isAuthorized, disconnectDatabase);  


router.get('/active', isAuthorized, getActiveDatabase);  


router.post('/query/:id', isAuthorized, executeQuery);


router.put('/:id', isAuthorized, updateDatabase);


router.delete('/:id', isAuthorized, deleteDatabase);

module.exports = router;