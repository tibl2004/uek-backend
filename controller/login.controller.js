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
            const [companyResult] = await pool.query("SELECT * FROM companies WHERE benutzername = ?", [benutzername]);
            const [departmentResult] = await pool.query("SELECT * FROM departments WHERE benutzername = ?", [benutzername]);

            let user = null;
            let userType = null;

            if (adminResult.length > 0) {
                user = adminResult[0];
                userType = 'admin';
            } else if (companyResult.length > 0) {
                user = companyResult[0];
                userType = 'company';
            } else if (departmentResult.length > 0) {
                user = departmentResult[0];
                userType = 'department';
            } else {
                return res.status(400).json({ error: 'Benutzername oder Passwort falsch.' });
            }

            const validPassword = await bcrypt.compare(passwort, user.passwort);
            if (!validPassword) {
                return res.status(400).json({ error: 'Benutzername oder Passwort falsch.' });
            }

            const tokenPayload = {
                id: user.id,
                benutzername: user.benutzername,
                userType,
                name: user.name // ⬅️ WICHTIG: Name ins Token packen
            };

            const token = jwt.sign(tokenPayload, 'secretKey', { expiresIn: '240h' });

            res.json({ token, userType });
        } catch (error) {
            console.error('Fehler beim Login:', error);
            res.status(500).json({ error: 'Fehler beim Login.' });
        }
    }
};

module.exports = loginController;
