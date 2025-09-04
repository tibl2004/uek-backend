const pool = require("../database/index");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt'); // Falls noch nicht oben importiert
const sharp = require("sharp");



const vorstandController = {
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

  createEvent: async (req, res) => {
    let connection;
    try {
      // Nur Vorstände dürfen Events erstellen
      if (
        !req.user.userTypes ||
        !Array.isArray(req.user.userTypes) ||
        !req.user.userTypes.includes("vorstand")
      ) {
        return res.status(403).json({ error: "Nur Benutzer mit Vorstandrechten dürfen ein Event erstellen." });
      }
  
      const {
        titel,
        beschreibung,
        ort,
        von,
        bis,
        alle,
        supporter,
        bildtitel,
        preise,
        bild // Erwartet als vollständiger Base64-String mit Präfix
      } = req.body;
  
      if (!titel || !beschreibung || !ort || !von || !bis) {
        return res.status(400).json({ error: "Titel, Beschreibung, Ort, Von und Bis müssen angegeben werden." });
      }
  
      // Falls Bild mitgeliefert wird, prüfe das Format und wandle es in PNG um
      let base64Bild = null;
      if (bild) {
        const matches = bild.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ error: "Ungültiges Bildformat. Erwarte Base64-String mit data:image/... Prefix." });
        }
  
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");
  
        // Nur bestimmte Formate zulassen
        if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mimeType)) {
          return res.status(400).json({ error: "Nur PNG, JPEG, JPG oder WEBP erlaubt." });
        }
  
        const convertedBuffer = await sharp(buffer).png().toBuffer();
        base64Bild = convertedBuffer.toString("base64"); // Reines Base64 ohne Prefix
      }
  
      connection = await pool.getConnection();
      await connection.beginTransaction();
  
      // Event speichern
      const [eventResult] = await connection.query(
        `INSERT INTO events (titel, beschreibung, ort, von, bis, bild, bildtitel, supporter, alle)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [titel, beschreibung, ort, von, bis, base64Bild, bildtitel || null, supporter || null, alle ? 1 : 0]
      );
  
      const eventId = eventResult.insertId;
  
      // Preise hinzufügen
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
      res.status(201).json({ message: "Event erfolgreich erstellt." });
    } catch (error) {
      if (connection) {
        try { await connection.rollback(); } catch {}
        connection.release();
      }
      console.error("Fehler beim Erstellen des Events:", error);
      res.status(500).json({ error: "Fehler beim Erstellen des Events." });
    } finally {
      if (connection) connection.release();
    }
  },
  


  getVorstand: async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT vorname, nachname, foto, rolle, beschreibung FROM vorstand`
      );

      const result = rows.map(v => ({
        vorname: v.vorname,
        nachname: v.nachname,
        rolle: v.rolle,
        beschreibung: v.beschreibung,
        foto: v.foto || null // Foto ist vollständiger Base64-String
      }));

      res.status(200).json(result);
    } catch (error) {
      console.error("Fehler beim Abrufen des Vorstands:", error);
      res.status(500).json({ error: "Fehler beim Abrufen des Vorstands." });
    }
  },

  getVorstandFotos: async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT vorname, nachname, foto FROM vorstand`
      );

      const result = rows.map(v => ({
        vorname: v.vorname,
        nachname: v.nachname,
        foto: v.foto || null // Base64-String oder null
      }));

      res.status(200).json(result);
    } catch (error) {
      console.error("Fehler beim Abrufen der Vorstand-Fotos:", error);
      res.status(500).json({ error: "Fehler beim Abrufen der Vorstand-Fotos." });
    }
  },


  getMyProfile: async (req, res) => {
    try {
      const { id, benutzername, userType } = req.user;
  
      // 1. Prüfen, ob der User im Vorstand ist (egal ob admin oder nicht)
      const [rows] = await pool.query(
        `SELECT id, vorname, nachname, adresse, plz, ort, telefon, email, beschreibung, benutzername, foto 
         FROM vorstand WHERE id = ? OR benutzername = ?`,
        [id, benutzername]
      );
  
      if (rows.length > 0) {
        const v = rows[0];
        return res.status(200).json({
          id: v.id,
          vorname: v.vorname,
          nachname: v.nachname,
          adresse: v.adresse,
          plz: v.plz,
          ort: v.ort,
          telefon: v.telefon,
          email: v.email,
          beschreibung: v.beschreibung,
          benutzername: v.benutzername,
          foto: v.foto || null,
          istImVorstand: true
        });
      }
  
      // 2. Kein Vorstandseintrag — trotzdem Profil des Users zurückgeben
      // Hier ggf. weitere Daten aus anderer Tabelle (z.B. admins, mitarbeiter) holen
      // Beispiel: Tabelle 'admins' abfragen
      if (userType === 'admin') {
        const [adminRows] = await pool.query(
          `SELECT id, benutzername, email, foto FROM admins WHERE id = ? OR benutzername = ?`,
          [id, benutzername]
        );
        if (adminRows.length > 0) {
          const a = adminRows[0];
          return res.status(200).json({
            id: a.id,
            benutzername: a.benutzername,
            email: a.email,
            foto: a.foto || null,
            istImVorstand: false
          });
        }
      }
  
      // Wenn kein Eintrag in Vorstand oder admins, dann nur Basisdaten zurückgeben
      return res.status(200).json({
        id,
        benutzername,
        istImVorstand: false,
        message: "Benutzerprofil (Basisdaten)."
      });
  
    } catch (error) {
      console.error('Fehler beim Abrufen des Profils:', error);
      res.status(500).json({ error: 'Fehler beim Abrufen des Profils.' });
    }
  },
  

  updateMyProfile: async (req, res) => {
    try {
      const id = req.user.id;
      const {
        vorname,
        nachname,
        adresse,
        plz,
        ort,
        telefon,
        email,
        beschreibung,
        benutzername,
      } = req.body;

      let fotoBase64 = null;

      // Wenn ein Bild über FormData hochgeladen wird (req.file)
      if (req.file && req.file.buffer) {
        const pngBuffer = await sharp(req.file.buffer).resize(400).png().toBuffer();
        fotoBase64 = pngBuffer.toString("base64"); // Nur der reine Base64-String
      }

      let sql = `
        UPDATE vorstand SET 
          vorname = ?, nachname = ?, adresse = ?, plz = ?, ort = ?, 
          telefon = ?, email = ?, beschreibung = ?, benutzername = ?`;

      const params = [
        vorname,
        nachname,
        adresse,
        plz,
        ort,
        telefon,
        email,
        beschreibung,
        benutzername
      ];

      if (fotoBase64) {
        sql += `, foto = ?`;
        params.push(fotoBase64); // Nur der Base64-Inhalt ohne Präfix
      }

      sql += ` WHERE id = ?`;
      params.push(id);

      await pool.query(sql, params);
      res.status(200).json({ message: "Profil erfolgreich aktualisiert (nur Bildinhalt gespeichert)." });
    } catch (error) {
      console.error("Fehler beim Aktualisieren:", error.message);
      res.status(500).json({ error: "Profil konnte nicht aktualisiert werden." });
    }
  },

  changePasswordByAdmin: async (req, res) => {
    try {
      const userType = req.user.userType;
      if (userType !== 'admin') {
        return res.status(403).json({ error: "Nur Admins dürfen Passwörter ändern." });
      }

      const { id, neuesPasswort } = req.body;

      if (!id || !neuesPasswort) {
        return res.status(400).json({ error: "ID und neues Passwort sind erforderlich." });
      }

      const hashedPassword = await bcrypt.hash(neuesPasswort, 10);
      await pool.query(`UPDATE vorstand SET passwort = ? WHERE id = ?`, [hashedPassword, id]);

      res.status(200).json({ message: "Passwort erfolgreich geändert." });
    } catch (error) {
      console.error("Fehler beim Passwort-Ändern:", error);
      res.status(500).json({ error: "Fehler beim Passwort-Ändern." });
    }
  }
};

module.exports = vorstandController;
