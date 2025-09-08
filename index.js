const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middlewares
app.use(cors());
app.use(express.urlencoded({ limit: "150mb", extended: true }));
app.use(express.json({ limit: "150mb" }));

// Router importieren
const klasseRouter = require('./routes/klasse.router');
const loginRouter = require('./routes/login.router');
const raumRouter = require('./routes/raum.router');
const stundenplanRouter = require('./routes/stundenplan.router');
const uekRouter = require('./routes/uek.router');
const linksRouter = require('./routes/links.router'); // <-- fehlt in deinem Code

// Router benutzen
app.use('/api/klasse', klasseRouter);
app.use('/api/login', loginRouter);
app.use('/api/raum', raumRouter);
app.use('/api/stundenplan', stundenplanRouter);
app.use('/api/uek', uekRouter);

// WebSocket-Beispiel
wss.on('connection', (ws) => {
    console.log('Neue WebSocket-Verbindung');
    ws.send(JSON.stringify({ message: 'Willkommen im WebSocket!' }));

    ws.on('message', (message) => {
        console.log('Empfangen:', message);
        // Nachricht an alle Clients broadcasten
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('WebSocket-Verbindung geschlossen');
    });
});

// Fehlerbehandlung
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Etwas ist schiefgelaufen!');
});

// Server starten
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}....`);
});
