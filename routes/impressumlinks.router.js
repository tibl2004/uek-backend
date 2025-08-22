const express = require("express");
const router = express.Router();
const impressumLinksController = require("../controller/impressumlinks.controller");

// Middleware zur Authentifizierung
const authenticate = impressumLinksController.authenticateToken;

// Route: Alle Links abrufen (öffentlich)
router.get("/", impressumLinksController.getLinks);

// Route: Neuen Link erstellen (nur Vorstand)
router.post("/create", authenticate, impressumLinksController.createLink);

// Route: Link aktualisieren (nur Vorstand)
router.put("/update", authenticate, impressumLinksController.updateLink);

// Route: Link löschen (nur Vorstand)
router.delete("/delete", authenticate, impressumLinksController.deleteLink);

module.exports = router;
