const pool = require("../database/index");
const jwt = require("jsonwebtoken");

const impressumLinksController = {
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

  // Neuen Link erstellen
  createLink: async (req, res) => {
    const { userType } = req.user;
    if (userType !== 'vorstand') return res.status(403).json({ error: "Nur Vorstände dürfen Links erstellen." });

    const { title, url, icon } = req.body;
    if (!title || !url || !icon) return res.status(400).json({ error: "Titel, URL und Icon sind Pflichtfelder." });

    try {
      const insertSql = "INSERT INTO impressum_links (title, url, icon) VALUES (?, ?, ?)";
      await pool.query(insertSql, [title, url, icon]);
      res.status(201).json({ message: "Link erfolgreich erstellt." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Fehler beim Erstellen des Links." });
    }
  },

  // Alle Links abrufen
  getLinks: async (req, res) => {
    try {
      const [results] = await pool.query("SELECT * FROM impressum_links ORDER BY id ASC");
      res.json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Fehler beim Abrufen der Links." });
    }
  },

  // Link aktualisieren
  updateLink: async (req, res) => {
    const { userType } = req.user;
    if (userType !== 'vorstand') return res.status(403).json({ error: "Nur Vorstände dürfen Links bearbeiten." });

    const { id, title, url, icon } = req.body;
    if (!id || !title || !url || !icon) return res.status(400).json({ error: "ID, Titel, URL und Icon sind Pflichtfelder." });

    try {
      const updateSql = "UPDATE impressum_links SET title=?, url=?, icon=? WHERE id=?";
      await pool.query(updateSql, [title, url, icon, id]);
      res.json({ message: "Link erfolgreich aktualisiert." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Fehler beim Aktualisieren des Links." });
    }
  },

  // Link löschen
  deleteLink: async (req, res) => {
    const { userType } = req.user;
    if (userType !== 'vorstand') return res.status(403).json({ error: "Nur Vorstände dürfen Links löschen." });

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "ID muss angegeben werden." });

    try {
      const deleteSql = "DELETE FROM impressum_links WHERE id=?";
      await pool.query(deleteSql, [id]);
      res.json({ message: "Link erfolgreich gelöscht." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Fehler beim Löschen des Links." });
    }
  }
};

module.exports = impressumLinksController;
