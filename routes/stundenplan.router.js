const express = require("express");
const router = express.Router();
const stundenplanController = require("../controller/stundenplan.controller");

// Token prüfen für alle Routen
router.use(stundenplanController.authenticateToken);

// Stundenplaneintrag erstellen
// POST /stundenplan/create/:uekId/:klasseId
router.post("/:uekId/:klasseId/create", stundenplanController.createEintrag);

// Alle Einträge ab heute abrufen
// GET /stundenplan/:uekId/:klasseId? → klasseId optional
router.get("/:uekId/:klasseId", stundenplanController.getEintraege);


// Eintrag löschen
// DELETE /stundenplan/delete/:id
router.delete("/delete/:id", stundenplanController.deleteEintrag);

module.exports = router;
