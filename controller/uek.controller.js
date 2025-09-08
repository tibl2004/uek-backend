const pool = require("../database/index");
const jwt = require("jsonwebtoken");

const uekController = {
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

  // ÜK erstellen
  createUek: (req, res) => {
    if (!req.user.userTypes || !req.user.userTypes.includes("vorstand")) {
      return res.status(403).json({ error: "Nur Vorstände dürfen ÜKs erstellen." });
    }

    const { titel, von, bis } = req.body;
    if (!titel || !von || !bis) return res.status(400).json({ error: "Titel, Von- und Bis-Datum müssen angegeben werden." });

    pool.query(
      `INSERT INTO uek (titel, von, bis) VALUES (?, ?, ?)`,
      [titel, von, bis],
      (err, result) => {
        if (err) return res.status(500).json({ error: "Fehler beim Erstellen des ÜKs." });
        res.status(201).json({ message: "ÜK erfolgreich erstellt.", id: result.insertId });
      }
    );
  },

  // Alle ÜKs abrufen
  getUeks: (req, res) => {
    pool.query(
      `SELECT id, titel, von, bis FROM uek ORDER BY von ASC`,
      (err, rows) => {
        if (err) return res.status(500).json({ error: "Fehler beim Abrufen der ÜKs." });
        res.status(200).json(rows);
      }
    );
  },


};

module.exports = uekController;
