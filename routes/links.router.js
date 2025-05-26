const express = require('express');
const router = express.Router();
const linksController = require('../controller/links.controller');

// Alle Inhalte abrufen (kein Auth erforderlich)
router.get('/', linksController.getAllSectionsWithLinks);

// Neue Section mit Links erstellen (Admin only)
router.post('/', linksController.authenticateToken, linksController.createSectionWithLinks);

// Bestehende Section mit Links aktualisieren (Admin only)
router.put('/:id', linksController.authenticateToken, linksController.updateSectionWithLinks);

// Section löschen (Admin only)
router.delete('/:id', linksController.authenticateToken, linksController.deleteSection);

// Einzelnen Link löschen (Admin only)
router.delete('/:id', linksController.authenticateToken, linksController.deleteLink);

module.exports = router;
