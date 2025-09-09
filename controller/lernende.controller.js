const pool = require("../database/index");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const lernendeController = {
  // Admin/Vorstand-Middleware
  authenticateAdmin: (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Kein Token bereitgestellt." });

    jwt.verify(token, "secretKey", (err, user) => {
      if (err) return res.status(403).json({ error: "Ungültiger Token." });
      if (!user.userTypes || (!user.userTypes.includes("vorstand") && !user.userTypes.includes("admin"))) {
        return res.status(403).json({ error: "Nur Vorstand oder Admin darf diese Aktion ausführen." });
      }
      req.user = user;
      next();
    });
  },

  // Lernenden erstellen + Login
  createLernende: async (req, res) => {
    const { klasseId, uekId } = req.params;
    const { vorname, nachname, email, passwort } = req.body;

    if (!vorname || !nachname || !klasseId || !uekId || !email || !passwort) {
      return res.status(400).json({ error: "Alle Felder müssen angegeben werden." });
    }

    try {
      const hashedPassword = await bcrypt.hash(passwort, 10);

      pool.query(
        `INSERT INTO lernende (vorname, nachname, klasse_id, uek_id, email, passwort)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [vorname, nachname, klasseId, uekId, email, hashedPassword],
        (err, result) => {
          if (err) return res.status(500).json({ error: "Fehler beim Erstellen des Lernenden." });
          res.status(201).json({ message: "Lernender erfolgreich erstellt.", id: result.insertId });
        }
      );
    } catch (err) {
      res.status(500).json({ error: "Serverfehler beim Passwort-Hashing." });
    }
  },

  

  // Alle Lernenden abrufen (Admin/Vorstand)
  getLernende: (req, res) => {
    const { klasseId, uekId } = req.params;
    let sql = `
      SELECT id, vorname, nachname, email, klasse_id, uek_id
      FROM lernende
      WHERE 1=1
    `;
    const params = [];

    if (klasseId) {
      sql += " AND klasse_id = ? ";
      params.push(klasseId);
    }

    if (uekId) {
      sql += " AND uek_id = ? ";
      params.push(uekId);
    }

    sql += " ORDER BY nachname ASC, vorname ASC";

    pool.query(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: "Fehler beim Abrufen der Lernenden." });
      res.status(200).json(rows);
    });
  },

  // Lernenden aktualisieren
  updateLernende: async (req, res) => {
    const { id, vorname, nachname, email, passwort } = req.body;
    const { klasseId, uekId } = req.params;

    if (!id || !vorname || !nachname || !klasseId || !uekId || !email) {
      return res.status(400).json({ error: "Alle Felder müssen angegeben werden." });
    }

    try {
      let hashedPassword = null;
      if (passwort) hashedPassword = await bcrypt.hash(passwort, 10);

      const fields = [vorname, nachname, klasseId, uekId, email];
      let sql = `UPDATE lernende SET vorname = ?, nachname = ?, klasse_id = ?, uek_id = ?, email = ?`;
      if (hashedPassword) {
        sql += `, passwort = ?`;
        fields.push(hashedPassword);
      }
      sql += ` WHERE id = ?`;
      fields.push(id);

      pool.query(sql, fields, (err) => {
        if (err) return res.status(500).json({ error: "Fehler beim Aktualisieren des Lernenden." });
        res.status(200).json({ message: "Lernender erfolgreich aktualisiert." });
      });
    } catch (err) {
      res.status(500).json({ error: "Serverfehler beim Passwort-Hashing." });
    }
  },

  // Lernenden löschen
  deleteLernende: (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ID muss angegeben werden." });

    pool.query(
      `DELETE FROM lernende WHERE id = ?`,
      [id],
      (err) => {
        if (err) return res.status(500).json({ error: "Fehler beim Löschen des Lernenden." });
        res.status(200).json({ message: "Lernender erfolgreich gelöscht." });
      }
    );
  },
};

module.exports = lernendeController;
