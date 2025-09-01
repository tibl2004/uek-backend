const express = require("express");
const router = express.Router();
const homeController = require("../controller/home.controller");


// 🔒 Nur eingeloggte Nutzer können überhaupt auf diese Routen zugreifen
router.post("/", homeController.authenticateToken, homeController.createHomeContent);
router.get("/",  homeController.getHomeContent);

module.exports = router;
