const pool = require("../database/index");
const bcrypt = require("bcrypt");

const adminController = {
  // Admin erstellen
  create: async (req, res) => {
    try {
      const { benutzername, passwort } = req.body;

      if (!benutzername || !passwort) {
        return res.status(400).json({ error: "Benutzername und Passwort erforderlich." });
      }

      // Prüfen, ob Benutzername schon existiert
      pool.query(
        "SELECT id FROM admins WHERE benutzername = ?",
        [benutzername],
        async (err, results) => {
          if (err) return res.status(500).json({ error: "DB Fehler." });
          if (results.length > 0) {
            return res.status(400).json({ error: "Benutzername existiert bereits." });
          }

          const hashedPassword = await bcrypt.hash(passwort, 10);

          pool.query(
            "INSERT INTO admins (benutzername, passwort) VALUES (?, ?)",
            [benutzername, hashedPassword],
            (err, result) => {
              if (err) return res.status(500).json({ error: "Fehler beim Erstellen des Admins." });
              res.status(201).json({ message: "Admin erfolgreich erstellt.", id: result.insertId });
            }
          );
        }
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Serverfehler." });
    }
  }
};

module.exports = adminController;
