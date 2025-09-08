const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../database/index');

const loginController = {
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

  login: async (req, res) => {
    try {
      const { benutzername, passwort } = req.body;

      if (!benutzername || !passwort) {
        return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich.' });
      }

      // Nur noch Tabelle vorstand prüfen
      const [vorstandResult] = await pool.query(
        "SELECT * FROM vorstand WHERE benutzername = ?",
        [benutzername]
      );

      if (vorstandResult.length === 0) {
        return res.status(400).json({ error: 'Benutzername oder Passwort falsch.' });
      }

      const user = vorstandResult[0];
      const valid = await bcrypt.compare(passwort, user.passwort);

      if (!valid) {
        return res.status(400).json({ error: 'Benutzername oder Passwort falsch.' });
      }

      // Immer nur "vorstand" als userType
      const userTypes = ["vorstand"];
      const rolle = user.rolle;

      // ⚡ JWT Payload
      const tokenPayload = {
        id: user.id,
        benutzername: user.benutzername,
        userTypes,
        rolle
      };

      const token = jwt.sign(tokenPayload, 'secretKey', { expiresIn: '240h' });

      res.json({
        token,
        id: user.id,
        benutzername: user.benutzername,
        userTypes,
        rolle
      });

    } catch (error) {
      console.error('Fehler beim Login:', error);
      res.status(500).json({ error: 'Fehler beim Login.' });
    }
  }
};

module.exports = loginController;
