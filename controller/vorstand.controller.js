const pool = require("../database/index");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt'); // Falls noch nicht oben importiert


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

  createVorstand: async (req, res) => {
    try {
      // Nur Admin darf Vorstand erstellen
      if (req.user.userType !== 'admin') {
        return res.status(403).json({ error: 'Nur Admins dürfen einen Vorstand erstellen.' });
      }
  
      const {
        geschlecht,
        vorname,
        nachname,
        adresse,
        plz,
        ort,
        benutzername,
        passwort,
        telefon,
        email,
        foto, // Erwartet als vollständiger Base64-String mit Präfix
        beschreibung,
        rolle
      } = req.body;
  
      // Pflichtfeld-Check
      if (
        !geschlecht || !vorname || !nachname || !adresse || !plz || !ort ||
        !benutzername || !passwort || !telefon || !email || !rolle
      ) {
        return res.status(400).json({ error: "Alle Pflichtfelder inklusive Rolle müssen ausgefüllt sein." });
      }
  
      // Falls Foto mitgeliefert wird, prüfe das Format
      let base64Foto = null;
      if (foto) {
        if (!foto.startsWith('data:image/png;base64,')) {
          return res.status(400).json({ error: 'Foto muss als PNG im Base64-Format mit Prefix gesendet werden.' });
        }
        // Optional: Header entfernen, nur wenn du es so wie bei "unterschrift" machen willst
        base64Foto = foto.replace(/^data:image\/png;base64,/, '');
      }
  
      // Benutzername darf nicht doppelt vorkommen
      const [existingUser] = await pool.query(
        'SELECT id FROM vorstand WHERE benutzername = ?',
        [benutzername]
      );
      if (existingUser.length > 0) {
        return res.status(409).json({ error: 'Benutzername bereits vergeben.' });
      }
  
      // Passwort verschlüsseln
      const hashedPassword = await bcrypt.hash(passwort, 10);
  
      // In DB speichern
      await pool.query(
        `INSERT INTO vorstand 
          (geschlecht, vorname, nachname, adresse, plz, ort, benutzername, passwort, telefon, email, foto, beschreibung, rolle)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          geschlecht,
          vorname,
          nachname,
          adresse,
          plz,
          ort,
          benutzername,
          hashedPassword,
          telefon,
          email,
          base64Foto,
          beschreibung || null,
          rolle
        ]
      );
  
      res.status(201).json({ message: 'Vorstand erfolgreich erstellt.' });
    } catch (error) {
      console.error('Fehler beim Erstellen des Vorstands:', error);
      res.status(500).json({ error: 'Fehler beim Erstellen des Vorstands.' });
    }
  }
  

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

  getMyProfile: async (req, res) => {
    try {
      const vorstandId = req.user.id;

      const [rows] = await pool.query(
        `SELECT id, vorname, nachname, adresse, plz, ort, telefon, email, beschreibung, benutzername, foto 
         FROM vorstand WHERE id = ?`,
        [vorstandId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Vorstand nicht gefunden." });
      }

      const v = rows[0];
      res.status(200).json({
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
        foto: v.foto || null // PNG Base64 mit Prefix direkt speichern/ausliefern
      });
    } catch (error) {
      console.error("Fehler beim Abrufen des Profils:", error);
      res.status(500).json({ error: "Fehler beim Abrufen des Profils." });
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
        foto
      } = req.body;

      if (foto && !foto.startsWith("data:image/png;base64,")) {
        return res.status(400).json({ error: "Foto muss ein PNG im Base64-Format mit Prefix sein." });
      }

      await pool.query(
        `UPDATE vorstand SET vorname = ?, nachname = ?, adresse = ?, plz = ?, ort = ?, 
         telefon = ?, email = ?, beschreibung = ?, benutzername = ?, foto = ?
         WHERE id = ?`,
        [vorname, nachname, adresse, plz, ort, telefon, email, beschreibung, benutzername, foto, id]
      );

      res.status(200).json({ message: "Profil erfolgreich aktualisiert." });
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Profils:", error);
      res.status(500).json({ error: "Fehler beim Aktualisieren des Profils." });
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
