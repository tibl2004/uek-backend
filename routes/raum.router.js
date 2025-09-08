const express = require("express");
const router = express.Router();
const raumController = require("../controller/raum.controller");


// Raum erstellen
router.post("/", raumController.createRaum);

// Alle Räume abrufen
router.get("/", raumController.getRaeume);

// Raum aktualisieren
router.put("/", raumController.updateRaum);

// Raum löschen
router.delete("/:id", raumController.deleteRaum);

module.exports = router;
