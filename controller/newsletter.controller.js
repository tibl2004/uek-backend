const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../database/index');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const crypto = require('crypto'); // Für Token-Generierung
const moment = require('moment'); // Oder mit native JS, s.u.
const { DateTime } = require('luxon');

// Mail-Transporter vorbereiten (GMX)
const transporter = nodemailer.createTransport({
  host: 'mail.gmx.net',
  port: 587,
  secure: false,
  auth: {
    user: 'tbs-solutions@gmx.net', // Ersetzen!
    pass: 'Cocco2016?.',            // Ersetzen!
  },
});

const newsletterController = {
  // Authentifizierungsmiddleware
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
  create: async (req, res) => {
    try {
      // Nur Admin darf Newsletter erstellen
      if (req.user.userType !== 'admin') {
        return res.status(403).json({ error: 'Nur Admin darf Newsletter erstellen' });
      }

      const { title, sections, send_date } = req.body;

      if (!title || !sections || !send_date) {
        return res.status(400).json({ error: 'title, sections, send_date erforderlich' });
      }
      if (!Array.isArray(sections) || sections.length === 0) {
        return res.status(400).json({ error: 'sections muss ein nicht-leeres Array sein' });
      }

      // Newsletter in DB einfügen (ohne HTML-Content, nur Grunddaten)
      const [result] = await pool.query(
        'INSERT INTO newsletter (title, send_date) VALUES (?, ?)',
        [title, send_date]
      );
      const newsletterId = result.insertId;

      // Sections speichern
      for (const section of sections) {
        const { subtitle, text, foto } = section;

        let base64Foto = null;
        if (foto) {
          // Base64 Bild mit data:image/... prefix validieren
          const matches = foto.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
          if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: 'Ungültiges Bildformat. Erwartet Base64 mit data:image/... prefix.' });
          }

          const mimeType = matches[1];
          const base64Data = matches[2];

          // Erlaubte Formate prüfen
          if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(mimeType)) {
            return res.status(400).json({ error: 'Nur PNG, JPEG, JPG oder WEBP sind erlaubt.' });
          }

          const buffer = Buffer.from(base64Data, 'base64');

          // Bild mit sharp auf max 400x400 skalieren, PNG formatieren
          const convertedBuffer = await sharp(buffer)
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .png()
            .toBuffer();

          base64Foto = 'data:image/png;base64,' + convertedBuffer.toString('base64');
        }

        await pool.query(
          'INSERT INTO newsletter_sections (newsletter_id, subtitle, text, image) VALUES (?, ?, ?, ?)',
          [newsletterId, subtitle || '', text || '', base64Foto || '']
        );
      }

      res.status(201).json({ message: 'Newsletter wurde erfolgreich erstellt!', newsletterId });
    } catch (error) {
      console.error('Fehler beim Erstellen des Newsletters:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  },
  getAllSubscribers: async (req, res) => {
    try {
      if (req.user.userType !== 'admin') {
        return res.status(403).json({ error: 'Nur Admins dürfen Abonnenten einsehen' });
      }
  
      const [subscribers] = await pool.query(`
        SELECT 
          id, 
          email, 
          subscribed_at, 
          unsubscribed_at,
          CASE 
            WHEN unsubscribed_at IS NULL THEN 'aktiv'
            ELSE 'inaktiv'
          END AS status
        FROM newsletter_subscribers
        ORDER BY subscribed_at DESC
      `);
  
      res.json(subscribers);
    } catch (error) {
      console.error('Fehler beim Abrufen der Abonnenten:', error);
      res.status(500).json({ error: 'Serverfehler beim Abrufen der Abonnenten' });
    }
  },
  
  

  getAll: async (req, res) => {
    try {
      const [newsletters] = await pool.query('SELECT * FROM newsletter ORDER BY created_at DESC');
      res.json(newsletters);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Fehler beim Abrufen der Newsletter' });
    }
  },

  getById: async (req, res) => {
    try {
      const {
         id } = req.params;
      const [[newsletter]] = await pool.query('SELECT * FROM newsletter WHERE id = ?', [id]);
      if (!newsletter) return res.status(404).json({ error: 'Newsletter nicht gefunden' });

      const [sections] = await pool.query('SELECT subtitle, text FROM newsletter_sections WHERE newsletter_id = ?', [id]);

      res.json({ newsletter, sections });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Fehler beim Abrufen des Newsletters' });
    }
  },

  subscribe: async (req, res) => {
    try {
      const { vorname, nachname, email, newsletter_optin } = req.body;
  
      // Pflichtfelder prüfen
      if (!vorname || !nachname || !email) {
        return res.status(400).json({ error: 'Vorname, Nachname und E-Mail sind erforderlich' });
      }
  
      // Checkbox muss TRUE sein
      if (newsletter_optin !== true) {
        return res.status(400).json({ error: 'Newsletter-Opt-in muss bestätigt sein' });
      }
  
      // Prüfen, ob schon vorhanden
      const [[existing]] = await pool.query(
        'SELECT * FROM newsletter_subscribers WHERE email = ?',
        [email]
      );
  
      if (existing) {
        if (existing.unsubscribed_at === null) {
          return res.status(400).json({ error: 'Diese E-Mail ist bereits angemeldet' });
        } else {
          // Reaktivierung
          const newToken = crypto.randomBytes(20).toString('hex');
          await pool.query(
            'UPDATE newsletter_subscribers SET unsubscribed_at = NULL, subscribed_at = NOW(), unsubscribe_token = ?, vorname = ?, nachname = ?, newsletter_optin = 1 WHERE email = ?',
            [newToken, vorname, nachname, email]
          );
  
          // Bestätigungsmail senden
          await transporter.sendMail({
            from: '"Jugendverein" <newsletter@jugendverein.de>',
            to: email,
            subject: 'Newsletter-Reaktivierung bestätigt',
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9;">
                <h2 style="color: #0056b3;">Willkommen zurück beim Newsletter unseres Vereins!</h2>
                <p>Du hast dich erfolgreich erneut für unseren Newsletter angemeldet.</p>
                <p>Wenn du dich abmelden möchtest, kannst du das jederzeit über folgenden Link tun:</p>
                <a href="https://meinverein.de/api/newsletter/unsubscribe?token=${newToken}" style="color: #0056b3;">Vom Newsletter abmelden</a>
                <p style="margin-top: 30px; font-size: 12px; color: #999;">© ${new Date().getFullYear()} Jugendverein – Alle Rechte vorbehalten</p>
              </div>
            `,
          });
  
          return res.json({ message: 'Newsletter-Anmeldung reaktiviert' });
        }
      }
  
      // Neue Anmeldung
      const unsubscribeToken = crypto.randomBytes(20).toString('hex');
      await pool.query(
        'INSERT INTO newsletter_subscribers (vorname, nachname, email, unsubscribe_token, newsletter_optin) VALUES (?, ?, ?, ?, 1)',
        [vorname, nachname, email, unsubscribeToken]
      );
  
      // Bestätigungsmail
      await transporter.sendMail({
        from: '"Jugendverein" <newsletter@jugendverein.de>',
        to: email,
        subject: 'Newsletter-Anmeldung bestätigt',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9;">
            <h2 style="color: #0056b3;">Vielen Dank für deine Anmeldung!</h2>
            <p>Du hast dich erfolgreich für unseren Vereins-Newsletter registriert.</p>
            <p>Wir halten dich über Neuigkeiten, Veranstaltungen und Aktionen unseres Vereins auf dem Laufenden.</p>
            <p>Wenn du dich wieder abmelden möchtest, kannst du das jederzeit über diesen Link tun:</p>
            <a href="https://meinverein.de/api/newsletter/unsubscribe?token=${unsubscribeToken}" style="color: #0056b3;">Vom Newsletter abmelden</a>
            <p style="margin-top: 30px; font-size: 12px; color: #999;">© ${new Date().getFullYear()} Jugendverein – Alle Rechte vorbehalten</p>
          </div>
        `,
      });
  
      res.status(201).json({ message: 'Newsletter-Anmeldung erfolgreich' });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Serverfehler bei Newsletter-Anmeldung' });
    }
  },
  
  
  unsubscribe: async (req, res) => {
    try {
      const { token } = req.query;
  
      if (!token || typeof token !== 'string') {
        return res.status(400).send('<h3>Fehler: Kein gültiger Abmelde-Token übergeben.</h3>');
      }
  
      const [subscribers] = await pool.query(
        'SELECT * FROM newsletter_subscribers WHERE unsubscribe_token = ? AND unsubscribed_at IS NULL',
        [token]
      );
  
      if (!subscribers || subscribers.length === 0) {
        return res.status(404).send('<h3>Dieser Abmelde-Link ist ungültig oder wurde bereits verwendet.</h3>');
      }
  
      await pool.query(
        'UPDATE newsletter_subscribers SET unsubscribed_at = NOW() WHERE unsubscribe_token = ?',
        [token]
      );
  
      return res.send(`
        <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
          <h2>Du wurdest erfolgreich vom Newsletter abgemeldet.</h2>
          <p style="color: gray;">Es tut uns leid, dich gehen zu sehen. Du kannst dich jederzeit wieder anmelden.</p>
          <a href="https://tbs-solutions.vercel.app" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#0066cc;color:white;text-decoration:none;border-radius:4px;">Zurück zur Startseite</a>
        </div>
      `);
    } catch (error) {
      console.error('Fehler beim Abmelden vom Newsletter:', error);
      return res.status(500).send('<h3>Serverfehler bei der Newsletter-Abmeldung.</h3>');
    }
  },
  // NEUE FUNKTION: Mehrere E-Mails importieren
importSubscribers: async (req, res) => {
  try {
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Nur Admin darf Abonnenten importieren' });
    }

    let { emails } = req.body;
    if (!emails) {
      return res.status(400).json({ error: 'Keine E-Mail-Adressen übergeben' });
    }

    // Falls String → in Array umwandeln
    if (typeof emails === 'string') {
      emails = emails.split(/[\s,;]+/).map(e => e.trim()).filter(e => e);
    }

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Ungültiges E-Mail-Format' });
    }

    let added = 0;
    let reactivated = 0;
    let skipped = 0;

    for (const email of emails) {
      // Existenz prüfen
      const [[existing]] = await pool.query(
        'SELECT id, unsubscribed_at FROM newsletter_subscribers WHERE email = ?',
        [email]
      );

      if (existing) {
        if (existing.unsubscribed_at) {
          // Reaktivieren
          const newToken = crypto.randomBytes(20).toString('hex');
          await pool.query(
            'UPDATE newsletter_subscribers SET unsubscribed_at = NULL, subscribed_at = NOW(), unsubscribe_token = ? WHERE id = ?',
            [newToken, existing.id]
          );
          reactivated++;
        } else {
          skipped++;
        }
      } else {
        // Neu hinzufügen
        const unsubscribeToken = crypto.randomBytes(20).toString('hex');
        await pool.query(
          'INSERT INTO newsletter_subscribers (email, unsubscribe_token) VALUES (?, ?)',
          [email, unsubscribeToken]
        );
        added++;
      }
    }

    res.status(201).json({
      message: 'Import abgeschlossen',
      hinzugefügt: added,
      reaktiviert: reactivated,
      übersprungen: skipped
    });

  } catch (error) {
    console.error('Fehler beim Import:', error);
    res.status(500).json({ error: 'Serverfehler beim Importieren' });
  }
},

  sendNewsletter: async (newsletterId) => {
    try {
      const [[newsletter]] = await pool.query('SELECT * FROM newsletter WHERE id = ?', [newsletterId]);
      if (!newsletter) throw new Error('Newsletter nicht gefunden');
  
      const [sections] = await pool.query('SELECT subtitle, text FROM newsletter_sections WHERE newsletter_id = ?', [newsletterId]);
  
      // Alle aktiven Subscriber mit Token laden
      const [subscribers] = await pool.query('SELECT email, unsubscribe_token FROM newsletter_subscribers WHERE unsubscribed_at IS NULL');
  
      let html = `
        <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              width: 100%;
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
            }
            .header {
              background-color: #0056b3;
              color: white;
              padding: 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .section {
              padding: 20px;
              border-bottom: 1px solid #f1f1f1;
            }
            .section h3 {
              font-size: 20px;
              color: #333333;
              margin-bottom: 10px;
            }
            .section p {
              font-size: 16px;
              color: #555555;
              line-height: 1.6;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #888888;
              padding: 10px;
              background-color: #f1f1f1;
            }
            .unsubscribe {
              color: #0056b3;
              text-decoration: none;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${newsletter.title}</h1>
            </div>
            ${sections.map(section => `
              <div class="section">
                <h3>${section.subtitle}</h3>
                <p>${section.text}</p>
              </div>
            `).join('')}
            <div class="footer">
              <p>© ${new Date().getFullYear()} TBS Solutions GmbH</p>
              <p><a href="https://tbsdigitalsolutionsbackend.onrender.com/api/newsletter/unsubscribe?token={{unsubscribe_token}}" class="unsubscribe">Vom Newsletter abmelden</a></p>
            </div>
          </div>
        </body>
        </html>
      `;
  
      for (const subscriber of subscribers) {
        const htmlWithUnsubscribe = html.replace("{{unsubscribe_token}}", subscriber.unsubscribe_token);
  
        await transporter.sendMail({
          from: '"TBS Solutions" <tbs-solutions@gmx.net>',
          to: subscriber.email,
          subject: `Newsletter: ${newsletter.title}`,
          html: htmlWithUnsubscribe,
        });
      }
  
      console.log(`Newsletter ${newsletterId} wurde an ${subscribers.length} Empfänger versandt.`);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },
  
};

cron.schedule('* * * * *', async () => {  // jede Minute prüfen
    try {
      // Aktuelle Zeit in Europe/Berlin mit Sekunden=0
      const nowBerlin = DateTime.now().setZone('Europe/Berlin').startOf('minute');
  
      // 1 Minute später
      const nextBerlin = nowBerlin.plus({ minutes: 1 });
  
      // SQL-Datumsstrings im richtigen Format
      const startStr = nowBerlin.toFormat('yyyy-LL-dd HH:mm:ss');     // z.B. '2025-07-02 11:35:00'
      const endStr = nextBerlin.toFormat('yyyy-LL-dd HH:mm:ss');      // z.B. '2025-07-02 11:36:00'
  
      // Newsletter mit send_date in der Minute holen
      const [pending] = await pool.query(
        'SELECT * FROM newsletter WHERE send_date >= ? AND send_date < ? AND sent IS NULL',
        [startStr, endStr]
      );
  
      for (const nl of pending) {
        const success = await newsletterController.sendNewsletter(nl.id);
        if (success) {
            await pool.query('UPDATE newsletter SET sent = TRUE WHERE id = ?', [nl.id]);
        }
      }
    } catch (err) {
      console.error('Fehler im Cronjob für Newsletter:', err);
    }
  });
  

module.exports = newsletterController;
