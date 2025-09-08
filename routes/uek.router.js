const express = require("express");
const router = express.Router();
const uekController = require("../controller/uek.controller");

// Token prüfen für alle Routen
router.use(uekController.authenticateToken);

// ÜK erstellen
// POST /uek/create
router.post("/create", uekController.createUek);

// Alle ÜKs abrufen
// GET /uek/all
router.get("/all", uekController.getUeks);


module.exports = router;
