const express = require("express");
const router = express.Router();
const klasseController = require("../controller/klasse.controller");

// Token prüfen für alle Routen
router.use(klasseController.authenticateToken);

// Klasse erstellen
// POST /klasse/create/:uekId?  → uekId optional in Params oder im Body
router.post("/:uekId?/create", klasseController.createKlasse);

// Alle Klassen abrufen
// GET /klasse/all/:uekId? → optional nach ÜK filtern
router.get("/:uekId/all", klasseController.getKlassen);

module.exports = router;
