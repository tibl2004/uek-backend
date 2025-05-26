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
    
            // Prüfe admins
            const [adminResult] = await pool.query("SELECT * FROM admins WHERE benutzername = ?", [benutzername]);
            // Prüfe vorstand (ggf. Rolle)
            const [vorstandResult] = await pool.query("SELECT * FROM vorstand WHERE benutzername = ?", [benutzername]);
    
            let user = null;
            let userType = null;
            let rolle = null;
    
            if (adminResult.length > 0) {
                user = adminResult[0];
                userType = 'admin';
            } else if (vorstandResult.length > 0) {
                user = vorstandResult[0];
                userType = 'vorstand';
            } else {
                return res.status(400).json({ error: 'Benutzername oder Passwort falsch.' });
            }
    
            const validPassword = await bcrypt.compare(passwort, user.passwort);
            if (!validPassword) {
                return res.status(400).json({ error: 'Benutzername oder Passwort falsch.' });
            }
    
            // Wenn User auch in vorstand ist, Rolle mitnehmen
            if (vorstandResult.length > 0) {
                rolle = vorstandResult[0].rolle;  // z.B. "PRÄSIDENTPRÄSIDENT"
            }
    
            // Name zusammensetzen
            const name = user.name || `${user.vorname || ''} ${user.nachname || ''}`.trim();
    
            const tokenPayload = {
                id: user.id,
                benutzername: user.benutzername,
                userType,
                rolle,
                name
            };
    
            const token = jwt.sign(tokenPayload, 'secretKey', { expiresIn: '240h' });
    
            // Rolle zusätzlich zurückgeben
            res.json({ token, userType, rolle, name });
        } catch (error) {
            console.error('Fehler beim Login:', error);
            res.status(500).json({ error: 'Fehler beim Login.' });
        }
    }
    
};

module.exports = loginController;
