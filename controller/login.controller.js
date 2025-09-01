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
    
        const [adminResult] = await pool.query("SELECT * FROM admins WHERE benutzername = ?", [benutzername]);
        const [vorstandResult] = await pool.query("SELECT * FROM vorstand WHERE benutzername = ?", [benutzername]);
    
        let user = null;
        let userTypes = [];
        let rolle = null;
    
        if (adminResult.length > 0) {
          const valid = await bcrypt.compare(passwort, adminResult[0].passwort);
          if (valid) {
            user = adminResult[0];
            userTypes.push("admin");
          }
        }
    
        if (vorstandResult.length > 0) {
          const valid = await bcrypt.compare(passwort, vorstandResult[0].passwort);
          if (valid) {
            if (!user) user = vorstandResult[0];
            userTypes.push("vorstand");
            rolle = vorstandResult[0].rolle;
          }
        }
    
        if (!user || userTypes.length === 0) {
          return res.status(400).json({ error: 'Benutzername oder Passwort falsch.' });
        }
    
        // ⚡ Nur notwendige Daten ins JWT packen
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
