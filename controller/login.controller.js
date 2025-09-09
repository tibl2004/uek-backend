const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../database/index');

const loginController = {
  // Middleware: Token prüfen
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
      const { benutzernameOderEmail, passwort } = req.body;
  
      if (!benutzernameOderEmail || !passwort) {
        return res.status(400).json({ error: 'Benutzername oder Passwort erforderlich.' });
      }
  
      // Prüfe Admin-Tabelle nach Benutzername oder Email
      const [adminResult] = await pool.query(
        "SELECT * FROM admins WHERE benutzername = ? OR email = ?",
        [benutzernameOderEmail, benutzernameOderEmail]
      );
  
      if (adminResult.length === 0) {
        return res.status(400).json({ error: 'Benutzername oder Passwort falsch.' });
      }
  
      const user = adminResult[0];
      const valid = await bcrypt.compare(passwort, user.passwort);
  
      if (!valid) {
        return res.status(400).json({ error: 'Benutzername oder Passwort falsch.' });
      }
  
      const userTypes = ["admin"];
      const rolle = user.rolle || "admin";
  
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
