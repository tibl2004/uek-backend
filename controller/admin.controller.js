const pool = require("../database/index");
const bcrypt = require("bcrypt");

const adminController = {

  // Admin erstellen (z.B. beim Setup oder durch anderen Admin)
  create: async (req, res) => {
    try {
      const { vorname, nachname, benutzername, passwort } = req.body;

      if (!vorname || !nachname || !benutzername || !passwort) {
        return res.status(400).json({ fehler: "Vorname, Nachname, Benutzername und Passwort sind erforderlich." });
      }

      // Prüfen, ob der Benutzername bereits existiert
      const [vorhanden] = await pool.query("SELECT id FROM admins WHERE benutzername = ?", [benutzername]);
      if (vorhanden.length > 0) {
        return res.status(409).json({ fehler: "Benutzername ist bereits vergeben." });
      }

      // Passwort hashen
      const gehashtesPasswort = await bcrypt.hash(passwort, 10);

      // Admin in die Datenbank einfügen
      await pool.query(
        "INSERT INTO admins (vorname, nachname, benutzername, passwort) VALUES (?, ?, ?, ?)",
        [vorname, nachname, benutzername, gehashtesPasswort]
      );

      res.status(201).json({ nachricht: "Admin wurde erfolgreich erstellt." });
    } catch (fehler) {
      console.error("Fehler beim Erstellen des Admins:", fehler);
      res.status(500).json({ fehler: "Interner Serverfehler beim Erstellen des Admins." });
    }
  }
};

module.exports = adminController;
