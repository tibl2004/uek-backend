// routes/vorstandRouter.js
const express = require("express");
const router = express.Router();
const vorstandController = require("../controller/vorstand.controller");

// Auth Middleware
const authenticate = vorstandController.authenticateToken;

// Nur Admin darf neuen Vorstand anlegen
router.post("/", authenticate, vorstandController.createVorstand);

// Alle Vorstände anzeigen (z. B. für öffentliche Liste)
router.get("/public", authenticate, vorstandController.getVorstand);

// Eigene Daten abrufen
router.get("/me", authenticate, vorstandController.getMyProfile);

// Eigene Daten aktualisieren
router.put("/me", authenticate, vorstandController.updateMyProfile);

// Nur Admin darf Passwort von einem Vorstand ändern
router.put("/change-password", authenticate, vorstandController.changePasswordByAdmin);

module.exports = router;
