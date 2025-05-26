const express = require("express");
const router = express.Router();
const adminController = require("../controller/admin.controller");

// Admin erstellen
router.post("/", adminController.create);

module.exports = router;
