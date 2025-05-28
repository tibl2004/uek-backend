const express = require('express');
const router = express.Router();
const youtubelinkController = require('../controller/youtubelink.controller');

// Middleware zur Authentifizierung
const { authenticateToken } = youtubelinkController;

// Link abrufen (es gibt nur einen)
router.get('/', youtubelinkController.getYoutubeLink);

// Link erstellen (nur wenn keiner existiert)
router.post('/', authenticateToken, youtubelinkController.createYoutubeLink);

// Link bearbeiten (nur vorhandenen bearbeiten)
router.put('/', authenticateToken, youtubelinkController.updateYoutubeLink);

module.exports = router;
