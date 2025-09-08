const pool = require("../database/index");
const jwt = require("jsonwebtoken");

const stundenplanController = {
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

  createEintrag: (req, res) => {
    if (!req.user.userTypes || !req.user.userTypes.includes("vorstand")) {
      return res.status(403).json({ error: "Nur Vorstände dürfen Stundenplaneinträge erstellen." });
    }
  
    const { uekId, klasseId } = req.params;
    const { datum, von, bis, thema, raum_id, referent } = req.body;
  
    if (!uekId || !klasseId || !datum || !von || !bis || !thema || !raum_id || !referent) {
      return res.status(400).json({ error: "Alle Felder müssen angegeben werden." });
    }
  
    pool.query(
      `INSERT INTO stundenplan (uek_id, klasse_id, datum, von, bis, thema, raum_id, referent) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uekId, klasseId, datum, von, bis, thema, raum_id, referent],
      (err, result) => {
        if (err) return res.status(500).json({ error: "Fehler beim Erstellen des Stundenplaneintrags." });
        res.status(201).json({ message: "Eintrag erfolgreich erstellt.", id: result.insertId });
      }
    );
  },


  // Alle Einträge ab dem aktuellen Tag für einen ÜK (und optional Klasse) abrufen
getEintraege: (req, res) => {
    const { uekId, klasseId } = req.params;
  
    let sql = `
      SELECT s.id, 
             s.datum, 
             DAYNAME(s.datum) AS tag,   -- automatisch Wochentag berechnen
             DATE_FORMAT(s.von, '%H:%i') AS von,
             DATE_FORMAT(s.bis, '%H:%i') AS bis,
             s.thema, s.referent,
             k.name AS klasse_name, 
             u.titel AS uek_titel, 
             r.name AS raum_name
      FROM stundenplan s
      JOIN klasse k ON s.klasse_id = k.id
      JOIN uek u ON s.uek_id = u.id
      JOIN raum r ON s.raum_id = r.id
      WHERE s.uek_id = ?
        AND s.datum >= CURDATE()       -- nur ab dem heutigen Tag
    `;
    const params = [uekId];
  
    if (klasseId) {
      sql += " AND s.klasse_id = ? ";
      params.push(klasseId);
    }
  
    // Sortieren nach Datum + Startzeit
    sql += " ORDER BY s.datum ASC, s.von ASC";
  
    pool.query(sql, params, (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Fehler beim Abrufen der Einträge." });
      }
      res.status(200).json(rows);
    });
  },
  
  // Eintrag aktualisieren
  updateEintrag: (req, res) => {
    const { id, datum, von, bis, thema, raum_id, referent } = req.body;
    if (!id || !datum || !von || !bis || !thema || !raum_id || !referent) {
      return res.status(400).json({ error: "Alle Felder müssen angegeben werden." });
    }

    pool.query(
      `UPDATE stundenplan 
       SET datum = ?, von = ?, bis = ?, thema = ?, raum_id = ?, referent = ?
       WHERE id = ?`,
      [datum, von, bis, thema, raum_id, referent, id],
      (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Fehler beim Aktualisieren des Eintrags." });
        }
        res.status(200).json({ message: "Eintrag erfolgreich aktualisiert." });
      }
    );
  },

  // Eintrag löschen
  deleteEintrag: (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ID muss angegeben werden." });

    pool.query(
      `DELETE FROM stundenplan WHERE id = ?`,
      [id],
      (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Fehler beim Löschen des Eintrags." });
        }
        res.status(200).json({ message: "Eintrag erfolgreich gelöscht." });
      }
    );
  }
};

module.exports = stundenplanController;
