const pool = require("../database/index");
const jwt = require("jsonwebtoken");

const impressumController = {
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

  // Neues Impressum erstellen
  createImpressum: async (req, res) => {
    const { userType } = req.user;
    if (userType !== 'vorstand') return res.status(403).json({ error: "Nur Vorstände dürfen das Impressum erstellen." });

    const { title, text, adresse } = req.body;
    if (!title || !text || !adresse) return res.status(400).json({ error: "Titel, Text und Adresse sind Pflichtfelder." });

    try {
      const [existing] = await pool.query("SELECT * FROM impressum LIMIT 1");
      if (existing.length > 0) {
        return res.status(400).json({ error: "Ein Impressum existiert bereits. Bitte zuerst aktualisieren." });
      }

      const insertSql = "INSERT INTO impressum (title, text, adresse) VALUES (?, ?, ?)";
      await pool.query(insertSql, [title, text, adresse]);
      return res.status(201).json({ message: "Impressum erfolgreich erstellt." });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Fehler beim Erstellen des Impressums." });
    }
  },

  // Bestehendes Impressum aktualisieren
  updateImpressum: async (req, res) => {
    const { userType } = req.user;
    if (userType !== 'vorstand') return res.status(403).json({ error: "Nur Vorstände dürfen das Impressum aktualisieren." });

    const { title, text, adresse } = req.body;
    if (!title || !text || !adresse) return res.status(400).json({ error: "Titel, Text und Adresse sind Pflichtfelder." });

    try {
      const [existing] = await pool.query("SELECT * FROM impressum LIMIT 1");
      if (existing.length === 0) {
        return res.status(404).json({ error: "Kein Impressum vorhanden. Bitte zuerst erstellen." });
      }

      const updateSql = "UPDATE impressum SET title=?, text=?, adresse=? WHERE id=?";
      await pool.query(updateSql, [title, text, adresse, existing[0].id]);
      return res.json({ message: "Impressum erfolgreich aktualisiert." });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Fehler beim Aktualisieren des Impressums." });
    }
  },

  // Impressum abrufen
  getImpressum: async (req, res) => {
    try {
      const [impressumRows] = await pool.query("SELECT * FROM impressum LIMIT 1");
      if (impressumRows.length === 0) return res.status(404).json({ error: "Kein Impressum vorhanden." });
      const impressum = impressumRows[0];

      const [logoRows] = await pool.query("SELECT * FROM logos LIMIT 1");
      const logo = logoRows.length > 0 ? logoRows[0].image : null;

      const [linksRows] = await pool.query("SELECT * FROM impressum_links ORDER BY id ASC");

      res.json({
        title: impressum.title,
        text: impressum.text,
        adresse: impressum.adresse,
        logo,
        links: linksRows
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Fehler beim Abrufen des Impressums." });
    }
  }
};

module.exports = impressumController;
