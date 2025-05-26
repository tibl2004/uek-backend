const pool = require("../database/index");
const bcrypt = require("bcrypt");

const adminController = {
  create: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { vorname, nachname, benutzername, passwort } = req.body;
  
      if (!vorname || !nachname || !benutzername || !passwort) {
        return res.status(400).json({ fehler: "Vorname, Nachname, Benutzername und Passwort sind erforderlich." });
      }
  
      await connection.beginTransaction();
  
      // Benutzername prüfen
      const [vorhandenAdmin] = await connection.query("SELECT id FROM admins WHERE benutzername = ?", [benutzername]);
      if (vorhandenAdmin.length > 0) {
        await connection.rollback();
        return res.status(409).json({ fehler: "Benutzername ist bereits vergeben." });
      }
  
      const [vorhandenVorstand] = await connection.query("SELECT id FROM vorstand WHERE benutzername = ?", [benutzername]);
      if (vorhandenVorstand.length > 0) {
        await connection.rollback();
        return res.status(409).json({ fehler: "Benutzername ist bereits als Vorstand vergeben." });
      }
  
      const gehashtesPasswort = await bcrypt.hash(passwort, 10);
  
      // Admin speichern
      await connection.query(
        "INSERT INTO admins (vorname, nachname, benutzername, passwort) VALUES (?, ?, ?, ?)",
        [vorname, nachname, benutzername, gehashtesPasswort]
      );
  
      // Vorstand speichern
      await connection.query(
        `INSERT INTO vorstand 
        (geschlecht, vorname, nachname, adresse, plz, ort, benutzername, passwort, telefon, email, foto, beschreibung, rolle)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          null,
          vorname,
          nachname,
          null,
          null,
          null,
          benutzername,
          gehashtesPasswort,
          null,
          null,
          null,
          null,
          "Präsident"
        ]
      );
  
      await connection.commit();
  
      res.status(201).json({ nachricht: "Admin und Vorstand (PRÄSIDENTPRÄSIDENT) erfolgreich erstellt." });
    } catch (fehler) {
      await connection.rollback();
      console.error("Fehler beim Erstellen des Admins:", fehler);
      res.status(500).json({ fehler: "Interner Serverfehler beim Erstellen des Admins." });
    } finally {
      connection.release();
    }
  }
  
};

module.exports = adminController;
