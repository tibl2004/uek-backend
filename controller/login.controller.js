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

            const userTypes = [];
            let user = null;
            let rolle = null;

            // Passwortprüfung an einem existierenden Datensatz machen
            if (adminResult.length > 0) {
                const valid = await bcrypt.compare(passwort, adminResult[0].passwort);
                if (valid) {
                    userTypes.push("admin");
                    user = adminResult[0];
                }
            }

            if (vorstandResult.length > 0) {
                const valid = await bcrypt.compare(passwort, vorstandResult[0].passwort);
                if (valid) {
                    userTypes.push("vorstand");
                    rolle = vorstandResult[0].rolle;
                    if (!user) user = vorstandResult[0]; // falls nicht Admin, aber Vorstand
                }
            }

            if (userTypes.length === 0 || !user) {
                return res.status(400).json({ error: 'Benutzername oder Passwort falsch.' });
            }

            const name = user.name || `${user.vorname || ''} ${user.nachname || ''}`.trim();

            const tokenPayload = {
                id: user.id,
                benutzername: user.benutzername,
                userTypes,
                rolle,
                name
            };

            const token = jwt.sign(tokenPayload, 'secretKey', { expiresIn: '240h' });

            res.json({ token, userTypes, rolle, name });
        } catch (error) {
            console.error('Fehler beim Login:', error);
            res.status(500).json({ error: 'Fehler beim Login.' });
        }
    }
};

module.exports = loginController;
