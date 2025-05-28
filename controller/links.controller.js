const pool = require("../database/index");
const jwt = require("jsonwebtoken");

const linksController = {
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Kein Token bereitgestellt.' });

    jwt.verify(token, 'secretKey', (err, user) => {
      if (err) {
        console.error('Token Überprüfung Fehlgeschlagen:', err);
        return res.status(403).json({ error: 'Ungültiger Token.' });
      }
      req.user = user;
      next();
    });
  },

  createSectionWithLinks: async (req, res) => {
    if (userType !== 'vorstand') {
      return res.status(403).json({ error: "Nur Admins dürfen Passwörter ändern." });
    }
    try {
  
      const { subtitle, links } = req.body;

      if (!subtitle || !Array.isArray(links) || links.length === 0) {
        return res.status(400).json({ error: 'Untertitel und mindestens ein Link müssen angegeben werden.' });
      }

      const insertSectionSql = 'INSERT INTO content_sections (subtitle) VALUES (?)';
      const [sectionResult] = await pool.query(insertSectionSql, [subtitle]);
      const sectionId = sectionResult.insertId;

      const insertLinkSql = 'INSERT INTO content_links (section_id, link_text, link_url) VALUES ?';
      const linkValues = links.map(link => [sectionId, link.text, link.url]);
      await pool.query(insertLinkSql, [linkValues]);

      res.status(201).json({ message: 'Inhalt erfolgreich erstellt.' });
    } catch (error) {
      console.error("Fehler beim Erstellen des Inhalts:", error);
      res.status(500).json({ error: "Fehler beim Erstellen des Inhalts." });
    }
  },

  getAllSectionsWithLinks: async (req, res) => {
    try {
      const [sections] = await pool.query('SELECT * FROM content_sections ORDER BY id');
      const [links] = await pool.query('SELECT * FROM content_links ORDER BY id');

      const sectionsWithLinks = sections.map(section => ({
        id: section.id,
        subtitle: section.subtitle,
        links: links
          .filter(link => link.section_id === section.id)
          .map(l => ({
            id: l.id,
            text: l.link_text,
            url: l.link_url
          }))
      }));

      res.json(sectionsWithLinks);
    } catch (error) {
      console.error("Fehler beim Abrufen der Inhalte:", error);
      res.status(500).json({ error: "Fehler beim Abrufen der Inhalte." });
    }
  },

  updateSectionWithLinks: async (req, res) => {
    try {
      if (req.user.userType !== 'admin') {
        return res.status(403).json({ error: 'Nur Administratoren dürfen Inhalte aktualisieren.' });
      }

      const sectionId = req.params.id;
      const { subtitle, links } = req.body;
      // links = [{id (optional), text, url}, ...]

      if (!subtitle || !Array.isArray(links)) {
        return res.status(400).json({ error: 'Untertitel und Links müssen angegeben werden.' });
      }

      // 1. Untertitel updaten
      const updateSectionSql = 'UPDATE content_sections SET subtitle = ? WHERE id = ?';
      await pool.query(updateSectionSql, [subtitle, sectionId]);

      // 2. Links aktualisieren
      // Links mit ID updaten, neue Links einfügen, gelöschte Links entfernen
      // 2a. Alle existierenden Links zur Section holen
      const [existingLinks] = await pool.query('SELECT * FROM content_links WHERE section_id = ?', [sectionId]);

      const existingLinkIds = existingLinks.map(l => l.id);
      const sentLinkIds = links.filter(l => l.id).map(l => l.id);

      // 2b. Links löschen, die nicht mehr gesendet wurden
      const toDeleteIds = existingLinkIds.filter(id => !sentLinkIds.includes(id));
      if (toDeleteIds.length > 0) {
        const deleteSql = `DELETE FROM content_links WHERE id IN (${toDeleteIds.map(() => '?').join(',')})`;
        await pool.query(deleteSql, toDeleteIds);
      }

      // 2c. Links updaten oder einfügen
      for (const link of links) {
        if (link.id) {
          // Update
          const updateLinkSql = 'UPDATE content_links SET link_text = ?, link_url = ? WHERE id = ?';
          await pool.query(updateLinkSql, [link.text, link.url, link.id]);
        } else {
          // Insert neu
          const insertLinkSql = 'INSERT INTO content_links (section_id, link_text, link_url) VALUES (?, ?, ?)';
          await pool.query(insertLinkSql, [sectionId, link.text, link.url]);
        }
      }

      res.json({ message: 'Inhalt erfolgreich aktualisiert.' });
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Inhalte:", error);
      res.status(500).json({ error: "Fehler beim Aktualisieren der Inhalte." });
    }
  },

  deleteSection: async (req, res) => {
    try {
      if (req.user.userType !== 'admin') {
        return res.status(403).json({ error: 'Nur Administratoren dürfen Inhalte löschen.' });
      }

      const sectionId = req.params.id;

      // Löschen der Sektion löscht wegen FOREIGN KEY CASCADE automatisch alle Links
      const deleteSectionSql = 'DELETE FROM content_sections WHERE id = ?';
      const [result] = await pool.query(deleteSectionSql, [sectionId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Untertitel nicht gefunden.' });
      }

      res.json({ message: 'Untertitel und alle zugehörigen Links gelöscht.' });
    } catch (error) {
      console.error("Fehler beim Löschen des Untertitels:", error);
      res.status(500).json({ error: "Fehler beim Löschen des Untertitels." });
    }
  },

  deleteLink: async (req, res) => {
    try {
      if (req.user.userType !== 'admin') {
        return res.status(403).json({ error: 'Nur Administratoren dürfen Links löschen.' });
      }

      const linkId = req.params.id;

      const deleteLinkSql = 'DELETE FROM content_links WHERE id = ?';
      const [result] = await pool.query(deleteLinkSql, [linkId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Link nicht gefunden.' });
      }

      res.json({ message: 'Link erfolgreich gelöscht.' });
    } catch (error) {
      console.error("Fehler beim Löschen des Links:", error);
      res.status(500).json({ error: "Fehler beim Löschen des Links." });
    }
  },

};

module.exports = linksController;
