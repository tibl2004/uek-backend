const pool = require("../database/index");
const jwt = require("jsonwebtoken");

const impressumController = {
  // Token-Check Middleware
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Kein Token bereitgestellt." });

    jwt.verify(token, "secretKey", (err, user) => {
      if (err) return res.status(403).json({ error: "Ungültiger Token." });
      req.user = user;
      next();
    });
  },

 

  updateImpressum: async (req, res) => {
    const { userType } = req.user;
    if (userType !== "vorstand")
      return res
        .status(403)
        .json({ error: "Nur Vorstände dürfen das Impressum aktualisieren." });

    const { title, text, adresse } = req.body;
    if (!title || !text || !adresse)
      return res
        .status(400)
        .json({ error: "Titel, Text und Adresse sind Pflichtfelder." });

    try {
      const [existing] = await pool.query("SELECT * FROM impressum LIMIT 1");
      if (existing.length === 0) {
        return res
          .status(404)
          .json({ error: "Kein Impressum vorhanden. Bitte zuerst erstellen." });
      }

      const updateSql =
        "UPDATE impressum SET title=?, text=?, adresse=? WHERE id=?";
      await pool.query(updateSql, [title, text, adresse, existing[0].id]);
      return res.json({ message: "Impressum erfolgreich aktualisiert." });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "Fehler beim Aktualisieren des Impressums." });
    }
  },

  getImpressum: async (req, res) => {
    try {
      const [impressumRows] = await pool.query("SELECT * FROM impressum LIMIT 1");
      if (impressumRows.length === 0)
        return res.status(404).json({ error: "Kein Impressum vorhanden." });
      const impressum = impressumRows[0];

      const [logoRows] = await pool.query("SELECT * FROM logos LIMIT 1");
      const logo = logoRows.length > 0 ? logoRows[0].image : null;

      const [linksRows] = await pool.query(
        "SELECT * FROM impressum_links ORDER BY id ASC"
      );

      res.json({
        title: impressum.title,
        text: impressum.text,
        adresse: impressum.adresse,
        logo,
        links: linksRows,
      });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ error: "Fehler beim Abrufen des Impressums." });
    }
  },

  create: async (req, res) => {
    const { userType } = req.user;
    if (userType !== "vorstand") {
      return res.status(403).json({ error: "Nur Vorstände dürfen ein Impressum erstellen." });
    }
  
    const { title, text, links, adresse } = req.body;
  
    if (!title || !text || !adresse) {
      return res.status(400).json({ error: "Titel, Text und Adresse sind Pflichtfelder." });
    }
  
    try {
      // prüfen, ob es schon ein Impressum gibt
      const [existing] = await pool.query("SELECT * FROM impressum LIMIT 1");
      if (existing.length > 0) {
        return res.status(400).json({ error: "Ein Impressum existiert bereits. Bitte zuerst aktualisieren." });
      }
  
      // Impressum speichern
      const [result] = await pool.query(
        "INSERT INTO impressum (title, text) VALUES (?, ?)",
        [title, text]
      );
      const impressumId = result.insertId;
  
      let savedLinks = [];
  
      // 1️⃣ Adresse als erster Link
      const [adresseResult] = await pool.query(
        "INSERT INTO impressum_links (impressum_id, title, url, icon) VALUES (?, ?, ?, ?)",
        [impressumId, "Adresse", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`, "MapPin"]
      );
  
      savedLinks.push({
        id: adresseResult.insertId,
        title: "Adresse",
        url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`,
        icon: "MapPin",
      });
  
      // 2️⃣ andere Links speichern
      if (Array.isArray(links) && links.length > 0) {
        for (const link of links) {
          const [linkResult] = await pool.query(
            "INSERT INTO impressum_links (impressum_id, title, url, icon) VALUES (?, ?, ?, ?)",
            [impressumId, link.title, link.url, link.icon || null]
          );
  
          savedLinks.push({
            id: linkResult.insertId,
            title: link.title,
            url: link.url,
            icon: link.icon || null,
          });
        }
      }
  
      return res.status(201).json({
        message: "Impressum inkl. Links erfolgreich erstellt.",
        impressum: {
          id: impressumId,
          title,
          text,
          links: savedLinks,
        },
      });
    } catch (err) {
      console.error("Fehler beim Erstellen des Impressums:", err);
      return res.status(500).json({ error: "Fehler beim Erstellen des Impressums." });
    }
  },
  

  getLinks: async (req, res) => {
    try {
      const [results] = await pool.query(
        "SELECT * FROM impressum_links ORDER BY id ASC"
      );
      res.json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Fehler beim Abrufen der Links." });
    }
  },

  updateLink: async (req, res) => {
    const { userType } = req.user;
    if (userType !== "vorstand")
      return res
        .status(403)
        .json({ error: "Nur Vorstände dürfen Links bearbeiten." });

    const { id, title, url, icon } = req.body;
    if (!id || !title || !url || !icon)
      return res.status(400).json({
        error: "ID, Titel, URL und Icon sind Pflichtfelder.",
      });

    try {
      const updateSql =
        "UPDATE impressum_links SET title=?, url=?, icon=? WHERE id=?";
      await pool.query(updateSql, [title, url, icon, id]);
      res.json({ message: "Link erfolgreich aktualisiert." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Fehler beim Aktualisieren des Links." });
    }
  },

  deleteLink: async (req, res) => {
    const { userType } = req.user;
    if (userType !== "vorstand")
      return res
        .status(403)
        .json({ error: "Nur Vorstände dürfen Links löschen." });

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
  },
};

module.exports = impressumController;
