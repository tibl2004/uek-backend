const express = require("express");
const router = express.Router();
const adminController = require("../controller/admin.controller");

// Nur Admin erstellen
router.post("/", adminController.create);

module.exports = router;
