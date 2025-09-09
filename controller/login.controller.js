const pool = require("../database/index");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const loginController = {
  login: async (req, res) => {
    try {
      const { benutzernameOderEmail, passwort } = req.body;

      if (!benutzernameOderEmail || !passwort) {
        return res.status(400).json({ error: "Benutzername oder Passwort erforderlich." });
      }

      let user = null;
      let rolle = null;

      // Prüfe, ob Eingabe eine E-Mail ist (einfaches @ check)
      const isEmail = benutzernameOderEmail.includes("@");

      if (isEmail) {
        // Login für Lernende über Email
        const [lernendeResult] = await pool.query(
          "SELECT * FROM lernende WHERE email = ?",
          [benutzernameOderEmail]
        );

        if (lernendeResult.length === 0) {
          return res.status(400).json({ error: "Benutzername oder Passwort falsch." });
        }

        user = lernendeResult[0];
        rolle = "lernende";

      } else {
        // Login für Admin über Benutzername
        const [adminResult] = await pool.query(
          "SELECT * FROM admins WHERE benutzername = ?",
          [benutzernameOderEmail]
        );

        if (adminResult.length === 0) {
          return res.status(400).json({ error: "Benutzername oder Passwort falsch." });
        }

        user = adminResult[0];
        rolle = user.rolle || "admin";
      }

      // Passwort prüfen
      const valid = await bcrypt.compare(passwort, user.passwort);
      if (!valid) {
        return res.status(400).json({ error: "Benutzername oder Passwort falsch." });
      }

      // Token erstellen
      const tokenPayload = {
        id: user.id,
        benutzername: user.benutzername || `${user.vorname} ${user.nachname}`,
        rolle,
        userTypes: [rolle],
      };

      const token = jwt.sign(tokenPayload, "secretKey", { expiresIn: "240h" });

      res.json({
        token,
        id: user.id,
        benutzername: tokenPayload.benutzername,
        rolle,
        userTypes: [rolle],
      });

    } catch (error) {
      console.error("Fehler beim Login:", error);
      res.status(500).json({ error: "Fehler beim Login." });
    }
  },
};

module.exports = loginController;
