// routes/eventRoutes.js
const express = require("express");
const eventController = require("../controller/event.controller");

const router = express.Router();

// Alle Events abrufen
router.get("/", eventController.getEvents);

// Einzelnes Event abrufen
router.get("/:id", eventController.getEventById);

// Neues Event erstellen (nur Vorstände, Bild per Base64 im Body)
router.post(
  "/",
  eventController.authenticateToken,
  eventController.createEvent
);

// Event aktualisieren (nur vorstands)
router.put(
  "/:id",
  eventController.authenticateToken,
  eventController.updateEvent
);

// Event löschen (nur vorstands)
router.delete(
  "/:id",
  eventController.authenticateToken,
  eventController.deleteEvent
);

module.exports = router;
