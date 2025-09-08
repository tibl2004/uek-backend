const pool = require("../database/index");
const jwt = require("jsonwebtoken");

const klasseController = {
  // Token prüfen
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

  // Klasse erstellen (ÜK automatisch erkennen: Body oder Params)
  createKlasse: (req, res) => {
    if (!req.user.userTypes || !req.user.userTypes.includes("vorstand")) {
      return res.status(403).json({ error: "Nur Vorstände dürfen Klassen erstellen." });
    }

    // uek_id kann aus req.body oder req.params kommen
    const uek_id = req.body.uek_id || req.params.uekId;
    const { name } = req.body;

    if (!uek_id || !name) {
      return res.status(400).json({ error: "ÜK-ID und Klassenname müssen angegeben werden." });
    }

    pool.query(
      `INSERT INTO klasse (uek_id, name) VALUES (?, ?)`,
      [uek_id, name],
      (err, result) => {
        if (err) return res.status(500).json({ error: "Fehler beim Erstellen der Klasse." });
        res.status(201).json({ message: "Klasse erfolgreich erstellt.", id: result.insertId });
      }
    );
  },

  // Alle Klassen abrufen (optional für einen ÜK)
  getKlassen: (req, res) => {
    const uekId = req.params.uekId;

    let sql = `
      SELECT k.id, k.name, u.titel AS uek_titel, u.von, u.bis
      FROM klasse k
      JOIN uek u ON k.uek_id = u.id
    `;
    const params = [];

    if (uekId) {
      sql += " WHERE u.id = ? ";
      params.push(uekId);
    }

    sql += " ORDER BY u.von ASC, k.name ASC";

    pool.query(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: "Fehler beim Abrufen der Klassen." });
      res.status(200).json(rows);
    });
  }
};

module.exports = klasseController;
