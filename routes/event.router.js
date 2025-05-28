const express = require('express');
const multer = require('multer');
const eventController = require('../controller/event.controller');

const router = express.Router();
const upload = multer(); // Speicher im RAM (keine Speicherung auf Festplatte)


// Alle Events holen (öffentlich, ohne Auth? Falls ja, Middleware hier entfernen)
router.get('/events', eventController.getEvents);

// Event nach ID holen
router.get('/events/:id', eventController.getEventById);

// Auth Middleware wird überall verwendet, außer beim GET (je nach Use Case anpassen)
router.use(eventController.authenticateToken);

// Event erstellen mit Bild-Upload
router.post('/events', upload.single('bild'), eventController.createEvent);


// Event updaten mit optionalem Bild-Upload (Admin only im Controller geprüft)
router.put('/events/:id', upload.single('bild'), eventController.updateEvent);

// Event löschen (Admin only im Controller geprüft)
router.delete('/events/:id', eventController.deleteEvent);

module.exports = router;
