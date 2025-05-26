const express = require('express');
const router = express.Router();
const vorstandController = require('../controller/vorstand.controller');

// Öffentliche Route:
router.get('/public', vorstandController.getVorstand);

// Admin-Route zum Erstellen:
router.post('/create', vorstandController.authenticateToken, vorstandController.createVorstand);

module.exports = router;
