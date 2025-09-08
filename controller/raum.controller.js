const pool = require("../database/index");
const jwt = require("jsonwebtoken");

const raumController = {
  // Token-Middleware für Admins/Vorstände
  authenticateAdmin: (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Kein Token bereitgestellt." });

    jwt.verify(token, "secretKey", (err, user) => {
      if (err) return res.status(403).json({ error: "Ungültiger Token." });

      // Nur Admin oder Vorstand darf
      if (!user.userTypes || (!user.userTypes.includes("vorstand") && !user.userTypes.includes("admin"))) {
        return res.status(403).json({ error: "Nur Vorstand oder Admin darf diese Aktion ausführen." });
      }

      req.user = user;
      next();
    });
  },

  // Raum erstellen
  createRaum: (req, res) => {
    const { name, link } = req.body;
    if (!name || !link) return res.status(400).json({ error: "Name und Link müssen angegeben werden." });

    pool.query(
      `INSERT INTO raum (name, link) VALUES (?, ?)`,
      [name, link],
      (err, result) => {
        if (err) return res.status(500).json({ error: "Fehler beim Erstellen des Raums." });
        res.status(201).json({ message: "Raum erfolgreich erstellt.", id: result.insertId });
      }
    );
  },

  // Alle Räume abrufen
  getRaeume: (req, res) => {
    pool.query(
      `SELECT id, name, link FROM raum ORDER BY name ASC`,
      (err, rows) => {
        if (err) return res.status(500).json({ error: "Fehler beim Abrufen der Räume." });
        res.status(200).json(rows);
      }
    );
  },

  // Raum aktualisieren
  updateRaum: (req, res) => {
    const { id, name, link } = req.body;
    if (!id || !name || !link) return res.status(400).json({ error: "Alle Felder müssen angegeben werden." });

    pool.query(
      `UPDATE raum SET name = ?, link = ? WHERE id = ?`,
      [name, link, id],
      (err) => {
        if (err) return res.status(500).json({ error: "Fehler beim Aktualisieren des Raums." });
        res.status(200).json({ message: "Raum erfolgreich aktualisiert." });
      }
    );
  },

  // Raum löschen
  deleteRaum: (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ID muss angegeben werden." });

    pool.query(
      `DELETE FROM raum WHERE id = ?`,
      [id],
      (err) => {
        if (err) return res.status(500).json({ error: "Fehler beim Löschen des Raums." });
        res.status(200).json({ message: "Raum erfolgreich gelöscht." });
      }
    );
  }
};

module.exports = raumController;
