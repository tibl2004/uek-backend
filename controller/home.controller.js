const pool = require("../database/index");
const jwt = require("jsonwebtoken");
const sharp = require("sharp");

const homeController = {
     // Token-Check Middleware
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Kein Token bereitgestellt." });

    jwt.verify(token, "secretKey", (err, user) => {
      if (err) return res.status(403).json({ error: "Ungültiger Token." });
      req.user = user;
      next();
    });
  },
    createHomeContent: async (req, res) => {
        try {
          const { userTypes } = req.user;
          if (!userTypes || !userTypes.includes("vorstand")) {
            return res.status(403).json({ error: "Nur Vorstände dürfen den Home-Inhalt aktualisieren." });
          }
      
          const { youtubeLink, willkommenText, willkommenLink, bild } = req.body;
      
          if (!willkommenText || !willkommenLink) {
            return res.status(400).json({
              error: "Willkommenstext und Willkommenslink sind erforderlich."
            });
          }
      
          if ((youtubeLink && bild) || (!youtubeLink && !bild)) {
            return res.status(400).json({
              error: "Bitte entweder einen YouTube-Link ODER ein Bild angeben, nicht beides oder keins."
            });
          }
      
          let base64Bild = null;
          if (bild) {
            const matches = bild.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
              return res.status(400).json({
                error: "Ungültiges Bildformat. Erwarte Base64-String mit data:image/... Prefix."
              });
            }
            const mimeType = matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, "base64");
      
            if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mimeType)) {
              return res.status(400).json({ error: "Nur PNG, JPEG, JPG oder WEBP erlaubt." });
            }
      
            const convertedBuffer = await sharp(buffer).resize(800).png().toBuffer();
            base64Bild = convertedBuffer.toString("base64");
          }
      
          // Prüfen, ob es schon einen Eintrag gibt
          const [rows] = await pool.query("SELECT id FROM home_content LIMIT 1");
      
          if (rows.length > 0) {
            // Update falls schon vorhanden
            await pool.query(
              `UPDATE home_content
               SET youtube_link = ?, bild = ?, willkommen_text = ?, willkommen_link = ?, aktualisiert_am = NOW()
               WHERE id = ?`,
              [youtubeLink || null, base64Bild, willkommenText, willkommenLink, rows[0].id]
            );
            return res.status(200).json({ message: "Home-Inhalt erfolgreich aktualisiert." });
          } else {
            // Insert nur wenn noch nichts existiert
            await pool.query(
              `INSERT INTO home_content (youtube_link, bild, willkommen_text, willkommen_link)
               VALUES (?, ?, ?, ?)`,
              [youtubeLink || null, base64Bild, willkommenText, willkommenLink]
            );
            return res.status(201).json({ message: "Home-Inhalt erfolgreich erstellt." });
          }
        } catch (error) {
          console.error("Fehler beim Erstellen/Aktualisieren des Home-Inhalts:", error);
          res.status(500).json({ error: "Fehler beim Erstellen/Aktualisieren des Home-Inhalts." });
        }
      },
      

  getHomeContent: async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, youtube_link, bild, willkommen_text, willkommen_link 
         FROM home_content 
         ORDER BY id DESC LIMIT 1`
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Kein Home-Inhalt gefunden." });
      }

      const content = rows[0];
      res.status(200).json({
        id: content.id,
        youtubeLink: content.youtube_link,
        bild: content.bild || null,
        willkommenText: content.willkommen_text,
        willkommenLink: content.willkommen_link
      });
    } catch (error) {
      console.error("Fehler beim Abrufen des Home-Inhalts:", error);
      res.status(500).json({ error: "Fehler beim Abrufen des Home-Inhalts." });
    }
  }
};

module.exports = homeController;
