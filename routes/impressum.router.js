const express = require("express");
const router = express.Router();
const impressumController = require("../controller/impressum.controller");

// Middleware zur Authentifizierung
const authenticate = impressumController.authenticateToken;

// Route: Impressum abrufen (öffentlich)
router.get("/", impressumController.getImpressum);

// Route: Neues Impressum erstellen (nur Vorstand)
router.post("/", authenticate, impressumController.create);

// Route: Bestehendes Impressum aktualisieren (nur Vorstand)
router.put("/update", authenticate, impressumController.updateImpressum);


module.exports = router;
