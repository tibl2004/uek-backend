const pool = require("../database/index");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

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
      const userType = req.user.userType;
      if (userType !== 'admin') {
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
        foto,          // base64 String (data:image/jpeg;base64,...)
        beschreibung,
        rolle
      } = req.body;

      if (
        !geschlecht || !vorname || !nachname || !adresse || !plz || !ort ||
        !benutzername || !passwort || !telefon || !email || !rolle
      ) {
        return res.status(400).json({ error: "Alle Pflichtfelder inklusive Rolle müssen ausgefüllt sein." });
      }

      const [existingUser] = await pool.query(
        `SELECT id FROM vorstand WHERE benutzername = ?`,
        [benutzername]
      );

      if (existingUser.length > 0) {
        return res.status(409).json({ error: "Benutzername bereits vergeben." });
      }

      const hashedPassword = await bcrypt.hash(passwort, 10);

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
          foto, // korrekt benannte Variable
          beschreibung || null,
          rolle
        ]
      );

      res.status(201).json({ message: "Vorstand erfolgreich erstellt." });
    } catch (error) {
      console.error("Fehler beim Erstellen des Vorstands:", error);
      res.status(500).json({ error: "Fehler beim Erstellen des Vorstands." });
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
        foto: v.foto ? `data:image/jpeg;base64,${v.foto}` : null
      }));

      res.status(200).json(result);
    } catch (error) {
      console.error("Fehler beim Abrufen des Vorstands:", error);
      res.status(500).json({ error: "Fehler beim Abrufen des Vorstands." });
    }
  }
};

module.exports = vorstandController;
