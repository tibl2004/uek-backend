const express = require('express');
const eventController = require('../controller/event.controller'); // Pfad anpassen

const router = express.Router();

// Öffentliche Events abrufen
router.get('/', eventController.getEvents);

// Event nach ID abrufen
router.get('/:id', eventController.getEventById);

// Middleware zur Authentifizierung für alle nachfolgenden Routen
router.use(eventController.authenticateToken);

// Event erstellen (nur authentifizierte Nutzer)
router.post('/', eventController.createEvent);

// Event aktualisieren (nur Admins)
router.put('/:id', eventController.updateEvent);

// Event löschen (nur Admins)
router.delete('/:id', eventController.deleteEvent);

module.exports = router;
