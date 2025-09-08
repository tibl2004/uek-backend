const express = require('express');
const router = express.Router();
const linksController = require('../controller/links.controller');

// Alle Inhalte abrufen (kein Auth erforderlich)
router.get('/', linksController.getAllSectionsWithLinks);

// Neue Section mit Links erstellen (vorstand only)
router.post('/', linksController.createSectionWithLinks);

// Bestehende Section mit Links aktualisieren (vorstand only)
router.put('/:id', linksController.authenticateToken, linksController.updateSectionWithLinks);

// Section löschen (vorstand only)
router.delete('/:id', linksController.authenticateToken, linksController.deleteSection);

// Einzelnen Link löschen (vorstand only)
router.delete('/:id', linksController.authenticateToken, linksController.deleteLink);

module.exports = router;
