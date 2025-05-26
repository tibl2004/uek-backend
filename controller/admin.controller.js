const pool = require("../database/index");
const bcrypt = require("bcrypt");

const adminController = {

  create: async (req, res) => {
    try {
      const { vorname, nachname, benutzername, passwort } = req.body;
  
      if (!vorname || !nachname || !benutzername || !passwort) {
        return res.status(400).json({ fehler: "Vorname, Nachname, Benutzername und Passwort sind erforderlich." });
      }
  
      // Prüfen, ob der Benutzername bereits existiert
      const [vorhandenAdmin] = await pool.query("SELECT id FROM admins WHERE benutzername = ?", [benutzername]);
      if (vorhandenAdmin.length > 0) {
        return res.status(409).json({ fehler: "Benutzername ist bereits vergeben." });
      }
  
      const [vorhandenVorstand] = await pool.query("SELECT id FROM vorstand WHERE benutzername = ?", [benutzername]);
      if (vorhandenVorstand.length > 0) {
        return res.status(409).json({ fehler: "Benutzername ist bereits als Vorstand vergeben." });
      }
  
      // Passwort hashen
      const gehashtesPasswort = await bcrypt.hash(passwort, 10);
  
      // Admin in admins Tabelle speichern
      await pool.query(
        "INSERT INTO admins (vorname, nachname, benutzername, passwort) VALUES (?, ?, ?, ?)",
        [vorname, nachname, benutzername, gehashtesPasswort]
      );
  
      // Admin auch in vorstand Tabelle speichern mit Rolle "PRÄSIDENTPRÄSIDENT"
      await pool.query(
        `INSERT INTO vorstand 
        (geschlecht, vorname, nachname, adresse, plz, ort, benutzername, passwort, telefon, email, foto, beschreibung, rolle)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          null,       // geschlecht (optional)
          vorname,
          nachname,
          null,       // adresse (optional)
          null,       // plz (optional)
          null,       // ort (optional)
          benutzername,
          gehashtesPasswort,
          null,       // telefon (optional)
          null,       // email (optional)
          null,       // foto (optional)
          null,       // beschreibung (optional)
          "Präsident" // Rolle fest auf "PRÄSIDENTPRÄSIDENT"
        ]
      );
  
      res.status(201).json({ nachricht: "Admin und Vorstand (PRÄSIDENTPRÄSIDENT) erfolgreich erstellt." });
    } catch (fehler) {
      console.error("Fehler beim Erstellen des Admins:", fehler);
      res.status(500).json({ fehler: "Interner Serverfehler beim Erstellen des Admins." });
    }
  }
  
};

module.exports = adminController;
