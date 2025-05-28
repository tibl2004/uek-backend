const pool = require("../database/index");
const jwt = require("jsonwebtoken");

const youtubelinkController = {
  // Authentifizierungsmiddleware
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

  // YouTube-Link speichern
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
      const insertSql = 'INSERT INTO youtube_links (link) VALUES (?)';
      await pool.query(insertSql, [youtubelink]);
      res.status(201).json({ message: 'YouTube-Link erfolgreich gespeichert.' });
    } catch (error) {
      console.error("Fehler beim Speichern des Links:", error);
      res.status(500).json({ error: "Fehler beim Speichern des Links." });
    }
  },

  // Alle YouTube-Links abrufen
  getAllYoutubeLinks: async (req, res) => {
    try {
      const [results] = await pool.query('SELECT * FROM youtube_links ORDER BY id DESC');
      res.json(results);
    } catch (error) {
      console.error("Fehler beim Abrufen der Links:", error);
      res.status(500).json({ error: "Fehler beim Abrufen der Links." });
    }
  }
};

module.exports = youtubelinkController;
