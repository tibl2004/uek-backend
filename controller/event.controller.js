const pool = require("../database/index");
const jwt = require("jsonwebtoken");
const sharp = require("sharp");

const eventController = {
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Kein Token bereitgestellt.' });

    jwt.verify(token, 'secretKey', (err, user) => {
      if (err) return res.status(403).json({ error: 'Ungültiger Token.' });
      req.user = user;
      next();
    });
  },

  createEvent: async (req, res) => {
    try {
      // Prüfen, ob User Rolle vorstand oder admin ist
      if (!req.user || !['admin', 'vorstand'].includes(req.user.rolle)) {
        return res.status(403).json({ error: "Nur Vorstand oder Admin dürfen Events erstellen." });
      }
  
      const connection = await pool.getConnection();
      const {
        titel,
        beschreibung,
        ort,
        von,
        bis,
        alle,
        supporter,
        bildtitel,
        preise
      } = req.body;
  
      if (!titel || !beschreibung || !ort || !von || !bis) {
        connection.release();
        return res.status(400).json({ error: "Titel, Beschreibung, Ort, Von und Bis müssen angegeben werden." });
      }
  
      let bildBase64 = null;
  
      if (req.file) {
        const pngBuffer = await sharp(req.file.buffer).png().toBuffer();
        bildBase64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
      } else if (req.body.bild && req.body.bild.startsWith("data:image/png;base64,")) {
        bildBase64 = req.body.bild;
      } else if (req.body.bild) {
        connection.release();
        return res.status(400).json({ error: "Bild muss hochgeladen oder als PNG-Base64 mit Prefix gesendet werden." });
      }
  
      await connection.beginTransaction();
  
      const [eventResult] = await connection.query(
        `INSERT INTO events (titel, beschreibung, ort, von, bis, bild, bildtitel, supporter, alle)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          titel, beschreibung, ort, von, bis,
          bildBase64, bildtitel || null,
          supporter || null, alle ? 1 : 0
        ]
      );
  
      const eventId = eventResult.insertId;
  
      if (Array.isArray(preise) && preise.length > 0) {
        const preisWerte = preise
          .filter(p => p.preisbeschreibung && p.kosten != null)
          .map(p => [eventId, p.preisbeschreibung, p.kosten]);
  
        if (preisWerte.length > 0) {
          await connection.query(
            `INSERT INTO event_preise (event_id, preisbeschreibung, kosten) VALUES ?`,
            [preisWerte]
          );
        }
      }
  
      await connection.commit();
      connection.release();
  
      res.status(201).json({ message: "Event erfolgreich erstellt." });
    } catch (error) {
      if (connection) await connection.rollback();
      if (connection) connection.release();
  
      console.error("Fehler beim Erstellen des Events:", error);
      res.status(500).json({ error: "Fehler beim Erstellen des Events." });
    }
  },
  
  getEvents: async (req, res) => {
    try {
      const [events] = await pool.query(`
        SELECT e.id, e.titel, e.beschreibung, e.ort, e.von, e.bis, e.bild, e.alle, e.supporter,
               p.id as preis_id, p.preisbeschreibung, p.kosten
        FROM events e
        LEFT JOIN event_preise p ON e.id = p.event_id
        ORDER BY e.von DESC
      `);

      const grouped = {};
      for (const row of events) {
        if (!grouped[row.id]) {
          grouped[row.id] = {
            id: row.id,
            titel: row.titel,
            beschreibung: row.beschreibung,
            ort: row.ort,
            von: row.von,
            bis: row.bis,
            bild: row.bild ? `data:image/png;base64,${row.bild}` : null,
            alle: !!row.alle,
            supporter: !!row.supporter,
            preise: []
          };
        }

        if (row.preis_id) {
          grouped[row.id].preise.push({
            id: row.preis_id,
            preisbeschreibung: row.preisbeschreibung,
            kosten: row.kosten
          });
        }
      }

      res.status(200).json(Object.values(grouped));
    } catch (error) {
      console.error("Fehler beim Abrufen der Events:", error);
      res.status(500).json({ error: "Fehler beim Abrufen der Events." });
    }
  },

  getEventById: async (req, res) => {
    try {
      const eventId = req.params.id;

      const [events] = await pool.query(`
        SELECT e.id, e.titel, e.beschreibung, e.ort, e.von, e.bis, e.bild, e.alle, e.supporter,
               p.id as preis_id, p.preisbeschreibung, p.kosten
        FROM events e
        LEFT JOIN event_preise p ON e.id = p.event_id
        WHERE e.id = ?
      `, [eventId]);

      if (events.length === 0) {
        return res.status(404).json({ error: "Event nicht gefunden." });
      }

      const event = {
        id: events[0].id,
        titel: events[0].titel,
        beschreibung: events[0].beschreibung,
        ort: events[0].ort,
        von: events[0].von,
        bis: events[0].bis,
        bild: events[0].bild ? `data:image/png;base64,${events[0].bild}` : null,
        alle: !!events[0].alle,
        supporter: !!events[0].supporter,
        preise: []
      };

      for (const row of events) {
        if (row.preis_id) {
          event.preise.push({
            id: row.preis_id,
            preisbeschreibung: row.preisbeschreibung,
            kosten: row.kosten
          });
        }
      }

      res.status(200).json(event);
    } catch (error) {
      console.error("Fehler beim Abrufen des Events:", error);
      res.status(500).json({ error: "Fehler beim Abrufen des Events." });
    }
  },

  updateEvent: async (req, res) => {
    try {
      if (req.user.userType !== 'admin') {
        return res.status(403).json({ error: 'Nur Admins dürfen Events bearbeiten.' });
      }

      const eventId = req.params.id;
      const { titel, beschreibung, ort, von, bis, alle, supporter } = req.body;

      let bildBase64 = null;
      if (req.body.bild) {
        if (!req.body.bild.startsWith('data:image/png;base64,')) {
          return res.status(400).json({ error: 'Bild muss als PNG im Base64-Format mit Prefix gesendet werden.' });
        }
        bildBase64 = req.body.bild.replace(/^data:image\/png;base64,/, '');
      }

      let sql = `UPDATE events SET titel = ?, beschreibung = ?, ort = ?, von = ?, bis = ?, alle = ?, supporter = ?`;
      let params = [titel, beschreibung, ort, von, bis, alle ? 1 : 0, supporter ? 1 : 0];

      if (bildBase64 !== null) {
        sql += `, bild = ?`;
        params.push(bildBase64);
      }

      sql += ` WHERE id = ?`;
      params.push(eventId);

      await pool.query(sql, params);

      res.status(200).json({ message: "Event erfolgreich aktualisiert." });
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Events:", error);
      res.status(500).json({ error: "Fehler beim Aktualisieren des Events." });
    }
  },

  deleteEvent: async (req, res) => {
    try {
      if (req.user.userType !== 'admin') {
        return res.status(403).json({ error: 'Nur Admins dürfen Events löschen.' });
      }

      const eventId = req.params.id;
      await pool.query(`DELETE FROM events WHERE id = ?`, [eventId]);

      res.status(200).json({ message: "Event erfolgreich gelöscht." });
    } catch (error) {
      console.error("Fehler beim Löschen des Events:", error);
      res.status(500).json({ error: "Fehler beim Löschen des Events." });
    }
  }
};

module.exports = eventController;
