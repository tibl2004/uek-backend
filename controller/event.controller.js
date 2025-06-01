const pool = require("../database/index");
const jwt = require("jsonwebtoken");
const sharp = require("sharp"); // Falls Bildkonvertierung benötigt wird

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
      const {
        titel,
        beschreibung,
        ort,
        von,
        bis,
        alle,
        supporter,
        bildtitel  // Bildtitel aus dem Request auslesen
      } = req.body;
  
      // Pflichtfelder prüfen
      if (!titel || !beschreibung || !ort || !von || !bis) {
        return res.status(400).json({ error: "Titel, Beschreibung, Ort, Von und Bis müssen angegeben werden." });
      }
  
      let bildBase64 = null;
  
      // Bild hochladen & als PNG-Base64 umwandeln
      if (req.file) {
        const pngBuffer = await sharp(req.file.buffer)
          .png()
          .toBuffer();
        bildBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;
      } else if (req.body.bild && req.body.bild.startsWith('data:image/png;base64,')) {
        bildBase64 = req.body.bild;
      } else if (req.body.bild) {
        return res.status(400).json({ error: "Bild muss hochgeladen oder als PNG-Base64 mit Prefix gesendet werden." });
      }
  
      // Daten in DB speichern, inkl. bildtitel (oder null, falls leer)
      await pool.query(
        `INSERT INTO events 
         (titel, beschreibung, ort, von, bis, bild, bildtitel, alle, supporter)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          titel,
          beschreibung,
          ort,
          von,
          bis,
          bildBase64,
          bildtitel || null,
          alle ? 1 : 0,
          supporter ? 1 : 0,
        ]
      );
  
      res.status(201).json({ message: "Event erfolgreich erstellt." });
    } catch (error) {
      console.error("Fehler beim Erstellen des Events:", error);
      res.status(500).json({ error: "Fehler beim Erstellen des Events." });
    }
  },
  
  
  

  getEvents: async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, titel, beschreibung, ort, von, bis, bild, alle, supporter FROM events ORDER BY von DESC`
      );

      const events = rows.map(event => ({
        id: event.id,
        titel: event.titel,
        beschreibung: event.beschreibung,
        ort: event.ort,
        von: event.von,
        bis: event.bis,
        bild: event.bild ? `data:image/png;base64,${event.bild}` : null,
        alle: !!event.alle,
        supporter: !!event.supporter
      }));

      res.status(200).json(events);
    } catch (error) {
      console.error("Fehler beim Abrufen der Events:", error);
      res.status(500).json({ error: "Fehler beim Abrufen der Events." });
    }
  },

  getEventById: async (req, res) => {
    try {
      const eventId = req.params.id;
      const [rows] = await pool.query(
        `SELECT id, titel, beschreibung, ort, von, bis, bild, alle, supporter FROM events WHERE id = ?`,
        [eventId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Event nicht gefunden." });
      }

      const event = rows[0];
      res.status(200).json({
        id: event.id,
        titel: event.titel,
        beschreibung: event.beschreibung,
        ort: event.ort,
        von: event.von,
        bis: event.bis,
        bild: event.bild ? `data:image/png;base64,${event.bild}` : null,
        alle: !!event.alle,
        supporter: !!event.supporter
      });
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
      const {
        titel,
        beschreibung,
        ort,
        von,
        bis,
        alle,
        supporter
      } = req.body;

      let bildBase64 = null;
      if (req.body.bild) {
        if (!req.body.bild.startsWith('data:image/png;base64,')) {
          return res.status(400).json({ error: 'Bild muss als PNG im Base64-Format mit Prefix gesendet werden.' });
        }
        bildBase64 = req.body.bild.replace(/^data:image\/png;base64,/, '');
      }

      // Update-Query dynamisch mit Bild nur, wenn vorhanden
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
