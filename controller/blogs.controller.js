const pool = require("../database/index");
const jwt = require("jsonwebtoken");
const sharp = require("sharp");

const blogController = {
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

  createBlog: async (req, res) => {
    let connection;
    try {
      // Nur Vorstände dürfen Blogs erstellen
      if (
        !req.user.userTypes ||
        !Array.isArray(req.user.userTypes) ||
        !req.user.userTypes.includes("vorstand")
      ) {
        return res.status(403).json({ error: "Nur Benutzer mit Vorstandrechten dürfen einen Blog erstellen." });
      }

      if (Array.isArray(bilder) && bilder.length > 5) {
        return res.status(400).json({ error: "Maximal 5 Bilder pro Blog erlaubt." });
      }
      
  
      const { titel, inhalt, bilder } = req.body;
  
      if (!titel || !inhalt) {
        return res.status(400).json({ error: "Titel und Inhalt müssen angegeben werden." });
      }
  
      // Autor aus Token bestimmen
      const autor = `${req.user.vorname || ""} ${req.user.nachname || ""}`.trim();
  
      connection = await pool.getConnection();
      await connection.beginTransaction();
  
      // Blog speichern
      const [blogResult] = await connection.query(
        `INSERT INTO blogs (titel, inhalt, autor, erstellt_am) VALUES (?, ?, ?, NOW())`,
        [titel, inhalt, autor]
      );
  
      const blogId = blogResult.insertId;
  
      // Bilder speichern (falls vorhanden)
      if (Array.isArray(bilder) && bilder.length > 0) {
  
        for (const bild of bilder) {
          try {
            const matches = bild.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
              console.warn("Ungültiges Bildformat, wird übersprungen.");
              continue;
            }
  
            const mimeType = matches[1];
            const base64Data = matches[2];
            let buffer = Buffer.from(base64Data, "base64");
  
            if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mimeType)) {
              console.warn("Nicht erlaubter Bildtyp, wird übersprungen:", mimeType);
              continue;
            }
  
            // Optional verkleinern, wenn zu groß (> 2MB)
            if (buffer.length > 2 * 1024 * 1024) {
              buffer = await sharp(buffer)
                .resize({ width: 1024 }) // max. Breite 1024px
                .png({ compressionLevel: 9 })
                .toBuffer();
              console.log("Bild wurde verkleinert, da zu groß.");
            } else {
              buffer = await sharp(buffer).png().toBuffer(); // nur Konvertieren in PNG
            }
  
            const base64Bild = buffer.toString("base64");
  
            // Einzelnes Bild einfügen
            await connection.query(
              `INSERT INTO blog_bilder (blog_id, bild) VALUES (?, ?)`,
              [blogId, base64Bild]
            );
  
          } catch (err) {
            console.warn("Bild konnte nicht konvertiert werden, wird übersprungen:", err.message);
            continue;
          }
        }
      }
  
      await connection.commit();
      res.status(201).json({ message: "Blog erfolgreich erstellt." });
  
    } catch (error) {
      if (connection) {
        try { await connection.rollback(); } catch {}
        connection.release();
      }
      console.error("Fehler beim Erstellen des Blogs:", error);
      res.status(500).json({ error: "Fehler beim Erstellen des Blogs." });
    } finally {
      if (connection) connection.release();
    }
  },
  
  
  getBlogs: async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT b.id, b.titel, LEFT(b.inhalt, 300) AS inhalt, b.erstellt_am,
               (
                 SELECT i.bild 
                 FROM blog_bilder i 
                 WHERE i.blog_id = b.id 
                 ORDER BY (TO_DAYS(NOW()) + i.id) % (SELECT COUNT(*) FROM blog_bilder WHERE blog_id = b.id)
                 LIMIT 1
               ) AS preview_bild
        FROM blogs b
        ORDER BY b.erstellt_am DESC
      `);
  
      const result = rows.map(row => ({
        id: row.id,
        titel: row.titel,
        inhalt: row.inhalt,
        erstellt_am: row.erstellt_am,
        bild: row.preview_bild 
          ? `data:image/png;base64,${row.preview_bild.toString("base64")}` 
          : null
      }));
  
      res.status(200).json(result);
    } catch (error) {
      console.error("Fehler beim Abrufen der Blogs:", error);
      res.status(500).json({ error: "Fehler beim Abrufen der Blogs." });
    }
  },
  
  
  getBlogById: async (req, res) => {
    try {
      const blogId = req.params.id;
  
      const [blogRows] = await pool.query(
        `SELECT id, titel, inhalt, autor, erstellt_am FROM blogs WHERE id = ?`,
        [blogId]
      );
  
      if (blogRows.length === 0) {
        return res.status(404).json({ error: "Blog nicht gefunden." });
      }
  
      const blog = blogRows[0];
  
      const [bilder] = await pool.query(
        `SELECT id, bild FROM blog_bilder WHERE blog_id = ?`,
        [blogId]
      );
  
      blog.bilder = bilder.map(b => ({
        id: b.id,
        bild: `data:image/png;base64,${b.bild.toString("base64")}`
      }));
  
      res.status(200).json(blog);
    } catch (error) {
      console.error("Fehler beim Abrufen des Blogs:", error);
      res.status(500).json({ error: "Fehler beim Abrufen des Blogs." });
    }
  },  

  updateBlog: async (req, res) => {
    let connection;
    try {
      if (req.user.userType !== "vorstand") {
        return res.status(403).json({ error: "Nur vorstands dürfen Blogs bearbeiten." });
      }

      const blogId = req.params.id;
      const { titel, inhalt, neueBilder } = req.body;

      connection = await pool.getConnection();
      await connection.beginTransaction();

      await connection.query(
        `UPDATE blogs SET titel = ?, inhalt = ? WHERE id = ?`,
        [titel, inhalt, blogId]
      );

      if (Array.isArray(neueBilder) && neueBilder.length > 0) {
        const bildWerte = [];

        for (const bild of neueBilder) {
          const matches = bild.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
          if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: "Ungültiges Bildformat." });
          }

          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, "base64");

          if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mimeType)) {
            return res.status(400).json({ error: "Nur PNG, JPEG, JPG oder WEBP erlaubt." });
          }

          const convertedBuffer = await sharp(buffer).png().toBuffer();
          const base64Bild = convertedBuffer.toString("base64");
          bildWerte.push([blogId, base64Bild]);
        }

        if (bildWerte.length > 0) {
          await connection.query(
            `INSERT INTO blog_bilder (blog_id, bild) VALUES ?`,
            [bildWerte]
          );
        }
      }

      await connection.commit();
      res.status(200).json({ message: "Blog erfolgreich aktualisiert." });
    } catch (error) {
      if (connection) {
        try { await connection.rollback(); } catch {}
        connection.release();
      }
      console.error("Fehler beim Aktualisieren des Blogs:", error);
      res.status(500).json({ error: "Fehler beim Aktualisieren des Blogs." });
    } finally {
      if (connection) connection.release();
    }
  },

  deleteBlog: async (req, res) => {
    try {
      if (req.user.userType !== "vorstand") {
        return res.status(403).json({ error: "Nur vorstands dürfen Blogs löschen." });
      }

      const blogId = req.params.id;

      await pool.query(`DELETE FROM blog_bilder WHERE blog_id = ?`, [blogId]);
      await pool.query(`DELETE FROM blogs WHERE id = ?`, [blogId]);

      res.status(200).json({ message: "Blog erfolgreich gelöscht." });
    } catch (error) {
      console.error("Fehler beim Löschen des Blogs:", error);
      res.status(500).json({ error: "Fehler beim Löschen des Blogs." });
    }
  }
};

module.exports = blogController;
