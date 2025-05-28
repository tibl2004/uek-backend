const pool = require("../database/index");
const jwt = require("jsonwebtoken");

const youtubelinkController = {
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Kein Token bereitgestellt.' });

    jwt.verify(token, 'secretKey', (err, user) => {
      if (err) {
        console.error('Token Überprüfung fehlgeschlagen:', err);
        return res.status(403).json({ error: 'Ungültiger Token.' });
      }
      req.user = user;
      next();
    });
  },

  createYoutubeLink: async (req, res) => {
    const { userType } = req.user;
    const { youtubelink } = req.body;

    if (userType !== 'vorstand') {
      return res.status(403).json({ error: "Nur Vorstände dürfen YouTube-Links hinzufügen." });
    }

    if (!youtubelink || typeof youtubelink !== 'string') {
      return res.status(400).json({ error: "Ein gültiger YouTube-Link muss angegeben werden." });
    }

    try {
      const [existing] = await pool.query('SELECT * FROM youtube_links LIMIT 1');
      if (existing.length > 0) {
        return res.status(400).json({ error: "Es existiert bereits ein YouTube-Link. Bitte bearbeiten statt neu erstellen." });
      }

      const insertSql = 'INSERT INTO youtube_links (link) VALUES (?)';
      await pool.query(insertSql, [youtubelink]);
      res.status(201).json({ message: 'YouTube-Link erfolgreich gespeichert.' });
    } catch (error) {
      console.error("Fehler beim Speichern des Links:", error);
      res.status(500).json({ error: "Fehler beim Speichern des Links." });
    }
  },

  getYoutubeLink: async (req, res) => {
    try {
      const [results] = await pool.query('SELECT * FROM youtube_links LIMIT 1');
      if (results.length === 0) {
        return res.status(404).json({ error: "Kein YouTube-Link vorhanden." });
      }
      res.json(results[0]);
    } catch (error) {
      console.error("Fehler beim Abrufen des Links:", error);
      res.status(500).json({ error: "Fehler beim Abrufen des Links." });
    }
  },

  updateYoutubeLink: async (req, res) => {
    const { userType } = req.user;
    const { newLink } = req.body; // wichtig: newLink erwartet

    if (userType !== 'vorstand') {
      return res.status(403).json({ error: "Nur Vorstände dürfen YouTube-Links bearbeiten." });
    }

    if (!newLink || typeof newLink !== 'string') {
      return res.status(400).json({ error: "Ein gültiger neuer Link muss angegeben werden." });
    }

    try {
      const [existing] = await pool.query('SELECT * FROM youtube_links LIMIT 1');
      if (existing.length === 0) {
        return res.status(400).json({ error: "Kein YouTube-Link vorhanden. Bitte zuerst einen erstellen." });
      }

      const updateSql = 'UPDATE youtube_links SET link = ? WHERE id = ?';
      await pool.query(updateSql, [newLink, existing[0].id]);

      res.json({ message: "YouTube-Link erfolgreich aktualisiert." });
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Links:", error);
      res.status(500).json({ error: "Fehler beim Aktualisieren des Links." });
    }
  }
};

module.exports = youtubelinkController;
