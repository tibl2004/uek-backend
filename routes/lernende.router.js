const express = require("express");
const router = express.Router();
const lernendeController = require("../controller/lernende.controller");

// Lernenden erstellen (Admin/Vorstand)
router.post("/:klasseId/:uekId", lernendeController.createLernende);

// Alle Lernenden abrufen (optional Filter)
router.get("/:klasseId?/:uekId?", lernendeController.getLernende);

// Lernenden aktualisieren
router.put("/:klasseId/:uekId", lernendeController.updateLernende);

// Lernenden löschen
router.delete("/:id", lernendeController.deleteLernende);

// NEU: Lernender -> eigene ÜKs anhand Token abrufen
router.get("/me/ueks", lernendeController.getLernendeUeks);

module.exports = router;
