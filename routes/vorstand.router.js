// routes/vorstandRouter.js
const express = require("express");
const router = express.Router();
const vorstandController = require("../controller/vorstand.controller");
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });



// Auth Middleware
const authenticate = vorstandController.authenticateToken;

// Nur Admin darf neuen Vorstand anlegen
router.post("/", authenticate, vorstandController.createVorstand);

// Alle Vorstände anzeigen (z. B. für öffentliche Liste)
router.get("/public", vorstandController.getVorstand);

// Eigene Daten abrufen
router.get("/me", authenticate, vorstandController.getMyProfile);

router.get('/fotos', authenticate, vorstandController.getVorstandFotos);

// Eigene Daten aktualisieren
router.put("/me", authenticate, upload.single("foto"), vorstandController.updateMyProfile);

// Nur Admin darf Passwort von einem Vorstand ändern
router.put("/change-password", authenticate, vorstandController.changePasswordByAdmin);



module.exports = router;
