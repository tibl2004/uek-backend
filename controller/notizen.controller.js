const pool = require("../database/index");
const jwt = require("jsonwebtoken");

const notizenController = {
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

  // 📌 Komplett verschachtelte Struktur erstellen
  createNotizenStruktur: (req, res) => {
    const { stundenplanId } = req.params;
    const lernendeId = req.user.id;
    const notizenArray = req.body; // Dein Array wie im Beispiel

    if (!stundenplanId || !Array.isArray(notizenArray)) {
      return res.status(400).json({ error: "Stundenplan-ID und Notizen-Array erforderlich." });
    }

    const created = [];

    // Alles nacheinander einfügen
    const promises = notizenArray.map(
      (titelObj) =>
        new Promise((resolve, reject) => {
          pool.query(
            `INSERT INTO notizen (lernende_id, stundenplan_id, titel) VALUES (?, ?, ?)`,
            [lernendeId, stundenplanId, titelObj.titel],
            (err, result) => {
              if (err) return reject(err);
              const notizId = result.insertId;
              const newTitel = { id: notizId, titel: titelObj.titel, untertitel: [] };

              if (Array.isArray(titelObj.untertitel)) {
                const untertitelPromises = titelObj.untertitel.map(
                  (utObj) =>
                    new Promise((resolveUT, rejectUT) => {
                      pool.query(
                        `INSERT INTO notizen_untertitel (notiz_id, untertitel) VALUES (?, ?)`,
                        [notizId, utObj.untertitel],
                        (err, resultUT) => {
                          if (err) return rejectUT(err);
                          const utId = resultUT.insertId;
                          const newUntertitel = { id: utId, untertitel: utObj.untertitel, texte: [] };

                          if (Array.isArray(utObj.texte)) {
                            const textPromises = utObj.texte.map(
                              (txtObj) =>
                                new Promise((resolveT, rejectT) => {
                                  pool.query(
                                    `INSERT INTO notizen_texte (untertitel_id, text) VALUES (?, ?)`,
                                    [utId, txtObj.text],
                                    (err, resultT) => {
                                      if (err) return rejectT(err);
                                      newUntertitel.texte.push({
                                        id: resultT.insertId,
                                        text: txtObj.text,
                                      });
                                      resolveT();
                                    }
                                  );
                                })
                            );
                            Promise.all(textPromises)
                              .then(() => {
                                newTitel.untertitel.push(newUntertitel);
                                resolveUT();
                              })
                              .catch(rejectUT);
                          } else {
                            newTitel.untertitel.push(newUntertitel);
                            resolveUT();
                          }
                        }
                      );
                    })
                );

                Promise.all(untertitelPromises)
                  .then(() => {
                    created.push(newTitel);
                    resolve();
                  })
                  .catch(reject);
              } else {
                created.push(newTitel);
                resolve();
              }
            }
          );
        })
    );

    Promise.all(promises)
      .then(() => res.status(201).json({ message: "Notizen erstellt.", data: created }))
      .catch((err) => {
        console.error("Fehler beim Erstellen:", err);
        res.status(500).json({ error: "Fehler beim Erstellen der Notizen." });
      });
  },

  // 📌 Abrufen (wie vorher verschachtelt)
  getNotizenByStundenplan: (req, res) => {
    const { stundenplanId } = req.params;
    const lernendeId = req.user.id;

    const sql = `
      SELECT 
        n.id AS notiz_id, n.titel,
        u.id AS untertitel_id, u.untertitel,
        t.id AS text_id, t.text
      FROM notizen n
      LEFT JOIN notizen_untertitel u ON n.id = u.notiz_id
      LEFT JOIN notizen_texte t ON u.id = t.untertitel_id
      WHERE n.lernende_id = ? AND n.stundenplan_id = ?
      ORDER BY n.id, u.id, t.id
    `;

    pool.query(sql, [lernendeId, stundenplanId], (err, rows) => {
      if (err) {
        console.error("DB Fehler:", err);
        return res.status(500).json({ error: "Fehler beim Abrufen der Notizen." });
      }

      const result = [];
      rows.forEach((row) => {
        let titelObj = result.find((r) => r.id === row.notiz_id);
        if (!titelObj) {
          titelObj = { id: row.notiz_id, titel: row.titel, untertitel: [] };
          result.push(titelObj);
        }

        if (row.untertitel_id) {
          let untertitelObj = titelObj.untertitel.find((u) => u.id === row.untertitel_id);
          if (!untertitelObj) {
            untertitelObj = { id: row.untertitel_id, untertitel: row.untertitel, texte: [] };
            titelObj.untertitel.push(untertitelObj);
          }

          if (row.text_id) {
            untertitelObj.texte.push({ id: row.text_id, text: row.text });
          }
        }
      });

      res.status(200).json(result);
    });
  },
};

module.exports = notizenController;
