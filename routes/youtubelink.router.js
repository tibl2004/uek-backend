const express = require('express');
const router = express.Router();
const youtubelinkController = require('../controller/youtubelink.controller');

// Route zum YouTube-Link speichern (mit Token-Authentifizierung)
router.post('/', youtubelinkController.authenticateToken, youtubelinkController.createYoutubeLink);

// Route zum Abrufen aller YouTube-Links (optional auch geschützt)
router.get('/', youtubelinkController.getAllYoutubeLinks);

module.exports = router;
